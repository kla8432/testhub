(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => Number(value).toLocaleString('th-TH', { maximumFractionDigits: 3 });
  const text = value => value == null || value === '' ? '—' : escape(value);
  const category = row => /^hotswap/i.test((row.name || '').trim()) ? 'Hotswap' : (row.category || '').trim() || 'ไม่ระบุ';
  const categories = rows => [...new Set(rows.map(category))].sort((a, b) => a.localeCompare(b, 'th'));
  function filter(rows, selected, query = '') {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(row => {
      if (selected && category(row) !== selected) return false;
      const searchable = [category(row), row.code, row.name, row.description, row.manufacturer, row.price, row.cycleLife, row.threshold, row.qty].join(' ').toLocaleLowerCase();
      return words.every(word => searchable.includes(word));
    });
  }
  function categoryBar(rows, selected) {
    const counts = new Map();
    rows.forEach(row => counts.set(category(row), (counts.get(category(row)) || 0) + 1));
    return `<div class="category-bar" role="group" aria-label="เลือกหมวดหมู่">${['', ...categories(rows)].map(name => `<button type="button" class="category-chip${selected === name ? ' selected' : ''}" aria-pressed="${selected === name}" data-category="${escape(name)}"><span>${escape(name || 'ทั้งหมด')}</span><span class="category-count">${number(name ? counts.get(name) : rows.length)}</span></button>`).join('')}</div>`;
  }
  function cycle(row) {
    const value = String(row.cycleLife ?? '').trim();
    if (!value) return '—';
    return `${escape(value)}${/^\d+(\.\d+)?$/.test(value) ? '<small class="cell-note">ยังไม่ระบุหน่วย</small>' : ''}`;
  }
  function table(rows, canWrite, online) {
    if (!rows.length) return '<div class="empty">ไม่พบรายการในหมวดหรือคำค้นนี้</div>';
    const headings = ['หมวด', 'MPN', 'Part name', 'รายละเอียด', 'ผู้ผลิต', 'ราคา (บาท)', 'รอบเปลี่ยน', 'Safety stock', 'คงเหลือ', 'รูป'];
    return `<div class="stock-table-scroll" role="region" aria-label="รายการสต็อก" tabindex="0"><table class="stock-table"><thead><tr>${headings.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>
      <td>${escape(category(row))}</td>
      <td class="mpn">${text(row.code)}</td>
      <td><strong>${text(row.name)}</strong>${canWrite ? `<button type="button" class="secondary stock-move" data-move="${escape(row.id)}" ${online ? '' : 'disabled'}>รับเข้า / เบิกออก</button>` : ''}</td>
      <td class="stock-description">${text(row.description)}</td>
      <td>${text(row.manufacturer)}</td>
      <td class="numeric">${row.price == null || row.price === '' ? '—' : Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td>
      <td>${cycle(row)}</td>
      <td class="numeric">${number(row.threshold)}</td>
      <td class="numeric"><strong>${number(row.qty)}</strong>${row.qty <= row.threshold ? '<small class="stock-low">ถึงจุดแจ้งเตือน</small>' : ''}</td>
      <td><span class="photo-placeholder">ยังไม่มีรูป</span></td>
    </tr>`).join('')}</tbody></table></div>`;
  }
  function fields(rows, selected = '') {
    const input = (name, label, type = 'text', required = false, value = '') => `<label>${label}${required ? ' *' : ''}<input name="${name}" type="${type}" value="${escape(value)}" ${required ? 'required' : ''} ${type === 'number' ? 'min="0" max="1000000000" step="0.001"' : ''}></label>`;
    return `<div class="stock-form-grid">
      <label>หมวด<input name="category" list="stock-category-options" value="${escape(selected)}"><datalist id="stock-category-options">${categories(rows).map(name => `<option value="${escape(name)}"></option>`).join('')}</datalist></label>
      ${input('code', 'MPN', 'text', true)}
      <div class="form-wide">${input('name', 'Part name', 'text', true)}</div>
      <label class="form-wide">รายละเอียด<textarea name="description"></textarea></label>
      ${input('manufacturer', 'ผู้ผลิต')}${input('price', 'ราคา (บาท)', 'number')}
      <div class="form-wide">${input('cycleLife', 'รอบเปลี่ยน')}<p class="field-hint">ใส่หน่วยด้วย เช่น 50000 tests หรือ Monthly ตามข้อมูลของอะไหล่</p></div>
      ${input('threshold', 'Safety stock', 'number', true)}${input('qty', 'คงเหลือเริ่มต้น', 'number', true)}
      <div class="form-wide"><span>รูป</span><p class="photo-placeholder">เว้นไว้สำหรับเพิ่มรูปภายหลัง</p><input type="hidden" name="photo" value=""></div>
    </div>`;
  }
  const api = { category, categories, filter, categoryBar, table, fields };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StockView = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
