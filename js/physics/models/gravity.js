/* ============================================================
 * 物绘流光 PhysFlux - 万有引力运动模型
 * 公式：F = G·M·m/r²，加速度 a = G·M/r²（指向中心天体）
 *       第一宇宙速度 v = √(GM/r)
 * 注：真实 G 极小，此处采用可视化缩放常数 G_s，保证轨道可见
 * ============================================================ */

class GravityModel extends BaseModel {
  static label = '万有引力';

  /** 参数 schema：中心质量、轨道半径、初速度、卫星质量 */
  static paramSchema = [
    { key: 'mass', label: '中心天体质量', min: 100, max: 5000, step: 100, default: 1500, unit: '×10³kg' },
    { key: 'radius', label: '初始轨道半径', min: 8, max: 30, step: 1, default: 18, unit: 'm' },
    { key: 'initialVelocity', label: '切向初速度', min: 1, max: 20, step: 0.2, default: 9, unit: 'm/s' },
    { key: 'particleCount', label: '卫星数量', min: 1, max: 4, step: 1, default: 1, unit: '颗' },
  ];

  /** 可视化缩放引力常数（非真实 G，仅用于演示） */
  static G_SCALED = 1.0;

  initialize() {
    super.initialize();
    const M = this.params.mass;
    const r = this.params.radius;
    const v0 = this.params.initialVelocity;
    const count = Math.max(1, Math.floor(this.params.particleCount));

    // 卫星颜色板
    const colors = ['#A8B5B0', '#C9A88A', '#D4A574', '#6B7B8C'];
    this.bodies = [];
    // 均匀分布初始相位
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const body = this.createBody({
        mass: 1,  // 卫星质量相对中心可忽略
        position: new Vec2(r * Math.cos(phase), r * Math.sin(phase)),
        // 切向初速度（位矢逆时针旋转 90° 方向）
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
      // 指向中心天体的位矢
      const rel = this._center.sub(body.position);
      const distSq = rel.lengthSq();
      const dist = Math.sqrt(distSq);
      if (dist < 1) continue;  // 避免奇点

      // 万有引力加速度 a = GM/r²，方向指向中心
      const a = (G * M) / distSq;
      const dir = rel.scale(1 / dist);
      body.acceleration = dir.scale(a);

      // 半隐式欧拉积分
      body.velocity.addInPlace(body.acceleration.scale(dt));
      body.position.addInPlace(body.velocity.scale(dt));

      // 合力 F = ma
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

window.GravityModel = GravityModel;
