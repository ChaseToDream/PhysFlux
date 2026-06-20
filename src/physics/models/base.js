/* ============================================================
 * 物绘流光 PhysFlux - 物理模型基类
 * 所有运动模型的抽象基类，定义统一接口与参数 schema
 * 新增题型仅需继承本类并实现四个核心方法
 * 增强：能量计算、空气阻力支持
 * ============================================================ */

import { Vec2 } from '../vector.js';
import { Helpers } from '../../utils/helpers.js';

export class BaseModel {
  /**
   * @param {Object} params 参数对象（来自控制面板）
   * @param {PhysicsEngine} engine 物理引擎引用
   */
  constructor(params, engine) {
    this.params = params || {};
    this.engine = engine || null;
    this.bodies = [];
    this.elapsedTime = 0;
    this.finished = false;
  }

  /* ---------- 子类应覆盖的静态属性 ---------- */
  static paramSchema = [];
  static label = '基类模型';

  /* ---------- 子类应覆盖的实例方法 ---------- */

  initialize() {
    this.bodies = [];
    this.elapsedTime = 0;
    this.finished = false;
    return this.bodies;
  }

  step(dt) {
    this.elapsedTime += dt;
  }

  getFormula() { return ''; }
  getExplanation() { return ''; }
  isFinished() { return this.finished; }

  /* ---------- 通用辅助方法 ---------- */

  /**
   * 获取当前应使用的重力加速度向量（物理坐标系，y 向上）
   * 优先使用引擎的自定义重力配置，否则使用参数中的 gravity
   */
  getGravityVector() {
    if (this.engine && this.engine.customGravity && this.engine.customGravity.enabled) {
      const { magnitude, angleDeg } = this.engine.customGravity;
      const rad = Helpers.degToRad(angleDeg);
      return new Vec2(magnitude * Math.cos(rad), magnitude * Math.sin(rad));
    }
    const g = this.params.gravity || 0;
    return new Vec2(0, -g);
  }

  /** 创建一个物体状态对象 */
  createBody(opts = {}) {
    return {
      id: Helpers.uid(),
      mass: opts.mass || 1,
      position: opts.position || new Vec2(0, 0),
      velocity: opts.velocity || new Vec2(0, 0),
      acceleration: opts.acceleration || new Vec2(0, 0),
      force: opts.force || new Vec2(0, 0),
      color: opts.color || '#A8B5B0',
      radius: opts.radius || 6,
      trail: [],
      label: opts.label || '物体',
      // 物理碰撞半径（米），默认与渲染半径关联
      collisionRadius: opts.collisionRadius || 1,
    };
  }

  /** 向物体轨迹追加一个点 */
  pushTrail(body, maxPoints = 2000) {
    body.trail.push({ x: body.position.x, y: body.position.y, alpha: 1 });
    if (body.trail.length > maxPoints) body.trail.shift();
  }

  /** 衰减所有物体轨迹点的 alpha */
  decayTrails(factor = 0.998) {
    for (const body of this.bodies) {
      for (const p of body.trail) p.alpha *= factor;
    }
  }

  /* ---------- 能量计算（供能量可视化使用） ---------- */

  /**
   * 计算当前系统总动能 Ek = Σ ½mv²
   */
  getKineticEnergy() {
    let ek = 0;
    for (const body of this.bodies) {
      const vSq = body.velocity.lengthSq();
      ek += 0.5 * body.mass * vSq;
    }
    return ek;
  }

  /**
   * 计算当前系统重力势能 Ep = Σ m·g·h
   * 以 y=0 为零势能参考面，g 取重力向量大小
   */
  getPotentialEnergy() {
    const g = this.getGravityVector();
    const gMag = g.length();
    let ep = 0;
    for (const body of this.bodies) {
      // 势能 = m * |g| * h，h 为沿重力反方向的高度
      // 简化：取 position 在重力方向上的投影
      ep += body.mass * gMag * (body.position.dot(g.normalize()) > 0
        ? body.position.dot(g.normalize())
        : 0);
    }
    // 更直观的实现：势能 = -m·(g·r)，r 为位置向量
    // 当重力向下时，y 越高势能越大
    let ep2 = 0;
    for (const body of this.bodies) {
      ep2 -= body.mass * body.position.dot(g);
    }
    return ep2;
  }

  /** 总机械能 */
  getTotalEnergy() {
    return this.getKineticEnergy() + this.getPotentialEnergy();
  }

  /* ---------- 空气阻力支持 ---------- */

  /**
   * 计算空气阻力对物体的减速加速度
   * 简单线性阻力模型：a_drag = -k·v
   * @param {Object} body 物体
   * @returns {Vec2} 阻力加速度向量
   */
  getDragAcceleration(body) {
    if (!this.engine || !this.engine.airResistance || !this.engine.airResistance.enabled) {
      return new Vec2(0, 0);
    }
    const k = this.engine.airResistance.coefficient || 0;
    if (k <= 0) return new Vec2(0, 0);
    return body.velocity.scale(-k);
  }
}
