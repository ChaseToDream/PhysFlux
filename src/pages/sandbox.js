/* ============================================================
 * 物绘流光 PhysFlux - 自由沙盒页面
 * 用户可在自定义画布上自由摆放多个物体，设置独立参数，
 * 模拟多物体碰撞、万有引力相互作用、边界反弹等
 * ============================================================ */

import { PhysicsEngine } from '../physics/engine.js';
import { SandboxModel } from '../physics/models/sandbox.js';
import { Vec2 } from '../physics/vector.js';
import { CanvasRenderer } from '../render/canvas.js';
import { EnergyChartRenderer } from '../render/energyChart.js';
import { AnimationRecorder } from '../ui/recorder.js';
import { Storage } from '../utils/storage.js';
import { Helpers } from '../utils/helpers.js';

export class SandboxPage {
  constructor() {
    this.engine = null;
    this.model = null;
    this.renderer = null;
    this.chartEnergy = null;
    this.recorder = null;
    this.selectedBody = null;
    this.dragging = null;
    this.dragOffset = null;
    this.playing = false;
    this._dataLoopId = null;
    this._initialized = false;
    /** 默认新物体属性 */
    this.defaultProps = { mass: 1, radius: 8, color: '#A8B5B0', vx: 0, vy: 0 };
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 构建沙盒页面 HTML
    this._buildHTML();

    // 初始化引擎与沙盒模型
    this.engine = new PhysicsEngine();
    this.engine.register('sandbox', SandboxModel);
    this.engine.loadModel('sandbox', { gravity: 9.8, boundary: 1 });
    this.model = this.engine.currentModel;
    // 沙盒默认配置
    this.model.interactionGravity = false;
    this.model.interactionCollision = true;
    this.model.boundaryBounce = true;
    this.model.elasticity = 0.85;

    // 渲染器
    const canvas = document.getElementById('sandboxCanvas');
    this.renderer = new CanvasRenderer(canvas, this.engine);
    this.renderer.showEnergyOverlay = true;
    // 沙盒中固定视角，不自动跟随
    this.renderer._updateTransform = () => {
      const { w, h } = this.renderer.transform;
      this.renderer.transform.originX = w / 2;
      this.renderer.transform.originY = h / 2;
      this.renderer.transform.scale = 8;
    };

    // 能量图表
    this.chartEnergy = new EnergyChartRenderer(document.getElementById('sandboxChartEnergy'));

    // 录制器
    this.recorder = new AnimationRecorder(this.renderer, {
      buttonId: 'sbRecord',
      indicatorId: 'sandboxRecIndicator',
      timeId: 'sandboxRecTime',
    });

    // 绑定事件
    this._bindEvents();

    // 添加几个示例物体
    this._addDemoBodies();

    // 启动数据循环
    this.startDataLoop();
  }

