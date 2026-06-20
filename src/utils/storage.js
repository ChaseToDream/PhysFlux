/* ============================================================
 * 物绘流光 PhysFlux - localStorage 存储封装
 * 用于持久化用户自定义参数方案与主题偏好
 * ============================================================ */

export const Storage = {
  PREFIX: 'physflux_',

  /** 读取存储数据并 JSON 解析 */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[PhysFlux] 读取存储失败:', key, e);
      return fallback;
    }
  },

  /** 写入数据（自动 JSON 序列化） */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[PhysFlux] 写入存储失败:', key, e);
      return false;
    }
  },

  /** 删除指定键 */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* ---------- 业务封装 ---------- */

  getPresets() { return this.get('presets', {}); },
  savePreset(name, data) {
    const presets = this.getPresets();
    presets[name] = data;
    this.set('presets', presets);
  },
  deletePreset(name) {
    const presets = this.getPresets();
    delete presets[name];
    this.set('presets', presets);
  },

  getTheme() { return this.get('theme', 'light'); },
  setTheme(theme) { this.set('theme', theme); },

  /* ---------- 自定义物理参数方案 ---------- */
  getCustomParams() { return this.get('custom_params', {}); },
  saveCustomParams(name, data) {
    const all = this.getCustomParams();
    all[name] = data;
    this.set('custom_params', all);
  },
  deleteCustomParams(name) {
    const all = this.getCustomParams();
    delete all[name];
    this.set('custom_params', all);
  },
  getActiveCustomParams() { return this.get('active_custom_params', null); },
  setActiveCustomParams(data) { this.set('active_custom_params', data); },

  /* ---------- 自定义物品库 ---------- */
  getCustomObjects() { return this.get('custom_objects', {}); },
  saveCustomObject(name, data) {
    const all = this.getCustomObjects();
    all[name] = data;
    this.set('custom_objects', all);
  },
  deleteCustomObject(name) {
    const all = this.getCustomObjects();
    delete all[name];
    this.set('custom_objects', all);
  },

  /* ---------- 沙盒场景 ---------- */
  getSandboxScenes() { return this.get('sandbox_scenes', {}); },
  saveSandboxScene(name, data) {
    const all = this.getSandboxScenes();
    all[name] = data;
    this.set('sandbox_scenes', all);
  },
  deleteSandboxScene(name) {
    const all = this.getSandboxScenes();
    delete all[name];
    this.set('sandbox_scenes', all);
  },
};
