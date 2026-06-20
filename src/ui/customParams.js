/* ============================================================
 * 物绘流光 PhysFlux - 自定义物理参数管理器
 * 提供：自定义重力、空气阻力、能量叠加显示、多方案保存
 * ============================================================ */

import { Storage } from '../utils/storage.js';
import { Helpers } from '../utils/helpers.js';
import { showPrompt, showConfirm, showAlert } from '../utils/dialog.js';

export class CustomParamsManager {
  constructor(engine, renderer, player) {
    this.engine = engine;
    this.renderer = renderer;
    this.player = player;

    this.environments = [
      { name: '地球', magnitude: 9.8, angleDeg: 270, icon: '🌍' },
      { name: '月球', magnitude: 1.6, angleDeg: 270, icon: '🌙' },
      { name: '火星', magnitude: 3.7, angleDeg: 270, icon: '🔴' },
      { name: '木星', magnitude: 24.8, angleDeg: 270, icon: '🪐' },
      { name: '失重', magnitude: 0, angleDeg: 270, icon: '✦' },
    ];

    this.config = { enabled: false, magnitude: 9.8, angleDeg: 270 };
    this.airConfig = { enabled: false, coefficient: 0.05 };

    this._buildUI();
    this._bindEvents();
    this._refreshSchemeList();
  }

