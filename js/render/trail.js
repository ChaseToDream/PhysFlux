/* ============================================================
 * 物绘流光 PhysFlux - 轨迹渲染器
 * 绘制渐变流光轨迹线，带残影 alpha 衰减效果
 * ============================================================ */

class TrailRenderer {
  /**
   * 绘制单个物体的轨迹
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {Object} body 物体
   * @param {Object} transform 坐标变换
   * @param {Object} theme 主题色 { trail, glow }
   */
  draw(ctx, body, transform, theme) {
    const trail = body.trail;
    if (trail.length < 2) return;

    const { scale, originX, originY } = transform;
    // 物理坐标 → 画布坐标
    const toX = (x) => originX + x * scale;
    const toY = (y) => originY - y * scale;  // y 轴翻转

    // ---------- 外层光晕（流光高光） ----------
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 分段绘制以实现渐变流光：越新越亮
    const len = trail.length;
    // 为性能，当点过多时按步长抽样
    const step = len > 500 ? Math.ceil(len / 500) : 1;

    for (let i = step; i < len; i += step) {
      const p0 = trail[i - step];
      const p1 = trail[i];
      // 进度因子：0(旧) → 1(新)
      const t = i / len;
      const alpha = p1.alpha * (0.15 + t * 0.85);

      // 主轨迹线
      ctx.strokeStyle = this._hexToRgba(theme.trail, alpha);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(toX(p0.x), toY(p0.y));
      ctx.lineTo(toX(p1.x), toY(p1.y));
      ctx.stroke();

      // 高光层（流光金，仅近期轨迹）
      if (t > 0.6) {
        ctx.strokeStyle = this._hexToRgba(theme.glow, alpha * 0.5 * (t - 0.6) / 0.4);
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(toX(p0.x), toY(p0.y));
        ctx.lineTo(toX(p1.x), toY(p1.y));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * 十六进制颜色转 rgba 字符串
   * @param {string} hex 如 '#A8B5B0'
   * @param {number} alpha 透明度 0~1
   * @returns {string} rgba 字符串
   */
  _hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${Helpers.clamp(alpha, 0, 1)})`;
  }
}

window.TrailRenderer = TrailRenderer;