  _buildHTML() {
    const container = document.getElementById('page-sandbox');
    container.innerHTML = `
      <aside class="panel panel-left sandbox-left">
        <div class="panel-section">
          <h2 class="panel-title">操作工具</h2>
          <div class="sandbox-tools">
            <button id="sbPlay" class="btn btn-primary">▶ 播放</button>
            <button id="sbReset" class="btn">↺ 重置</button>
            <button id="sbClear" class="btn">✕ 清空</button>
            <button id="sbRecord" class="btn">● 录制</button>
            <button id="sbExportPng" class="btn">⤓ 截图</button>
          </div>
          <div class="param-hint" style="margin-top:8px;">
            点击画布添加物体 · 拖拽移动物体 · 点击选中
          </div>
        </div>

        <div class="panel-section">
          <h2 class="panel-title">全局物理设置</h2>
          <div class="param-item">
            <div class="param-label">
              <span class="param-name">重力加速度</span>
              <span class="param-value font-mono" id="sbGravityVal">9.80 m/s²</span>
            </div>
            <div class="param-input-row">
              <input type="range" class="param-slider" id="sbGravitySlider" min="0" max="20" step="0.1" value="9.8" />
              <input type="number" class="num-input" id="sbGravityInput" min="0" max="20" step="0.1" value="9.8" />
            </div>
          </div>

          <div class="param-item">
            <div class="param-label">
              <span class="param-name">恢复系数</span>
              <span class="param-value font-mono" id="sbElasticityVal">0.85</span>
            </div>
            <div class="param-input-row">
              <input type="range" class="param-slider" id="sbElasticitySlider" min="0" max="1" step="0.05" value="0.85" />
              <input type="number" class="num-input" id="sbElasticityInput" min="0" max="1" step="0.05" value="0.85" />
            </div>
          </div>

          <div class="param-item">
            <div class="param-label">
              <span class="param-name">空气阻力系数</span>
              <span class="param-value font-mono" id="sbAirVal">0.00</span>
            </div>
            <div class="param-input-row">
              <input type="range" class="param-slider" id="sbAirSlider" min="0" max="1" step="0.01" value="0" />
              <input type="number" class="num-input" id="sbAirInput" min="0" max="1" step="0.01" value="0" />
            </div>
          </div>

          <div class="param-item">
            <label class="toggle-switch">
              <input type="checkbox" id="sbCollision" checked />
              <span class="toggle-slider"></span>
              <span class="toggle-label">物体间碰撞</span>
            </label>
          </div>
          <div class="param-item">
            <label class="toggle-switch">
              <input type="checkbox" id="sbGravityInteraction" />
              <span class="toggle-slider"></span>
              <span class="toggle-label">物体间万有引力</span>
            </label>
          </div>
          <div class="param-item">
            <label class="toggle-switch">
              <input type="checkbox" id="sbBoundary" checked />
              <span class="toggle-slider"></span>
              <span class="toggle-label">边界反弹</span>
            </label>
          </div>
        </div>

        <div class="panel-section">
          <h2 class="panel-title">场景管理</h2>
          <div class="preset-controls">
            <button id="sbSaveScene" class="btn btn-outline">保存场景</button>
            <select id="sbSceneSelect" class="select-input mt-2">
              <option value="">— 选择已保存场景 —</option>
            </select>
            <button id="sbLoadScene" class="btn btn-outline mt-2">载入场景</button>
            <button id="sbDeleteScene" class="btn btn-ghost mt-2">删除场景</button>
            <hr class="divider" />
            <button id="sbExportScene" class="btn btn-outline">导出场景文件</button>
            <button id="sbImportScene" class="btn btn-outline">导入场景文件</button>
            <input type="file" id="sbSceneFile" accept=".json" hidden />
          </div>
        </div>
      </aside>

      <section class="canvas-wrap">
        <canvas id="sandboxCanvas" class="main-canvas"></canvas>
        <div class="canvas-badge font-mono" id="sandboxBadge">t = 0.00 s · 0 个物体</div>
        <div id="sandboxRecIndicator" class="record-indicator" hidden>
          <span class="rec-dot"></span>录制中 <span id="sandboxRecTime">00:00</span>
        </div>
      </section>

      <aside class="panel panel-right sandbox-right">
        <div class="panel-section">
          <h2 class="panel-title">物体属性</h2>
          <div id="sbPropPanel" class="sb-prop-panel">
            <div class="empty-hint">点击画布添加物体，或选中物体编辑属性</div>
          </div>
        </div>

        <div class="panel-section">
          <h2 class="panel-title">物体列表</h2>
          <div id="sbBodyList" class="sb-body-list"></div>
        </div>

        <div class="panel-section">
          <h2 class="panel-title">能量变化</h2>
          <canvas id="sandboxChartEnergy" class="mini-chart"></canvas>
        </div>
      </aside>
    `;
  }

