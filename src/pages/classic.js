/* ============================================================
 * 物绘流光 PhysFlux - 经典模型页面
 * 整合原有全部功能：模型选择、参数控制、播放、方案管理、
 * 自定义参数、物品库、实时数据、曲线图、能量图表
 * 新增：WebM 录制、场景导入/导出、能量可视化
 * ============================================================ */

import { PhysicsEngine } from '../physics/engine.js';
import { Vec2 } from '../physics/vector.js';
import { ProjectileModel } from '../physics/models/projectile.js';
import { FreeFallModel } from '../physics/models/freefall.js';
import { CircularModel } from '../physics/models/circular.js';
import { GravityModel } from '../physics/models/gravity.js';
import { CollisionModel } from '../physics/models/collision.js';
import { UniformModel } from '../physics/models/uniform.js';

import { CanvasRenderer } from '../render/canvas.js';
import { ChartRenderer } from '../render/charts.js';
import { EnergyChartRenderer } from '../render/energyChart.js';

import { ControlsManager } from '../ui/controls.js';
import { PlayerController } from '../ui/player.js';
import { PresetManager } from '../ui/presets.js';
import { CustomParamsManager } from '../ui/customParams.js';
import { ObjectLibraryManager } from '../ui/objectLibrary.js';
import { AnimationRecorder } from '../ui/recorder.js';
import { SceneIO } from '../ui/sceneIO.js';

import { Storage } from '../utils/storage.js';
import { Helpers } from '../utils/helpers.js';

