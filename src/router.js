/* ============================================================
 * 物绘流光 PhysFlux - 简单页面路由
 * 管理经典模型页与自由沙盒页之间的切换
 * ============================================================ */

import { Helpers } from './utils/helpers.js';

export class Router {
  constructor(pages) {
    /** 已注册的页面 { name: pageInstance } */
    this.pages = pages;
    this.currentPage = null;
    this._bindNav();
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

  /** 切换到指定页面 */
  navigate(name) {
    if (this.currentPage === name) return;
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
    // 持久化当前页面
    Helpers._currentPage = name;
  }

  /** 初始化默认页面 */
  init() {
    this.navigate('classic');
  }
}
