/* ============================================================
 * 物绘流光 PhysFlux - 自由沙盒物理模型
 * 支持多物体自由布置、物体间万有引力、弹性碰撞、边界反弹
 * 适用于自由沙盒画布页面
 * ============================================================ */

import { BaseModel } from './base.js';

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

    const g = this.getGravityVector();
    const airEnabled = this.engine && this.engine.airResistance && this.engine.airResistance.enabled;
    const airK = airEnabled ? (this.engine.airResistance.coefficient || 0) : 0;
    const G = SandboxModel.G_SCALED;

    // 1. 计算每个物体所受合力（直接累加到 body.force，避免临时向量）
    for (const body of this.bodies) {
      const force = body.force;
      force.set(body.mass * g.x, body.mass * g.y);

      // 空气阻力（线性阻力 F = -k·m·v）
      if (airEnabled && airK > 0) {
        force.addScaledInPlace(body.velocity, -airK * body.mass);
      }

      // 物体间万有引力
      if (this.interactionGravity) {
        for (const other of this.bodies) {
          if (other === body) continue;
          const rx = other.position.x - body.position.x;
          const ry = other.position.y - body.position.y;
          const distSq = rx * rx + ry * ry;
          if (distSq < 0.25) continue; // 避免奇点
          const dist = Math.sqrt(distSq);
          const fMag = (G * body.mass * other.mass) / distSq;
          const f = fMag / dist;
          force.x += rx * f;
          force.y += ry * f;
        }
      }

      body.acceleration.set(force.x / body.mass, force.y / body.mass);
    }

    // 2. 积分更新速度与位置（半隐式欧拉，原地更新避免 scale 临时对象）
    for (const body of this.bodies) {
      body.velocity.addScaledInPlace(body.acceleration, dt);
      body.position.addScaledInPlace(body.velocity, dt);
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

  /** 二维弹性碰撞解算（使用均匀空间网格加速，避免 O(n²) 暴力遍历） */
  _resolveCollisions() {
    const bodies = this.bodies;
    const n = bodies.length;
    if (n < 2) return;

    // 网格单元尺寸取最大碰撞直径，保证潜在碰撞对必在相邻 9 格内
    let maxR = 0;
    for (let i = 0; i < n; i++) maxR = Math.max(maxR, bodies[i].collisionRadius);
    const cellSize = Math.max(0.5, maxR * 2);

    // 构建均匀网格：key = "cx,cy" -> [bodyIndex,...]
    const grid = new Map();
    const keyOf = (cx, cy) => cx + ',' + cy;
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      const cx = Math.floor(b.position.x / cellSize);
      const cy = Math.floor(b.position.y / cellSize);
      const key = keyOf(cx, cy);
      let cell = grid.get(key);
      if (!cell) { cell = []; grid.set(key, cell); }
      cell.push(i);
    }

    const e = this.elasticity;
    const checked = new Set();
    for (let i = 0; i < n; i++) {
      const a = bodies[i];
      const cx = Math.floor(a.position.x / cellSize);
      const cy = Math.floor(a.position.y / cellSize);
      // 仅检查当前格与右/下相邻格（加上自身格），避免重复对
      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = (dx === 0 ? 0 : -1); dy <= 1; dy++) {
          const cell = grid.get(keyOf(cx + dx, cy + dy));
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            const pairKey = i * n + j;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);
            this._resolvePair(a, bodies[j], e);
          }
        }
      }
    }
  }

  /** 解算两个物体间的碰撞冲量与位置修正（按质量反比分离） */
  _resolvePair(a, b, e) {
    const nx = b.position.x - a.position.x;
    const ny = b.position.y - a.position.y;
    const dist = Math.sqrt(nx * nx + ny * ny);
    const minDist = a.collisionRadius + b.collisionRadius;
    if (dist >= minDist || dist <= 1e-6) return;
    const invDist = 1 / dist;
    const nrx = nx * invDist;
    const nry = ny * invDist;
    // 沿法线方向的相对速度（b 相对 a）
    const rvx = b.velocity.x - a.velocity.x;
    const rvy = b.velocity.y - a.velocity.y;
    const velAlongNormal = rvx * nrx + rvy * nry;
    if (velAlongNormal > 0) return; // 相离
    const invMassA = 1 / a.mass;
    const invMassB = 1 / b.mass;
    const impulse = (-(1 + e) * velAlongNormal) / (invMassA + invMassB);
    // 冲量向量 = n * impulse，直接加权更新速度，避免临时向量
    const jx = nrx * impulse;
    const jy = nry * impulse;
    a.velocity.x -= jx * invMassA;
    a.velocity.y -= jy * invMassA;
    b.velocity.x += jx * invMassB;
    b.velocity.y += jy * invMassB;
    // 位置修正：按质量反比分离，避免穿透（轻物退让更多）
    const overlap = minDist - dist;
    const totalInv = invMassA + invMassB;
    const corrA = -overlap * (invMassA / totalInv);
    const corrB = overlap * (invMassB / totalInv);
    a.position.x += nrx * corrA;
    a.position.y += nry * corrA;
    b.position.x += nrx * corrB;
    b.position.y += nry * corrB;
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
