/* ============================================================
 * 物绘流光 PhysFlux - 播放控制器
 * 管理播放/暂停/单步/重置/清除/导出 等播放控制
 * ============================================================ */

class PlayerController {
  /**
   * @param {PhysicsEngine} engine 物理引擎
   * @param {CanvasRenderer} renderer 画布渲染器
   * @param {Object} callbacks 回调集合 { onStateChange, onReset, onClear }
   */
  constructor(engine, renderer, callbacks = {}) {
    this.engine = engine;
    this.renderer = renderer;
    this.callbacks = callbacks;
    /** 是否正在播放 */
    this.playing = false;

    this._bindButtons();
  }

  _bindButtons() {
    document.getElementById('btnPlay').addEventListener('click', () => this.togglePlay());
    document.getElementById('btnStep').addEventListener('click', () => this.step());
    document.getElementById('btnReset').addEventListener('click', () => this.reset());
    document.getElementById('btnClear').addEventListener('click', () => this.clear());
    document.getElementById('btnExport').addEventListener('click', () => this.exportImage());

    // 键盘快捷键：空格播放/暂停
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'KeyR') {
        this.reset();
      } else if (e.code === 'KeyS') {
        this.step();
      }
    });
  }

  /** 切换播放/暂停 */
  togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      // 若已结束，先重置再播放
      if (this.engine.isFinished()) {
        this.engine.reset();
      }
      this.renderer.start();
    } else {
      this.renderer.stop();
    }
    this._updatePlayButton();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.playing);
  }

  /** 单步推演 */
  step() {
    if (this.playing) this.togglePlay();
    if (this.engine.isFinished()) this.engine.reset();
    this.renderer.renderOnce();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(false);
  }

  /** 重置到初始状态 */
  reset() {
    this.engine.reset();
    this.renderer.snapTransform();
    this.renderer.render();
    if (this.callbacks.onReset) this.callbacks.onReset();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(false);
  }

  /** 清除轨迹（保留物体，清空轨迹点） */
  clear() {
    const bodies = this.engine.getBodies();
    for (const body of bodies) {
      body.trail = [];
    }
    this.renderer.render();
    if (this.callbacks.onClear) this.callbacks.onClear();
  }

  /** 导出当前画布为 PNG */
  exportImage() {
    this.renderer.exportImage();
  }

  /** 更新播放按钮文案 */
  _updatePlayButton() {
    const btn = document.getElementById('btnPlay');
    btn.textContent = this.playing ? '❚❚ 暂停' : '▶ 播放';
  }

  /** 外部调用：停止播放（如切换模型时） */
  stop() {
    this.playing = false;
    this.renderer.stop();
    this._updatePlayButton();
  }
}

window.PlayerController = PlayerController;
