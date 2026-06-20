/* ============================================================
 * 物绘流光 PhysFlux - 自定义物理参数管理器
 * 提供独立的自定义重力参数配置界面，支持：
 * - 重力大小与方向配置
 * - 预设环境一键切换（地球/月球/火星/失重）
 * - 参数验证机制
 * - 多方案保存与加载
 * ============================================================ */

class CustomParamsManager {
  /**
   * @param {PhysicsEngine} engine 物理引擎
   * @param {CanvasRenderer} renderer 渲染器
   * @param {PlayerController} player 播放控制器
   */
  constructor(engine, renderer, player) {
    this.engine = engine;
    this.renderer = renderer;
    this.player = player;

    /** 预设环境配置 */
    this.environments = [
      { name: '地球', magnitude: 9.8, angleDeg: 270, icon: '🌍' },
      { name: '月球', magnitude: 1.6, angleDeg: 270, icon: '🌙' },
      { name: '火星', magnitude: 3.7, angleDeg: 270, icon: '🔴' },
      { name: '木星', magnitude: 24.8, angleDeg: 270, icon: '🪐' },
      { name: '失重', magnitude: 0, angleDeg: 270, icon: '✦' },
    ];

    /** 当前配置 */
    this.config = {
      enabled: false,
      magnitude: 9.8,
      angleDeg: 270,
    };

    this._buildUI();
    this._bindEvents();
    this._refreshSchemeList();
  }

  /* ---------- UI 构建 ---------- */

