/* ============================================================
 * 物绘流光 PhysFlux - 方案管理器
 * 保存/载入/删除用户自定义参数方案（localStorage 持久化）
 * ============================================================ */

class PresetManager {
  /**
   * @param {PhysicsEngine} engine 物理引擎
   * @param {ControlsManager} controls 控件管理器
   * @param {Function} onLoaded 载入方案后回调
   */
  constructor(engine, controls, onLoaded) {
    this.engine = engine;
    this.controls = controls;
    this.onLoaded = onLoaded;
    this._bindButtons();
    this.refreshList();
  }

  _bindButtons() {
    document.getElementById('btnSavePreset').addEventListener('click', () => this.save());
    document.getElementById('btnLoadPreset').addEventListener('click', () => this.load());
    document.getElementById('btnDeletePreset').addEventListener('click', () => this.delete());
  }

  /** 保存当前参数为自定义方案 */
  save() {
    const name = prompt('请输入方案名称：', `${this.engine.currentType}_${Date.now()}`);
    if (!name) return;
    const data = {
      modelType: this.engine.currentType,
      params: this.controls.collectValues(),
      savedAt: new Date().toISOString(),
    };
    Storage.savePreset(name, data);
    this.refreshList();
    // 选中新保存的方案
    document.getElementById('presetSelect').value = name;
  }

  /** 载入选中方案 */
  load() {
    const select = document.getElementById('presetSelect');
    const name = select.value;
    if (!name) {
      alert('请先选择一个方案');
      return;
    }
    const presets = Storage.getPresets();
    const data = presets[name];
    if (!data) {
      alert('方案不存在');
      return;
    }
    if (this.onLoaded) this.onLoaded(data.modelType, data.params, name);
  }

  /** 删除选中方案 */
  delete() {
    const select = document.getElementById('presetSelect');
    const name = select.value;
    if (!name) {
      alert('请先选择一个方案');
      return;
    }
    if (!confirm(`确认删除方案「${name}」？`)) return;
    Storage.deletePreset(name);
    this.refreshList();
  }

  /** 刷新方案下拉列表 */
  refreshList() {
    const select = document.getElementById('presetSelect');
    const presets = Storage.getPresets();
    const names = Object.keys(presets).sort();
    select.innerHTML = '<option value="">— 选择已保存方案 —</option>';
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name}（${presets[name].modelType}）`;
      select.appendChild(opt);
    }
  }
}

window.PresetManager = PresetManager;
