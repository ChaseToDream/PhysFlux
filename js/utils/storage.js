/* ============================================================
 * 物绘流光 PhysFlux - localStorage 存储封装
 * 用于持久化用户自定义参数方案与主题偏好
 * ============================================================ */

const Storage = {
  /** 存储键名前缀，避免与其他应用冲突 */
  PREFIX: 'physflux_',

  /**
   * 读取存储数据并 JSON 解析
   * @param {string} key 键名（不含前缀）
   * @param {*} fallback 解析失败时的默认值
   * @returns {*} 解析后的数据
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[PhysFlux] 读取存储失败:', key, e);
      return fallback;
    }
  },

  /**
   * 写入数据（自动 JSON 序列化）
   * @param {string} key 键名
   * @param {*} value 数据
   * @returns {boolean} 是否成功
   */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[PhysFlux] 写入存储失败:', key, e);
      return false;
    }
  },

  /**
   * 删除指定键
   * @param {string} key 键名
   */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* ---------- 业务封装 ---------- */

  /** 读取全部自定义方案 */
  getPresets() {
    return this.get('presets', {});
  },

  /** 保存单个自定义方案 */
  savePreset(name, data) {
    const presets = this.getPresets();
    presets[name] = data;
    this.set('presets', presets);
  },

  /** 删除自定义方案 */
  deletePreset(name) {
    const presets = this.getPresets();
    delete presets[name];
    this.set('presets', presets);
  },

  /** 读取主题偏好 */
  getTheme() {
    return this.get('theme', 'light');
  },

  /** 保存主题偏好 */
  setTheme(theme) {
    this.set('theme', theme);
  },
};

window.Storage = Storage;
