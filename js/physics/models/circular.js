/* ============================================================
 * 物绘流光 PhysFlux - 匀速圆周运动模型
 * 公式：线速度 v = ωr，向心加速度 a = v²/r，向心力 F = mv²/r
 *       角速度 ω = v/r，周期 T = 2πr/v
 * ============================================================ */

class CircularModel extends BaseModel {
  static label = '圆周运动';

  /** 参数 schema：线速度、半径、质量 */
  static paramSchema = [
    { key: 'initialVelocity', label: '线速度', min: 1, max: 20, step: 0.5, default: 8, unit: 'm/s' },
    { key: 'radius', label: '轨道半径', min: 3, max: 25, step: 0.5, default: 12, unit: 'm' },
    { key: 'mass', label: '质量', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'kg' },
  ];

  initialize() {
    super.initialize();
    const r = this.params.radius;
    const v = this.params.initialVelocity;
    // 从圆周右侧起点出发，初速度沿切线方向（向上）
    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(r, 0),
      velocity: new Vec2(0, v),
      color: '#C9A88A',
      label: '圆周质点',
    });
    this.bodies = [body];
    this._center = new Vec2(0, 0);  // 圆心固定在原点
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    const r = this.params.radius;
    const v = this.params.initialVelocity;
    const omega = v / r;  // 角速度 ω = v/r

    // 当前位置相对圆心的位矢
    const rel = body.position.sub(this._center);
    const dist = rel.length();
    if (dist < 1e-6) return;

    // 向心加速度方向：指向圆心，大小 a = v²/r
    const centripetalDir = rel.scale(-1 / dist);
    const a = (v * v) / r;
    body.acceleration = centripetalDir.scale(a);

    // 旋转位矢实现匀速圆周（解析法，避免数值漂移）
    // θ += ω·dt，位置 = 圆心 + r·(cosθ, sinθ)
    const angle = rel.angle() + omega * dt;
    body.position = new Vec2(
      this._center.x + r * Math.cos(angle),
      this._center.y + r * Math.sin(angle)
    );
    // 速度方向沿切线（位矢逆时针旋转 90°）
    body.velocity = new Vec2(-r * Math.sin(angle), r * Math.cos(angle)).scale(omega);

    // 向心力 F = mv²/r
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

window.CircularModel = CircularModel;
