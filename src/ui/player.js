/* ============================================================
 * 物绘流光 PhysFlux - 播放控制器
 * 管理播放/暂停/单步/重置/清除/导出 等播放控制
 * ============================================================ */

export class PlayerController {
  constructor(engine, renderer, callbacks = {}) {
    this.engine = engine;
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.playing = false;
    this._bindButtons();
  }

  _bindButtons() {
    const btnPlay = document.getElementById('btnPlay');
    const btnStep = document.getElementById('btnStep');
    const btnReset = document.getElementById('btnReset');
    const btnClear = document.getElementById('btnClear');
    const btnExport = document.getElementById('btnExport');
    if (btnPlay) btnPlay.addEventListener('click', () => this.togglePlay());
    if (btnStep) btnStep.addEventListener('click', () => this.step());
    if (btnReset) btnReset.addEventListener('click', () => this.reset());
    if (btnClear) btnClear.addEventListener('click', () => this.clear());
    if (btnExport) btnExport.addEventListener('click', () => this.exportImage());

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      else if (e.code === 'KeyR') { this.reset(); }
      else if (e.code === 'KeyS') { this.step(); }
    });
  }

  togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      if (this.engine.isFinished()) this.engine.reset();
      this.renderer.start();
    } else {
      this.renderer.stop();
    }
    this._updatePlayButton();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.playing);
  }

  step() {
    if (this.playing) this.togglePlay();
    if (this.engine.isFinished()) this.engine.reset();
    this.renderer.renderOnce();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(false);
  }

  reset() {
    this.engine.reset();
    this.renderer.snapTransform();
    this.renderer.render();
    if (this.callbacks.onReset) this.callbacks.onReset();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(false);
  }

  clear() {
    const bodies = this.engine.getBodies();
    for (const body of bodies) body.trail = [];
    this.renderer.render();
    if (this.callbacks.onClear) this.callbacks.onClear();
  }

  exportImage() { this.renderer.exportImage(); }

  _updatePlayButton() {
    const btn = document.getElementById('btnPlay');
    if (btn) btn.textContent = this.playing ? '❚❚ 暂停' : '▶ 播放';
  }

  stop() {
    this.playing = false;
    this.renderer.stop();
    this._updatePlayButton();
  }
}
