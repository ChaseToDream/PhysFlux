/* ============================================================
 * 物绘流光 PhysFlux - 二维向量工具类
 * 物理计算的基础数据结构，封装常见向量运算
 * 注：Canvas 坐标系 y 轴向下，物理坐标系 y 轴向上，
 *      渲染层负责坐标转换，本类保持物理坐标系语义。
 * ============================================================ */

class Vec2 {
  /**
   * @param {number} x x 分量
   * @param {number} y y 分量
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** 克隆向量，避免引用污染 */
  clone() {
    return new Vec2(this.x, this.y);
  }

  /** 设置分量 */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /** 复制另一向量的值 */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /** 加法：返回新向量 this + v */
  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /** 原地加法 */
  addInPlace(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** 减法：返回新向量 this - v */
  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /** 数乘：返回新向量 */
  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  /** 向量模长（长度） */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 模长平方（避免开方，用于比较） */
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  /** 距离另一向量的距离 */
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 归一化为单位向量 */
  normalize() {
    const len = this.length();
    if (len < 1e-9) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  /** 旋转（弧度），返回新向量 */
  rotate(rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return new Vec2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /** 点积 */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /** 与水平轴的夹角（弧度） */
  angle() {
    return Math.atan2(this.y, this.x);
  }

  /** 转字符串（调试用） */
  toString() {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}

window.Vec2 = Vec2;