  _buildUI() {
    const container = document.getElementById('customParamsPanel');
    if (!container) return;
    container.innerHTML = `
      <div class="custom-params-section">
        <!-- 启用开关 -->
        <div class="custom-param-toggle">
          <label class="toggle-switch">
            <input type="checkbox" id="cpEnable" />
            <span class="toggle-slider"></span>
            <span class="toggle-label">启用自定义重力</span>
          </label>
        </div>

        <!-- 环境预设按钮 -->
        <div class="env-presets" id="envPresets">
          ${this.environments.map((env) => `
            <button class="env-btn" data-mag="${env.magnitude}" data-angle="${env.angleDeg}" title="${env.name}：g=${env.magnitude} m/s²">
              <span class="env-icon">${env.icon}</span>
              <span class="env-name">${env.name}</span>
            </button>
          `).join('')}
        </div>

        <!-- 重力大小 -->
        <div class="custom-param-item">
          <div class="param-label">
            <span class="param-name">重力大小</span>
            <span class="param-value font-mono" id="cpMagVal">9.80 m/s²</span>
          </div>
          <div class="param-input-row">
            <input type="range" class="param-slider" id="cpMagSlider"
                   min="0" max="30" step="0.1" value="9.8" />
            <input type="number" class="num-input" id="cpMagInput"
                   min="0" max="30" step="0.1" value="9.8" />
          </div>
          <div class="param-hint">范围：0 ~ 30 m/s²</div>
        </div>

        <!-- 重力方向 -->
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
              <input type="range" class="param-slider" id="cpAngSlider"
                     min="0" max="359" step="1" value="270" />
              <input type="number" class="num-input" id="cpAngInput"
                     min="0" max="359" step="1" value="270" />
            </div>
          </div>
          <div class="direction-presets">
            <button class="dir-btn" data-angle="270" title="向下">↓</button>
            <button class="dir-btn" data-angle="0" title="向右">→</button>
            <button class="dir-btn" data-angle="90" title="向上">↑</button>
            <button class="dir-btn" data-angle="180" title="向左">←</button>
          </div>
        </div>

        <!-- 方案管理 -->
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

  /* ---------- 事件绑定 ---------- */

  _bindEvents() {
    // 启用开关
    document.getElementById('cpEnable').addEventListener('change', (e) => {
      this.config.enabled = e.target.checked;
      this._applyConfig();
      this._updateUIState();
    });

    // 环境预设按钮
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

    // 重力大小控件
    const magSlider = document.getElementById('cpMagSlider');
    const magInput = document.getElementById('cpMagInput');
    this._linkInputs(magSlider, magInput, (val) => {
      this._setMagnitude(val);
      this._applyConfig();
    });

    // 重力方向控件
    const angSlider = document.getElementById('cpAngSlider');
    const angInput = document.getElementById('cpAngInput');
    this._linkInputs(angSlider, angInput, (val) => {
      this._setAngle(val);
      this._applyConfig();
    });

    // 方向预设按钮
    document.querySelectorAll('.dir-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const angle = parseFloat(btn.dataset.angle);
        this._setAngle(angle);
        this._applyConfig();
      });
    });

    // 方案管理
    document.getElementById('cpSaveScheme').addEventListener('click', () => this._saveScheme());
    document.getElementById('cpLoadScheme').addEventListener('click', () => this._loadScheme());
    document.getElementById('cpDeleteScheme').addEventListener('click', () => this._deleteScheme());
  }

  /**
   * 关联滑块与数字输入框，双向同步
   */
  _linkInputs(slider, input, callback) {
    const update = (rawVal, source) => {
      let val = parseFloat(rawVal);
      if (isNaN(val)) {
        input.classList.add('invalid');
        return;
      }
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
      if (isNaN(val)) {
        val = parseFloat(slider.value);
        input.value = val;
        input.classList.remove('invalid');
      }
    });
  }

  /* ---------- 配置更新 ---------- */

  /** 设置重力大小并更新显示 */
  _setMagnitude(val) {
    this.config.magnitude = Helpers.clamp(val, 0, 30);
    document.getElementById('cpMagVal').textContent = Helpers.fmt(this.config.magnitude, 2) + ' m/s²';
  }

  /** 设置重力方向并更新显示 */
  _setAngle(val) {
    this.config.angleDeg = Math.round(Helpers.clamp(val, 0, 359));
    const dirText = this._angleToDirection(this.config.angleDeg);
    document.getElementById('cpAngVal').textContent = this.config.angleDeg + '° (' + dirText + ')';
    // 旋转方向指示箭头
    const arrow = document.getElementById('cpDirArrow');
    if (arrow) {
      arrow.style.transform = `rotate(${this.config.angleDeg - 270}deg)`;
    }
  }

  /** 角度转方向文字 */
  _angleToDirection(deg) {
    const dirs = {
      0: '→', 90: '↑', 180: '←', 270: '↓',
    };
    if (dirs[deg]) return dirs[deg];
    // 8 方位
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

  /** 应用配置到引擎 */
  _applyConfig() {
    this.engine.setCustomGravity(this.config);
    Storage.setActiveCustomParams(this.config);
    if (this.player) this.player.stop();
    if (this.renderer) {
      this.renderer.snapTransform();
      this.renderer.render();
    }
  }

  /** 更新 UI 启用/禁用状态 */
  _updateUIState() {
    const inputs = document.querySelectorAll('#customParamsPanel input:not(#cpEnable), #customParamsPanel button:not(#cpEnable)');
    const envBtns = document.querySelectorAll('#envPresets .env-btn');
    const disabled = !this.config.enabled;
    inputs.forEach((el) => { el.disabled = disabled; });
    envBtns.forEach((el) => { el.disabled = disabled; });
    document.getElementById('customParamsPanel').classList.toggle('disabled-state', disabled);
  }

  /* ---------- 方案管理 ---------- */

  _saveScheme() {
    const name = prompt('请输入方案名称：', `自定义重力_${Date.now()}`);
    if (!name) return;
    const data = {
      config: Helpers.deepClone(this.config),
      savedAt: new Date().toISOString(),
    };
    Storage.saveCustomParams(name, data);
    this._refreshSchemeList();
    document.getElementById('cpSchemeSelect').value = name;
  }

  _loadScheme() {
    const select = document.getElementById('cpSchemeSelect');
    const name = select.value;
    if (!name) {
      alert('请先选择一个方案');
      return;
    }
    const all = Storage.getCustomParams();
    const data = all[name];
    if (!data) {
      alert('方案不存在');
      return;
    }
    this.config = Helpers.deepClone(data.config);
    this._syncUIFromConfig();
    this._applyConfig();
  }

  _deleteScheme() {
    const select = document.getElementById('cpSchemeSelect');
    const name = select.value;
    if (!name) {
      alert('请先选择一个方案');
      return;
    }
    if (!confirm(`确认删除方案「${name}」？`)) return;
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

  /** 从配置同步到 UI 控件 */
  _syncUIFromConfig() {
    document.getElementById('cpEnable').checked = this.config.enabled;
    document.getElementById('cpMagSlider').value = this.config.magnitude;
    document.getElementById('cpMagInput').value = this.config.magnitude;
    document.getElementById('cpAngSlider').value = this.config.angleDeg;
    document.getElementById('cpAngInput').value = this.config.angleDeg;
    this._setMagnitude(this.config.magnitude);
    this._setAngle(this.config.angleDeg);
    this._updateUIState();
  }

  /** 从存储恢复上次配置 */
  restoreFromStorage() {
    const saved = Storage.getActiveCustomParams();
    if (saved) {
      this.config = Helpers.deepClone(saved);
      this._syncUIFromConfig();
      if (this.config.enabled) {
        this._applyConfig();
      }
    }
  }
}

window.CustomParamsManager = CustomParamsManager;
