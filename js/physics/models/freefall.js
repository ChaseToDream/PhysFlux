/* ============================================================
 * 物绘流光 PhysFlux - 自由落体运动模型
 * 公式：h = ½gt²，v = gt
 *       初速度为零，仅受重力作用
 * ============================================================ */

class FreeFallModel extends BaseModel {
  static label = '自由落体';

  /** 参数 schema：高度、重力、质量 */
  static paramSchema = [
    { key: 'radius', label: '初始高度', min: 5, max: 60, step: 1, default: 30, unit: 'm' },
    { key: 'gravity', label: '重力加速度', min: 1, max: 20, step: 0.1, default: 9.8, unit: 'm/s²' },
    { key: 'mass', label: '质量', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'kg' },
    { key: 'initialVelocity', label: '初速度(向下)', min: 0, max: 20, step: 0.5, default: 0, unit: 'm/s' },
  ];

  initialize() {
    super.initialize();
    // 获取重力向量（支持自定义重力方向）
    const g = this.getGravityVector();
    const body = this.createBody({
      mass: this.params.mass,
      position: new Vec2(0, this.params.radius),  // 从高处释放
      velocity: new Vec2(0, -this.params.initialVelocity), // 初速度向下
      acceleration: new Vec2(g.x, g.y),
      color: '#6B7B8C',
      label: '落体',
    });
    this.bodies = [body];
    // 缓存重力向量供 step 使用
    this._gravity = g;
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const body = this.bodies[0];
    const g = this._gravity;
    // v = v₀ + g·t，位置更新（支持任意方向重力）
    body.velocity.x += g.x * dt;
    body.velocity.y += g.y * dt;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
    body.force = new Vec2(body.mass * g.x, body.mass * g.y);
    this.pushTrail(body);

    // 落地判定（仅当默认向下重力时生效）
    if (!this.engine || !this.engine.customGravity || !this.engine.customGravity.enabled) {
      if (body.position.y <= 0 && this.elapsedTime > 0.05) {
        body.position.y = 0;
        this.finished = true;
      }
    }
  }

  getFormula() {
    return 'h = ½·g·t²\nv = g·t\n落地时间 t = √(2h/g)';
  }

  getExplanation() {
    return '自由落体运动是初速度为零、仅受重力作用的匀加速直线运动。加速度恒为 g，方向竖直向下。下落距离与时间平方成正比，速度与时间成正比。';
  }
}

window.FreeFallModel = FreeFallModel;
