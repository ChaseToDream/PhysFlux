/* ============================================================
 * 物绘流光 PhysFlux - 物理引擎核心
 * 职责：模型注册、模型调度、时间步进、状态查询
 * 与渲染层解耦：仅负责物理状态计算，不关心如何绘制
 * ============================================================ */

class PhysicsEngine {
  constructor() {
    /** 模型注册表：{ type: { class, label } } */
    this.registry = {};
    /** 当前激活的模型实例 */
    this.currentModel = null;
    /** 当前模型类型 */
    this.currentType = null;
    /** 当前参数 */
    this.params = {};
    /** 时间倍率（影响模拟速度） */
    this.timeScale = 1.0;
    /** 固定物理步长（秒），保证积分稳定 */
    this.fixedDt = 1 / 60;
  }

  /* ---------- 模型注册 ---------- */

  /**
   * 注册一个物理模型
   * @param {string} type 模型类型键
   * @param {Function} modelClass 模型类（继承自 BaseModel）
   */
  register(type, modelClass) {
    this.registry[type] = {
      class: modelClass,
      label: modelClass.label || type,
    };
  }

  /** 获取所有已注册模型的类型与名称（供下拉选择） */
  listModels() {
    const list = [];
    for (const type in this.registry) {
      list.push({ type, label: this.registry[type].label });
    }
    return list;
  }

  /** 获取指定模型的参数 schema */
  getParamSchema(type) {
    const entry = this.registry[type];
    return entry ? entry.class.paramSchema : [];
  }

  /* ---------- 模型调度 ---------- */

  /**
   * 切换当前模型并初始化
   * @param {string} type 模型类型
   * @param {Object} params 参数对象
   */
  loadModel(type, params) {
    const entry = this.registry[type];
    if (!entry) {
      console.warn('[PhysFlux] 未知模型类型:', type);
      return;
    }
    this.currentType = type;
    this.params = params || this.buildDefaultParams(type);
    this.currentModel = new entry.class(this.params);
    this.currentModel.initialize();
  }

  /**
   * 根据参数 schema 构建默认参数
   * @param {string} type 模型类型
   * @returns {Object} 默认参数对象
   */
  buildDefaultParams(type) {
    const schema = this.getParamSchema(type);
    const params = {};
    for (const item of schema) {
      params[item.key] = item.default;
    }
    return params;
  }

  /**
   * 更新参数（不重建模型，仅刷新当前模型参数）
   * @param {Object} newParams 新参数
   * @param {boolean} reinit 是否重新初始化物体状态
   */
  updateParams(newParams, reinit = true) {
    this.params = Object.assign({}, this.params, newParams);
    if (this.currentModel) {
      this.currentModel.params = this.params;
      if (reinit) {
        this.currentModel.initialize();
      }
    }
  }

  /* ---------- 时间步进 ---------- */

  /**
   * 推进一步物理计算
   * @param {number} dt 实际帧间隔（秒），内部按 timeScale 缩放
   */
  step(dt) {
    if (!this.currentModel) return;
    const scaledDt = dt * this.timeScale;
    // 子步进：当帧间隔过大时拆分为固定步长，提升数值稳定性
    const steps = Math.max(1, Math.ceil(scaledDt / this.fixedDt));
    const subDt = scaledDt / steps;
    for (let i = 0; i < steps; i++) {
      this.currentModel.step(subDt);
      if (this.currentModel.isFinished()) break;
    }
    // 轨迹残影衰减
    this.currentModel.decayTrails(0.997);
  }

  /** 单步推演（固定一个时间步） */
  singleStep() {
    if (!this.currentModel) return;
    this.currentModel.step(this.fixedDt * this.timeScale);
    this.currentModel.decayTrails(0.997);
  }

  /** 重置当前模型到初始状态 */
  reset() {
    if (this.currentModel) {
      this.currentModel.initialize();
    }
  }

  /* ---------- 状态查询 ---------- */

  /** 获取所有物体当前状态（供渲染层使用） */
  getBodies() {
    return this.currentModel ? this.currentModel.bodies : [];
  }

  /** 获取累计模拟时间 */
  getElapsedTime() {
    return this.currentModel ? this.currentModel.elapsedTime : 0;
  }

  /** 获取当前模型公式 */
  getFormula() {
    return this.currentModel ? this.currentModel.getFormula() : '';
  }

  /** 获取当前题型解析 */
  getExplanation() {
    return this.currentModel ? this.currentModel.getExplanation() : '';
  }

  /** 是否已结束 */
  isFinished() {
    return this.currentModel ? this.currentModel.isFinished() : false;
  }
}

window.PhysicsEngine = PhysicsEngine;
