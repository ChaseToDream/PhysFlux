/* ============================================================
 * 物绘流光 PhysFlux - 题库预设与默认参数
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export const Presets = {
  templates: {
    projectile: {
      '标准斜抛(45°)': { initialVelocity: 18, angle: 45, gravity: 9.8, mass: 1 },
      '最大射程演示': { initialVelocity: 25, angle: 45, gravity: 9.8, mass: 1 },
      '低角度平抛': { initialVelocity: 20, angle: 15, gravity: 9.8, mass: 1 },
      '月球重力(g=1.6)': { initialVelocity: 18, angle: 45, gravity: 1.6, mass: 1 },
    },
    freefall: {
      '标准自由落体': { radius: 30, gravity: 9.8, mass: 1, initialVelocity: 0 },
      '高空下落(50m)': { radius: 50, gravity: 9.8, mass: 1, initialVelocity: 0 },
      '带初速度下抛': { radius: 30, gravity: 9.8, mass: 1, initialVelocity: 8 },
    },
    circular: {
      '标准圆周': { initialVelocity: 8, radius: 12, mass: 1 },
      '高速小半径': { initialVelocity: 15, radius: 6, mass: 1 },
      '低速大半径': { initialVelocity: 4, radius: 20, mass: 1 },
    },
    gravity: {
      '近圆轨道': { mass: 1500, radius: 18, initialVelocity: 9, particleCount: 1 },
      '椭圆轨道': { mass: 1500, radius: 18, initialVelocity: 6, particleCount: 1 },
      '多卫星编队': { mass: 2000, radius: 20, initialVelocity: 10, particleCount: 3 },
    },
    collision: {
      '等质量弹性碰撞': { mass: 2, initialVelocity: 10, particleCount: 2, elasticity: 1 },
      '完全非弹性': { mass: 2, initialVelocity: 10, particleCount: 3, elasticity: 0 },
      '大撞小': { mass: 5, initialVelocity: 8, particleCount: 1, elasticity: 0.8 },
    },
    uniform: {
      '匀加速': { initialVelocity: 0, gravity: 3, friction: 0, mass: 2 },
      '匀减速(摩擦)': { initialVelocity: 15, gravity: 0, friction: 0.2, mass: 2 },
      '刹车过程': { initialVelocity: 20, gravity: -5, friction: 0.1, mass: 2 },
    },
  },

  listTemplates(modelType) {
    const t = this.templates[modelType];
    return t ? Object.keys(t) : [];
  },

  getTemplate(modelType, templateName) {
    const t = this.templates[modelType];
    return t && t[templateName] ? Helpers.deepClone(t[templateName]) : null;
  },

  getAllTemplates() {
    const all = [];
    for (const modelType in this.templates) {
      for (const name in this.templates[modelType]) {
        all.push({ modelType, name, params: Helpers.deepClone(this.templates[modelType][name]) });
      }
    }
    return all;
  },
};
