/* ============================================================
 * 物绘流光 PhysFlux - 匀速圆周运动模型
 * 公式：线速度 v = ωr，向心加速度 a = v²/r，向心力 F = mv²/r
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';

export class CircularModel extends BaseModel {
  static label = '圆周运动';

  static paramSchema = [
    { key: 'initialVelocity', label: '线速度', min: 1, max: 20, step: 0.5, default: 8, unit: 'm/s' },
    { key: 'radius', label: '轨道半径', min: 3, max: 25, step: 0.5, default: 12, unit: 'm' },
    { key: 'mass', label: '质量', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'kg' },
  ];

  initialize() {
    super.initialize();
    const r = this.params.radius;
    const v = this.params.initialVelocity;
    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(r, 0),
      velocity: new Vec2(0, v),
      color: '#C9A88A',
      label: '圆周质点',
    });
    this.bodies = [body];
    this._center = new Vec2(0, 0);
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    const r = this.params.radius;
    const v = this.params.initialVelocity;
    const omega = v / r;

    const rel = body.position.sub(this._center);
    const dist = rel.length();
    if (dist < 1e-6) return;

    const centripetalDir = rel.scale(-1 / dist);
    const a = (v * v) / r;
    body.acceleration = centripetalDir.scale(a);

    const angle = rel.angle() + omega * dt;
    body.position = new Vec2(
      this._center.x + r * Math.cos(angle),
      this._center.y + r * Math.sin(angle)
    );
    body.velocity = new Vec2(-r * Math.sin(angle), r * Math.cos(angle)).scale(omega);
    body.force = centripetalDir.scale(body.mass * a);
    this.pushTrail(body);
  }

  getFormula() {
    return 'v = ω·r\na = v²/r = ω²·r\nF = m·v²/r\nT = 2π·r/v';
  }

  getExplanation() {
    return '匀速圆周运动中线速度大小恒定、方向沿切线时刻变化，存在指向圆心的向心加速度。向心力是效果力，由重力、弹力、摩擦力等提供。线速度越大、半径越小，向心加速度越大。';
  }
}
