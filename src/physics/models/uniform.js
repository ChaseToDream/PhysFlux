/* ============================================================
 * 物绘流光 PhysFlux - 匀变速直线运动模型
 * 公式：v = v₀ + a·t，s = v₀·t + ½·a·t²
 * 含摩擦力时：合加速度 a = a₀ − μg
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';

export class UniformModel extends BaseModel {
  static label = '匀变速直线';

  static paramSchema = [
    { key: 'initialVelocity', label: '初速度', min: 0, max: 30, step: 0.5, default: 12, unit: 'm/s' },
    { key: 'gravity', label: '加速度', min: -10, max: 10, step: 0.5, default: 3, unit: 'm/s²' },
    { key: 'friction', label: '摩擦系数', min: 0, max: 1, step: 0.05, default: 0.1, unit: 'μ' },
    { key: 'mass', label: '质量', min: 0.5, max: 10, step: 0.5, default: 2, unit: 'kg' },
  ];

  initialize() {
    super.initialize();
    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(-25, 0),
      velocity: new Vec2(this.params.initialVelocity, 0),
      color: '#D4A574',
      label: '质点',
    });
    this.bodies = [body];
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    const a0 = this.params.gravity;
    const mu = this.params.friction;
    const customG = (this.engine && this.engine.customGravity && this.engine.customGravity.enabled)
      ? this.engine.customGravity.magnitude : 9.8;

    let aNet = a0;
    const speed = body.velocity.x;
    if (Math.abs(speed) > 0.01) {
      const frictionDecel = mu * customG * Math.sign(speed);
      aNet = a0 - frictionDecel;
    } else if (Math.abs(a0) < mu * customG) {
      aNet = 0;
      body.velocity.x = 0;
    }

    body.acceleration = new Vec2(aNet, 0);
    body.velocity.x += aNet * dt;
    if (mu > 0 && Math.abs(a0) < mu * customG && Math.abs(body.velocity.x) < 0.05) {
      body.velocity.x = 0;
    }
    body.position.x += body.velocity.x * dt;
    body.force = new Vec2(body.mass * aNet, 0);
    this.pushTrail(body);

    if (Math.abs(body.position.x) > 35) this.finished = true;
  }

  getFormula() {
    return 'v = v₀ + a·t\ns = v₀·t + ½·a·t²\nv² − v₀² = 2·a·s';
  }

  getExplanation() {
    return '匀变速直线运动是加速度恒定的直线运动。速度随时间线性变化，位移随时间二次方变化。当存在摩擦力时，合加速度为外加加速度减去摩擦减速度 μg。v-t 图像为直线，s-t 图像为抛物线。';
  }
}
