(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => value == null ? '—' : Number(value).toLocaleString('th-TH', { maximumFractionDigits: 3 });
  const text = value => value == null || value === '' ? '—' : escape(value);
  const category = row => /^hotswap/i.test((row.name || '').trim()) ? 'Hotswap' : (row.category || '').trim() || 'ไม่ระบุ';
  const categories = rows => [...new Set(rows.map(category))].sort((a, b) => a.localeCompare(b, 'th'));
  function reorder(row) {
    const planned=!!row.reorderPlan, annual=row.reorderPlan?.annualUsage;
    const point=planned?(Number.isFinite(annual)&&annual>=0?Math.ceil(Number((annual/2).toFixed(9))):null):(Number.isFinite(row.threshold)?row.threshold:null);
    const po=planned?(Number.isFinite(row.outstandingPo)?row.outstandingPo:null):0;
    const available=Number.isFinite(row.qty)&&po!==null?row.qty+po:null;
    const shortfall=point!==null&&available!==null?Math.max(0,Math.ceil(point-available)):null;
    return {planned,point,po,available,shortfall,low:planned?shortfall>0:point!==null&&available!==null&&available<=point};
  }
  function planDetails(row) {
    const p=row.reorderPlan;if(!p)return '';
    return `<details class="reorder-details"><summary>วิธีคำนวณ / ที่มา</summary><p>จุดสั่งซื้อ 6 เดือน = ปัดขึ้น (ยอดใช้ Hotswap ต่อปี ÷ 2)</p><p>ยอดใช้ต่อปี ${number(p.annualUsage)} ชิ้น · Demand ตามไฟล์ ${number(p.annualDemand)} · อายุใช้งาน ${number(p.serviceLife)} ครั้ง · จุดใช้งาน ${number(p.stations)}</p><p>${p.special?'รวมการใช้แยกรุ่นตาม Sheet2 ในไฟล์':'สูตรยอดใช้ต่อปี = Demand × จุดใช้งาน ÷ อายุใช้งาน × 1.10 ตามไฟล์'}</p>${p.missing?.length?`<p>ข้อมูลไม่ครบ: ${p.missing.map(escape).join(', ')}</p>`:''}<p>เปรียบเทียบกับยอดสโตร์ + PO/WIP ที่รอรับ โดยไม่รวมยอดนับในห้อง · PO ว่างในไฟล์คิดเป็น 0 ตามสูตรต้นฉบับ</p><p>${text(row.storeSource?.file)} · ${text(row.storeSource?.sheet)} แถว ${number(row.storeSource?.row)} · ยอดสโตร์ ณ ${text(row.storeSource?.date)}</p>${p.poNumber?`<p>PO ${text(p.poNumber)} · ${text(p.poDate)}</p>`:''}</details>`;
  }
  function summary(rows) {
    const planned=rows.filter(r=>r.reorderPlan);if(!planned.length)return '';
    const pending=planned.filter(r=>reorder(r).low).length,missing=planned.filter(r=>reorder(r).point===null).length;
    return `<section class="reorder-summary"><strong>จุดสั่งซื้อ 6 เดือน</strong><span>ควรสั่งเพิ่ม ${pending} รายการ</span><span>ข้อมูลคำนวณไม่ครบ ${missing} รายการ</span><p>อิง Axis Hotswap Invt - WK39 · ยอดสโตร์ในไฟล์ ณ 22/9/2026 · ยอดใช้ต่อปี ÷ 2 ปัดขึ้น · หัก PO/WIP ที่รอรับเมื่อตรวจว่าต้องสั่งเพิ่ม</p><details class="reorder-overview"><summary>ดูรายการที่ควรสั่งเพิ่ม (${pending})</summary><div class="reorder-overview-scroll"><table><thead><tr>${['รุ่น','P/N','สโตร์','PO รอรับ','จุดสั่งซื้อ 6 เดือน','ขาดอีก (ชิ้น)'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${planned.filter(r=>reorder(r).low).map(r=>`<tr><td>${text(r.model)}</td><td>${text(r.pn)}</td><td>${number(r.qty)}</td><td>${number(reorder(r).po)}</td><td>${number(reorder(r).point)}</td><td><strong>${number(reorder(r).shortfall)}</strong></td></tr>`).join('')}</tbody></table></div><p>จำนวนขาดเพื่อให้ครบจุดสั่งซื้อ 6 เดือนตามไฟล์ ยังไม่ได้สร้างใบสั่งซื้อ</p></details></section>`;
  }
  function filter(rows, selected, query = '') {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(row => {
      if (selected && category(row) !== selected) return false;
      const searchable = [category(row), row.model, row.pn, row.code, row.name, row.description, row.manufacturer, row.price, row.cycleLife, row.threshold, row.qty].join(' ').toLocaleLowerCase();
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
  function table(rows, canWrite, online, canEdit = false) {
    if (!rows.length) return '<div class="empty">ไม่พบรายการในหมวดหรือคำค้นนี้</div>';
    const headings = ['หมวด', 'รุ่น', 'P/N', 'MPN', 'Part name', 'รายละเอียด', 'ผู้ผลิต', 'ราคา (บาท)', 'รอบเปลี่ยน', 'จุดสั่งซื้อ / Safety stock', 'คงเหลือสโตร์', 'PO/WIP รอรับ', 'สถานะสั่งซื้อ', 'ในห้อง (นับล่าสุด)', 'รูป'];
    return `<div class="stock-table-scroll" role="region" aria-label="รายการสต็อก" tabindex="0"><table class="stock-table"><thead><tr>${headings.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>
      <td>${escape(category(row))}</td>
      <td><strong>${text(row.model)}</strong></td>
      <td class="mpn"><strong>${text(row.pn)}</strong></td>
      <td class="mpn">${text(row.code)}</td>
      <td><strong>${text(row.name)}</strong>${canWrite ? `<button type="button" class="secondary stock-move" data-move="${escape(row.id)}" ${online ? '' : 'disabled'}>เบิกจากสโตร์ / ตรวจนับ</button>` : ''}${canEdit ? `<button type="button" class="secondary stock-move" data-edit="${escape(row.id)}" ${online ? '' : 'disabled'}>แก้ไขรายการ</button>` : ''}</td>
      <td class="stock-description">${text(row.description)}</td>
      <td>${text(row.manufacturer)}</td>
      <td class="numeric">${row.price == null || row.price === '' ? '—' : Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td>
      <td>${cycle(row)}</td>
      <td class="numeric"><strong>${reorder(row).point===null?'ข้อมูลไม่ครบ':number(reorder(row).point)}</strong><small class="cell-note">${row.reorderPlan?'6 เดือน · ปัดขึ้นเป็นชิ้น':'Safety stock ที่กำหนดเอง'}</small>${planDetails(row)}</td>
      <td class="numeric"><strong>${number(row.qty)}</strong>${row.storeSource?`<small class="cell-note">ฐาน WK39: ${number(row.storeSource.qty)}<br>ณ ${escape(row.storeSource.date)}</small>`:''}</td>
      <td class="numeric">${row.reorderPlan?number(row.outstandingPo):'—'}</td>
      <td>${reorder(row).shortfall===null?'ข้อมูลไม่ครบ':reorder(row).low?`<strong class="stock-low">ควรสั่งเพิ่ม${row.reorderPlan?' '+number(reorder(row).shortfall)+' ชิ้น':''}</strong>`:row.reorderPlan&&row.qty<reorder(row).point?'รอรับ PO ครบจุดสั่งซื้อ':'เพียงพอ'}</td>
      <td class="numeric"><strong>${row.roomQty==null?'ยังไม่นับ':number(row.roomQty)}</strong>${row.lastRoomCountDate?`<small class="cell-note">นับ ${escape(row.lastRoomCountDate)}</small>`:''}</td>
      <td>${row.photoCount ? `<button type="button" class="secondary stock-photo-button" data-stock-photo="${escape(row.pn)}" aria-label="ดูรูป P/N ${escape(row.pn)}">ดูรูป (${number(row.photoCount)})</button>` : '<span class="photo-placeholder">ยังไม่มีรูป</span>'}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }
  function fields(rows, selected = '', record = {}) {
    const input = (name, label, type = 'text', required = false, value = record[name] ?? '') => `<label>${label}${required ? ' *' : ''}<input name="${name}" type="${type}" value="${escape(value)}" ${required ? 'required' : ''} ${type === 'number' ? 'min="0" max="1000000000" step="0.001"' : ''}></label>`;
    return `<div class="stock-form-grid">
      <label>หมวด<input name="category" list="stock-category-options" value="${escape(record.id ? record.category : selected)}"><datalist id="stock-category-options">${categories(rows).map(name => `<option value="${escape(name)}"></option>`).join('')}</datalist></label>
      ${input('code', 'MPN', 'text', true)}
      ${input('model', 'รุ่น')}
      <div class="form-wide">${input('name', 'Part name', 'text', true)}</div>
      <label class="form-wide">รายละเอียด<textarea name="description">${escape(record.description)}</textarea></label>
      ${input('manufacturer', 'ผู้ผลิต')}${input('price', 'ราคา (บาท)', 'number')}
      <div class="form-wide">${input('cycleLife', 'รอบเปลี่ยน')}<p class="field-hint">ใส่หน่วยด้วย เช่น 50000 tests หรือ Monthly ตามข้อมูลของอะไหล่</p></div>
      ${record.reorderPlan?`<div>จุดสั่งซื้อ 6 เดือน: <strong>${reorder(record).point===null?'ข้อมูลไม่ครบ':number(reorder(record).point)}</strong><input type="hidden" name="threshold" value="${escape(record.threshold)}">${planDetails(record)}</div>${input('outstandingPo','PO/WIP รอรับ','number',true)}`:input('threshold', 'Safety stock สโตร์', 'number', true)}${input('qty', record.id ? 'คงเหลือสโตร์' : 'ยอดเริ่มต้นสโตร์', 'number', true)}
      ${record.id ? '<div class="form-wide">'+input('adjustmentNote','เหตุผลปรับยอดสโตร์')+'<p class="field-hint">กรอกเหตุผลเมื่อแก้จำนวนคงเหลือสโตร์ ระบบจะบันทึกส่วนต่างในประวัติสต็อก</p></div>' : ''}
      <div class="form-wide"><span>รูป</span><p class="photo-placeholder">ดูรูปประกอบได้จากรายการ Stock</p><input type="hidden" name="photo" value=""></div>
    </div>`;
  }
  const api = { category, categories, filter, categoryBar, table, fields, reorder, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StockView = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
