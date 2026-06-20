/* ============================================================
 * 物绘流光 PhysFlux - 主入口
 * 职责：装配所有模块、事件总线、模型切换、主题、数据刷新
 * ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. 注册全部物理模型 ---------- */
  const engine = new PhysicsEngine();
  engine.register('projectile', ProjectileModel);
  engine.register('freefall', FreeFallModel);
  engine.register('circular', CircularModel);
  engine.register('gravity', GravityModel);
  engine.register('collision', CollisionModel);
  engine.register('uniform', UniformModel);

  /* ---------- 2. 初始化渲染器与控件 ---------- */
  const canvas = document.getElementById('mainCanvas');
  const renderer = new CanvasRenderer(canvas, engine);

  const chartST = new ChartRenderer(document.getElementById('chartST'));
  const chartVT = new ChartRenderer(document.getElementById('chartVT'));

  const controls = new ControlsManager(
    document.getElementById('paramControls'),
    engine,
    (params) => {
      // 参数变化：更新引擎并重置（保证从新初始条件开始）
      engine.updateParams(params, true);
      renderer.render();
    }
  );

  const player = new PlayerController(engine, renderer, {
    onStateChange: () => {},
    onReset: () => {
      chartST.clear();
      chartVT.clear();
    },
    onClear: () => {
      chartST.clear();
      chartVT.clear();
    },
  });

  const presetMgr = new PresetManager(engine, controls, (modelType, params, name) => {
    // 载入方案：切换模型并应用参数
    loadModel(modelType, params);
  });

  /* ---------- 3. 模型切换 ---------- */
  const modelSelect = document.getElementById('modelSelect');

  /**
   * 加载指定模型并应用参数
   * @param {string} modelType 模型类型
   * @param {Object|null} params 参数（为空则用默认）
   */
  function loadModel(modelType, params) {
    player.stop();
    const defaultParams = engine.buildDefaultParams(modelType);
    const finalParams = params ? Object.assign({}, defaultParams, params) : defaultParams;
    engine.loadModel(modelType, finalParams);
    controls.rebuild(modelType);
    controls.setValues(finalParams);
    chartST.clear();
    chartVT.clear();
    updateFormula();
    renderer.snapTransform();
    renderer.render();
    updateDataTable();
    updateBadge();
  }

  modelSelect.addEventListener('change', () => {
    loadModel(modelSelect.value, null);
  });

  /* ---------- 4. 主题切换 ---------- */
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    // 等待 CSS 变量更新后刷新画布主题色
    setTimeout(() => {
      renderer.refreshTheme();
      renderer.render();
    }, 50);
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  // 初始化主题（读取偏好）
  applyTheme(Storage.getTheme());

  /* ---------- 5. 悬浮数据卡片 ---------- */
  const hoverTip = document.getElementById('hoverTip');
  renderer.onHover = (info) => {
    if (!info) {
      hoverTip.hidden = true;
      return;
    }
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
    // 定位（避免溢出画布）
    const rect = canvas.getBoundingClientRect();
    let left = x + 14;
    let top = y + 14;
    if (left + 160 > rect.width) left = x - 170;
    if (top + 100 > rect.height) top = y - 110;
    hoverTip.style.left = left + 'px';
    hoverTip.style.top = top + 'px';
  };

  /* ---------- 6. 数据表格与曲线图刷新循环 ---------- */
  const tableBody = document.getElementById('dataTableBody');
  const badge = document.getElementById('canvasBadge');

  function updateDataTable() {
    const bodies = engine.getBodies();
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

  function updateBadge() {
    badge.textContent = `t = ${Helpers.fmt(engine.getElapsedTime())} s`;
  }

  function updateFormula() {
    document.getElementById('formulaText').textContent = engine.getFormula();
    document.getElementById('explainText').textContent = engine.getExplanation();
  }

  /** 数据刷新循环：独立于物理步进，每帧更新表格/曲线/徽标 */
  function dataLoop() {
    updateDataTable();
    updateBadge();
    const bodies = engine.getBodies();
    const time = engine.getElapsedTime();
    chartST.sample(bodies, time);
    chartVT.sample(bodies, time);
    chartST.draw('s', Helpers.cssVar('--vector-velocity') || '#6B7B8C');
    chartVT.draw('v', Helpers.cssVar('--vector-force') || '#C9A88A');
    requestAnimationFrame(dataLoop);
  }

  /* ---------- 7. 移动端面板切换 ---------- */
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

  /* ---------- 8. 启动 ---------- */
  // 默认加载平抛运动
  loadModel('projectile', null);
  // 启动数据刷新循环
  dataLoop();

  // 暴露调试接口（可选）
  window.PhysFlux = { engine, renderer, controls, player, presetMgr };
})();
