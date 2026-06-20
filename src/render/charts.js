/* ============================================================
 * 物绘流光 PhysFlux - 数据曲线图渲染器
 * 绘制位移-时间(s-t)、速度-时间(v-t)迷你曲线图
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export class ChartRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.samples = [];
    this._counter = 0;
    this.maxSamples = 200;
    this._resizeHandler = Helpers.debounce(() => this.resize(), 100);
    this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  /** 销毁渲染器：移除全局监听 */
  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
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

  clear() { this.samples = []; this._counter = 0; }

  sample(bodies, time) {
    this._counter++;
    if (this._counter % 5 !== 0) return;
    if (!bodies || bodies.length === 0) return;
    // 记录所有物体的采样值，使多体场景下曲线有意义
    const snapshot = { t: time, items: [] };
    for (const body of bodies) {
      snapshot.items.push({
        s: body.position.length(),
        v: body.velocity.length(),
        color: body.color,
        label: body.label,
      });
    }
    this.samples.push(snapshot);
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }

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

    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

    if (this.samples.length < 2) {
      ctx.fillStyle = theme.text;
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', w / 2, h / 2);
      return;
    }

    const tMin = this.samples[0].t;
    const tMax = this.samples[this.samples.length - 1].t;
    // 取所有物体在所有采样点中的最大值，统一纵轴量纲
    let valMax = 0;
    for (const snap of this.samples) {
      for (const it of snap.items) {
        valMax = Math.max(valMax, type === 's' ? it.s : it.v);
      }
    }
    valMax = Math.max(0.1, valMax * 1.1);
    const tRange = Math.max(0.1, tMax - tMin);

    const toX = (t) => padL + ((t - tMin) / tRange) * plotW;
    const toY = (val) => padT + plotH - (val / valMax) * plotH;

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

    // 物体数量决定系列数；按物体索引绘制各自曲线
    const bodyCount = this.samples[this.samples.length - 1].items.length;
    for (let bi = 0; bi < bodyCount; bi++) {
      const firstSnap = this.samples.find((s) => s.items[bi]);
      if (!firstSnap) continue;
      const seriesColor = firstSnap.items[bi].color || color;

      ctx.save();
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < this.samples.length; i++) {
        const it = this.samples[i].items[bi];
        if (!it) continue;
        const x = toX(this.samples[i].t);
        const y = toY(type === 's' ? it.s : it.v);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = seriesColor;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 末点高亮
      for (let i = this.samples.length - 1; i >= 0; i--) {
        const it = this.samples[i].items[bi];
        if (it) {
          ctx.fillStyle = seriesColor;
          ctx.beginPath();
          ctx.arc(toX(this.samples[i].t), toY(type === 's' ? it.s : it.v), 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }
}
