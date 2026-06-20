/* ============================================================
 * 物绘流光 PhysFlux - 平抛/斜抛运动模型
 * 公式：x = v₀cosθ·t，y = v₀sinθ·t - ½gt²
 *       速度：vx = v₀cosθ，vy = v₀sinθ - gt
 * ============================================================ */

class ProjectileModel extends BaseModel {
  static label = '平抛运动';

  /** 参数 schema：初速度、角度、重力、质量 */
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
    // 初速度分解为水平、竖直分量（物理坐标系 y 向上）
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);

    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(-20, 0),   // 从左侧地面起抛，便于观察完整轨迹
      velocity: new Vec2(vx, vy),
      acceleration: new Vec2(0, -this.params.gravity),
      color: '#A8B5B0',
      label: '抛体',
    });
    this.bodies = [body];
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    // 半隐式欧拉积分：先更新速度，再更新位置，能量更稳定
    // a = (0, -g)，重力加速度恒定
    body.velocity.y += body.acceleration.y * dt;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
    // 合力 F = ma
    body.force = new Vec2(0, body.mass * body.acceleration.y);
    this.pushTrail(body);

    // 落地判定：回到地面以下则结束
    if (body.position.y <= -0.5 && this.elapsedTime > 0.1) {
      body.position.y = 0;
      this.finished = true;
    }
  }

  getFormula() {
    return 'x = v₀·cosθ·t\ny = v₀·sinθ·t − ½·g·t²\nvx = v₀·cosθ，vy = v₀·sinθ − g·t';
  }

  getExplanation() {
    return '平抛运动可分解为水平方向的匀速直线运动与竖直方向的匀变速直线运动。当抛射角度为 0° 即为平抛，0°~90° 之间为斜抛。射程 R = v₀²·sin(2θ)/g，当 θ=45° 时射程最大。';
  }
}

window.ProjectileModel = ProjectileModel;
