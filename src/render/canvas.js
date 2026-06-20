/* ============================================================
 * 物绘流光 PhysFlux - Canvas 主渲染器
 * 职责：管理画布、坐标变换、分层绘制（轴/轨迹/物体/矢量）、动画循环
 * 增强：captureStream 支持（WebM 录制）、能量叠加显示
 * ============================================================ */

import { AxesRenderer } from './axes.js';
import { TrailRenderer } from './trail.js';
import { Helpers } from '../utils/helpers.js';

export class CanvasRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.axesRenderer = new AxesRenderer();
    this.trailRenderer = new TrailRenderer();

    this.transform = { w: 0, h: 0, scale: 10, originX: 0, originY: 0 };
    this.targetScale = 10;
    this.running = false;
    this.lastTime = 0;
    this.mouse = { x: -1, y: -1, inside: false };
    this.onHover = null;
    /** 是否显示能量叠加信息 */
    this.showEnergyOverlay = false;
    /** 选中物体回调（沙盒模式用） */
    this.onSelect = null;
    /** 当前选中物体 id */
    this.selectedId = null;
    this.theme = this._readTheme();

    this._bindEvents();
    this.resize();
  }

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

  refreshTheme() {
    this.theme = this._readTheme();
    this.axesRenderer.invalidate();
  }

  _bindEvents() {
    window.addEventListener('resize', Helpers.debounce(() => this.resize(), 100));
    window.addEventListener('load', () => { this.resize(); this.render(); });

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

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width || window.innerWidth - 620;
    const h = rect.height || window.innerHeight - 204;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, w * dpr);
    this.canvas.height = Math.max(1, h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.transform.w = w;
    this.transform.h = h;
    this.axesRenderer.invalidate();
  }

  _updateTransform() {
    const bodies = this.engine.getBodies();
    const { w, h } = this.transform;
    if (bodies.length === 0) {
      this.transform.originX = w / 2;
      this.transform.originY = h * 0.65;
      this.transform.scale = this.targetScale;
      return;
    }

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
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scaleX = w / spanX;
    const scaleY = h / spanY;
    const fitScale = Math.min(scaleX, scaleY);
    this.targetScale = Helpers.clamp(fitScale, 4, 40);
    this.transform.scale += (this.targetScale - this.transform.scale) * 0.1;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const targetOriginX = w / 2 - cx * this.transform.scale;
    const targetOriginY = h / 2 + cy * this.transform.scale;
    this.transform.originX += (targetOriginX - this.transform.originX) * 0.1;
    this.transform.originY += (targetOriginY - this.transform.originY) * 0.1;
  }

  snapTransform() {
    this._updateTransform();
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

  toCanvasX(x) { return this.transform.originX + x * this.transform.scale; }
  toCanvasY(y) { return this.transform.originY - y * this.transform.scale; }
  toPhysicsX(px) { return (px - this.transform.originX) / this.transform.scale; }
  toPhysicsY(py) { return (this.transform.originY - py) / this.transform.scale; }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() { this.running = false; }

  _loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.engine.step(dt);
    this.render();
    requestAnimationFrame(this._loop);
  };

  renderOnce() {
    this.engine.singleStep();
    this.render();
  }

  render() {
    const { ctx, transform, theme } = this;
    if (transform.w < 2 || transform.h < 2) {
      this.resize();
      if (this.transform.w < 2 || this.transform.h < 2) return;
    }
    this._updateTransform();

    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, transform.w, transform.h);

    this.axesRenderer.draw(ctx, transform, theme);

    const bodies = this.engine.getBodies();
    for (const body of bodies) {
      this.trailRenderer.draw(ctx, body, transform, theme);
    }
    for (const body of bodies) {
      this._drawBody(ctx, body, theme);
    }
    for (const body of bodies) {
      this._drawVectors(ctx, body, theme);
    }

    // 能量叠加信息
    if (this.showEnergyOverlay) {
      this._drawEnergyOverlay(ctx, theme);
    }

    this._handleHover(bodies);
  }

  _drawBody(ctx, body, theme) {
    const x = this.toCanvasX(body.position.x);
    const y = this.toCanvasY(body.position.y);
    const r = body.radius || 6;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    grad.addColorStop(0, Helpers.hexToRgba(body.color, 0.35));
    grad.addColorStop(1, Helpers.hexToRgba(body.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 选中高亮（沙盒模式）
    if (this.selectedId === body.id) {
      ctx.strokeStyle = theme.glow;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawVectors(ctx, body, theme) {
    const x = this.toCanvasX(body.position.x);
    const y = this.toCanvasY(body.position.y);
    const scale = this.transform.scale;

    const vLen = body.velocity.length();
    if (vLen > 0.1) {
      const vx = body.velocity.x * scale * 0.5;
      const vy = -body.velocity.y * scale * 0.5;
      this._drawArrow(ctx, x, y, x + vx, y + vy, theme.velocity, 'v');
    }

    const fLen = body.force.length();
    if (fLen > 0.1) {
      const fScale = scale * 0.05;
      const fx = body.force.x * fScale;
      const fy = -body.force.y * fScale;
      this._drawArrow(ctx, x, y, x + fx, y + fy, theme.force, 'F');
    }
  }

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

    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

    const angle = Math.atan2(dy, dx);
    const headLen = 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.font = 'italic 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x1 + 4, y1);
    ctx.restore();
  }

  /** 绘制能量叠加信息（左上角） */
  _drawEnergyOverlay(ctx, theme) {
    const ek = this.engine.getKineticEnergy();
    const ep = this.engine.getPotentialEnergy();
    const et = this.engine.getTotalEnergy();
    const lines = [
      `动能 Ek = ${Helpers.fmt(ek)} J`,
      `势能 Ep = ${Helpers.fmt(ep)} J`,
      `总能 E  = ${Helpers.fmt(et)} J`,
    ];
    ctx.save();
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const pad = 8;
    const lineH = 18;
    const boxW = 180;
    const boxH = lines.length * lineH + pad * 2;
    ctx.fillStyle = Helpers.hexToRgba(theme.bg, 0.85);
    ctx.fillRect(12, 12, boxW, boxH);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, boxW, boxH);
    ctx.fillStyle = theme.body;
    lines.forEach((line, i) => {
      ctx.fillText(line, 12 + pad, 12 + pad + i * lineH);
    });
    ctx.restore();
  }

  _handleHover(bodies) {
    if (!this.mouse.inside || !this.onHover) return;
    let nearest = null;
    let minDist = 30;
    for (const body of bodies) {
      const bx = this.toCanvasX(body.position.x);
      const by = this.toCanvasY(body.position.y);
      const d = Math.sqrt((this.mouse.x - bx) ** 2 + (this.mouse.y - by) ** 2);
      if (d < minDist) { minDist = d; nearest = body; }
    }
    if (nearest) {
      this.onHover({ body: nearest, x: this.mouse.x, y: this.mouse.y, time: this.engine.getElapsedTime() });
    } else {
      this.onHover(null);
    }
  }

  /** 导出当前画布为 PNG 图像 */
  exportImage() {
    const link = document.createElement('a');
    link.download = `physflux_${this.engine.currentType}_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  /** 获取画布流（用于 MediaRecorder 录制 WebM） */
  captureStream(fps = 30) {
    if (this.canvas.captureStream) {
      return this.canvas.captureStream(fps);
    }
    console.warn('[PhysFlux] 当前浏览器不支持 canvas.captureStream');
    return null;
  }
}
