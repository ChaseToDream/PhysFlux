/* ============================================================
 * 物绘流光 PhysFlux - 弹性碰撞运动模型
 * 公式：动量守恒 m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′
 *       恢复系数 e：v₁′ − v₂′ = −e(v₁ − v₂)
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';
import { Helpers } from '../../utils/helpers.js';

export class CollisionModel extends BaseModel {
  static label = '弹性碰撞';

  static paramSchema = [
    { key: 'mass', label: '物体A质量', min: 0.5, max: 10, step: 0.5, default: 2, unit: 'kg' },
    { key: 'initialVelocity', label: '物体A初速度', min: 1, max: 20, step: 0.5, default: 10, unit: 'm/s' },
    { key: 'particleCount', label: '物体B质量', min: 0.5, max: 10, step: 0.5, default: 3, unit: 'kg' },
    { key: 'elasticity', label: '恢复系数', min: 0, max: 1, step: 0.05, default: 0.8, unit: '' },
  ];

  initialize() {
    super.initialize();
    const m1 = this.params.mass;
    const v1 = this.params.initialVelocity;
    const m2 = this.params.particleCount;
    this._e = Helpers.clamp(this.params.elasticity, 0, 1);
    this._collided = false;

    const bodyA = this.createBody({
      mass: m1,
      position: new Vec2(-15, 0),
      velocity: new Vec2(v1, 0),
      color: '#A8B5B0',
      label: '物体A',
      radius: 8,
      collisionRadius: 1.5,
    });
    const bodyB = this.createBody({
      mass: m2,
      position: new Vec2(5, 0),
      velocity: new Vec2(0, 0),
      color: '#C9A88A',
      label: '物体B',
      radius: 8,
      collisionRadius: 1.5,
    });
    this.bodies = [bodyA, bodyB];
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const [a, b] = this.bodies;

    a.position.addInPlace(a.velocity.scale(dt));
    b.position.addInPlace(b.velocity.scale(dt));
    a.acceleration = new Vec2(0, 0);
    b.acceleration = new Vec2(0, 0);
    a.force = new Vec2(0, 0);
    b.force = new Vec2(0, 0);
    this.pushTrail(a);
    this.pushTrail(b);

    // 二维碰撞检测：基于物体碰撞半径之和与连心方向
    const delta = b.position.sub(a.position);
    const dist = delta.length();
    const minDist = a.collisionRadius + b.collisionRadius;
    if (dist > 0 && !this._collided && dist <= minDist) {
      const n = delta.scale(1 / dist);
      // 沿法线方向的相对速度（接近为正）
      const relVel = a.velocity.sub(b.velocity);
      const relAlongN = relVel.dot(n);
      if (relAlongN > 0) {
        const m1 = a.mass, m2 = b.mass;
        const e = this._e;
        // 冲量大小 j = -(1+e)·vRel / (1/m1 + 1/m2)；这里 vRel 已是接近量，取正
        const j = (1 + e) * relAlongN / (1 / m1 + 1 / m2);
        const impulse = n.scale(j);
        a.velocity.addInPlace(impulse.scale(-1 / m1));
        b.velocity.addInPlace(impulse.scale(1 / m2));
        // 位置修正：按质量反比分离，避免穿透
        const overlap = minDist - dist;
        const totalM = m1 + m2;
        a.position.addInPlace(n.scale(-overlap * (m2 / totalM)));
        b.position.addInPlace(n.scale(overlap * (m1 / totalM)));
        this._collided = true;
      }
    }

    // 二维离场判定：两物体均离开可视区域则结束
    const outOfBounds = (p) => Math.abs(p.x) > 35 || Math.abs(p.y) > 25;
    if (this._collided && outOfBounds(a.position) && outOfBounds(b.position)) this.finished = true;
    // 超时保护，避免长时间不结束
    if (this.elapsedTime > 30) this.finished = true;
  }

  getFormula() {
    return 'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′\nv₁′ − v₂′ = −e·(v₁ − v₂)\n动能损失 ΔE = ½(1−e²)·m₁m₂(v₁−v₂)²/(m₁+m₂)';
  }

  getExplanation() {
    return '碰撞过程中系统动量守恒。恢复系数 e 描述碰撞的弹性程度：e=1 为完全弹性碰撞（动能守恒），e=0 为完全非弹性碰撞（两物体粘合）。当 m₁=m₂ 且 e=1 时，两物体速度交换，这是弹性碰撞的经典结论。';
  }
}
