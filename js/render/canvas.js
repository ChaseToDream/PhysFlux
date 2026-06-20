/* ============================================================
 * 物绘流光 PhysFlux - Canvas 主渲染器
 * 职责：管理画布、坐标变换、分层绘制（轴/轨迹/物体/矢量）、动画循环
 * ============================================================ */

class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas 主画布元素
   * @param {PhysicsEngine} engine 物理引擎实例
   */
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.axesRenderer = new AxesRenderer();
    this.trailRenderer = new TrailRenderer();

    /** 坐标变换信息 */
    this.transform = { w: 0, h: 0, scale: 10, originX: 0, originY: 0 };
    /** 目标缩放（用于平滑过渡） */
    this.targetScale = 10;
    /** 动画运行状态 */
    this.running = false;
    /** 上一帧时间戳 */
    this.lastTime = 0;
    /** 鼠标位置（画布坐标） */
    this.mouse = { x: -1, y: -1, inside: false };
    /** 悬浮提示回调 */
    this.onHover = null;
    /** 主题色缓存 */
    this.theme = this._readTheme();

    this._bindEvents();
    this.resize();
  }

  /* ---------- 主题色读取 ---------- */

  _readTheme() {
    return {
      axis: Helpers.cssVar('--axis-color') || '#B5AE9F',
      grid: Helpers.cssVar('--grid-color') || '#E8E2D5',
      text: Helpers.cssVar('--text-muted') || '#8B9A94',
      trail: Helpers.cssVar('--trail-color') || '#A8B5B0',
      glow: Helpers.cssVar('--trail-glow') || '#D4A574',
      velocity: Helpers.cssVar('--vector-velocity') || '#6B7B8C',
      force: Helpers.cssVar('--vector-force') || '#C9A88A',
      body: Helpers.cssVar('--text-primary') || '#3E4A55',
      bg: Helpers.cssVar('--bg-canvas') || '#F8F5EE',
    };
  }

  /** 主题切换后刷新主题色与坐标轴缓存 */
  refreshTheme() {
    this.theme = this._readTheme();
    this.axesRenderer.invalidate();
  }

  /* ---------- 事件绑定 ---------- */

  _bindEvents() {
    // 窗口尺寸变化时重设画布
    window.addEventListener('resize', Helpers.debounce(() => this.resize(), 100));

    // 页面完全加载后（字体/Tailwind 就绪）重新适配并重绘
    window.addEventListener('load', () => {
      this.resize();
      this.render();
    });

    // 鼠标悬浮：记录位置用于数据卡片
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.inside = true;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
      if (this.onHover) this.onHover(null);
    });
  }

  /* ---------- 画布尺寸 ---------- */

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    // 容器尺寸可能未就绪（布局未完成），用窗口尺寸兜底
    const w = rect.width || window.innerWidth - 620;
    const h = rect.height || window.innerHeight - 204;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, w * dpr);
    this.canvas.height = Math.max(1, h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // 高分屏适配
    this.transform.w = w;
    this.transform.h = h;
    this.axesRenderer.invalidate();
  }

  /* ---------- 坐标变换 ---------- */

  /**
   * 根据物体分布自动计算缩放与原点，使场景居中可见
   */
  _updateTransform() {
    const bodies = this.engine.getBodies();
    const { w, h } = this.transform;
    if (bodies.length === 0) {
      this.transform.originX = w / 2;
      this.transform.originY = h * 0.65;  // 原点偏下，留出上方空间
      this.transform.scale = this.targetScale;
      return;
    }

    // 计算所有物体（含轨迹）的包围盒
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const body of bodies) {
      minX = Math.min(minX, body.position.x);
      maxX = Math.max(maxX, body.position.x);
      minY = Math.min(minY, body.position.y);
      maxY = Math.max(maxY, body.position.y);
      // 轨迹点也纳入计算
      for (const p of body.trail) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
    // 加边距
    const padX = Math.max(5, (maxX - minX) * 0.15);
    const padY = Math.max(5, (maxY - minY) * 0.15);
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    // 计算适配缩放（像素/米），保留最小可视缩放
    const scaleX = w / spanX;
    const scaleY = h / spanY;
    const fitScale = Math.min(scaleX, scaleY);
    // 平滑过渡到目标缩放，避免突变
    this.targetScale = Helpers.clamp(fitScale, 4, 40);
    this.transform.scale += (this.targetScale - this.transform.scale) * 0.1;

    // 原点：使场景中心位于画布中心，平滑过渡避免视角抖动
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const targetOriginX = w / 2 - cx * this.transform.scale;
    const targetOriginY = h / 2 + cy * this.transform.scale;  // y 翻转
    this.transform.originX += (targetOriginX - this.transform.originX) * 0.1;
    this.transform.originY += (targetOriginY - this.transform.originY) * 0.1;
  }

  /**
   * 立即对齐视角到目标（无平滑过渡），用于模型加载/重置时
   */
  snapTransform() {
    this._updateTransform();
    // 强制对齐，消除平滑过渡的初始偏移
    this.transform.scale = this.targetScale;
    const bodies = this.engine.getBodies();
    if (bodies.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const body of bodies) {
      minX = Math.min(minX, body.position.x);
      maxX = Math.max(maxX, body.position.x);
      minY = Math.min(minY, body.position.y);
      maxY = Math.max(maxY, body.position.y);
      for (const p of body.trail) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
    const padX = Math.max(5, (maxX - minX) * 0.15);
    const padY = Math.max(5, (maxY - minY) * 0.15);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.transform.originX = this.transform.w / 2 - cx * this.transform.scale;
    this.transform.originY = this.transform.h / 2 + cy * this.transform.scale;
  }

  /** 物理坐标 → 画布坐标 */
  toCanvasX(x) { return this.transform.originX + x * this.transform.scale; }
  toCanvasY(y) { return this.transform.originY - y * this.transform.scale; }
  /** 画布坐标 → 物理坐标 */
  toPhysicsX(px) { return (px - this.transform.originX) / this.transform.scale; }
  toPhysicsY(py) { return (this.transform.originY - py) / this.transform.scale; }

  /* ---------- 动画循环 ---------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);  // 限制最大步长，防卡顿跳跃
    this.lastTime = now;

    // 物理步进
    this.engine.step(dt);
    // 渲染
    this.render();
    // 下一帧
    requestAnimationFrame(this._loop);
  };

  /** 单步渲染（暂停时调用，仅推进一帧物理并重绘） */
  renderOnce() {
    this.engine.singleStep();
    this.render();
  }

  /* ---------- 主渲染 ---------- */

  render() {
    const { ctx, transform, theme } = this;
    // 尺寸未就绪时尝试重新适配，仍为 0 则跳过本次渲染
    if (transform.w < 2 || transform.h < 2) {
      this.resize();
      if (this.transform.w < 2 || this.transform.h < 2) return;
    }
    this._updateTransform();

    // 1. 清屏（带轻微残影，营造拖尾氛围）
    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, transform.w, transform.h);

    // 2. 坐标轴与网格
    this.axesRenderer.draw(ctx, transform, theme);

    // 3. 轨迹
    const bodies = this.engine.getBodies();
    for (const body of bodies) {
      this.trailRenderer.draw(ctx, body, transform, theme);
    }

    // 4. 运动物体
    for (const body of bodies) {
      this._drawBody(ctx, body, theme);
    }

    // 5. 速度/受力矢量
    for (const body of bodies) {
      this._drawVectors(ctx, body, theme);
    }

    // 6. 悬浮数据卡片
    this._handleHover(bodies);
  }

  /** 绘制运动物体（带微光） */
  _drawBody(ctx, body, theme) {
    const x = this.toCanvasX(body.position.x);
    const y = this.toCanvasY(body.position.y);
    const r = body.radius || 6;

    // 外层光晕
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    grad.addColorStop(0, this._hexToRgba(body.color, 0.35));
    grad.addColorStop(1, this._hexToRgba(body.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 主体
    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 高光点
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 绘制速度与受力矢量箭头 */
  _drawVectors(ctx, body, theme) {
    const x = this.toCanvasX(body.position.x);
    const y = this.toCanvasY(body.position.y);
    const scale = this.transform.scale;

    // 速度矢量（蓝色），长度按速度大小缩放
    const vLen = body.velocity.length();
    if (vLen > 0.1) {
      const vx = body.velocity.x * scale * 0.5;
      const vy = -body.velocity.y * scale * 0.5;  // y 翻转
      this._drawArrow(ctx, x, y, x + vx, y + vy, theme.velocity, 'v');
    }

    // 受力矢量（赭石色）
    const fLen = body.force.length();
    if (fLen > 0.1) {
      // 受力缩放：避免过大，取对数压缩
      const fScale = scale * 0.05;
      const fx = body.force.x * fScale;
      const fy = -body.force.y * fScale;
      this._drawArrow(ctx, x, y, x + fx, y + fy, theme.force, 'F');
    }
  }

  /** 绘制带标签的箭头 */
  _drawArrow(ctx, x0, y0, x1, y1, color, label) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 3) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;

    // 主线
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // 箭头头部
    const angle = Math.atan2(dy, dx);
    const headLen = 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x1 - headLen * Math.cos(angle - Math.PI / 6),
      y1 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x1 - headLen * Math.cos(angle + Math.PI / 6),
      y1 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // 标签
    ctx.globalAlpha = 1;
    ctx.font = 'italic 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x1 + 4, y1);
    ctx.restore();
  }

  /* ---------- 悬浮数据 ---------- */

  _handleHover(bodies) {
    if (!this.mouse.inside || !this.onHover) return;
    // 找到距鼠标最近的物体
    let nearest = null;
    let minDist = 30;  // 像素阈值
    for (const body of bodies) {
      const bx = this.toCanvasX(body.position.x);
      const by = this.toCanvasY(body.position.y);
      const d = Math.sqrt((this.mouse.x - bx) ** 2 + (this.mouse.y - by) ** 2);
      if (d < minDist) {
        minDist = d;
        nearest = body;
      }
    }
    if (nearest) {
      this.onHover({
        body: nearest,
        x: this.mouse.x,
        y: this.mouse.y,
        time: this.engine.getElapsedTime(),
      });
    } else {
      this.onHover(null);
    }
  }

  /* ---------- 工具 ---------- */

  _hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${Helpers.clamp(alpha, 0, 1)})`;
  }

  /** 导出当前画布为 PNG 图像 */
  exportImage() {
    const link = document.createElement('a');
    link.download = `physflux_${this.engine.currentType}_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

window.CanvasRenderer = CanvasRenderer;
