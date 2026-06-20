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
    const useRK4 = this.engine && this.engine.integrator === 'rk4';

    // 复用 scratch 向量，避免每步在闭包内分配临时对象
    if (!this._scratch) this._scratch = new Vec2();

    for (const body of this.bodies) {
      // 加速度仅依赖位置（中心引力场），写入 out 向量，避免链式 scale 分配
      const accelInto = (pos, out) => {
        const rx = this._center.x - pos.x;
        const ry = this._center.y - pos.y;
        const distSq = rx * rx + ry * ry;
        const dist = Math.sqrt(distSq);
        if (dist < 1) { out.set(0, 0); return out; }
        const a = (G * M) / distSq;
        out.set((rx / dist) * a, (ry / dist) * a);
        return out;
      };
      // RK4 的 k1v..k4v 需同时存活，必须返回独立向量
      const accelAt = (pos) => accelInto(pos, new Vec2());

      if (useRK4) {
        const p0 = body.position;
        const v0 = body.velocity;
        const s = this._scratch;
        // k1
        const k1p = v0;
        const k1v = accelAt(p0);
        // k2
        const k2p = v0.clone(); k2p.addScaledInPlace(k1v, dt * 0.5);
        s.copy(p0); s.addScaledInPlace(k1p, dt * 0.5); const k2v = accelAt(s);
        // k3
        const k3p = v0.clone(); k3p.addScaledInPlace(k2v, dt * 0.5);
        s.copy(p0); s.addScaledInPlace(k2p, dt * 0.5); const k3v = accelAt(s);
        // k4
        const k4p = v0.clone(); k4p.addScaledInPlace(k3v, dt);
        s.copy(p0); s.addScaledInPlace(k3p, dt); const k4v = accelAt(s);
        // 合成：x = x0 + (k1 + 2k2 + 2k3 + k4)·dt/6，用累加避免链式 add/scale
        const newPos = p0.clone();
        const c = dt / 6;
        newPos.addScaledInPlace(k1p, c);
        newPos.addScaledInPlace(k2p, 2 * c);
        newPos.addScaledInPlace(k3p, 2 * c);
        newPos.addScaledInPlace(k4p, c);
        const newVel = v0.clone();
        newVel.addScaledInPlace(k1v, c);
        newVel.addScaledInPlace(k2v, 2 * c);
        newVel.addScaledInPlace(k3v, 2 * c);
        newVel.addScaledInPlace(k4v, c);
        body.position = newPos;
        body.velocity = newVel;
        accelInto(body.position, s);
        body.acceleration = s.clone();
      } else {
        const rx = this._center.x - body.position.x;
        const ry = this._center.y - body.position.y;
        const distSq = rx * rx + ry * ry;
        const dist = Math.sqrt(distSq);
        if (dist < 1) {
          body.force = body.acceleration = new Vec2(0, 0);
        } else {
          const a = (G * M) / distSq;
          const ax = (rx / dist) * a;
          const ay = (ry / dist) * a;
          body.acceleration = new Vec2(ax, ay);
          body.velocity.x += ax * dt;
          body.velocity.y += ay * dt;
          body.position.x += body.velocity.x * dt;
          body.position.y += body.velocity.y * dt;
          body.force = new Vec2(ax * body.mass, ay * body.mass);
        }
      }
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
