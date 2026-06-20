/* ============================================================
 * 物绘流光 PhysFlux - 轨迹渲染器
 * 绘制渐变流光轨迹线，带残影 alpha 衰减效果
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export class TrailRenderer {
  draw(ctx, body, transform, theme) {
    const trail = body.trail;
    if (trail.length < 2) return;

    const { scale, originX, originY } = transform;
    const toX = (x) => originX + x * scale;
    const toY = (y) => originY - y * scale;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const len = trail.length;
    const step = len > 500 ? Math.ceil(len / 500) : 1;

    for (let i = step; i < len; i += step) {
      const p0 = trail[i - step];
      const p1 = trail[i];
      const t = i / len;
      const alpha = p1.alpha * (0.15 + t * 0.85);

      ctx.strokeStyle = Helpers.hexToRgba(theme.trail, alpha);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(toX(p0.x), toY(p0.y));
      ctx.lineTo(toX(p1.x), toY(p1.y));
      ctx.stroke();

      if (t > 0.6) {
        ctx.strokeStyle = Helpers.hexToRgba(theme.glow, alpha * 0.5 * (t - 0.6) / 0.4);
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(toX(p0.x), toY(p0.y));
        ctx.lineTo(toX(p1.x), toY(p1.y));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
