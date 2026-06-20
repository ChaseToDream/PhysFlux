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

  scale(s) { return new Vec2(this.x * s, this.y * s); }

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

  rotate(rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  dot(v) { return this.x * v.x + this.y * v.y; }

  angle() { return Math.atan2(this.y, this.x); }

  toString() { return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
}
