/* ============================================================
 * 物绘流光 PhysFlux - 预设模拟物品库
 * 提供常见物理实验物品的预设参数（质量、半径、颜色、描述）
 * 用户可一键应用预设物品到当前模型，也可自定义新物品
 * ============================================================ */

const ObjectLibrary = {
  /**
   * 预设物品模板：按类别分组
   * 每个物品包含：name, category, mass, radius, color, description
   * mass 单位 kg，radius 为渲染半径（像素）
   */
  presets: {
    '球类': [
      {
        name: '篮球',
        mass: 0.6,
        radius: 8,
        color: '#C97A4A',
        description: '标准男子篮球，约 600g',
      },
      {
        name: '足球',
        mass: 0.43,
        radius: 9,
        color: '#8B9A94',
        description: '标准 5 号足球，约 430g',
      },
      {
        name: '网球',
        mass: 0.058,
        radius: 5,
        color: '#D4E574',
        description: '标准网球，约 58g',
      },
      {
        name: '乒乓球',
        mass: 0.0027,
        radius: 4,
        color: '#F0EDE5',
        description: '标准 40mm 乒乓球，约 2.7g',
      },
      {
        name: '保龄球',
        mass: 6.4,
        radius: 10,
        color: '#3E4A55',
        description: '标准保龄球，约 6.4kg',
      },
    ],
    '天体': [
      {
        name: '卫星',
        mass: 1,
        radius: 5,
        color: '#A8B5B0',
        description: '人造卫星（演示用）',
      },
      {
        name: '陨石',
        mass: 3,
        radius: 7,
        color: '#6B5A4A',
        description: '小型陨石，约 3kg',
      },
      {
        name: '空间站',
        mass: 5,
        radius: 9,
        color: '#D4A574',
        description: '大型空间站（演示用）',
      },
    ],
    '日常': [
      {
        name: '铁球',
        mass: 5,
        radius: 6,
        color: '#5A6A78',
        description: '实心铁球，约 5kg',
      },
      {
        name: '木球',
        mass: 0.5,
        radius: 7,
        color: '#B08D6A',
        description: '实木球，约 500g',
      },
      {
        name: '冰块',
        mass: 0.9,
        radius: 6,
        color: '#B5D4E5',
        description: '冰块，约 900g',
      },
      {
        name: '羽毛',
        mass: 0.01,
        radius: 8,
        color: '#E8E2D5',
        description: '羽毛，受空气阻力影响大',
      },
    ],
    '粒子': [
      {
        name: '质点A',
        mass: 1,
        radius: 5,
        color: '#A8B5B0',
        description: '理想质点，质量 1kg',
      },
      {
        name: '质点B',
        mass: 2,
        radius: 6,
        color: '#C9A88A',
        description: '理想质点，质量 2kg',
      },
      {
        name: '质点C',
        mass: 0.5,
        radius: 4,
        color: '#D4A574',
        description: '理想质点，质量 0.5kg',
      },
    ],
  },

  /**
   * 获取所有预设分类
   * @returns {string[]} 分类名数组
   */
  getCategories() {
    return Object.keys(this.presets);
  },

  /**
   * 获取指定分类的所有预设物品
   * @param {string} category 分类名
   * @returns {Array} 物品数组
   */
  getByCategory(category) {
    return this.presets[category] || [];
  },

  /**
   * 获取所有预设物品（含分类信息）
   * @returns {Array} [{ category, ...item }]
   */
  getAllPresets() {
    const all = [];
    for (const category in this.presets) {
      for (const item of this.presets[category]) {
        all.push({ ...Helpers.deepClone(item), category });
      }
    }
    return all;
  },

  /**
   * 按名称查找预设物品
   * @param {string} name 物品名
   * @returns {Object|null} 物品对象
   */
  findByName(name) {
    for (const category in this.presets) {
      const found = this.presets[category].find((item) => item.name === name);
      if (found) return Helpers.deepClone(found);
    }
    return null;
  },
};

window.ObjectLibrary = ObjectLibrary;
