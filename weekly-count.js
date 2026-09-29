(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>v==null?'—':Number(v).toLocaleString('th-TH',{maximumFractionDigits:3});
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const week=date=>{const d=new Date(date+'T00:00:00Z');if(!Number.isFinite(+d))return '';d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);return start+' ถึง '+d.toISOString().slice(0,10);};
 const entered=e=>e&&e.qty!==''&&e.qty!=null;
 const filter=(items,category,query)=>items.filter(r=>(!category||r.category===category)&&query.toLowerCase().trim().split(/\s+/).every(w=>[r.product,r.pn,r.svi,r.description,r.station,r.location].join(' ').toLowerCase().includes(w)));
 let host,context,draft,owner,category='',query='',view='form',message='',busy=false,pending=null;
 const $=id=>host.querySelector('#'+id);
 const storageKey=()=> 'testhub-weekly-draft:'+owner;
 function persist(){try{sessionStorage.setItem(storageKey(),JSON.stringify(draft));}catch{message='เบราว์เซอร์เก็บแบบร่างไม่ได้ กรุณาบันทึกก่อนปิดหน้า';}}
 function init(){
  if(owner===context.user.id)return;
  owner=context.user.id;draft={date:today(),entries:{}};category='';query='';message='';pending=null;
  try{const old=JSON.parse(sessionStorage.getItem(storageKey())||'null');if(old&&typeof old.date==='string'&&old.entries&&typeof old.entries==='object')draft=old;}catch{}
 }
 function snapshot(item){const part=context.db.stock.find(r=>r.id===item.stockId);return {version:part?.version??0,expectedQty:part?.qty??null};}
 function row(item){
  const e=draft.entries[item.id],base=e||snapshot(item),changed=entered(e)&&Number(e.qty)!==base.expectedQty;
  const stale=entered(e)&&base.version!==snapshot(item).version;
  return `<tr data-row="${esc(item.id)}" class="${entered(e)?'count-entered':''}"><td class="count-item"><strong>${esc(item.product)}</strong><span><b>P/N ${esc(item.pn||'—')}</b></span><span>SVI P/N ${esc(item.svi||'—')}</span><small>${esc(item.description)}</small><small>${esc(item.station)}${item.location?' · '+esc(item.location):''}</small>${context.db.stockPhotos?.[item.pn]?.length?`<button type="button" class="secondary stock-photo-button" data-stock-photo="${esc(item.pn)}">ดูรูป (${context.db.stockPhotos[item.pn].length})</button>`:''}</td>
   <td class="count-before">${base.expectedQty==null?'<span class="count-new">รายการใหม่</span>':num(base.expectedQty)}<small>${item.referenceQty==null?'':'ใน Excel '+num(item.referenceQty)+' ('+esc(item.referenceDate)+')'}</small></td>
   <td class="count-entry"><label class="sr-only" for="qty-${esc(item.id)}">จำนวนที่นับได้ ${esc(item.product)} ${esc(item.pn)}</label><input id="qty-${esc(item.id)}" data-count-id="${esc(item.id)}" data-field="qty" type="number" min="0" max="1000000000" step="1" inputmode="numeric" placeholder="กรอกจำนวน" value="${esc(e?.qty??'')}" ${busy||context.user.role==='viewer'?'disabled':''}><small data-difference="${esc(item.id)}">${stale?'ยอดเปลี่ยนแล้ว กรุณานับใหม่':entered(e)?base.expectedQty==null?'เพิ่มใน Stock เมื่อบันทึก':changed?'ต่างจากเดิม '+num(Number(e.qty)-base.expectedQty):'ตรงกับยอดเดิม':''}</small>${stale?`<button type="button" class="board-link" data-recount="${esc(item.id)}">ใช้ยอดล่าสุดและนับใหม่</button>`:''}</td>
   <td class="count-note"><label class="sr-only" for="note-${esc(item.id)}">หมายเหตุ ${esc(item.product)} ${esc(item.pn)}</label><input id="note-${esc(item.id)}" data-count-id="${esc(item.id)}" data-field="note" maxlength="1000" placeholder="หมายเหตุ (ถ้ามี)" value="${esc(e?.note??'')}" ${busy||context.user.role==='viewer'?'disabled':''}></td></tr>`;
 }
 function history(){
  const records=[...(context.db.counts||[])].sort((a,b)=>b.created-a.created);
  return records.length?records.map(r=>`<details class="panel count-history"><summary><strong>${esc(r.date)}</strong> · ${esc(r.tech)} · ${r.items.length} รายการ <span>บันทึก ${esc(new Date(r.created).toLocaleString('th-TH'))}</span></summary><div class="count-table-wrap"><table><thead><tr><th>รุ่น / P/N</th><th>ก่อนนับ</th><th>นับได้</th><th>ส่วนต่าง</th><th>หมายเหตุ</th></tr></thead><tbody>${r.items.map(e=>`<tr><td>${esc(e.product)}<small>${esc(e.pn||e.code)}</small></td><td>${num(e.beforeQty)}</td><td>${num(e.qty)}</td><td>${e.delta==null?'ยอดเริ่มต้น':num(e.delta)}</td><td>${esc(e.note)}</td></tr>`).join('')}</tbody></table></div></details>`).join(''):'<div class="panel empty">ยังไม่มีประวัติการนับบนเว็บ</div>';
 }
 function progress(){
  const items=Object.entries(draft.entries).filter(([,e])=>entered(e));
  const count=$('count-progress');if(count)count.textContent=`กรอกแล้ว ${items.length} / ${(context.db.countCatalog||[]).length} รายการ`;
  const button=$('count-save');if(button){button.disabled=busy||!items.length||!context.connected||context.user.role==='viewer';button.textContent=busy?'กำลังบันทึก…':`บันทึก ${items.length} รายการและอัปเดต Stock`;}
 }
 function rows(){const items=filter(context.db.countCatalog||[],category,query);$('count-rows').innerHTML=items.map(row).join('')||'<tr><td colspan="4" class="empty">ไม่พบรายการ</td></tr>';if($('count-visible'))$('count-visible').textContent=`แสดง ${items.length} รายการ`;progress();}
 function render(){
  if(!host)return;
  const focus=document.activeElement?.id,selection=document.activeElement?.selectionStart;
  const all=context.db.countCatalog||[],categories=[...new Set(all.map(r=>r.category))];
  host.innerHTML=`<div class="count-tabs"><button type="button" class="${view==='form'?'':'secondary'}" data-count-view="form">กรอกตรวจนับ</button><button type="button" class="${view==='history'?'':'secondary'}" data-count-view="history">ประวัติการนับ (${(context.db.counts||[]).length})</button></div><p id="count-message" role="status">${esc(message)}</p>${view==='history'?history():`
  <form id="count-form"><section class="panel count-intro"><div><h2>นับแล้วกรอกจำนวนได้เลย</h2><p>ช่องว่าง = ยังไม่นับ · กรอก 0 เมื่อของหมด · บันทึกเฉพาะรายการที่กรอก</p><p>บันทึกแล้วอัปเดตยอดคงเหลือทันที พร้อมเก็บประวัติผู้ตรวจนับและส่วนต่าง</p></div><label>วันที่ตรวจนับ<input id="count-date" type="date" required max="${today()}" value="${esc(draft.date)}" ${busy?'disabled':''}><small id="count-week">สัปดาห์ ${week(draft.date)}</small></label><div class="count-person">ผู้ตรวจนับ<strong>${esc(context.user.name)}</strong></div></section>
  <section class="panel count-panel"><div class="count-filters"><label>หมวด<select id="count-category"><option value="">ทั้งหมด</option>${categories.map(c=>`<option value="${esc(c)}" ${category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label>ค้นหารุ่น / P/N / จุดใช้งาน<input id="count-search" type="search" placeholder="เช่น Mimmi, IBAS2, 1616879" value="${esc(query)}"></label><span id="count-visible"></span></div><div class="count-table-wrap"><table class="count-table"><thead><tr><th>รุ่น / อะไหล่ / จุดเก็บ</th><th>ยอดใน Stock</th><th>จำนวนที่นับได้</th><th>หมายเหตุ</th></tr></thead><tbody id="count-rows"></tbody></table></div></section>
  <div class="count-savebar"><div><strong id="count-progress"></strong><small>แบบร่างอยู่ในแท็บนี้จนกดบันทึก · Enter ไปช่องจำนวนถัดไป</small></div><button id="count-save" type="submit"></button></div></form>`}`;
  if(view==='form'){
   rows();$('count-category').onchange=e=>{category=e.target.value;rows();};
   $('count-search').oninput=e=>{query=e.target.value;rows();};
   $('count-date').onchange=e=>{draft.date=e.target.value;pending=null;persist();$('count-week').textContent='สัปดาห์ '+week(draft.date);};
   $('count-form').onsubmit=save;
   $('count-form').oninput=e=>{
    const id=e.target.dataset.countId,field=e.target.dataset.field;if(!id)return;
    const item=all.find(r=>r.id===id);if(!draft.entries[id])draft.entries[id]={...snapshot(item),qty:'',note:''};
    draft.entries[id][field]=e.target.value;pending=null;persist();progress();
    const entry=draft.entries[id],diff=host.querySelector(`[data-difference="${id}"]`);
    if(diff)diff.textContent=entered(entry)?entry.version!==snapshot(item).version?'ยอดเปลี่ยนแล้ว กรุณานับใหม่':entry.expectedQty==null?'เพิ่มใน Stock เมื่อบันทึก':'ส่วนต่าง '+num(Number(entry.qty)-entry.expectedQty):'';
    e.target.closest('tr').classList.toggle('count-entered',entered(entry));
   };
   $('count-form').onkeydown=e=>{if(e.key!=='Enter'||e.target.dataset.field!=='qty')return;e.preventDefault();const inputs=[...host.querySelectorAll('[data-field="qty"]')],i=inputs.indexOf(e.target);if(inputs[i+1])inputs[i+1].focus();else $('count-save').focus();};
  }
  host.onclick=e=>{
   const tab=e.target.closest('[data-count-view]');if(tab){view=tab.dataset.countView;render();return;}
   const recount=e.target.closest('[data-recount]');if(recount){delete draft.entries[recount.dataset.recount];pending=null;persist();rows();}
  };
  if(focus){const target=document.getElementById(focus);if(target&&host.contains(target)){target.focus({preventScroll:true});if(selection!=null&&target.type!=='number')try{target.setSelectionRange(selection,selection);}catch{}}}
 }
 async function save(e){
  e.preventDefault();if(busy||!context.connected||context.user.role==='viewer')return;
  const items=Object.entries(draft.entries).filter(([,r])=>entered(r)).map(([id,r])=>({id,qty:r.qty,version:r.version,note:r.note||''}));
  if(!items.length)return;
  if(!pending)pending={requestId:crypto.randomUUID(),action:'count',data:{date:draft.date,items}};
  busy=true;message='';render();
  try{const next=await context.api('/api/mutate',pending);draft={date:today(),entries:{}};pending=null;persist();context.onState(next);context.db=next;message=`บันทึก ${items.length} รายการแล้ว อัปเดตยอดใน Stock เรียบร้อย`;}
  catch(error){message=error.message;try{const next=await context.api('/api/state');context.db=next;context.onState(next);}catch{}}
  finally{busy=false;render();}
 }
 const api={filter,week,entered,mount(element,options){host=element;context=options;init();render();},refresh(db,connected){if(context){context.db=db;context.connected=connected;progress();}},unmount(){host=null;},};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WeeklyCount=api;
})(typeof globalThis==='undefined'?this:globalThis);
