/* ============================================================
 * 物绘流光 PhysFlux - WebM 动画录制器
 * 使用 MediaRecorder API 录制画布为 WebM 视频文件
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export class AnimationRecorder {
  /**
   * @param {CanvasRenderer} renderer 画布渲染器
   * @param {Object} options 选项
   *   - buttonId: 录制按钮元素 ID（默认 'btnRecord'）
   *   - indicatorId: 录制指示器元素 ID（默认 'recordIndicator'）
   *   - timeId: 录制时间显示元素 ID（默认 'recTime'）
   *   - autoBind: 是否自动绑定按钮点击事件（默认 true）
   */
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.mediaRecorder = null;
    this.chunks = [];
    this.recording = false;
    this.startTime = 0;
    this._timerId = null;
    this.buttonId = options.buttonId || 'btnRecord';
    this.indicatorId = options.indicatorId || 'recordIndicator';
    this.timeId = options.timeId || 'recTime';
    if (options.autoBind !== false) this._bindButton();
  }

  _bindButton() {
    const btn = document.getElementById(this.buttonId);
    if (btn) btn.addEventListener('click', () => this.toggle());
  }

  /** 切换录制状态 */
  toggle() {
    if (this.recording) this.stop();
    else this.start();
  }

  /** 开始录制 */
  start() {
    const stream = this.renderer.captureStream(30);
    if (!stream) {
      Helpers.toast('当前浏览器不支持画布录制');
      return;
    }

    // 选择支持的 MIME 类型
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    let mimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) { mimeType = type; break; }
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
    } catch (e) {
      console.error('[PhysFlux] 创建 MediaRecorder 失败:', e);
      Helpers.toast('录制功能不可用：' + e.message);
      return;
    }

    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this._download();

    this.mediaRecorder.start(100); // 每 100ms 收集一次数据
    this.recording = true;
    this.startTime = performance.now();
    this._updateButton();
    this._updateIndicator(true);
    Helpers.toast('开始录制动画…');
  }

  /** 停止录制并下载 */
  stop() {
    if (!this.recording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.recording = false;
    this._updateButton();
    this._updateIndicator(false);
    Helpers.toast('录制结束，正在保存 WebM…');
  }

  /** 下载录制文件 */
  _download() {
    if (this.chunks.length === 0) return;
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const duration = ((performance.now() - this.startTime) / 1000).toFixed(1);
    link.download = `physflux_${this.renderer.engine.currentType}_${duration}s_${Date.now()}.webm`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  _updateButton() {
    const btn = document.getElementById(this.buttonId);
    if (!btn) return;
    if (this.recording) {
      btn.textContent = '■ 停止';
      btn.classList.add('recording');
    } else {
      btn.textContent = '● 录制';
      btn.classList.remove('recording');
    }
  }

  _updateIndicator(show) {
    const indicator = document.getElementById(this.indicatorId);
    if (!indicator) return;
    indicator.hidden = !show;
    if (show) {
      this._timerId = setInterval(() => {
        const elapsed = (performance.now() - this.startTime) / 1000;
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
        const timeEl = document.getElementById(this.timeId);
        if (timeEl) timeEl.textContent = `${mm}:${ss}`;
      }, 500);
    } else if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }
}
