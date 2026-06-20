/* ============================================================
 * 物绘流光 PhysFlux - 平抛/斜抛运动模型
 * 公式：x = v₀cosθ·t，y = v₀sinθ·t - ½gt²
 *       速度：vx = v₀cosθ，vy = v₀sinθ - gt
 * ============================================================ */

import { BaseModel } from './base.js';
import { Vec2 } from '../vector.js';
import { Helpers } from '../../utils/helpers.js';

export class ProjectileModel extends BaseModel {
  static label = '平抛运动';

  static paramSchema = [
    { key: 'initialVelocity', label: '初速度', min: 1, max: 40, step: 0.5, default: 18, unit: 'm/s' },
    { key: 'angle', label: '抛射角度', min: 0, max: 90, step: 1, default: 45, unit: '°' },
    { key: 'gravity', label: '重力加速度', min: 1, max: 20, step: 0.1, default: 9.8, unit: 'm/s²' },
    { key: 'mass', label: '质量', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'kg' },
  ];

  initialize() {
    super.initialize();
    const v0 = this.params.initialVelocity;
    const theta = Helpers.degToRad(this.params.angle);
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);
    const g = this.getGravityVector();

    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(-20, 0),
      velocity: new Vec2(vx, vy),
      acceleration: new Vec2(g.x, g.y),
      color: '#A8B5B0',
      label: '抛体',
    });
    this.bodies = [body];
    this._gravity = g;
    // 记录发射点与重力方向单位向量，用于统一落地判定（兼容自定义重力方向）
    this._launchPos = body.position.clone();
    this._gHat = g.length() > 1e-6 ? g.normalize() : new Vec2(0, 0);
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    const g = this._gravity;
    // 合加速度 = 重力 + 空气阻力
    const drag = this.getDragAcceleration(body);
    const ax = g.x + drag.x;
    const ay = g.y + drag.y;
    body.velocity.x += ax * dt;
    body.velocity.y += ay * dt;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
    body.force = new Vec2(body.mass * ax, body.mass * ay);
    this.pushTrail(body);

    // 统一落地判定：沿重力方向位移超过 0.5m 即视为落地
    // 兼容默认重力与自定义重力（任意方向），不再因 customGravity 开关而跳过
    if (this._gHat.lengthSq() > 0) {
      const fallen = body.position.sub(this._launchPos).dot(this._gHat);
      if (fallen >= 0.5 && this.elapsedTime > 0.1) {
        // 将抛体拉回发射平面（沿重力方向归零），避免穿透地面
        body.position = body.position.sub(this._gHat.scale(fallen));
        this.finished = true;
      }
    }
    // 超时或远离视野保护：无重力或异常情况下避免永不结束
    if (this.elapsedTime > 60 || body.position.length() > 500) this.finished = true;
  }

  getFormula() {
    return 'x = v₀·cosθ·t\ny = v₀·sinθ·t − ½·g·t²\nvx = v₀·cosθ，vy = v₀·sinθ − g·t';
  }

  getExplanation() {
    return '平抛运动可分解为水平方向的匀速直线运动与竖直方向的匀变速直线运动。当抛射角度为 0° 即为平抛，0°~90° 之间为斜抛。射程 R = v₀²·sin(2θ)/g，当 θ=45° 时射程最大。';
  }
}
