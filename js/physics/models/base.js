/* ============================================================
 * 物绘流光 PhysFlux - 物理模型基类
 * 所有运动模型的抽象基类，定义统一接口与参数 schema
 * 新增题型仅需继承本类并实现四个核心方法
 * ============================================================ */

class BaseModel {
  /**
   * @param {Object} params 参数对象（来自控制面板）
   * @param {PhysicsEngine} engine 物理引擎引用（用于访问自定义重力等全局配置）
   */
  constructor(params, engine) {
    this.params = params || {};
    /** @type {PhysicsEngine} */
    this.engine = engine || null;
    /** @type {Array} 运动物体列表 */
    this.bodies = [];
    /** @type {number} 模拟累计时间 */
    this.elapsedTime = 0;
    /** @type {boolean} 是否已结束（落地/停止） */
    this.finished = false;
  }

  /* ---------- 子类应覆盖的静态属性 ---------- */

  /** 参数 schema：声明该模型使用的参数及其范围，供控件动态生成 */
  static paramSchema = [];

  /** 模型显示名称 */
  static label = '基类模型';

  /* ---------- 子类应覆盖的实例方法 ---------- */

  /**
   * 初始化物体状态（在播放/重置时调用）
   * @returns {Array} 物体数组
   */
  initialize() {
    this.bodies = [];
    this.elapsedTime = 0;
    this.finished = false;
    return this.bodies;
  }

  /**
   * 时间步进：更新所有物体状态
   * @param {number} dt 时间步长（秒）
   */
  step(dt) {
    this.elapsedTime += dt;
  }

  /** 返回当前模型的物理公式文本（用于底部说明区） */
  getFormula() {
    return '';
  }

  /** 返回题型解析文字 */
  getExplanation() {
    return '';
  }

  /** 是否模拟结束（默认永不结束，子类按需覆盖） */
  isFinished() {
    return this.finished;
  }

  /* ---------- 通用辅助方法 ---------- */

  /**
   * 获取当前应使用的重力加速度向量（物理坐标系，y 向上）
   * 优先使用引擎的自定义重力配置，否则使用参数中的 gravity（默认向下）
   * @returns {Vec2} 重力加速度向量
   */
  getGravityVector() {
    if (this.engine && this.engine.customGravity && this.engine.customGravity.enabled) {
      const { magnitude, angleDeg } = this.engine.customGravity;
      const rad = Helpers.degToRad(angleDeg);
      return new Vec2(
        magnitude * Math.cos(rad),
        magnitude * Math.sin(rad)
      );
    }
    // 默认：重力向下（y 负方向），大小取 params.gravity
    const g = this.params.gravity || 0;
    return new Vec2(0, -g);
  }

  /**
   * 创建一个物体状态对象
   * @param {Object} opts 物体属性
   * @returns {Object} 物体对象
   */
  createBody(opts = {}) {
    return {
      id: Helpers.uid(),
      mass: opts.mass || 1,
      position: opts.position || new Vec2(0, 0),
      velocity: opts.velocity || new Vec2(0, 0),
      acceleration: opts.acceleration || new Vec2(0, 0),
      force: opts.force || new Vec2(0, 0),
      color: opts.color || '#A8B5B0',
      radius: opts.radius || 6,           // 渲染半径（像素）
      trail: [],                           // 轨迹点缓存 [{x,y,alpha}]
      label: opts.label || '物体',
    };
  }

  /**
   * 向物体轨迹追加一个点（带残影 alpha）
   * @param {Object} body 物体
   * @param {number} maxPoints 最大轨迹点数
   */
  pushTrail(body, maxPoints = 2000) {
    body.trail.push({
      x: body.position.x,
      y: body.position.y,
      alpha: 1,
    });
    // 超出上限丢弃最旧点，保证性能
    if (body.trail.length > maxPoints) {
      body.trail.shift();
    }
  }

  /** 衰减所有物体轨迹点的 alpha（残影渐隐） */
  decayTrails(factor = 0.998) {
    for (const body of this.bodies) {
      for (const p of body.trail) {
        p.alpha *= factor;
      }
    }
  }
}

window.BaseModel = BaseModel;
