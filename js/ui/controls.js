/* ============================================================
 * 物绘流光 PhysFlux - 参数控件管理
 * 根据当前模型的 paramSchema 动态生成滑块+数字输入框
 * 含输入校验、非法值拦截、防抖通知
 * ============================================================ */

class ControlsManager {
  /**
   * @param {HTMLElement} container 控件容器
   * @param {PhysicsEngine} engine 物理引擎
   * @param {Function} onParamChange 参数变化回调（防抖后触发）
   */
  constructor(container, engine, onParamChange) {
    this.container = container;
    this.engine = engine;
    this.onParamChange = onParamChange;
    /** 当前 schema */
    this.schema = [];
    /** 防抖通知 */
    this._debouncedNotify = Helpers.debounce((params) => {
      if (this.onParamChange) this.onParamChange(params);
    }, 60);
  }

  /**
   * 根据模型类型重建控件
   * @param {string} modelType 模型类型
   */
  rebuild(modelType) {
    this.schema = this.engine.getParamSchema(modelType);
    this.container.innerHTML = '';

    for (const item of this.schema) {
      const wrap = document.createElement('div');
      wrap.className = 'param-item';

      // 标签行：名称 + 当前值
      const labelRow = document.createElement('div');
      labelRow.className = 'param-label';
      const name = document.createElement('span');
      name.className = 'param-name';
      name.textContent = item.label;
      const value = document.createElement('span');
      value.className = 'param-value font-mono';
      value.textContent = this._fmtVal(item.default, item);
      labelRow.appendChild(name);
      labelRow.appendChild(value);

      // 输入行：滑块 + 数字输入框
      const inputRow = document.createElement('div');
      inputRow.className = 'param-input-row';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'param-slider';
      slider.min = item.min;
      slider.max = item.max;
      slider.step = item.step;
      slider.value = item.default;

      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.className = 'num-input';
      numInput.min = item.min;
      numInput.max = item.max;
      numInput.step = item.step;
      numInput.value = item.default;

      inputRow.appendChild(slider);
      inputRow.appendChild(numInput);

      wrap.appendChild(labelRow);
      wrap.appendChild(inputRow);
      this.container.appendChild(wrap);

      // 绑定联动事件
      this._bindControl(item, slider, numInput, value);
    }
  }

  /**
   * 绑定滑块与数字输入框的联动
   */
  _bindControl(item, slider, numInput, valueLabel) {
    const update = (rawVal, source) => {
      // 输入校验与拦截
      let val = parseFloat(rawVal);
      if (isNaN(val)) {
        numInput.classList.add('invalid');
        return null;
      }
      // 钳制到合法范围
      val = Helpers.clamp(val, item.min, item.max);
      numInput.classList.remove('invalid');

      // 同步两个控件
      if (source !== 'slider') slider.value = val;
      if (source !== 'input') numInput.value = val;
      valueLabel.textContent = this._fmtVal(val, item);

      return val;
    };

    // 滑块拖动
    slider.addEventListener('input', () => {
      const val = update(slider.value, 'slider');
      if (val !== null) this._notifyChange(item.key, val);
    });

    // 数字输入框
    numInput.addEventListener('input', () => {
      const val = update(numInput.value, 'input');
      if (val !== null) this._notifyChange(item.key, val);
    });
    // 失焦时再次校验并复位
    numInput.addEventListener('blur', () => {
      let val = parseFloat(numInput.value);
      if (isNaN(val)) {
        val = item.default;
        numInput.value = val;
        slider.value = val;
        numInput.classList.remove('invalid');
        valueLabel.textContent = this._fmtVal(val, item);
        this._notifyChange(item.key, val);
      }
    });
  }

  /** 通知参数变化（防抖） */
  _notifyChange(key, val) {
    const params = {};
    params[key] = val;
    this._debouncedNotify(params);
  }

  /** 格式化数值显示（含单位） */
  _fmtVal(val, item) {
    const decimals = item.step < 1 ? 2 : 0;
    return Helpers.fmt(val, decimals) + (item.unit ? ' ' + item.unit : '');
  }

  /**
   * 从外部设置参数值（如载入预设时）
   * @param {Object} params 参数对象
   */
  setValues(params) {
    const items = this.container.querySelectorAll('.param-item');
    this.schema.forEach((item, idx) => {
      if (params[item.key] === undefined) return;
      const wrap = items[idx];
      if (!wrap) return;
      const slider = wrap.querySelector('.param-slider');
      const numInput = wrap.querySelector('.num-input');
      const valueLabel = wrap.querySelector('.param-value');
      const val = Helpers.clamp(params[item.key], item.min, item.max);
      slider.value = val;
      numInput.value = val;
      numInput.classList.remove('invalid');
      valueLabel.textContent = this._fmtVal(val, item);
    });
  }

  /** 收集当前所有参数值 */
  collectValues() {
    const params = {};
    this.schema.forEach((item, idx) => {
      const wrap = this.container.querySelectorAll('.param-item')[idx];
      if (wrap) {
        const slider = wrap.querySelector('.param-slider');
        params[item.key] = parseFloat(slider.value);
      }
    });
    return params;
  }
}

window.ControlsManager = ControlsManager;
