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

  clear() { this.samples = []; this._counter = 0; }

  sample(bodies, time) {
    this._counter++;
    if (this._counter % 5 !== 0) return;
    const body = bodies[0];
    if (!body) return;
    const s = body.position.length();
    const v = body.velocity.length();
    this.samples.push({ t: time, s, v });
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
    let valMax = 0;
    for (const s of this.samples) {
      valMax = Math.max(valMax, type === 's' ? s.s : s.v);
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toX(this.samples[0].t), toY(type === 's' ? this.samples[0].s : this.samples[0].v));
    for (let i = 1; i < this.samples.length; i++) {
      const s = this.samples[i];
      ctx.lineTo(toX(s.t), toY(type === 's' ? s.s : s.v));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineTo(toX(this.samples[this.samples.length - 1].t), padT + plotH);
    ctx.lineTo(toX(this.samples[0].t), padT + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, Helpers.hexToRgba(color, 0.25));
    grad.addColorStop(1, Helpers.hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    const last = this.samples[this.samples.length - 1];
    const lx = toX(last.t);
    const ly = toY(type === 's' ? last.s : last.v);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
