/* ============================================================
 * 物绘流光 PhysFlux - 通用工具函数
 * 提供数值钳制、防抖、格式化等无副作用纯函数
 * ============================================================ */

export const Helpers = {
  /** 数值钳制：将 value 限制在 [min, max] 区间 */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /** 线性插值 */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /** 角度转弧度 */
  degToRad(deg) {
    return (deg * Math.PI) / 180;
  },

  /** 弧度转角度 */
  radToDeg(rad) {
    return (rad * 180) / Math.PI;
  },

  /** 数值格式化：保留指定位小数，去除尾零 */
  fmt(value, digits = 2) {
    if (!isFinite(value)) return '—';
    return Number(value.toFixed(digits)).toString();
  },

  /** 防抖函数 */
  debounce(fn, wait = 50) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  /** 唯一 ID 生成 */
  uid: (() => {
    let id = 0;
    return () => ++id;
  })(),

  /** 深拷贝对象 */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => Helpers.deepClone(item));
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = Helpers.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  /** 读取 CSS 变量值 */
  cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  },

  /**
   * 将十六进制颜色转为 rgba 字符串。
   * 支持 #RGB、#RRGGBB、#RRGGBBAA 三种格式；非法输入回退为不透明黑，
   * 避免 parseInt 产生 NaN 导致 canvas 颜色解析失败。
   */
  hexToRgba(hex, alpha) {
    const a = Helpers.clamp(alpha, 0, 1);
    if (typeof hex !== 'string') return `rgba(0,0,0,${a})`;
    const h = hex.trim().replace(/^#/, '');
    let r, g, b;
    if (/^[0-9a-fA-F]{3}$/.test(h)) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (/^[0-9a-fA-F]{6}$/.test(h)) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    } else if (/^[0-9a-fA-F]{8}$/.test(h)) {
      // #RRGGBBAA：忽略自带 alpha，使用传入 alpha 统一控制
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    } else {
      return `rgba(0,0,0,${a})`;
    }
    return `rgba(${r},${g},${b},${a})`;
  },

  /** 显示短暂提示 Toast */
  toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    if (!el) { console.log('[toast]', msg); return; }
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('toast-show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove('toast-show');
    }, duration);
  },
};
