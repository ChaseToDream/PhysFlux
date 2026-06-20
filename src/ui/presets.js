/* ============================================================
 * 物绘流光 PhysFlux - 方案管理器
 * ============================================================ */

import { Storage } from '../utils/storage.js';
import { showPrompt, showConfirm, showAlert } from '../utils/dialog.js';

export class PresetManager {
  constructor(engine, controls, onLoaded) {
    this.engine = engine;
    this.controls = controls;
    this.onLoaded = onLoaded;
    this._bindButtons();
    this.refreshList();
  }

  _bindButtons() {
    const save = document.getElementById('btnSavePreset');
    const load = document.getElementById('btnLoadPreset');
    const del = document.getElementById('btnDeletePreset');
    if (save) save.addEventListener('click', () => this.save());
    if (load) load.addEventListener('click', () => this.load());
    if (del) del.addEventListener('click', () => this.delete());
  }

  async save() {
    const name = await showPrompt('保存方案', `${this.engine.currentType}_${Date.now()}`, '请输入方案名称：');
    if (!name) return;
    const data = {
      modelType: this.engine.currentType,
      params: this.controls.collectValues(),
      savedAt: new Date().toISOString(),
    };
    Storage.savePreset(name, data);
    this.refreshList();
    document.getElementById('presetSelect').value = name;
  }

  async load() {
    const select = document.getElementById('presetSelect');
    const name = select.value;
    if (!name) { await showAlert('提示', '请先选择一个方案'); return; }
    const presets = Storage.getPresets();
    const data = presets[name];
    if (!data) { await showAlert('提示', '方案不存在'); return; }
    if (this.onLoaded) this.onLoaded(data.modelType, data.params, name);
  }

  async delete() {
    const select = document.getElementById('presetSelect');
    const name = select.value;
    if (!name) { await showAlert('提示', '请先选择一个方案'); return; }
    const ok = await showConfirm('删除方案', `确认删除方案「${name}」？`, '删除');
    if (!ok) return;
    Storage.deletePreset(name);
    this.refreshList();
  }

  refreshList() {
    const select = document.getElementById('presetSelect');
    if (!select) return;
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
