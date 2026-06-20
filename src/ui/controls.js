/* ============================================================
 * 物绘流光 PhysFlux - 参数控件管理
 * ============================================================ */

import { Helpers } from '../utils/helpers.js';

export class ControlsManager {
  constructor(container, engine, onParamChange) {
    this.container = container;
    this.engine = engine;
    this.onParamChange = onParamChange;
    this.schema = [];
    this._debouncedNotify = Helpers.debounce((params) => {
      if (this.onParamChange) this.onParamChange(params);
    }, 60);
  }

  rebuild(modelType) {
    this.schema = this.engine.getParamSchema(modelType);
    this.container.innerHTML = '';

    for (const item of this.schema) {
      const wrap = document.createElement('div');
      wrap.className = 'param-item';

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

      const inputRow = document.createElement('div');
      inputRow.className = 'param-input-row';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'param-slider';
      slider.min = item.min; slider.max = item.max; slider.step = item.step;
      slider.value = item.default;

      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.className = 'num-input';
      numInput.min = item.min; numInput.max = item.max; numInput.step = item.step;
      numInput.value = item.default;

      inputRow.appendChild(slider);
      inputRow.appendChild(numInput);
      wrap.appendChild(labelRow);
      wrap.appendChild(inputRow);
      this.container.appendChild(wrap);

      this._bindControl(item, slider, numInput, value);
    }
  }

  _bindControl(item, slider, numInput, valueLabel) {
    const update = (rawVal, source) => {
      let val = parseFloat(rawVal);
      if (isNaN(val)) { numInput.classList.add('invalid'); return null; }
      val = Helpers.clamp(val, item.min, item.max);
      numInput.classList.remove('invalid');
      if (source !== 'slider') slider.value = val;
      if (source !== 'input') numInput.value = val;
      valueLabel.textContent = this._fmtVal(val, item);
      return val;
    };

    slider.addEventListener('input', () => {
      const val = update(slider.value, 'slider');
      if (val !== null) this._notifyChange(item.key, val);
    });
    numInput.addEventListener('input', () => {
      const val = update(numInput.value, 'input');
      if (val !== null) this._notifyChange(item.key, val);
    });
    numInput.addEventListener('blur', () => {
      let val = parseFloat(numInput.value);
      if (isNaN(val)) {
        val = item.default;
        numInput.value = val; slider.value = val;
        numInput.classList.remove('invalid');
        valueLabel.textContent = this._fmtVal(val, item);
        this._notifyChange(item.key, val);
      }
    });
  }

  _notifyChange(key, val) {
    const params = {};
    params[key] = val;
    this._debouncedNotify(params);
  }

  _fmtVal(val, item) {
    const decimals = item.step < 1 ? 2 : 0;
    return Helpers.fmt(val, decimals) + (item.unit ? ' ' + item.unit : '');
  }

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
      slider.value = val; numInput.value = val;
      numInput.classList.remove('invalid');
      valueLabel.textContent = this._fmtVal(val, item);
    });
  }

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
