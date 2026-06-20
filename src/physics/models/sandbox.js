/* ============================================================
 * 物绘流光 PhysFlux - 自由沙盒物理模型
 * 支持多物体自由布置、物体间万有引力、弹性碰撞、边界反弹
 * 适用于自由沙盒画布页面
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';
import { Helpers } from '../../utils/helpers.js';

export class SandboxModel extends BaseModel {
  static label = '自由沙盒';

  /** 沙盒专用参数 schema（在沙盒页面中按物体单独配置，此处仅作占位） */
  static paramSchema = [
    { key: 'gravity', label: '重力加速度', min: 0, max: 20, step: 0.1, default: 9.8, unit: 'm/s²' },
    { key: 'boundary', label: '边界模式', min: 0, max: 1, step: 1, default: 1, unit: '' },
  ];

  /** 可视化缩放引力常数 */
  static G_SCALED = 0.5;

  constructor(params, engine) {
    super(params, engine);
    /** 沙盒边界（物理坐标）：{ left, right, bottom, top } */
    this.bounds = { left: -40, right: 40, bottom: -25, top: 25 };
    /** 是否启用物体间万有引力 */
    this.interactionGravity = false;
    /** 是否启用物体间碰撞 */
    this.interactionCollision = true;
    /** 恢复系数（碰撞弹性） */
    this.elasticity = 0.85;
    /** 是否启用边界反弹 */
    this.boundaryBounce = true;
  }

  initialize() {
    super.initialize();
    // 沙盒物体由外部通过 addBody 添加，initialize 仅清空
    return this.bodies;
  }

  /** 添加一个物体到沙盒 */
  addBody(opts = {}) {
    const body = this.createBody(opts);
    // 沙盒中物理碰撞半径根据渲染半径换算（约 1px = 0.15m）
    body.collisionRadius = Math.max(0.3, (opts.radius || 6) * 0.06);
    this.bodies.push(body);
    return body;
  }

  /** 移除指定物体 */
  removeBody(id) {
    const idx = this.bodies.findIndex((b) => b.id === id);
    if (idx >= 0) this.bodies.splice(idx, 1);
  }

  /** 清空所有物体 */
  clearBodies() {
    this.bodies = [];
  }

  /** 设置沙盒边界 */
  setBounds(bounds) {
    this.bounds = Object.assign({}, this.bounds, bounds);
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;

    // 1. 计算每个物体所受合力
    for (const body of this.bodies) {
      let force = new Vec2(0, 0);

      // 重力
      const g = this.getGravityVector();
      force.addInPlace(new Vec2(body.mass * g.x, body.mass * g.y));

      // 空气阻力（线性阻力 F = -k·v）
      if (this.engine && this.engine.airResistance && this.engine.airResistance.enabled) {
        const k = this.engine.airResistance.coefficient || 0;
        force.addInPlace(body.velocity.scale(-k * body.mass));
      }

      // 物体间万有引力
      if (this.interactionGravity) {
        for (const other of this.bodies) {
          if (other === body) continue;
          const rel = other.position.sub(body.position);
          const distSq = rel.lengthSq();
          const dist = Math.sqrt(distSq);
          if (dist < 0.5) continue; // 避免奇点
          const G = SandboxModel.G_SCALED;
          const fMag = (G * body.mass * other.mass) / distSq;
          const fDir = rel.scale(1 / dist);
          force.addInPlace(fDir.scale(fMag));
        }
      }

      body.force = force;
      body.acceleration = force.scale(1 / body.mass);
    }

    // 2. 积分更新速度与位置（半隐式欧拉）
    for (const body of this.bodies) {
      body.velocity.addInPlace(body.acceleration.scale(dt));
      body.position.addInPlace(body.velocity.scale(dt));
      this.pushTrail(body, 800);
    }

    // 3. 物体间碰撞检测与解算
    if (this.interactionCollision) {
      this._resolveCollisions();
    }

    // 4. 边界反弹
    if (this.boundaryBounce) {
      this._resolveBoundary();
    }
  }

  /** 二维弹性碰撞解算 */
  _resolveCollisions() {
    const n = this.bodies.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        const rel = b.position.sub(a.position);
        const dist = rel.length();
        const minDist = a.collisionRadius + b.collisionRadius;
        if (dist < minDist && dist > 1e-6) {
          // 法向量
          const n = rel.scale(1 / dist);
          // 相对速度
          const relVel = b.velocity.sub(a.velocity);
          const velAlongNormal = relVel.dot(n);
          // 相离则不处理
          if (velAlongNormal > 0) continue;
          // 冲量计算
          const e = this.elasticity;
          const invMassA = 1 / a.mass;
          const invMassB = 1 / b.mass;
          const impulse = (-(1 + e) * velAlongNormal) / (invMassA + invMassB);
          const impulseVec = n.scale(impulse);
          a.velocity.addInPlace(impulseVec.scale(-invMassA));
          b.velocity.addInPlace(impulseVec.scale(invMassB));
          // 位置修正（分离避免穿透）
          const overlap = minDist - dist;
          const correction = n.scale(overlap / 2);
          a.position.addInPlace(correction.scale(-1));
          b.position.addInPlace(correction);
        }
      }
    }
  }

  /** 边界反弹处理 */
  _resolveBoundary() {
    const { left, right, bottom, top } = this.bounds;
    const damp = 0.8; // 边界反弹衰减
    for (const body of this.bodies) {
      const r = body.collisionRadius;
      if (body.position.x - r < left) {
        body.position.x = left + r;
        body.velocity.x = Math.abs(body.velocity.x) * damp;
      }
      if (body.position.x + r > right) {
        body.position.x = right - r;
        body.velocity.x = -Math.abs(body.velocity.x) * damp;
      }
      if (body.position.y - r < bottom) {
        body.position.y = bottom + r;
        body.velocity.y = Math.abs(body.velocity.y) * damp;
      }
      if (body.position.y + r > top) {
        body.position.y = top - r;
        body.velocity.y = -Math.abs(body.velocity.y) * damp;
      }
    }
  }

  getFormula() {
    return 'F = m·a\nF_gravity = m·g\nF_grav = G·m₁·m₂/r²\n碰撞：m₁v₁ + m₂v₂ = 守恒';
  }

  getExplanation() {
    return '自由沙盒模式下，你可以在画布上自由摆放多个物体，为每个物体设置质量、初速度等参数。物体间可发生弹性碰撞与万有引力相互作用，并受统一重力场与空气阻力影响。点击画布添加物体，拖拽调整位置，右侧面板编辑选中物体属性。';
  }
}
