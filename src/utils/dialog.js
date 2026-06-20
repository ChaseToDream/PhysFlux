/* ============================================================
 * 物绘流光 PhysFlux - 轻量对话框工具
 * 替代原生 prompt/confirm/alert，提供与国风主题一致的弹窗
 * 所有方法返回 Promise，便于异步流程编排
 * ============================================================ */

/**
 * 创建并显示一个模态对话框
 * @param {Object} opts
 * @param {string} opts.title 标题
 * @param {string} opts.message 正文说明
 * @param {'prompt'|'confirm'|'alert'} opts.type 类型
 * @param {string} [opts.defaultValue] prompt 默认值
 * @param {string} [opts.confirmText] 确认按钮文案
 * @param {string} [opts.cancelText] 取消按钮文案
 * @returns {Promise<{confirmed:boolean,value:string|null}>}
 */
export function showDialog(opts) {
  const {
    title = '提示',
    message = '',
    type = 'alert',
    defaultValue = '',
    confirmText = '确定',
    cancelText = '取消',
  } = opts;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'pf-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'pf-dialog';

    const header = document.createElement('div');
    header.className = 'pf-dialog-header';
    header.innerHTML = `<span class="pf-dialog-title">${title}</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pf-dialog-close';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'pf-dialog-body';
    if (message) {
      const msg = document.createElement('p');
      msg.className = 'pf-dialog-message';
      msg.textContent = message;
      body.appendChild(msg);
    }
    let input = null;
    if (type === 'prompt') {
      input = document.createElement('input');
      input.className = 'pf-dialog-input';
      input.type = 'text';
      input.value = defaultValue;
      body.appendChild(input);
    }

    const footer = document.createElement('div');
    footer.className = 'pf-dialog-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = cancelText;
    const okBtn = document.createElement('button');
    okBtn.className = 'btn btn-primary';
    okBtn.textContent = confirmText;
    if (type === 'alert') {
      footer.appendChild(okBtn);
    } else {
      footer.appendChild(cancelBtn);
      footer.appendChild(okBtn);
    }

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 触发进入动画
    requestAnimationFrame(() => overlay.classList.add('pf-dialog-show'));

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      overlay.classList.remove('pf-dialog-show');
      setTimeout(() => overlay.remove(), 200);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onConfirm = () => {
      finish({ confirmed: true, value: input ? input.value : null });
    };
    const onCancel = () => {
      finish({ confirmed: false, value: null });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && type !== 'alert') {
        e.preventDefault();
        onConfirm();
      }
    };

    okBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) onCancel();
    });
    document.addEventListener('keydown', onKey);

    if (input) {
      requestAnimationFrame(() => { input.focus(); input.select(); });
    } else {
      requestAnimationFrame(() => okBtn.focus());
    }
  });
}

/** 替代 prompt：返回用户输入字符串，取消则返回 null */
export async function showPrompt(title, defaultValue = '', message = '') {
  const res = await showDialog({ title, message, type: 'prompt', defaultValue });
  return res.confirmed ? res.value : null;
}

/** 替代 confirm：返回布尔值 */
export async function showConfirm(title, message, confirmText = '确定') {
  const res = await showDialog({ title, message, type: 'confirm', confirmText });
  return res.confirmed;
}

/** 替代 alert：仅提示，无返回值 */
export async function showAlert(title, message) {
  await showDialog({ title, message, type: 'alert' });
}
