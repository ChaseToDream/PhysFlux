/* ============================================================
 * 物绘流光 PhysFlux - 通用工具函数
 * 提供数值钳制、防抖、格式化等无副作用纯函数
 * ============================================================ */

const Helpers = {
  /**
   * 数值钳制：将 value 限制在 [min, max] 区间
   * @param {number} value 输入值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @returns {number} 钳制后的值
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * 线性插值
   * @param {number} a 起点值
   * @param {number} b 终点值
   * @param {number} t 插值因子 [0,1]
   * @returns {number} 插值结果
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * 角度转弧度
   * @param {number} deg 角度值
   * @returns {number} 弧度值
   */
  degToRad(deg) {
    return (deg * Math.PI) / 180;
  },

  /**
   * 弧度转角度
   * @param {number} rad 弧度值
   * @returns {number} 角度值
   */
  radToDeg(rad) {
    return (rad * 180) / Math.PI;
  },

  /**
   * 数值格式化：保留指定位小数，去除尾零
   * @param {number} value 数值
   * @param {number} digits 小数位数
   * @returns {string} 格式化字符串
   */
  fmt(value, digits = 2) {
    if (!isFinite(value)) return '—';
    return Number(value.toFixed(digits)).toString();
  },

  /**
   * 防抖函数：延迟执行，避免高频触发
   * @param {Function} fn 目标函数
   * @param {number} wait 等待毫秒
   * @returns {Function} 防抖后的函数
   */
  debounce(fn, wait = 50) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  /**
   * 唯一 ID 生成（简易版，用于物体标识）
   * @returns {number} 自增 ID
   */
  uid: (() => {
    let id = 0;
    return () => ++id;
  })(),

  /**
   * 深拷贝对象（用于参数快照，避免引用污染）
   * @param {*} obj 任意对象
   * @returns {*} 深拷贝结果
   */
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

  /**
   * 读取 CSS 变量值（用于画布取主题色）
   * @param {string} name 变量名，如 '--accent'
   * @returns {string} 变量值
   */
  cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  },
};

// 挂载到全局，供各模块使用（纯静态无模块系统）
window.Helpers = Helpers;
