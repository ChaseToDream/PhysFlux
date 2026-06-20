/* ============================================================
 * 物绘流光 PhysFlux - 数据曲线图渲染器
 * 绘制位移-时间(s-t)、速度-时间(v-t)迷你曲线图
 * 数据采样：每 5 帧采样一次，降低绘制开销
 * ============================================================ */

class ChartRenderer {
  /**
   * @param {HTMLCanvasElement} canvas 曲线图画布
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    /** 采样数据：[{ t, s, v }] */
    this.samples = [];
    /** 采样计数器（每 5 帧采一次） */
    this._counter = 0;
    /** 最大采样点数 */
    this.maxSamples = 200;
    this.resize();
    window.addEventListener('resize', Helpers.debounce(() => this.resize(), 100));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  /** 清空采样数据 */
  clear() {
    this.samples = [];
    this._counter = 0;
  }

  /**
   * 采样一帧数据（每 5 帧实际记录一次）
   * @param {Array} bodies 物体列表
   * @param {number} time 当前时间
   */
  sample(bodies, time) {
    this._counter++;
    if (this._counter % 5 !== 0) return;
    // 取第一个物体作为主采样对象
    const body = bodies[0];
    if (!body) return;
    const s = body.position.length();  // 位移大小
    const v = body.velocity.length();  // 速度大小
    this.samples.push({ t: time, s, v });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * 绘制曲线图
   * @param {string} type 's' 位移 或 'v' 速度
   * @param {string} color 曲线颜色
   */
  draw(type, color) {
    const { ctx, w, h } = this;
    const theme = {
      axis: Helpers.cssVar('--axis-color') || '#B5AE9F',
      grid: Helpers.cssVar('--grid-color') || '#E8E2D5',
      text: Helpers.cssVar('--text-muted') || '#8B9A94',
    };

    ctx.clearRect(0, 0, w, h);

    const padL = 28, padR = 8, padT = 8, padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // ---------- 边框与网格 ----------
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    // 横向参考线
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 坐标轴
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    if (this.samples.length < 2) {
      // 空状态提示
      ctx.fillStyle = theme.text;
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', w / 2, h / 2);
      return;
    }

    // ---------- 数据范围 ----------
    const tMin = this.samples[0].t;
    const tMax = this.samples[this.samples.length - 1].t;
    let valMax = 0;
    for (const s of this.samples) {
      valMax = Math.max(valMax, type === 's' ? s.s : s.v);
    }
    valMax = Math.max(0.1, valMax * 1.1);  // 留上方空间
    const tRange = Math.max(0.1, tMax - tMin);

    // 坐标映射
    const toX = (t) => padL + ((t - tMin) / tRange) * plotW;
    const toY = (val) => padT + plotH - (val / valMax) * plotH;

    // ---------- 刻度标注 ----------
    ctx.fillStyle = theme.text;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Helpers.fmt(valMax, 1), padL - 3, padT + 4);
    ctx.fillText('0', padL - 3, padT + plotH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(Helpers.fmt(tMin, 1) + 's', padL, padT + plotH + 3);
    ctx.fillText(Helpers.fmt(tMax, 1) + 's', padL + plotW, padT + plotH + 3);

    // ---------- 曲线（带渐变填充） ----------
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toX(this.samples[0].t), toY(type === 's' ? this.samples[0].s : this.samples[0].v));
    for (let i = 1; i < this.samples.length; i++) {
      const s = this.samples[i];
      ctx.lineTo(toX(s.t), toY(type === 's' ? s.s : s.v));
    }
    // 描边
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 渐变填充
    ctx.lineTo(toX(this.samples[this.samples.length - 1].t), padT + plotH);
    ctx.lineTo(toX(this.samples[0].t), padT + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, this._hexToRgba(color, 0.25));
    grad.addColorStop(1, this._hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // 当前点高亮
    const last = this.samples[this.samples.length - 1];
    const lx = toX(last.t);
    const ly = toY(type === 's' ? last.s : last.v);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${Helpers.clamp(alpha, 0, 1)})`;
  }
}

window.ChartRenderer = ChartRenderer;
