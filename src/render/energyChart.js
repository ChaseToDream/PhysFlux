/* ============================================================
 * 物绘流光 PhysFlux - 能量曲线图渲染器
 * 绘制动能(Ek)、势能(Ep)、总能量(E)三条曲线，直观展示能量转化
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export class EnergyChartRenderer {
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

  /** 采样能量数据 */
  sample(engine, time) {
    this._counter++;
    if (this._counter % 5 !== 0) return;
    const ek = engine.getKineticEnergy();
    const ep = engine.getPotentialEnergy();
    const et = ek + ep;
    this.samples.push({ t: time, ek, ep, et });
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }

  draw() {
    const { ctx, w, h } = this;
    const theme = {
      axis: Helpers.cssVar('--axis-color') || '#B5AE9F',
      grid: Helpers.cssVar('--grid-color') || '#E8E2D5',
      text: Helpers.cssVar('--text-muted') || '#8B9A94',
    };
    // 三条曲线颜色
    const colors = {
      ek: Helpers.cssVar('--vector-velocity') || '#6B7B8C', // 动能-蓝
      ep: Helpers.cssVar('--vector-force') || '#C9A88A',    // 势能-赭
      et: Helpers.cssVar('--trail-glow') || '#D4A574',      // 总能-金
    };

    ctx.clearRect(0, 0, w, h);

    const padL = 32, padR = 8, padT = 18, padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // 网格
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 坐标轴
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

    // 图例
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const legend = [['Ek', colors.ek], ['Ep', colors.ep], ['E', colors.et]];
    legend.forEach(([label, color], i) => {
      const lx = padL + 4 + i * 40;
      ctx.fillStyle = color;
      ctx.fillRect(lx, padT - 14, 8, 8);
      ctx.fillStyle = theme.text;
      ctx.fillText(label, lx + 10, padT - 15);
    });

    if (this.samples.length < 2) {
      ctx.fillStyle = theme.text;
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', w / 2, h / 2);
      return;
    }

    const tMin = this.samples[0].t;
    const tMax = this.samples[this.samples.length - 1].t;
    let valMax = 0, valMin = 0;
    for (const s of this.samples) {
      valMax = Math.max(valMax, s.ek, s.ep, s.et);
      valMin = Math.min(valMin, s.ek, s.ep, s.et);
    }
    valMax = Math.max(0.1, valMax * 1.1);
    valMin = Math.min(0, valMin * 1.1);
    const valRange = Math.max(0.1, valMax - valMin);
    const tRange = Math.max(0.1, tMax - tMin);

    const toX = (t) => padL + ((t - tMin) / tRange) * plotW;
    const toY = (val) => padT + plotH - ((val - valMin) / valRange) * plotH;

    // 刻度
    ctx.fillStyle = theme.text;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Helpers.fmt(valMax, 1), padL - 3, padT + 4);
    ctx.fillText(Helpers.fmt(valMin, 1), padL - 3, padT + plotH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(Helpers.fmt(tMin, 1) + 's', padL, padT + plotH + 3);
    ctx.fillText(Helpers.fmt(tMax, 1) + 's', padL + plotW, padT + plotH + 3);

    // 绘制三条曲线
    const drawLine = (key, color) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(toX(this.samples[0].t), toY(this.samples[0][key]));
      for (let i = 1; i < this.samples.length; i++) {
        const s = this.samples[i];
        ctx.lineTo(toX(s.t), toY(s[key]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    };

    drawLine('ek', colors.ek);
    drawLine('ep', colors.ep);
    drawLine('et', colors.et);
  }
}
