/* ============================================================
 * 物绘流光 PhysFlux - 坐标轴渲染器
 * 绘制水墨风坐标轴、刻度、网格，支持离屏缓存
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
    const key = `${transform.w}x${transform.h}_${transform.scale.toFixed(1)}_${theme.axis}`;
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
    ctx.clearRect(0, 0, w, h);

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
