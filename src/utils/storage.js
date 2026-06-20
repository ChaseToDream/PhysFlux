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

  /** 写入数据（自动 JSON 序列化），配额满时返回 false */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('[PhysFlux] 存储配额已满，写入失败:', key);
      } else {
        console.warn('[PhysFlux] 写入存储失败:', key, e);
      }
      return false;
    }
  },

  /** 删除指定键 */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* ---------- 存储版本与迁移 ---------- */

  /** 当前存储 schema 版本，schema 变更时递增 */
  SCHEMA_VERSION: 2,

  getVersion() { return this.get('schema_version', 0); },
  setVersion(v) { this.set('schema_version', v); },

  /**
   * 版本迁移：当存储版本低于 SCHEMA_VERSION 时执行。
   * 当前 v0→v2：首次打版本号，旧版数据结构兼容，保留用户创作内容。
   * 未来 schema 变更在此追加迁移逻辑（清理废弃键、重组结构等）。
   * @returns {boolean} 是否执行了迁移
   */
  migrate() {
    const current = this.getVersion();
    if (current >= this.SCHEMA_VERSION) return false;
    this.setVersion(this.SCHEMA_VERSION);
    return true;
  },

  /* ---------- 配额检测 ---------- */

  /**
   * 估算 localStorage 配额使用情况（依赖 StorageManager API，部分浏览器不可用）
   * @returns {Promise<{usage:number,quota:number,remaining:number}|null>}
   */
  async estimateUsage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        return { usage, quota, remaining: quota ? Math.max(0, quota - usage) : 0 };
      }
    } catch {
      /* 忽略，回退到 set 的 try/catch 兜底 */
    }
    return null;
  },

  /**
   * 预检是否有足够配额写入指定字节数
   * @returns {Promise<boolean>} true 表示可写或无法判定（放行由 set 兜底）
   */
  async hasQuota(bytesNeeded = 0) {
    const est = await this.estimateUsage();
    if (!est || !est.quota) return true;
    return est.remaining >= bytesNeeded;
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

  /* ---------- 数值积分方法偏好 ---------- */
  getIntegrator() { return this.get('integrator', 'euler'); },
  setIntegrator(name) { this.set('integrator', name); },

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
