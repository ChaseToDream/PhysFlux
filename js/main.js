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

  /* ---------- 3. 自定义物理参数管理器 ---------- */
  const customParamsMgr = new CustomParamsManager(engine, renderer, player);
  customParamsMgr.restoreFromStorage();

  /* ---------- 4. 模拟物品库管理器 ---------- */
  const objectLibMgr = new ObjectLibraryManager(engine, renderer, player);

  /* ---------- 5. 模型切换 ---------- */
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

  /* ---------- 6. 主题切换 ---------- */
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

  /* ---------- 7. 悬浮数据卡片 ---------- */
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

  /* ---------- 8. 数据表格与曲线图刷新循环 ---------- */
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

  /* ---------- 9. 移动端面板切换 ---------- */
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

  /* ---------- 10. 可折叠面板分区 ---------- */
  document.querySelectorAll('.collapsible-header').forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  /* ---------- 11. 帮助说明模态框 ---------- */
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpClose = document.getElementById('helpClose');
  const helpOverlay = document.getElementById('helpOverlay');
  const helpBody = document.getElementById('helpBody');

  // 帮助内容
  helpBody.innerHTML = `
    <h4>快速入门</h4>
    <ul>
      <li>在左侧「题型预设」中选择物理运动模型（平抛、自由落体、圆周等）</li>
      <li>在「力学参数」中调整初速度、角度、重力等参数</li>
      <li>点击「播放」按钮开始模拟，观察运动轨迹</li>
      <li>右侧面板实时显示位移、速度、加速度数据及曲线图</li>
    </ul>

    <h4>自定义物理参数</h4>
    <ul>
      <li>展开「自定义物理参数」板块，开启「启用自定义重力」开关</li>
      <li>可一键选择预设环境：地球(g=9.8)、月球(g=1.6)、火星(g=3.7)、木星(g=24.8)、失重(g=0)</li>
      <li>通过滑块或数字输入框自定义重力大小（0~30 m/s²）</li>
      <li>通过方向选择器或方向预设按钮设置重力方向（0°向右、90°向上、180°向左、270°向下）</li>
      <li>点击「保存方案」可将当前配置保存为自定义方案，支持随时载入</li>
      <li>自定义重力会覆盖模型默认的重力设置，适用于平抛、自由落体、匀变速直线模型</li>
    </ul>

    <h4>模拟物品库</h4>
    <ul>
      <li>展开「模拟物品库」板块，按分类浏览预设物品（球类、天体、日常、粒子）</li>
      <li>点击物品卡片可将其属性（质量、半径、颜色）应用到当前模型</li>
      <li>在「创建自定义物品」区域填写名称、质量、半径、颜色后：
        <ul>
          <li>「仅应用」：临时应用到当前模型，不保存</li>
          <li>「保存并应用」：保存到自定义物品库并应用</li>
        </ul>
      </li>
      <li>在「我的自定义物品」列表中可管理已保存的物品（应用/删除）</li>
      <li>点击「✕」按钮可清除当前物品设置，恢复模型默认属性</li>
    </ul>

    <h4>方案管理</h4>
    <ul>
      <li>「保存当前方案」：将当前模型类型与参数保存为方案</li>
      <li>选择已保存方案后点击「载入方案」可快速恢复</li>
      <li>方案与自定义物理参数方案独立存储，互不影响</li>
    </ul>

    <h4>播放控制</h4>
    <ul>
      <li><kbd>空格</kbd>：播放/暂停</li>
      <li><kbd>R</kbd>：重置到初始状态</li>
      <li><kbd>S</kbd>：单步推演</li>
      <li>「清除」：清空轨迹但保留物体，「重置」：恢复到初始状态</li>
      <li>「导出」：将当前画布保存为 PNG 图片</li>
    </ul>

    <h4>交互技巧</h4>
    <ul>
      <li>鼠标悬浮在运动物体上可查看实时数据卡片</li>
      <li>点击面板标题可折叠/展开对应分区，节省空间</li>
      <li>右上角按钮可切换深色/浅色主题</li>
      <li>移动端点击左下角圆形按钮可切换左右面板</li>
    </ul>
  `;

  function openHelp() { helpModal.hidden = false; }
  function closeHelp() { helpModal.hidden = true; }
  helpBtn.addEventListener('click', openHelp);
  helpClose.addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', closeHelp);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
  });

  /* ---------- 12. 启动 ---------- */
  // 默认加载平抛运动
  loadModel('projectile', null);
  // 启动数据刷新循环
  dataLoop();

  // 暴露调试接口（可选）
  window.PhysFlux = { engine, renderer, controls, player, presetMgr, customParamsMgr, objectLibMgr };
})();
