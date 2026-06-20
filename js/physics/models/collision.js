/* ============================================================
 * 物绘流光 PhysFlux - 弹性碰撞运动模型
 * 公式：动量守恒 m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′
 *       恢复系数 e：v₁′ − v₂′ = −e(v₁ − v₂)
 *       当 e=1 为完全弹性碰撞，e=0 为完全非弹性碰撞
 * ============================================================ */

class CollisionModel extends BaseModel {
  static label = '弹性碰撞';

  /** 参数 schema：物体1质量、物体1速度、物体2质量、恢复系数 */
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

    // 物体A从左侧向右运动，物体B静止于右侧
    const bodyA = this.createBody({
      mass: m1,
      position: new Vec2(-15, 0),
      velocity: new Vec2(v1, 0),
      color: '#A8B5B0',
      label: '物体A',
    });
    const bodyB = this.createBody({
      mass: m2,
      position: new Vec2(5, 0),
      velocity: new Vec2(0, 0),
      color: '#C9A88A',
      label: '物体B',
    });
    this.bodies = [bodyA, bodyB];
    return this.bodies;
  }

  step(dt) {
    super.step(dt);
    if (this.finished) return;
    const [a, b] = this.bodies;

    // 碰撞前匀速运动
    a.position.addInPlace(a.velocity.scale(dt));
    b.position.addInPlace(b.velocity.scale(dt));
    a.acceleration = new Vec2(0, 0);
    b.acceleration = new Vec2(0, 0);
    a.force = new Vec2(0, 0);
    b.force = new Vec2(0, 0);
    this.pushTrail(a);
    this.pushTrail(b);

    // 碰撞检测：两物体距离小于物理碰撞半径之和（约 1.5m，区别于渲染半径）
    const dist = a.position.distanceTo(b.position);
    const collisionRadius = 1.5;  // 物理碰撞半径（米）
    const minDist = collisionRadius * 2;
    if (!this._collided && dist <= minDist && a.velocity.x > b.velocity.x) {
      // 一维碰撞解算（沿 x 方向）
      const m1 = a.mass, m2 = b.mass;
      const u1 = a.velocity.x, u2 = b.velocity.x;
      const e = this._e;
      // 由动量守恒与恢复系数定义联立解得碰后速度
      // v1 = (m1u1 + m2u2 + m2·e·(u2−u1)) / (m1+m2)
      // v2 = (m1u1 + m2u2 + m1·e·(u1−u2)) / (m1+m2)
      const totalM = m1 + m2;
      const v1New = (m1 * u1 + m2 * u2 + m2 * e * (u2 - u1)) / totalM;
      const v2New = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / totalM;
      a.velocity.x = v1New;
      b.velocity.x = v2New;
      // 分离避免粘连
      const overlap = minDist - dist;
      a.position.x -= overlap / 2;
      b.position.x += overlap / 2;
      this._collided = true;
    }

    // 碰撞后两物体均离开视野则结束
    if (this._collided && a.position.x > 30 && b.position.x > 30) {
      this.finished = true;
    }
    if (this._collided && a.position.x < -30 && b.position.x < -30) {
      this.finished = true;
    }
  }

  getFormula() {
    return 'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′\nv₁′ − v₂′ = −e·(v₁ − v₂)\n动能损失 ΔE = ½(1−e²)·m₁m₂(v₁−v₂)²/(m₁+m₂)';
  }

  getExplanation() {
    return '碰撞过程中系统动量守恒。恢复系数 e 描述碰撞的弹性程度：e=1 为完全弹性碰撞（动能守恒），e=0 为完全非弹性碰撞（两物体粘合）。当 m₁=m₂ 且 e=1 时，两物体速度交换，这是弹性碰撞的经典结论。';
  }
}

window.CollisionModel = CollisionModel;
