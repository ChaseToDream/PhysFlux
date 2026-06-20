/* ============================================================
 * 物绘流光 PhysFlux - 物理引擎核心
 * 职责：模型注册、模型调度、时间步进、状态查询
 * 与渲染层解耦：仅负责物理状态计算，不关心如何绘制
 * 增强：空气阻力配置、能量查询接口
 * ============================================================ */

import { Vec2 } from './vector.js';
import { Helpers } from '../utils/helpers.js';

export class PhysicsEngine {
  constructor() {
    this.registry = {};
    this.currentModel = null;
    this.currentType = null;
    this.params = {};
    this.timeScale = 1.0;
    this.fixedDt = 1 / 60;
    /** 自定义重力配置 */
    this.customGravity = { enabled: false, magnitude: 9.8, angleDeg: 270 };
    /** 自定义物品属性 */
    this.customObject = null;
    /** 空气阻力配置（新增） */
    this.airResistance = { enabled: false, coefficient: 0.05 };
    /**
     * 数值积分方法：'euler'（半隐式欧拉，默认）| 'rk4'（四阶龙格-库塔，适合轨道/引力系统）
     * 由各模型在 step 中自行选择使用；不支持的模型回退到 euler。
     */
    this.integrator = 'euler';
  }

  /* ---------- 模型注册 ---------- */

  register(type, modelClass) {
    this.registry[type] = { class: modelClass, label: modelClass.label || type };
  }

  listModels() {
    const list = [];
    for (const type in this.registry) {
      list.push({ type, label: this.registry[type].label });
    }
    return list;
  }

  getParamSchema(type) {
    const entry = this.registry[type];
    return entry ? entry.class.paramSchema : [];
  }

  /* ---------- 模型调度 ---------- */

  loadModel(type, params) {
    const entry = this.registry[type];
    if (!entry) {
      console.warn('[PhysFlux] 未知模型类型:', type);
      return;
    }
    this.currentType = type;
    this.params = params || this.buildDefaultParams(type);
    this.currentModel = new entry.class(this.params, this);
    this.currentModel.initialize();
    this._applyCustomObject();
  }

  _applyCustomObject() {
    if (!this.currentModel || !this.customObject) return;
    const obj = this.customObject;
    for (const body of this.currentModel.bodies) {
      if (obj.mass !== undefined) body.mass = obj.mass;
      if (obj.radius !== undefined) body.radius = obj.radius;
      if (obj.color !== undefined) body.color = obj.color;
    }
  }

  setCustomObject(obj) {
    this.customObject = obj;
    this._applyCustomObject();
  }

  getCustomGravityVector() {
    if (!this.customGravity.enabled) return null;
    const { magnitude, angleDeg } = this.customGravity;
    const rad = Helpers.degToRad(angleDeg);
    return new Vec2(magnitude * Math.cos(rad), magnitude * Math.sin(rad));
  }

  setCustomGravity(config) {
    this.customGravity = Object.assign({}, this.customGravity, config);
    if (this.currentModel) {
      this.currentModel.initialize();
      this._applyCustomObject();
    }
  }

  /** 设置空气阻力配置（新增） */
  setAirResistance(config) {
    this.airResistance = Object.assign({}, this.airResistance, config);
  }

  /** 设置数值积分方法（'euler' | 'rk4'），不重置当前模拟状态 */
  setIntegrator(name) {
    if (name === 'euler' || name === 'rk4') this.integrator = name;
  }

  buildDefaultParams(type) {
    const schema = this.getParamSchema(type);
    const params = {};
    for (const item of schema) params[item.key] = item.default;
    return params;
  }

  updateParams(newParams, reinit = true) {
    this.params = Object.assign({}, this.params, newParams);
    if (this.currentModel) {
      this.currentModel.params = this.params;
      if (reinit) this.currentModel.initialize();
    }
  }

  /* ---------- 时间步进 ---------- */

  step(dt) {
    if (!this.currentModel) return;
    const scaledDt = dt * this.timeScale;
    const steps = Math.max(1, Math.ceil(scaledDt / this.fixedDt));
    const subDt = scaledDt / steps;
    for (let i = 0; i < steps; i++) {
      this.currentModel.step(subDt);
      if (this.currentModel.isFinished()) break;
    }
    this.currentModel.decayTrails(scaledDt);
  }

  singleStep() {
    if (!this.currentModel) return;
    const dt = this.fixedDt * this.timeScale;
    this.currentModel.step(dt);
    this.currentModel.decayTrails(dt);
  }

  reset() {
    if (this.currentModel) this.currentModel.initialize();
  }

  /* ---------- 状态查询 ---------- */

  getBodies() { return this.currentModel ? this.currentModel.bodies : []; }
  getElapsedTime() { return this.currentModel ? this.currentModel.elapsedTime : 0; }
  getFormula() { return this.currentModel ? this.currentModel.getFormula() : ''; }
  getExplanation() { return this.currentModel ? this.currentModel.getExplanation() : ''; }
  isFinished() { return this.currentModel ? this.currentModel.isFinished() : false; }

  /* ---------- 能量查询（新增，供能量可视化使用） ---------- */
  getKineticEnergy() { return this.currentModel ? this.currentModel.getKineticEnergy() : 0; }
  getPotentialEnergy() { return this.currentModel ? this.currentModel.getPotentialEnergy() : 0; }
  getTotalEnergy() { return this.currentModel ? this.currentModel.getTotalEnergy() : 0; }
}