  _bindEvents() {
    const canvas = document.getElementById('sandboxCanvas');

    // 播放控制
    document.getElementById('sbPlay').addEventListener('click', () => this.togglePlay());
    document.getElementById('sbReset').addEventListener('click', () => this.reset());
    document.getElementById('sbClear').addEventListener('click', () => this.clearAll());
    document.getElementById('sbExportPng').addEventListener('click', () => this.renderer.exportImage());

    // 全局设置
    this._linkInputs('sbGravitySlider', 'sbGravityInput', (val) => {
      this.engine.customGravity = { enabled: val > 0, magnitude: val, angleDeg: 270 };
      document.getElementById('sbGravityVal').textContent = Helpers.fmt(val, 2) + ' m/s²';
    });
    this._linkInputs('sbElasticitySlider', 'sbElasticityInput', (val) => {
      this.model.elasticity = val;
      document.getElementById('sbElasticityVal').textContent = Helpers.fmt(val, 2);
    });
    this._linkInputs('sbAirSlider', 'sbAirInput', (val) => {
      this.engine.airResistance = { enabled: val > 0, coefficient: val };
      document.getElementById('sbAirVal').textContent = Helpers.fmt(val, 2);
    });

    document.getElementById('sbCollision').addEventListener('change', (e) => {
      this.model.interactionCollision = e.target.checked;
    });
    document.getElementById('sbGravityInteraction').addEventListener('change', (e) => {
      this.model.interactionGravity = e.target.checked;
    });
    document.getElementById('sbBoundary').addEventListener('change', (e) => {
      this.model.boundaryBounce = e.target.checked;
    });

    // 场景管理
    document.getElementById('sbSaveScene').addEventListener('click', () => this._saveScene());
    document.getElementById('sbLoadScene').addEventListener('click', () => this._loadScene());
    document.getElementById('sbDeleteScene').addEventListener('click', () => this._deleteScene());
    document.getElementById('sbExportScene').addEventListener('click', () => this._exportSceneFile());
    document.getElementById('sbImportScene').addEventListener('click', () => {
      document.getElementById('sbSceneFile').click();
    });
    document.getElementById('sbSceneFile').addEventListener('change', (e) => this._importSceneFile(e));
    this._refreshSceneList();

    // 画布交互
    let mouseDownPos = null;
    let isDragging = false;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const physX = this.renderer.toPhysicsX(px);
      const physY = this.renderer.toPhysicsY(py);

      // 查找点击的物体
      const body = this._findBodyAt(physX, physY);
      if (body) {
        this.selectBody(body);
        this.dragging = body;
        this.dragOffset = new Vec2(physX - body.position.x, physY - body.position.y);
        this.stopPlay();
      } else {
        mouseDownPos = { px, py, physX, physY };
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const physX = this.renderer.toPhysicsX(px);
      const physY = this.renderer.toPhysicsY(py);
      this.dragging.position = new Vec2(physX - this.dragOffset.x, physY - this.dragOffset.y);
      this.dragging.velocity = new Vec2(0, 0);
      this.renderer.render();
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.dragging) {
        this.dragging = null;
        this.dragOffset = null;
        return;
      }
      if (mouseDownPos) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        // 判断是否为点击（移动距离小）
        const dist = Math.sqrt((px - mouseDownPos.px) ** 2 + (py - mouseDownPos.py) ** 2);
        if (dist < 5) {
          // 添加新物体
          this.addBody(mouseDownPos.physX, mouseDownPos.physY);
        }
        mouseDownPos = null;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.dragging = null;
      mouseDownPos = null;
    });

    // 键盘删除（仅在沙盒页面激活时响应）
    document.addEventListener('keydown', (e) => {
      if (!this._isActive()) return;
      if (this.selectedBody && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
          this.removeBody(this.selectedBody.id);
          e.preventDefault();
        }
      }
    });
  }

  /** 检查沙盒页面是否当前激活 */
  _isActive() {
    const page = document.getElementById('page-sandbox');
    return page && page.classList.contains('page-active');
  }

  _linkInputs(sliderId, inputId, callback) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    const update = (rawVal, source) => {
      let val = parseFloat(rawVal);
      if (isNaN(val)) return;
      val = Helpers.clamp(val, parseFloat(slider.min), parseFloat(slider.max));
      if (source !== 'slider') slider.value = val;
      if (source !== 'input') input.value = val;
      callback(val);
    };
    slider.addEventListener('input', () => update(slider.value, 'slider'));
    input.addEventListener('input', () => update(input.value, 'input'));
  }

  /** 查找指定物理坐标处的物体 */
  _findBodyAt(physX, physY) {
    const bodies = this.engine.getBodies();
    for (let i = bodies.length - 1; i >= 0; i--) {
      const body = bodies[i];
      const dist = Math.sqrt((body.position.x - physX) ** 2 + (body.position.y - physY) ** 2);
      // 像素半径转换为物理半径
      const physR = body.radius / this.renderer.transform.scale;
      if (dist <= physR + 0.5) return body;
    }
    return null;
  }

  /** 添加一个新物体 */
  addBody(x, y, opts = {}) {
    const props = Object.assign({}, this.defaultProps, opts);
    const body = this.model.addBody({
      mass: props.mass,
      radius: props.radius,
      color: props.color,
      position: new Vec2(x, y),
      velocity: new Vec2(props.vx, props.vy),
      label: props.label || `物体${this.engine.getBodies().length + 1}`,
    });
    this.selectBody(body);
    this.renderer.render();
    this._updateBodyList();
    this._updateBadge();
    return body;
  }

  /** 移除物体 */
  removeBody(id) {
    this.model.removeBody(id);
    if (this.selectedBody && this.selectedBody.id === id) {
      this.selectedBody = null;
      this.renderer.selectedId = null;
      this._renderPropPanel();
    }
    this.renderer.render();
    this._updateBodyList();
    this._updateBadge();
  }

  /** 选中物体 */
  selectBody(body) {
    this.selectedBody = body;
    this.renderer.selectedId = body ? body.id : null;
    this._renderPropPanel();
    this._updateBodyList();
    this.renderer.render();
  }

  /** 渲染物体属性编辑面板 */
  _renderPropPanel() {
    const panel = document.getElementById('sbPropPanel');
    if (!this.selectedBody) {
      panel.innerHTML = '<div class="empty-hint">点击画布添加物体，或选中物体编辑属性</div>';
      return;
    }
    const b = this.selectedBody;
    panel.innerHTML = `
      <div class="sb-prop-header">
        <span class="sb-prop-name">${b.label}</span>
        <button id="sbDeleteBody" class="btn btn-ghost btn-sm">删除</button>
      </div>
      <div class="param-item">
        <div class="param-label">
          <span class="param-name">质量 (kg)</span>
          <span class="param-value font-mono" id="sbMassVal">${Helpers.fmt(b.mass)}</span>
        </div>
        <div class="param-input-row">
          <input type="range" class="param-slider" id="sbMassSlider" min="0.1" max="20" step="0.1" value="${b.mass}" />
          <input type="number" class="num-input" id="sbMassInput" min="0.1" max="20" step="0.1" value="${b.mass}" />
        </div>
      </div>
      <div class="param-item">
        <div class="param-label">
          <span class="param-name">半径 (px)</span>
          <span class="param-value font-mono" id="sbRadiusVal">${b.radius}</span>
        </div>
        <div class="param-input-row">
          <input type="range" class="param-slider" id="sbRadiusSlider" min="3" max="25" step="1" value="${b.radius}" />
          <input type="number" class="num-input" id="sbRadiusInput" min="3" max="25" step="1" value="${b.radius}" />
        </div>
      </div>
      <div class="param-item">
        <div class="param-label">
          <span class="param-name">初速度 X</span>
          <span class="param-value font-mono" id="sbVxVal">${Helpers.fmt(b.velocity.x)}</span>
        </div>
        <div class="param-input-row">
          <input type="range" class="param-slider" id="sbVxSlider" min="-20" max="20" step="0.5" value="${b.velocity.x}" />
          <input type="number" class="num-input" id="sbVxInput" min="-20" max="20" step="0.5" value="${b.velocity.x}" />
        </div>
      </div>
      <div class="param-item">
        <div class="param-label">
          <span class="param-name">初速度 Y</span>
          <span class="param-value font-mono" id="sbVyVal">${Helpers.fmt(b.velocity.y)}</span>
        </div>
        <div class="param-input-row">
          <input type="range" class="param-slider" id="sbVySlider" min="-20" max="20" step="0.5" value="${b.velocity.y}" />
          <input type="number" class="num-input" id="sbVyInput" min="-20" max="20" step="0.5" value="${b.velocity.y}" />
        </div>
      </div>
      <div class="param-item">
        <div class="param-label"><span class="param-name">颜色</span></div>
        <div class="color-picker-row">
          <input type="color" id="sbColor" class="color-input" value="${b.color}" />
          <div class="color-presets">
            <button class="color-preset" style="background:#A8B5B0" data-color="#A8B5B0"></button>
            <button class="color-preset" style="background:#C9A88A" data-color="#C9A88A"></button>
            <button class="color-preset" style="background:#D4A574" data-color="#D4A574"></button>
            <button class="color-preset" style="background:#6B7B8C" data-color="#6B7B8C"></button>
            <button class="color-preset" style="background:#C97A6A" data-color="#C97A6A"></button>
            <button class="color-preset" style="background:#8B9A4A" data-color="#8B9A4A"></button>
          </div>
        </div>
      </div>
      <div class="param-item">
        <div class="param-label"><span class="param-name">名称</span></div>
        <input type="text" id="sbLabel" class="text-input" value="${b.label}" maxlength="20" />
      </div>
    `;

    // 绑定属性编辑事件
    document.getElementById('sbDeleteBody').addEventListener('click', () => {
      this.removeBody(b.id);
    });

    this._linkInputs('sbMassSlider', 'sbMassInput', (val) => {
      b.mass = val;
      document.getElementById('sbMassVal').textContent = Helpers.fmt(val);
      this._updateBodyList();
    });
    this._linkInputs('sbRadiusSlider', 'sbRadiusInput', (val) => {
      b.radius = val;
      b.collisionRadius = Math.max(0.3, val * 0.06);
      document.getElementById('sbRadiusVal').textContent = val;
      this.renderer.render();
    });
    this._linkInputs('sbVxSlider', 'sbVxInput', (val) => {
      b.velocity.x = val;
      document.getElementById('sbVxVal').textContent = Helpers.fmt(val);
    });
    this._linkInputs('sbVySlider', 'sbVyInput', (val) => {
      b.velocity.y = val;
      document.getElementById('sbVyVal').textContent = Helpers.fmt(val);
    });

    document.getElementById('sbColor').addEventListener('input', (e) => {
      b.color = e.target.value;
      this.renderer.render();
      this._updateBodyList();
    });
    document.querySelectorAll('#sbPropPanel .color-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        b.color = btn.dataset.color;
        document.getElementById('sbColor').value = b.color;
        this.renderer.render();
        this._updateBodyList();
      });
    });
    document.getElementById('sbLabel').addEventListener('input', (e) => {
      b.label = e.target.value;
      this._updateBodyList();
    });
  }

  /** 更新物体列表 */
  _updateBodyList() {
    const list = document.getElementById('sbBodyList');
    const bodies = this.engine.getBodies();
    if (bodies.length === 0) {
      list.innerHTML = '<div class="empty-hint">暂无物体，点击画布添加</div>';
      return;
    }
    list.innerHTML = bodies.map((b) => `
      <div class="obj-custom-item ${this.selectedBody && this.selectedBody.id === b.id ? 'active' : ''}" data-id="${b.id}">
        <div class="obj-custom-icon" style="background:${b.color}"></div>
        <div class="obj-custom-info">
          <div class="obj-custom-name">${b.label}</div>
          <div class="obj-custom-meta font-mono">${Helpers.fmt(b.mass)}kg · r${b.radius}</div>
        </div>
        <div class="obj-custom-actions">
          <button class="icon-action delete" title="删除">✕</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.obj-custom-item').forEach((item) => {
      const id = parseInt(item.dataset.id);
      item.addEventListener('click', () => {
        const body = this.engine.getBodies().find((b) => b.id === id);
        if (body) this.selectBody(body);
      });
      item.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeBody(id);
      });
    });
  }

  /** 添加示例物体 */
  _addDemoBodies() {
    this.addBody(-10, 5, { mass: 2, radius: 10, color: '#A8B5B0', vx: 8, vy: 0, label: '物体A' });
    this.addBody(10, 5, { mass: 3, radius: 12, color: '#C9A88A', vx: -5, vy: 0, label: '物体B' });
    this.addBody(0, 15, { mass: 1, radius: 7, color: '#D4A574', vx: 0, vy: 0, label: '物体C' });
    this.selectBody(null);
  }

  togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      this.renderer.start();
    } else {
      this.renderer.stop();
    }
    const btn = document.getElementById('sbPlay');
    btn.textContent = this.playing ? '❚❚ 暂停' : '▶ 播放';
  }

  stopPlay() {
    if (this.playing) this.togglePlay();
  }

  reset() {
    this.stopPlay();
    this.model.elapsedTime = 0;
    for (const body of this.engine.getBodies()) body.trail = [];
    this.renderer.render();
    this.chartEnergy.clear();
  }

  clearAll() {
    this.stopPlay();
    this.model.clearBodies();
    this.selectedBody = null;
    this.renderer.selectedId = null;
    this.renderer.render();
    this._renderPropPanel();
    this._updateBodyList();
    this._updateBadge();
    this.chartEnergy.clear();
  }

  _updateBadge() {
    const badge = document.getElementById('sandboxBadge');
    if (badge) {
      const count = this.engine.getBodies().length;
      badge.textContent = `t = ${Helpers.fmt(this.engine.getElapsedTime())} s · ${count} 个物体`;
    }
  }

  startDataLoop() {
    const loop = () => {
      this._updateBadge();
      const time = this.engine.getElapsedTime();
      this.chartEnergy.sample(this.engine, time);
      this.chartEnergy.draw();
      this._dataLoopId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopDataLoop() {
    if (this._dataLoopId) cancelAnimationFrame(this._dataLoopId);
    this._dataLoopId = null;
  }

  /* ---------- 场景管理 ---------- */

  _serializeScene() {
    return {
      version: '2.0',
      app: 'PhysFlux',
      type: 'sandbox',
      exportedAt: new Date().toISOString(),
      bodies: this.engine.getBodies().map((b) => ({
        mass: b.mass,
        radius: b.radius,
        color: b.color,
        label: b.label,
        position: { x: b.position.x, y: b.position.y },
        velocity: { x: b.velocity.x, y: b.velocity.y },
      })),
      settings: {
        gravity: this.engine.customGravity.magnitude,
        elasticity: this.model.elasticity,
        airResistance: this.engine.airResistance.coefficient,
        collision: this.model.interactionCollision,
        gravityInteraction: this.model.interactionGravity,
        boundary: this.model.boundaryBounce,
      },
    };
  }

  _loadSceneData(scene) {
    this.clearAll();
    // 恢复设置
    if (scene.settings) {
      const s = scene.settings;
      this.engine.customGravity = { enabled: s.gravity > 0, magnitude: s.gravity, angleDeg: 270 };
      this.model.elasticity = s.elasticity;
      this.engine.airResistance = { enabled: s.airResistance > 0, coefficient: s.airResistance };
      this.model.interactionCollision = s.collision;
      this.model.interactionGravity = s.gravityInteraction;
      this.model.boundaryBounce = s.boundary;
      // 同步 UI
      document.getElementById('sbGravitySlider').value = s.gravity;
      document.getElementById('sbGravityInput').value = s.gravity;
      document.getElementById('sbGravityVal').textContent = Helpers.fmt(s.gravity, 2) + ' m/s²';
      document.getElementById('sbElasticitySlider').value = s.elasticity;
      document.getElementById('sbElasticityInput').value = s.elasticity;
      document.getElementById('sbElasticityVal').textContent = Helpers.fmt(s.elasticity, 2);
      document.getElementById('sbAirSlider').value = s.airResistance;
      document.getElementById('sbAirInput').value = s.airResistance;
      document.getElementById('sbAirVal').textContent = Helpers.fmt(s.airResistance, 2);
      document.getElementById('sbCollision').checked = s.collision;
      document.getElementById('sbGravityInteraction').checked = s.gravityInteraction;
      document.getElementById('sbBoundary').checked = s.boundary;
    }
    // 恢复物体
    if (scene.bodies) {
      for (const b of scene.bodies) {
        this.model.addBody({
          mass: b.mass,
          radius: b.radius,
          color: b.color,
          label: b.label,
          position: new Vec2(b.position.x, b.position.y),
          velocity: new Vec2(b.velocity.x, b.velocity.y),
        });
      }
    }
    this.renderer.render();
    this._updateBodyList();
    this._updateBadge();
  }

  _saveScene() {
    const name = prompt('请输入场景名称：', `沙盒场景_${Date.now()}`);
    if (!name) return;
    Storage.saveSandboxScene(name, this._serializeScene());
    this._refreshSceneList();
    document.getElementById('sbSceneSelect').value = name;
    Helpers.toast('场景已保存');
  }

  _loadScene() {
    const name = document.getElementById('sbSceneSelect').value;
    if (!name) { alert('请先选择一个场景'); return; }
    const all = Storage.getSandboxScenes();
    if (!all[name]) { alert('场景不存在'); return; }
    this._loadSceneData(all[name]);
    Helpers.toast('场景已载入');
  }

  _deleteScene() {
    const name = document.getElementById('sbSceneSelect').value;
    if (!name) { alert('请先选择一个场景'); return; }
    if (!confirm(`确认删除场景「${name}」？`)) return;
    Storage.deleteSandboxScene(name);
    this._refreshSceneList();
  }

  _refreshSceneList() {
    const select = document.getElementById('sbSceneSelect');
    const all = Storage.getSandboxScenes();
    const names = Object.keys(all).sort();
    select.innerHTML = '<option value="">— 选择已保存场景 —</option>';
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
  }

  _exportSceneFile() {
    const scene = this._serializeScene();
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `physflux_sandbox_${Date.now()}.json`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Helpers.toast('场景文件已导出');
  }

  _importSceneFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scene = JSON.parse(e.target.result);
        if (scene.type !== 'sandbox') {
          Helpers.toast('无效的沙盒场景文件');
          return;
        }
        this._loadSceneData(scene);
        Helpers.toast('场景已成功导入');
      } catch (err) {
        Helpers.toast('导入失败：' + err.message);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  onShow() {
    if (!this._initialized) this.init();
    this.startDataLoop();
    setTimeout(() => this.renderer.resize(), 50);
  }

  onHide() {
    this.stopPlay();
    this.stopDataLoop();
  }

  refreshTheme() {
    if (this.renderer) {
      this.renderer.refreshTheme();
      this.renderer.render();
    }
  }
}
