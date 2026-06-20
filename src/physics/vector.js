/* ============================================================
 * 物绘流光 PhysFlux - 二维向量工具类
 * 物理计算的基础数据结构，封装常见向量运算
 * 注：Canvas 坐标系 y 轴向下，物理坐标系 y 轴向上，
 *      渲染层负责坐标转换，本类保持物理坐标系语义。
 * ============================================================ */

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() { return new Vec2(this.x, this.y); }

  set(x, y) { this.x = x; this.y = y; return this; }

  copy(v) { this.x = v.x; this.y = v.y; return this; }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }

  addInPlace(v) { this.x += v.x; this.y += v.y; return this; }

  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }

  /** 原地减法：this -= v */
  subInPlace(v) { this.x -= v.x; this.y -= v.y; return this; }

  scale(s) { return new Vec2(this.x * s, this.y * s); }

  /** 原地缩放：this *= s */
  scaleInPlace(s) { this.x *= s; this.y *= s; return this; }

  /**
   * 原地加权加法：this += v * s
   * 替代 this.addInPlace(v.scale(s)) 模式，避免分配临时向量。
   * 物理步进热路径（积分、力累加、碰撞冲量）高频使用。
   */
  addScaledInPlace(v, s) { this.x += v.x * s; this.y += v.y * s; return this; }

  /** 原地加权减法：this -= v * s */
  subScaledInPlace(v, s) { this.x -= v.x * s; this.y -= v.y * s; return this; }

  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }

  lengthSq() { return this.x * this.x + this.y * this.y; }

  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  normalize() {
    const len = this.length();
    if (len < 1e-9) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  /** 原地归一化：this /= |this|，零向量归零 */
  normalizeInPlace() {
    const len = this.length();
    if (len < 1e-9) { this.x = 0; this.y = 0; }
    else { this.x /= len; this.y /= len; }
    return this;
  }

  rotate(rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  dot(v) { return this.x * v.x + this.y * v.y; }

  angle() { return Math.atan2(this.y, this.x); }

  toString() { return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
}
