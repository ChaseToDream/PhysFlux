/* ============================================================
 * 物绘流光 PhysFlux - 简单页面路由
 * 管理经典模型页与自由沙盒页之间的切换
 * 基于 location.hash 实现：支持刷新保持、浏览器前进/后退、可分享链接
 * ============================================================ */

export class Router {
  constructor(pages) {
    /** 已注册的页面 { name: pageInstance } */
    this.pages = pages;
    this.currentPage = null;
    this._bindNav();
    window.addEventListener('hashchange', () => this._onHashChange());
  }

  _bindNav() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.navigate(page);
      });
    });
  }

  /** 从 location.hash 解析页面名（#/sandbox → sandbox），无效时返回空串 */
  _parseHash() {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const name = raw.split(/[/?#]/)[0];
    return this.pages[name] ? name : '';
  }

  /** hashchange 回调：浏览器前进/后退时同步切换页面 */
  _onHashChange() {
    const name = this._parseHash();
    if (name && name !== this.currentPage) this._switch(name);
  }

  /** 实际执行页面切换（DOM + 生命周期 + 状态更新），不触碰 hash */
  _switch(name) {
    if (this.currentPage === name) return;
    if (!this.pages[name]) return;
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach((el) => {
      el.classList.remove('page-active');
    });
    // 显示目标页面
    const target = document.getElementById(`page-${name}`);
    if (target) target.classList.add('page-active');

    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === name);
    });

    // 通知页面切换
    if (this.currentPage && this.pages[this.currentPage]) {
      this.pages[this.currentPage].onHide();
    }
    if (this.pages[name]) {
      this.pages[name].onShow();
    }
    this.currentPage = name;
  }

  /** 切换到指定页面并写入 hash（产生历史记录，支持前进/后退） */
  navigate(name) {
    if (!this.pages[name]) return;
    if (this.currentPage === name) return;
    this._switch(name);
    const target = '#/' + name;
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }

  /** 初始化：从 hash 恢复页面，无 hash 时默认 classic。用 replaceState 写入初始 hash，避免首屏产生多余历史记录 */
  init() {
    const name = this._parseHash() || 'classic';
    this._switch(name);
    const target = '#/' + name;
    if (window.location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }
}