  _buildUI() {
    const container = document.getElementById('customParamsPanel');
    if (!container) return;
    container.innerHTML = `
      <div class="custom-params-section">
        <div class="custom-param-toggle">
          <label class="toggle-switch">
            <input type="checkbox" id="cpEnable" />
            <span class="toggle-slider"></span>
            <span class="toggle-label">启用自定义重力</span>
          </label>
        </div>

        <div class="env-presets" id="envPresets">
          ${this.environments.map((env) => `
            <button class="env-btn" data-mag="${env.magnitude}" data-angle="${env.angleDeg}" title="${env.name}：g=${env.magnitude} m/s²">
              <span class="env-icon">${env.icon}</span>
              <span class="env-name">${env.name}</span>
            </button>
          `).join('')}
        </div>

        <div class="custom-param-item">
          <div class="param-label">
            <span class="param-name">重力大小</span>
            <span class="param-value font-mono" id="cpMagVal">9.80 m/s²</span>
          </div>
          <div class="param-input-row">
            <input type="range" class="param-slider" id="cpMagSlider" min="0" max="30" step="0.1" value="9.8" />
            <input type="number" class="num-input" id="cpMagInput" min="0" max="30" step="0.1" value="9.8" />
          </div>
          <div class="param-hint">范围：0 ~ 30 m/s²</div>
        </div>

        <div class="custom-param-item">
          <div class="param-label">
            <span class="param-name">重力方向</span>
            <span class="param-value font-mono" id="cpAngVal">270° (↓)</span>
          </div>
          <div class="direction-selector" id="cpDirSelector">
            <div class="direction-dial">
              <div class="direction-arrow" id="cpDirArrow"></div>
              <div class="direction-center"></div>
            </div>
            <div class="direction-controls">
              <input type="range" class="param-slider" id="cpAngSlider" min="0" max="359" step="1" value="270" />
              <input type="number" class="num-input" id="cpAngInput" min="0" max="359" step="1" value="270" />
            </div>
          </div>
          <div class="direction-presets">
            <button class="dir-btn" data-angle="270" title="向下">↓</button>
            <button class="dir-btn" data-angle="0" title="向右">→</button>
            <button class="dir-btn" data-angle="90" title="向上">↑</button>
            <button class="dir-btn" data-angle="180" title="向左">←</button>
          </div>
        </div>

        <!-- 空气阻力配置（新增） -->
        <div class="custom-param-item air-section">
          <div class="custom-param-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="cpAirEnable" />
              <span class="toggle-slider"></span>
              <span class="toggle-label">启用空气阻力</span>
            </label>
          </div>
          <div class="param-label">
            <span class="param-name">阻力系数 k</span>
            <span class="param-value font-mono" id="cpAirVal">0.05</span>
          </div>
          <div class="param-input-row">
            <input type="range" class="param-slider" id="cpAirSlider" min="0" max="1" step="0.01" value="0.05" />
            <input type="number" class="num-input" id="cpAirInput" min="0" max="1" step="0.01" value="0.05" />
          </div>
          <div class="param-hint">线性阻力模型 a = -k·v</div>
        </div>

        <!-- 能量叠加显示（新增） -->
        <div class="custom-param-item">
          <label class="toggle-switch">
            <input type="checkbox" id="cpEnergyOverlay" />
            <span class="toggle-slider"></span>
            <span class="toggle-label">画布显示能量信息</span>
          </label>
        </div>

        <!-- 数值积分方法（轨道/引力系统精度选项） -->
        <div class="custom-param-item">
          <div class="param-label">
            <span class="param-name">数值积分方法</span>
            <span class="param-hint" style="font-size:11px;">RK4 适合长时轨道，精度更高</span>
          </div>
          <select id="cpIntegrator" class="select-input">
            <option value="euler">半隐式欧拉（默认）</option>
            <option value="rk4">四阶龙格-库塔 RK4</option>
          </select>
        </div>

        <div class="custom-scheme-section">
          <div class="scheme-controls">
            <button id="cpSaveScheme" class="btn btn-outline btn-sm">保存方案</button>
            <button id="cpDeleteScheme" class="btn btn-ghost btn-sm">删除</button>
          </div>
          <select id="cpSchemeSelect" class="select-input mt-2">
            <option value="">— 选择已保存方案 —</option>
          </select>
          <button id="cpLoadScheme" class="btn btn-outline btn-sm mt-2">载入方案</button>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    document.getElementById('cpEnable').addEventListener('change', (e) => {
      this.config.enabled = e.target.checked;
      this._applyConfig();
      this._updateUIState();
    });

    document.querySelectorAll('#envPresets .env-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mag = parseFloat(btn.dataset.mag);
        const angle = parseFloat(btn.dataset.angle);
        this._setMagnitude(mag);
        this._setAngle(angle);
        if (!this.config.enabled) {
          this.config.enabled = true;
          document.getElementById('cpEnable').checked = true;
          this._updateUIState();
        }
        this._applyConfig();
      });
    });

    this._linkInputs(document.getElementById('cpMagSlider'), document.getElementById('cpMagInput'), (val) => {
      this._setMagnitude(val); this._applyConfig();
    });
    this._linkInputs(document.getElementById('cpAngSlider'), document.getElementById('cpAngInput'), (val) => {
      this._setAngle(val); this._applyConfig();
    });

    document.querySelectorAll('.dir-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._setAngle(parseFloat(btn.dataset.angle));
        this._applyConfig();
      });
    });

    // 空气阻力
    document.getElementById('cpAirEnable').addEventListener('change', (e) => {
      this.airConfig.enabled = e.target.checked;
      this._applyAirConfig();
    });
    this._linkInputs(document.getElementById('cpAirSlider'), document.getElementById('cpAirInput'), (val) => {
      this.airConfig.coefficient = Helpers.clamp(val, 0, 1);
      document.getElementById('cpAirVal').textContent = Helpers.fmt(this.airConfig.coefficient, 2);
      this._applyAirConfig();
    });

    // 能量叠加
    document.getElementById('cpEnergyOverlay').addEventListener('change', (e) => {
      this.renderer.showEnergyOverlay = e.target.checked;
      this.renderer.render();
    });

    // 数值积分方法
    const integratorSel = document.getElementById('cpIntegrator');
    integratorSel.addEventListener('change', (e) => {
      this.engine.setIntegrator(e.target.value);
      Storage.setIntegrator(e.target.value);
    });

    document.getElementById('cpSaveScheme').addEventListener('click', () => this._saveScheme());
    document.getElementById('cpLoadScheme').addEventListener('click', () => this._loadScheme());
    document.getElementById('cpDeleteScheme').addEventListener('click', () => this._deleteScheme());
  }

  _linkInputs(slider, input, callback) {
    const update = (rawVal, source) => {
      let val = parseFloat(rawVal);
      if (isNaN(val)) { input.classList.add('invalid'); return; }
      val = Helpers.clamp(val, parseFloat(slider.min), parseFloat(slider.max));
      input.classList.remove('invalid');
      if (source !== 'slider') slider.value = val;
      if (source !== 'input') input.value = val;
      callback(val);
    };
    slider.addEventListener('input', () => update(slider.value, 'slider'));
    input.addEventListener('input', () => update(input.value, 'input'));
    input.addEventListener('blur', () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) { val = parseFloat(slider.value); input.value = val; input.classList.remove('invalid'); }
    });
  }

  _setMagnitude(val) {
    this.config.magnitude = Helpers.clamp(val, 0, 30);
    document.getElementById('cpMagVal').textContent = Helpers.fmt(this.config.magnitude, 2) + ' m/s²';
  }

  _setAngle(val) {
    this.config.angleDeg = Math.round(Helpers.clamp(val, 0, 359));
    document.getElementById('cpAngVal').textContent = this.config.angleDeg + '° (' + this._angleToDirection(this.config.angleDeg) + ')';
    const arrow = document.getElementById('cpDirArrow');
    if (arrow) arrow.style.transform = `rotate(${this.config.angleDeg - 270}deg)`;
  }

  _angleToDirection(deg) {
    const dirs = { 0: '→', 90: '↑', 180: '←', 270: '↓' };
    if (dirs[deg]) return dirs[deg];
    const sectors = [
      { range: [338, 360], text: '→' }, { range: [0, 23], text: '→' },
      { range: [23, 68], text: '↗' }, { range: [68, 113], text: '↑' },
      { range: [113, 158], text: '↖' }, { range: [158, 203], text: '←' },
      { range: [203, 248], text: '↙' }, { range: [248, 293], text: '↓' },
      { range: [293, 338], text: '↘' },
    ];
    for (const s of sectors) {
      if (deg >= s.range[0] && deg < s.range[1]) return s.text;
    }
    return '↓';
  }

  _applyConfig() {
    this.engine.setCustomGravity(this.config);
    Storage.setActiveCustomParams(this.config);
    if (this.player) this.player.stop();
    if (this.renderer) { this.renderer.snapTransform(); this.renderer.render(); }
  }

  _applyAirConfig() {
    this.engine.setAirResistance(this.airConfig);
    if (this.renderer) this.renderer.render();
  }

  _updateUIState() {
    const inputs = document.querySelectorAll('#customParamsPanel input:not(#cpEnable):not(#cpAirEnable):not(#cpEnergyOverlay), #customParamsPanel button:not(#cpEnable)');
    const envBtns = document.querySelectorAll('#envPresets .env-btn');
    const disabled = !this.config.enabled;
    inputs.forEach((el) => { el.disabled = disabled; });
    envBtns.forEach((el) => { el.disabled = disabled; });
    document.getElementById('customParamsPanel').classList.toggle('disabled-state', disabled);
  }

  async _saveScheme() {
    const name = await showPrompt('保存方案', `自定义参数_${Date.now()}`, '请输入方案名称：');
    if (!name) return;
    const data = {
      config: Helpers.deepClone(this.config),
      airConfig: Helpers.deepClone(this.airConfig),
      savedAt: new Date().toISOString(),
    };
    Storage.saveCustomParams(name, data);
    this._refreshSchemeList();
    document.getElementById('cpSchemeSelect').value = name;
  }

  async _loadScheme() {
    const select = document.getElementById('cpSchemeSelect');
    const name = select.value;
    if (!name) { await showAlert('提示', '请先选择一个方案'); return; }
    const all = Storage.getCustomParams();
    const data = all[name];
    if (!data) { await showAlert('提示', '方案不存在'); return; }
    this.config = Helpers.deepClone(data.config);
    if (data.airConfig) this.airConfig = Helpers.deepClone(data.airConfig);
    this._syncUIFromConfig();
    this._applyConfig();
    this._applyAirConfig();
  }

  async _deleteScheme() {
    const select = document.getElementById('cpSchemeSelect');
    const name = select.value;
    if (!name) { await showAlert('提示', '请先选择一个方案'); return; }
    const ok = await showConfirm('删除方案', `确认删除方案「${name}」？`, '删除');
    if (!ok) return;
    Storage.deleteCustomParams(name);
    this._refreshSchemeList();
  }

  _refreshSchemeList() {
    const select = document.getElementById('cpSchemeSelect');
    const all = Storage.getCustomParams();
    const names = Object.keys(all).sort();
    select.innerHTML = '<option value="">— 选择已保存方案 —</option>';
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      const cfg = all[name].config;
      opt.textContent = `${name}（g=${cfg.magnitude}, ${cfg.angleDeg}°）`;
      select.appendChild(opt);
    }
  }

  _syncUIFromConfig() {
    document.getElementById('cpEnable').checked = this.config.enabled;
    document.getElementById('cpMagSlider').value = this.config.magnitude;
    document.getElementById('cpMagInput').value = this.config.magnitude;
    document.getElementById('cpAngSlider').value = this.config.angleDeg;
    document.getElementById('cpAngInput').value = this.config.angleDeg;
    document.getElementById('cpAirEnable').checked = this.airConfig.enabled;
    document.getElementById('cpAirSlider').value = this.airConfig.coefficient;
    document.getElementById('cpAirInput').value = this.airConfig.coefficient;
    document.getElementById('cpAirVal').textContent = Helpers.fmt(this.airConfig.coefficient, 2);
    this._setMagnitude(this.config.magnitude);
    this._setAngle(this.config.angleDeg);
    this._updateUIState();
  }

  restoreFromStorage() {
    const saved = Storage.getActiveCustomParams();
    if (saved) {
      this.config = Helpers.deepClone(saved);
      this._syncUIFromConfig();
      if (this.config.enabled) this._applyConfig();
    }
    // 恢复数值积分方法偏好
    const integrator = Storage.getIntegrator();
    this.engine.setIntegrator(integrator);
    const sel = document.getElementById('cpIntegrator');
    if (sel) sel.value = integrator;
  }
}
