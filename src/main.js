/* ============================================================
 * 物绘流光 PhysFlux - 主入口
 * 职责：装配页面、路由、主题、帮助说明等全局功能
 * ============================================================ */

import { ClassicPage } from './pages/classic.js';
import { SandboxPage } from './pages/sandbox.js';
import { Router } from './router.js';
import { Storage } from './utils/storage.js';

(function () {
  'use strict';

  /* ---------- 1. 创建页面实例 ---------- */
  const classicPage = new ClassicPage();
  const sandboxPage = new SandboxPage();

  /* ---------- 2. 初始化路由 ---------- */
  const router = new Router({
    classic: classicPage,
    sandbox: sandboxPage,
  });
  router.init();

  /* ---------- 3. 主题切换 ---------- */
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    setTimeout(() => {
      classicPage.refreshTheme();
      sandboxPage.refreshTheme();
    }, 50);
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  applyTheme(Storage.getTheme());

  /* ---------- 4. 帮助说明模态框 ---------- */
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpClose = document.getElementById('helpClose');
  const helpOverlay = document.getElementById('helpOverlay');
  const helpBody = document.getElementById('helpBody');

  helpBody.innerHTML = `
    <h4>快速入门</h4>
    <ul>
      <li>顶部导航切换「经典模型」与「自由沙盒」两个页面</li>
      <li>经典模型页：选择物理运动模型（平抛、自由落体、圆周等），调整参数后播放</li>
      <li>自由沙盒页：在画布上自由摆放物体，模拟多物体碰撞与万有引力</li>
      <li>右侧面板实时显示位移、速度、加速度数据及曲线图</li>
    </ul>

    <h4>经典模型页</h4>
    <ul>
      <li>在「题型预设」中选择物理运动模型（平抛、自由落体、圆周等）</li>
      <li>在「力学参数」中调整初速度、角度、重力等参数</li>
      <li>「自定义物理参数」：启用自定义重力（含地球/月球/火星等预设）、空气阻力、能量叠加显示</li>
      <li>「模拟物品库」：按分类选择物品，或创建自定义物品</li>
      <li>「播放控制」：<kbd>空格</kbd>播放/暂停，<kbd>R</kbd>重置，<kbd>S</kbd>单步</li>
      <li>「导出PNG」：保存当前画布为图片；「录制」：录制 WebM 动画视频</li>
      <li>「方案管理」：保存/载入参数方案；「导出/导入场景」：以 JSON 文件备份完整场景</li>
    </ul>

    <h4>自由沙盒页（新功能）</h4>
    <ul>
      <li><b>添加物体</b>：点击画布空白处即可添加一个新物体</li>
      <li><b>选中物体</b>：点击已有物体，右侧面板显示其属性</li>
      <li><b>移动物体</b>：按住物体拖拽可调整位置</li>
      <li><b>编辑属性</b>：在右侧面板修改质量、半径、初速度、颜色、名称</li>
      <li><b>删除物体</b>：选中后按 <kbd>Delete</kbd> 键，或在属性面板点击「删除」</li>
      <li><b>全局设置</b>：调整重力、恢复系数、空气阻力，开关碰撞/万有引力/边界反弹</li>
      <li><b>场景管理</b>：保存/载入/删除沙盒场景，支持导入导出 JSON 文件</li>
      <li>「录制」按钮可录制沙盒动画为 WebM 视频</li>
    </ul>

    <h4>新增功能一览</h4>
    <ul>
      <li><b>多物体系统</b>：沙盒中支持任意数量物体，物体间可发生弹性碰撞与万有引力</li>
      <li><b>空气阻力</b>：线性阻力模型 a = -k·v，可调节系数</li>
      <li><b>能量守恒可视化</b>：右侧能量图表显示动能、势能、总能量曲线；画布可叠加能量数值</li>
      <li><b>WebM 动画导出</b>：录制模拟过程为 WebM 视频文件</li>
      <li><b>场景导入/导出</b>：完整场景（含参数、物体、设置）以 JSON 文件备份恢复</li>
    </ul>

    <h4>交互技巧</h4>
    <ul>
      <li>鼠标悬浮在运动物体上可查看实时数据卡片（经典页）</li>
      <li>点击面板标题可折叠/展开对应分区</li>
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

  /* ---------- 5. 暴露调试接口 ---------- */
  window.PhysFlux = { classicPage, sandboxPage, router };
})();
