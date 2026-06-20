/* ============================================================
 * 物绘流光 PhysFlux - 模拟物品库管理器
 * ============================================================ */

import { ObjectLibrary } from '../config/objects.js';
import { Storage } from '../utils/storage.js';

export class ObjectLibraryManager {
  constructor(engine, renderer, player) {
    this.engine = engine;
    this.renderer = renderer;
    this.player = player;
    this.currentCategory = '';
    this.activeObjectName = '';

    this._buildUI();
    this._bindEvents();
    this._renderCategoryTabs();
    this._renderObjectGrid();
    this._renderCustomList();
  }

  _buildUI() {
    const container = document.getElementById('objectLibraryPanel');
    if (!container) return;
    container.innerHTML = `
      <div class="obj-category-tabs" id="objCategoryTabs"></div>
      <div class="obj-grid" id="objGrid"></div>
      <div class="obj-active-info" id="objActiveInfo" hidden>
        <span class="obj-active-label">当前物品：</span>
        <span class="obj-active-name" id="objActiveName">—</span>
        <button id="objClearActive" class="btn btn-ghost btn-sm" title="清除物品设置">✕</button>
      </div>
      <div class="obj-custom-section">
        <div class="obj-custom-title">创建自定义物品</div>
        <div class="obj-custom-form" id="objCustomForm">
          <div class="form-row">
            <label class="form-label">名称</label>
            <input type="text" id="objName" class="text-input" placeholder="如：铅球" maxlength="20" />
          </div>
          <div class="form-row">
            <label class="form-label">质量 (kg)</label>
            <input type="number" id="objMass" class="num-input" min="0.001" max="100" step="0.1" value="1" />
          </div>
          <div class="form-row">
            <label class="form-label">半径 (px)</label>
            <input type="number" id="objRadius" class="num-input" min="2" max="30" step="1" value="6" />
          </div>
          <div class="form-row">
            <label class="form-label">颜色</label>
            <div class="color-picker-row">
              <input type="color" id="objColor" class="color-input" value="#A8B5B0" />
              <div class="color-presets">
                <button class="color-preset" style="background:#A8B5B0" data-color="#A8B5B0"></button>
                <button class="color-preset" style="background:#C9A88A" data-color="#C9A88A"></button>
                <button class="color-preset" style="background:#D4A574" data-color="#D4A574"></button>
                <button class="color-preset" style="background:#6B7B8C" data-color="#6B7B8C"></button>
                <button class="color-preset" style="background:#3E4A55" data-color="#3E4A55"></button>
                <button class="color-preset" style="background:#C97A6A" data-color="#C97A6A"></button>
              </div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">描述</label>
            <input type="text" id="objDesc" class="text-input" placeholder="物品描述（可选）" maxlength="50" />
          </div>
          <div class="form-actions">
            <button id="objApplyOnce" class="btn btn-outline btn-sm">仅应用</button>
            <button id="objSaveCustom" class="btn btn-primary btn-sm">保存并应用</button>
          </div>
        </div>
      </div>
      <div class="obj-custom-list-section">
        <div class="obj-custom-title">我的自定义物品</div>
        <div class="obj-custom-list" id="objCustomList">
          <div class="empty-hint">暂无自定义物品</div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    document.getElementById('objClearActive').addEventListener('click', () => {
      this.activeObjectName = '';
      this.engine.setCustomObject(null);
      this._updateActiveInfo();
      if (this.player) this.player.stop();
      if (this.renderer) { this.renderer.snapTransform(); this.renderer.render(); }
    });

    document.querySelectorAll('.color-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('objColor').value = btn.dataset.color;
      });
    });

    document.getElementById('objApplyOnce').addEventListener('click', () => {
      const obj = this._collectFormData();
      if (!obj) return;
      this._applyObject(obj, obj.name + '（临时）');
    });

    document.getElementById('objSaveCustom').addEventListener('click', () => this._saveCustomObject());
  }

  _renderCategoryTabs() {
    const tabs = document.getElementById('objCategoryTabs');
    const categories = ObjectLibrary.getCategories();
    if (categories.length === 0) return;
    if (!this.currentCategory) this.currentCategory = categories[0];

    tabs.innerHTML = categories.map((cat) => `
      <button class="obj-tab ${cat === this.currentCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('');

    tabs.querySelectorAll('.obj-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.currentCategory = tab.dataset.cat;
        this._renderCategoryTabs();
        this._renderObjectGrid();
      });
    });
  }

  _renderObjectGrid() {
    const grid = document.getElementById('objGrid');
    const items = ObjectLibrary.getByCategory(this.currentCategory);
    if (items.length === 0) { grid.innerHTML = '<div class="empty-hint">该分类暂无物品</div>'; return; }
    grid.innerHTML = items.map((item) => `
      <div class="obj-card ${this.activeObjectName === item.name ? 'active' : ''}" data-name="${item.name}">
        <div class="obj-card-icon" style="background:${item.color}; width:${item.radius * 2.5}px; height:${item.radius * 2.5}px;"></div>
        <div class="obj-card-name">${item.name}</div>
        <div class="obj-card-info font-mono">${item.mass}kg · r${item.radius}</div>
        <div class="obj-card-desc">${item.description || ''}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.obj-card').forEach((card) => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        const obj = ObjectLibrary.findByName(name);
        if (obj) this._applyObject(obj, name);
      });
    });
  }

  _renderCustomList() {
    const list = document.getElementById('objCustomList');
    const customs = Storage.getCustomObjects();
    const names = Object.keys(customs);
    if (names.length === 0) { list.innerHTML = '<div class="empty-hint">暂无自定义物品</div>'; return; }
    list.innerHTML = names.map((name) => {
      const obj = customs[name];
      return `
        <div class="obj-custom-item ${this.activeObjectName === name ? 'active' : ''}" data-name="${name}">
          <div class="obj-custom-icon" style="background:${obj.color}"></div>
          <div class="obj-custom-info">
            <div class="obj-custom-name">${name}</div>
            <div class="obj-custom-meta font-mono">${obj.mass}kg · r${obj.radius}</div>
          </div>
          <div class="obj-custom-actions">
            <button class="icon-action apply" title="应用">✓</button>
            <button class="icon-action delete" title="删除">✕</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.obj-custom-item').forEach((item) => {
      const name = item.dataset.name;
      item.querySelector('.apply').addEventListener('click', (e) => {
        e.stopPropagation();
        const customs = Storage.getCustomObjects();
        if (customs[name]) this._applyObject(customs[name], name);
      });
      item.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`确认删除自定义物品「${name}」？`)) {
          Storage.deleteCustomObject(name);
          this._renderCustomList();
          if (this.activeObjectName === name) {
            this.activeObjectName = '';
            this.engine.setCustomObject(null);
            this._updateActiveInfo();
          }
        }
      });
    });
  }

  _collectFormData() {
    const name = document.getElementById('objName').value.trim();
    const mass = parseFloat(document.getElementById('objMass').value);
    const radius = parseFloat(document.getElementById('objRadius').value);
    const color = document.getElementById('objColor').value;
    const desc = document.getElementById('objDesc').value.trim();
    if (!name) { alert('请输入物品名称'); return null; }
    if (isNaN(mass) || mass <= 0 || mass > 100) { alert('质量必须在 0 ~ 100 kg 之间'); return null; }
    if (isNaN(radius) || radius < 2 || radius > 30) { alert('半径必须在 2 ~ 30 px 之间'); return null; }
    return { name, mass, radius, color, description: desc };
  }

  _saveCustomObject() {
    const obj = this._collectFormData();
    if (!obj) return;
    Storage.saveCustomObject(obj.name, obj);
    this._renderCustomList();
    this._applyObject(obj, obj.name);
    document.getElementById('objName').value = '';
    document.getElementById('objDesc').value = '';
  }

  _applyObject(obj, displayName) {
    this.activeObjectName = displayName || obj.name;
    this.engine.setCustomObject({ mass: obj.mass, radius: obj.radius, color: obj.color });
    this._updateActiveInfo();
    this._renderObjectGrid();
    this._renderCustomList();
    if (this.player) this.player.stop();
    if (this.renderer) { this.renderer.snapTransform(); this.renderer.render(); }
  }

  _updateActiveInfo() {
    const info = document.getElementById('objActiveInfo');
    const nameEl = document.getElementById('objActiveName');
    if (this.activeObjectName) { info.hidden = false; nameEl.textContent = this.activeObjectName; }
    else { info.hidden = true; }
  }
}
