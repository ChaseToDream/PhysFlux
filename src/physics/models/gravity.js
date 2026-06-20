/* ============================================================
 * 物绘流光 PhysFlux - 万有引力运动模型
 * 公式：F = G·M·m/r²，加速度 a = G·M/r²
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';

export class GravityModel extends BaseModel {
  static label = '万有引力';

  static paramSchema = [
    { key: 'mass', label: '中心天体质量', min: 100, max: 5000, step: 100, default: 1500, unit: '×10³kg' },
    { key: 'radius', label: '初始轨道半径', min: 8, max: 30, step: 1, default: 18, unit: 'm' },
    { key: 'initialVelocity', label: '切向初速度', min: 1, max: 20, step: 0.2, default: 9, unit: 'm/s' },
    { key: 'particleCount', label: '卫星数量', min: 1, max: 4, step: 1, default: 1, unit: '颗' },
  ];

  static G_SCALED = 1.0;

  initialize() {
    super.initialize();
    const M = this.params.mass;
    const r = this.params.radius;
    const v0 = this.params.initialVelocity;
    const count = Math.max(1, Math.floor(this.params.particleCount));

    const colors = ['#A8B5B0', '#C9A88A', '#D4A574', '#6B7B8C'];
    this.bodies = [];
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const body = this.createBody({
        mass: 1,
        position: new Vec2(r * Math.cos(phase), r * Math.sin(phase)),
        velocity: new Vec2(-v0 * Math.sin(phase), v0 * Math.cos(phase)),
        color: colors[i % colors.length],
        label: `卫星${i + 1}`,
      });
      this.bodies.push(body);
    }
    this._centerMass = M;
    this._center = new Vec2(0, 0);
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const G = GravityModel.G_SCALED;
    const M = this._centerMass;

    for (const body of this.bodies) {
      const rel = this._center.sub(body.position);
      const distSq = rel.lengthSq();
      const dist = Math.sqrt(distSq);
      if (dist < 1) continue;

      const a = (G * M) / distSq;
      const dir = rel.scale(1 / dist);
      body.acceleration = dir.scale(a);

      body.velocity.addInPlace(body.acceleration.scale(dt));
      body.position.addInPlace(body.velocity.scale(dt));
      body.force = body.acceleration.scale(body.mass);
      this.pushTrail(body);
    }
  }

  getFormula() {
    return 'F = G·M·m/r²\na = G·M/r²\n第一宇宙速度 v₁ = √(G·M/r)';
  }

  getExplanation() {
    return '万有引力是任意两个有质量物体间的相互吸引力，与质量乘积成正比、与距离平方成反比。行星绕日、卫星绕地运动均由万有引力提供向心力。当初速度等于第一宇宙速度时为圆轨道，大于则成椭圆或抛物线轨道。';
  }
}