export class ClassicPage {
  constructor() {
    this.engine = null;
    this.renderer = null;
    this.chartST = null;
    this.chartVT = null;
    this.chartEnergy = null;
    this.controls = null;
    this.player = null;
    this.presetMgr = null;
    this.customParamsMgr = null;
    this.objectLibMgr = null;
    this.recorder = null;
    this.sceneIO = null;
    this._dataLoopId = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 1. 注册物理模型
    this.engine = new PhysicsEngine();
    this.engine.register('projectile', ProjectileModel);
    this.engine.register('freefall', FreeFallModel);
    this.engine.register('circular', CircularModel);
    this.engine.register('gravity', GravityModel);
    this.engine.register('collision', CollisionModel);
    this.engine.register('uniform', UniformModel);

    // 2. 渲染器
    const canvas = document.getElementById('mainCanvas');
    this.renderer = new CanvasRenderer(canvas, this.engine);
    this.chartST = new ChartRenderer(document.getElementById('chartST'));
    this.chartVT = new ChartRenderer(document.getElementById('chartVT'));
    this.chartEnergy = new EnergyChartRenderer(document.getElementById('chartEnergy'));

    // 3. 控件
    this.controls = new ControlsManager(
      document.getElementById('paramControls'),
      this.engine,
      (params) => {
        this.engine.updateParams(params, true);
        this.renderer.render();
      }
    );

    this.player = new PlayerController(this.engine, this.renderer, {
      onReset: () => { this.chartST.clear(); this.chartVT.clear(); this.chartEnergy.clear(); },
      onClear: () => { this.chartST.clear(); this.chartVT.clear(); this.chartEnergy.clear(); },
    });

    this.presetMgr = new PresetManager(this.engine, this.controls, (modelType, params) => {
      this.loadModel(modelType, params);
    });

    this.customParamsMgr = new CustomParamsManager(this.engine, this.renderer, this.player);
    this.customParamsMgr.restoreFromStorage();

    this.objectLibMgr = new ObjectLibraryManager(this.engine, this.renderer, this.player);

    // 4. 新功能：录制器与场景IO
    this.recorder = new AnimationRecorder(this.renderer);
    this.sceneIO = new SceneIO(this.engine, this.controls, this.customParamsMgr, (modelType, params) => {
      this.loadModel(modelType, params);
    });

    // 5. 模型切换
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.addEventListener('change', () => {
      this.loadModel(modelSelect.value, null);
    });

    // 6. 悬浮数据卡片
    const hoverTip = document.getElementById('hoverTip');
    this.renderer.onHover = (info) => {
      if (!info) { hoverTip.hidden = true; return; }
      const { body, x, y, time } = info;
      const v = body.velocity.length();
      const s = body.position.length();
      const a = body.acceleration.length();
      const f = body.force.length();
      hoverTip.hidden = false;
      hoverTip.innerHTML =
        `<div class="tip-title">${body.label}</div>` +
        `时间 t = ${Helpers.fmt(time)} s<br>` +
        `位移 |s| = ${Helpers.fmt(s)} m<br>` +
        `速度 |v| = ${Helpers.fmt(v)} m/s<br>` +
        `加速度 |a| = ${Helpers.fmt(a)} m/s²<br>` +
        `合力 |F| = ${Helpers.fmt(f)} N`;
      const rect = canvas.getBoundingClientRect();
      let left = x + 14, top = y + 14;
      if (left + 160 > rect.width) left = x - 170;
      if (top + 100 > rect.height) top = y - 110;
      hoverTip.style.left = left + 'px';
      hoverTip.style.top = top + 'px';
    };

    // 7. 可折叠面板
    document.querySelectorAll('#page-classic .collapsible-header').forEach((header) => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('collapsed');
      });
    });

    // 8. 移动端面板切换
    const mobileToggle = document.getElementById('mobilePanelToggle');
    let mobilePanelTarget = 'left';
    mobileToggle.addEventListener('click', () => {
      const left = document.getElementById('leftPanel');
      const right = document.getElementById('rightPanel');
      if (mobilePanelTarget === 'left') {
        left.classList.toggle('show');
        right.classList.remove('show');
        mobilePanelTarget = 'right';
      } else {
        right.classList.toggle('show');
        left.classList.remove('show');
        mobilePanelTarget = 'left';
      }
    });

    // 9. 默认加载平抛运动
    this.loadModel('projectile', null);
    this.startDataLoop();
  }

  loadModel(modelType, params) {
    this.player.stop();
    const defaultParams = this.engine.buildDefaultParams(modelType);
    const finalParams = params ? Object.assign({}, defaultParams, params) : defaultParams;
    this.engine.loadModel(modelType, finalParams);
    this.controls.rebuild(modelType);
    this.controls.setValues(finalParams);
    this.chartST.clear();
    this.chartVT.clear();
    this.chartEnergy.clear();
    this.updateFormula();
    this.renderer.snapTransform();
    this.renderer.render();
    this.updateDataTable();
    this.updateBadge();
  }

  updateDataTable() {
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;
    const bodies = this.engine.getBodies();
    tableBody.innerHTML = '';
    for (const body of bodies) {
      const tr = document.createElement('tr');
      const s = body.position.length();
      const v = body.velocity.length();
      const a = body.acceleration.length();
      tr.innerHTML =
        `<td><span class="obj-dot" style="background:${body.color}"></span>${body.label}</td>` +
        `<td>${Helpers.fmt(s)}</td>` +
        `<td>${Helpers.fmt(v)}</td>` +
        `<td>${Helpers.fmt(a)}</td>`;
      tableBody.appendChild(tr);
    }
  }

  updateBadge() {
    const badge = document.getElementById('canvasBadge');
    if (badge) badge.textContent = `t = ${Helpers.fmt(this.engine.getElapsedTime())} s`;
  }

  updateFormula() {
    const formula = document.getElementById('formulaText');
    const explain = document.getElementById('explainText');
    if (formula) formula.textContent = this.engine.getFormula();
    if (explain) explain.textContent = this.engine.getExplanation();
  }

  startDataLoop() {
    const loop = () => {
      this.updateDataTable();
      this.updateBadge();
      const bodies = this.engine.getBodies();
      const time = this.engine.getElapsedTime();
      this.chartST.sample(bodies, time);
      this.chartVT.sample(bodies, time);
      this.chartEnergy.sample(this.engine, time);
      this.chartST.draw('s', Helpers.cssVar('--vector-velocity') || '#6B7B8C');
      this.chartVT.draw('v', Helpers.cssVar('--vector-force') || '#C9A88A');
      this.chartEnergy.draw();
      this._dataLoopId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopDataLoop() {
    if (this._dataLoopId) cancelAnimationFrame(this._dataLoopId);
    this._dataLoopId = null;
  }

  /** 页面激活时调用 */
  onShow() {
    if (!this._initialized) this.init();
    this.startDataLoop();
    setTimeout(() => this.renderer.resize(), 50);
  }

  /** 页面隐藏时调用 */
  onHide() {
    this.player.stop();
    this.stopDataLoop();
  }

  /** 主题切换后刷新 */
  refreshTheme() {
    if (this.renderer) {
      this.renderer.refreshTheme();
      this.renderer.render();
    }
  }
}
