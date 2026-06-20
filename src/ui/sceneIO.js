/* ============================================================
 * 物绘流光 PhysFlux - 场景导入/导出管理器
 * 支持将整个模拟场景（模型类型、参数、自定义配置）导出为 JSON 文件，
 * 并可重新导入恢复模拟状态
 * ============================================================ */

import { Storage } from '../utils/storage.js';
import { Helpers } from '../utils/helpers.js';

export class SceneIO {
  /**
   * @param {PhysicsEngine} engine 物理引擎
   * @param {ControlsManager} controls 控件管理器
   * @param {CustomParamsManager} customParams 自定义参数管理器
   * @param {Function} onLoaded 场景载入后回调（loadModel）
   */
  constructor(engine, controls, customParams, onLoaded) {
    this.engine = engine;
    this.controls = controls;
    this.customParams = customParams;
    this.onLoaded = onLoaded;
    this._bindButtons();
  }

  _bindButtons() {
    const btnExport = document.getElementById('btnExportScene');
    const btnImport = document.getElementById('btnImportScene');
    const fileInput = document.getElementById('sceneFileInput');
    if (btnExport) btnExport.addEventListener('click', () => this.exportScene());
    if (btnImport) btnImport.addEventListener('click', () => fileInput && fileInput.click());
    if (fileInput) fileInput.addEventListener('change', (e) => this.importScene(e));
  }

  /** 导出当前场景为 JSON 文件 */
  exportScene() {
    const scene = {
      version: '2.0',
      app: 'PhysFlux',
      exportedAt: new Date().toISOString(),
      modelType: this.engine.currentType,
      params: this.controls.collectValues(),
      customGravity: Helpers.deepClone(this.engine.customGravity),
      airResistance: Helpers.deepClone(this.engine.airResistance),
      customObject: this.engine.customObject ? Helpers.deepClone(this.engine.customObject) : null,
    };

    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `physflux_scene_${this.engine.currentType}_${Date.now()}.json`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Helpers.toast('场景文件已导出');
  }

  /** 从 JSON 文件导入场景 */
  importScene(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scene = JSON.parse(e.target.result);
        if (!scene.modelType) {
          Helpers.toast('无效的场景文件');
          return;
        }
        // 载入模型与参数
        if (this.onLoaded) this.onLoaded(scene.modelType, scene.params);

        // 恢复自定义重力
        if (scene.customGravity && this.customParams) {
          this.customParams.config = Helpers.deepClone(scene.customGravity);
          this.customParams._syncUIFromConfig();
          if (this.customParams.config.enabled) this.customParams._applyConfig();
        }

        // 恢复空气阻力
        if (scene.airResistance) {
          this.engine.setAirResistance(scene.airResistance);
          if (this.customParams) {
            this.customParams.airConfig = Helpers.deepClone(scene.airResistance);
            const airEnable = document.getElementById('cpAirEnable');
            const airSlider = document.getElementById('cpAirSlider');
            const airInput = document.getElementById('cpAirInput');
            const airVal = document.getElementById('cpAirVal');
            if (airEnable) airEnable.checked = scene.airResistance.enabled;
            if (airSlider) airSlider.value = scene.airResistance.coefficient;
            if (airInput) airInput.value = scene.airResistance.coefficient;
            if (airVal) airVal.textContent = Helpers.fmt(scene.airResistance.coefficient, 2);
          }
        }

        // 恢复自定义物品
        if (scene.customObject) {
          this.engine.setCustomObject(scene.customObject);
        }

        Helpers.toast('场景已成功导入');
      } catch (err) {
        console.error('[PhysFlux] 导入场景失败:', err);
        Helpers.toast('导入失败：' + err.message);
      }
      // 重置 input 以便重复选择同一文件
      event.target.value = '';
    };
    reader.readAsText(file);
  }
}
