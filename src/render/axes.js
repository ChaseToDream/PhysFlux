/* ============================================================
 * 物绘流光 PhysFlux - 坐标轴渲染器
 * 绘制水墨风坐标轴、刻度、网格，作为静态层离屏缓存
 * 缓存键含原点（按像素取整）与缩放（取 1 位小数），平移/缩放未越过
 * 取整阈值时直接 blit，避免每帧重绘网格与刻度文本。
 * ============================================================ */

export class AxesRenderer {
  constructor() {
    this.cacheCanvas = document.createElement('canvas');
    this.cacheCtx = this.cacheCanvas.getContext('2d');
    this.cacheValid = false;
    this.cacheKey = '';
  }

  invalidate() { this.cacheValid = false; }

  draw(ctx, transform, theme) {
    if (transform.w < 2 || transform.h < 2) return;
    // 原点按像素取整参与缓存键：平移不足 1px 时复用缓存，兼顾正确性与性能
    const key = [
      transform.w, 'x', transform.h,
      '_s', transform.scale.toFixed(1),
      '_o', Math.round(transform.originX), Math.round(transform.originY),
      '_bg', theme.bg, '_ax', theme.axis, '_gr', theme.grid, '_tx', theme.text,
    ].join('');
    if (!this.cacheValid || this.cacheKey !== key) {
      this._renderToCache(transform, theme);
      this.cacheKey = key;
      this.cacheValid = true;
    }
    ctx.drawImage(this.cacheCanvas, 0, 0);
  }

  _renderToCache(transform, theme) {
    const { w, h, scale, originX, originY } = transform;
    this.cacheCanvas.width = w;
    this.cacheCanvas.height = h;
    const ctx = this.cacheCtx;
    // 静态层底色：背景填充一并纳入缓存，render() 无需再单独 fillRect
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    const gridStep = this._niceStep(scale);
    const gridPx = gridStep * scale;

    const startX = originX % gridPx;
    for (let x = startX; x < w; x += gridPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    const startY = originY % gridPx;
    for (let y = startY; y < h; y += gridPx) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 坐标轴
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, originY); ctx.lineTo(w, originY); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, 0); ctx.lineTo(originX, h); ctx.stroke();

    // 刻度与标注
    ctx.fillStyle = theme.text;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xMin = Math.ceil(-originX / scale / gridStep) * gridStep;
    const xMax = Math.floor((w - originX) / scale / gridStep) * gridStep;
    for (let xm = xMin; xm <= xMax; xm += gridStep) {
      if (xm === 0) continue;
      const px = originX + xm * scale;
      ctx.beginPath();
      ctx.moveTo(px, originY - 4); ctx.lineTo(px, originY + 4); ctx.stroke();
      ctx.fillText(xm.toString(), px, originY + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMin = Math.ceil(-(h - originY) / scale / gridStep) * gridStep;
    const yMax = Math.floor(originY / scale / gridStep) * gridStep;
    for (let ym = yMin; ym <= yMax; ym += gridStep) {
      if (ym === 0) continue;
      const py = originY - ym * scale;
      ctx.beginPath();
      ctx.moveTo(originX - 4, py); ctx.lineTo(originX + 4, py); ctx.stroke();
      ctx.fillText(ym.toString(), originX - 6, py);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', originX - 4, originY + 4);

    ctx.fillStyle = theme.text;
    ctx.font = '12px "Noto Serif SC", serif';
    ctx.textAlign = 'right';
    ctx.fillText('x / m', w - 8, originY + 6);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('y / m', originX + 6, 8);
  }

  _niceStep(scale) {
    const targetPx = 60;
    const targetMeters = targetPx / scale;
    const pow = Math.pow(10, Math.floor(Math.log10(targetMeters)));
    const candidates = [1, 2, 5, 10].map((c) => c * pow);
    let best = candidates[0];
    let bestDiff = Math.abs(best - targetMeters);
    for (const c of candidates) {
      const diff = Math.abs(c - targetMeters);
      if (diff < bestDiff) { best = c; bestDiff = diff; }
    }
    return Math.max(1, best);
  }
}
