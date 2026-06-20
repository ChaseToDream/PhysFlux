/* ============================================================
 * 物绘流光 PhysFlux - 坐标轴渲染器
 * 绘制水墨风坐标轴、刻度、网格，支持离屏缓存
 * ============================================================ */

class AxesRenderer {
  constructor() {
    /** 离屏 Canvas 缓存静态坐标轴，避免每帧重绘 */
    this.cacheCanvas = document.createElement('canvas');
    this.cacheCtx = this.cacheCanvas.getContext('2d');
    /** 缓存有效性标记（尺寸/缩放变化时失效） */
    this.cacheValid = false;
    this.cacheKey = '';
  }

  /**
   * 使缓存失效（缩放或尺寸变化时调用）
   */
  invalidate() {
    this.cacheValid = false;
  }

  /**
   * 绘制坐标轴到主画布
   * @param {CanvasRenderingContext2D} ctx 主画布上下文
   * @param {Object} transform 坐标变换 { scale, originX, originY, w, h }
   * @param {Object} theme 主题色 { axis, grid, text }
   */
  draw(ctx, transform, theme) {
    // 尺寸为 0 时跳过，避免 drawImage 异常
    if (transform.w < 2 || transform.h < 2) return;
    const key = `${transform.w}x${transform.h}_${transform.scale.toFixed(1)}_${theme.axis}`;
    if (!this.cacheValid || this.cacheKey !== key) {
      this._renderToCache(transform, theme);
      this.cacheKey = key;
      this.cacheValid = true;
    }
    // 将缓存画布贴到主画布
    ctx.drawImage(this.cacheCanvas, 0, 0);
  }

  /**
   * 渲染坐标轴到离屏缓存
   */
  _renderToCache(transform, theme) {
    const { w, h, scale, originX, originY } = transform;
    this.cacheCanvas.width = w;
    this.cacheCanvas.height = h;
    const ctx = this.cacheCtx;
    ctx.clearRect(0, 0, w, h);

    // ---------- 网格 ----------
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    const gridStep = this._niceStep(scale);  // 自适应刻度间隔（米）
    const gridPx = gridStep * scale;

    // 竖向网格线
    const startX = originX % gridPx;
    for (let x = startX; x < w; x += gridPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // 横向网格线
    const startY = originY % gridPx;
    for (let y = startY; y < h; y += gridPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ---------- 坐标轴（水墨风，细淡） ----------
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    // X 轴（水平）
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    ctx.stroke();
    // Y 轴（竖直）
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.stroke();

    // ---------- 刻度与标注 ----------
    ctx.fillStyle = theme.text;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X 轴刻度
    const xMin = Math.ceil(-originX / scale / gridStep) * gridStep;
    const xMax = Math.floor((w - originX) / scale / gridStep) * gridStep;
    for (let xm = xMin; xm <= xMax; xm += gridStep) {
      if (xm === 0) continue;
      const px = originX + xm * scale;
      ctx.beginPath();
      ctx.moveTo(px, originY - 4);
      ctx.lineTo(px, originY + 4);
      ctx.stroke();
      ctx.fillText(xm.toString(), px, originY + 6);
    }
    // Y 轴刻度（物理坐标 y 向上，画布向下）
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMin = Math.ceil(-(h - originY) / scale / gridStep) * gridStep;
    const yMax = Math.floor(originY / scale / gridStep) * gridStep;
    for (let ym = yMin; ym <= yMax; ym += gridStep) {
      if (ym === 0) continue;
      const py = originY - ym * scale;
      ctx.beginPath();
      ctx.moveTo(originX - 4, py);
      ctx.lineTo(originX + 4, py);
      ctx.stroke();
      ctx.fillText(ym.toString(), originX - 6, py);
    }

    // 原点标注
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', originX - 4, originY + 4);

    // 轴标签
    ctx.fillStyle = theme.text;
    ctx.font = '12px "Noto Serif SC", serif';
    ctx.textAlign = 'right';
    ctx.fillText('x / m', w - 8, originY + 6);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('y / m', originX + 6, 8);
  }

  /**
   * 计算合适的刻度间隔（米），使网格不过密或过疏
   * @param {number} scale 像素/米
   * @returns {number} 刻度间隔（米）
   */
  _niceStep(scale) {
    // 目标网格像素间距约 60px
    const targetPx = 60;
    const targetMeters = targetPx / scale;
    // 取 1, 2, 5, 10, 20, 50 ... 序列中最接近的
    const pow = Math.pow(10, Math.floor(Math.log10(targetMeters)));
    const candidates = [1, 2, 5, 10].map((c) => c * pow);
    let best = candidates[0];
    let bestDiff = Math.abs(best - targetMeters);
    for (const c of candidates) {
      const diff = Math.abs(c - targetMeters);
      if (diff < bestDiff) {
        best = c;
        bestDiff = diff;
      }
    }
    return Math.max(1, best);
  }
}

window.AxesRenderer = AxesRenderer;
