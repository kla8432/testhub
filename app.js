'use strict';
const $=id=>document.getElementById(id);
const pages={dashboard:['ภาพรวมระบบ','ติดตามสถานะเครื่องเทสและงานซ่อมบำรุงในที่เดียว','▦'],cal:['บันทึกคาลิเบรต','บันทึกผลการสอบเทียบ และตรวจสอบประวัติของแต่ละเครื่อง','✓'],setup:['คู่มือเซ็ตอัพ','รวบรวมวิธีต่อสายและขั้นตอนการตั้งค่าแยกตามรุ่น','▤'],downtime:['บันทึก Downtime','บันทึกชื่อรุ่น Order วันที่ทำ อาการและวิธีการแก้','◷'],stock:['จัดการสต็อก','แยกยอดสโตร์และห้องเก็บของ · เบิกจากสโตร์ · ยอดห้องเก็บของอิงผลนับล่าสุด','▧']};
const initialPage=new URLSearchParams(location.search).get('page');
let db={cal:[],setup:[],downtime:[],stock:[],moves:[],revision:-1},page=initialPage==='setup'?'setup':['count','stock'].includes(initialPage)?'stock':'dashboard',currentUser=null,connected=false;
async function api(url,data){return TestHubCloud.request(url,data);}
function connection(ok) {
  connected = ok;
  WeeklyCount.refresh(db,ok);
  document.querySelector('.local').textContent = ok ? '● เชื่อมต่อข้อมูลกลาง' : '● ขาดการเชื่อมต่อ';
  $('add').disabled = !ok;
  document.querySelectorAll('[data-move],[data-delete-setup],[data-edit]').forEach(button => button.disabled = !ok);
}
async function sync(){
  if(location.protocol==='file:'){$('content').textContent='เว็บเวอร์ชันนี้ใช้เซิร์ฟเวอร์ กรุณารัน npm start แล้วเปิด http://localhost:3000';$('add').hidden=true;return;}
  try{
    if(!currentUser){const session=await api('/api/session');if(!session.user){location.replace('login.html');return;}currentUser=session.user;document.querySelector('.notice').textContent=`${currentUser.name} · ${currentUser.role} · ข้อมูลกลางอัปเดตอัตโนมัติทุก 30 วินาที`;$('export').hidden=currentUser.role!=='admin';$('users-link').hidden=currentUser.role!=='admin';}
    const next=await api('/api/state');connection(true);document.querySelector('.notice').textContent=currentUser.name+' · '+currentUser.role+' · ข้อมูลกลางอัปเดตอัตโนมัติทุก 30 วินาที';
    if(next.revision>db.revision||renderDay!==CalView.today()){db=next;render();}
  }catch{connection(false);document.querySelector('.notice').textContent='ติดต่อเซิร์ฟเวอร์ไม่ได้ ข้อมูลที่แสดงอาจเก่า ระบบจะเชื่อมต่อใหม่อัตโนมัติ';}
}
const roomAlertPolicy={mode:'fixed',limit:10};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge=(text,bad=false)=>`<span class="badge ${bad?'bad':''}">${esc(text)}</span>`;
const table=(heads,rows)=>rows.length?`<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีข้อมูล · เริ่มต้นด้วยการเพิ่มรายการ</div>';
function toast(){ $('toast').textContent='บันทึกข้อมูลเรียบร้อยแล้ว';$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2500);}
function hours(r){return (new Date(r.end)-new Date(r.start))/3600000;}
function latest(){return CalView.latest(db.cal);}
function dashboard(){
 const today=CalView.today(),month=today.slice(0,7),last=latest().map(r=>({...r,pm:CalView.status(r)}));
 const count=key=>last.filter(r=>r.pm.key===key).length,urgent=count('fail')+count('overdue')+count('due');
 const roomLow=StockView.roomAlerts(stockRows(),db.countCatalog||[],roomAlertPolicy);
 const low=db.stock.filter(r=>StockView.reorder(r).low).sort((a,b)=>(a.qty>0)-(b.qty>0)||a.qty-b.qty);
 const date=r=>r.date||r.start?.slice(0,10)||'';
 const total=db.downtime.filter(r=>date(r).startsWith(month)).length;
 const months=Array.from({length:6},(_,i)=>{const d=new Date(today.slice(0,7)+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-5+i);const key=d.toISOString().slice(0,7);return {label:d.toLocaleDateString('th-TH',{month:'short',timeZone:'UTC'}),value:db.downtime.filter(r=>date(r).startsWith(key)).length};});
 const max=Math.max(1,...months.map(r=>r.value)),priority={fail:0,overdue:1,due:2,soon:3,ok:4};
 last.sort((a,b)=>priority[a.pm.key]-priority[b.pm.key]||a.pm.days-b.pm.days);
 const labels={fail:'ไม่ผ่าน',overdue:'เกินกำหนด',due:'ครบวันนี้',soon:'ใกล้ครบกำหนด',ok:'ปกติ'};
 return `<div class="overview-board"><div class="board-title"><div><span class="board-kicker">TEST ENGINEERING</span><h1>ภาพรวมเครื่องเทส</h1></div><div class="board-tools"><span>${new Date(today+'T00:00:00Z').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}</span><button class="secondary" data-fullscreen>${document.fullscreenElement?'↙ ออกจากเต็มจอ':'⛶ เต็มจอ'}</button></div></div>
 <div class="board-metrics">
 <button class="board-metric metric-blue" data-go="cal"><span>เครื่องที่ติดตาม</span><strong>${last.length}<small>เครื่อง</small></strong><em>ผ่านล่าสุด ${last.filter(r=>r.result==='Pass').length} เครื่อง</em></button>
 <button class="board-metric metric-red" data-go="cal"><span>ต้องดำเนินการ</span><strong>${urgent}<small>เครื่อง</small></strong><em>ไม่ผ่าน ${count('fail')} · เกินกำหนด ${count('overdue')} · ครบวันนี้ ${count('due')}</em></button>
 <button class="board-metric metric-amber" data-go="cal" data-filter="soon"><span>PM ภายใน 7 วัน</span><strong>${count('soon')}<small>เครื่อง</small></strong><em>เตรียมสอบเทียบก่อนครบกำหนด</em></button>
 <button class="board-metric" data-go="downtime"><span>Downtime เดือนนี้</span><strong>${total}<small>รายการ</small></strong><em>ดูอาการและวิธีการแก้ →</em></button>
 </div><div class="board-columns"><section class="board-panel machine-panel"><div class="board-panel-head"><div><h2>สถานะเครื่องและรอบ PM</h2><p>รอบ 30 วัน · เรียงเครื่องที่ต้องดำเนินการก่อน</p></div><button data-go="cal" class="board-link">ดูทั้งหมด →</button></div>
 <div class="machine-legend"><span class="dot-ok">ปกติ ${count('ok')}</span><span class="dot-soon">ใกล้ครบ ${count('soon')}</span><span class="dot-fail">ต้องดำเนินการ ${urgent}</span></div>
 <div class="machine-grid">${last.length?last.map(r=>`<button class="machine-tile pm-${r.pm.key}" data-go="cal" data-machine="${esc(r.machine)}" title="${esc(r.model)} · แคลล่าสุด ${esc(r.date)} · ครบกำหนด ${r.pm.due}"><span class="machine-id">${esc(r.machine)}</span><span class="machine-model">${esc(r.model)}</span><span class="machine-state">${labels[r.pm.key]}</span><small>${r.pm.days<0?'เกิน '+-r.pm.days+' วัน':r.pm.days===0?'ครบกำหนดวันนี้':'อีก '+r.pm.days+' วัน'}</small></button>`).join(''):'<div class="board-empty">ยังไม่มีประวัติแคล<br>เพิ่มผลแคลเพื่อเริ่มติดตามเครื่อง</div>'}</div>
 <div class="board-footnote">กดที่เครื่องเพื่อดูประวัติและกำหนด PM · แสดงเฉพาะเครื่องที่มีประวัติแคล</div></section>
 <div class="board-side"><section class="board-panel stock-summary room-alert-panel"><div class="board-panel-head"><div><h2>Hotswap ห้องเก็บของใกล้หมด <span class="board-count">${roomLow.length}</span></h2><p>เหลือไม่เกิน 10 ชิ้น · อิงผลตรวจนับล่าสุด</p></div><button class="board-link" data-go="stock">ดูรายการ →</button></div><div class="board-stock-list">${roomLow.length?roomLow.map(r=>`<button data-go="stock" data-query="${esc(r.code)}" class="board-stock-row"><span><strong>${esc(r.model||r.name)}</strong><small>P/N ${esc(r.pn||'—')} · สโตร์ ${r.qty??'ไม่ทราบ'} · ${esc(r.supply)}</small></span><span class="stock-amount ${r.roomQty===0?'stock-zero':''}">${r.roomQty}<small>ห้องเก็บของ / เตือน ≤ ${r.roomLimit}</small></span></button>`).join(''):'<div class="board-empty">ไม่มีรายการใกล้หมดในยอดที่นับแล้ว</div>'}</div></section><section class="board-panel stock-summary"><div class="board-panel-head"><div><h2>สโตร์ที่ต้องเติม <span class="board-count">${low.length}</span></h2><p>จุดสั่งซื้อ 6 เดือนรวม PO รอรับ หรือ Safety stock ที่กำหนด</p></div><button class="board-link" data-go="stock">ดูทั้งหมด →</button></div>
 <div class="board-stock-list">${low.length?low.slice(0,3).map(r=>`<button data-go="stock" data-query="${esc(r.code)}" class="board-stock-row"><span><strong>${esc(r.name)}</strong><small>${esc(r.code)}</small></span><span class="stock-amount ${r.qty===0?'stock-zero':''}">${r.qty}<small>จุดสั่งซื้อ ${StockView.reorder(r).point}</small></span></button>`).join(''):'<div class="board-empty">สต็อกทุกรายการสูงกว่าจุดแจ้งเตือน</div>'}</div>${low.length>3?`<p class="board-footnote">แสดง 3 จาก ${low.length} รายการ · เรียงของหมดก่อน</p>`:''}</section>
 <section class="board-panel trend-panel"><div class="board-panel-head"><div><h2>Downtime ย้อนหลัง 6 เดือน</h2><p>จำนวนรายการที่บันทึก</p></div><button class="board-link" data-go="downtime">ดูรายละเอียด →</button></div><div class="board-chart">${months.map(r=>`<div class="chart-column"><strong>${r.value}</strong><div class="chart-track"><span style="height:${r.value/max*100}%"></span></div><small>${r.label}</small></div>`).join('')}</div></section></div></div></div>`;
}
function calTable(rows){const admin=currentUser?.role==='admin';return table(['รหัสเครื่อง','รุ่น / ชื่อเครื่อง','วันที่คาลิเบรต','ผล','ช่างผู้ดำเนินการ','หมายเหตุ',...(admin?['จัดการ']:[])],rows.map(r=>[esc(r.machine),esc(r.model),esc(r.date),badge(r.result,r.result==='Fail'),esc(r.tech),esc(r.note),...(admin?[`<button class="secondary" data-delete-cal="${esc(r.id)}" ${!connected?'disabled':''}>ลบประวัติ</button>`]:[])]));}
async function deleteCalibration(button){
 const r=db.cal.find(r=>r.id===button.dataset.deleteCal);
 if(!r||currentUser?.role!=='admin'||!connected)return;
 if(!confirm(`ลบประวัติแคลเครื่อง ${r.machine} (${r.model}) วันที่ ${r.date} ผล ${r.result}?\nสถานะ PM จะคำนวณจากประวัติที่เหลือ`))return;
 button.disabled=true;
 try{db=await api('/api/mutate',{requestId:crypto.randomUUID(),action:'delete',kind:'cal',id:r.id,version:r.version});render();toast();}
 catch(e){alert(e.message);button.disabled=false;}
}
function rowCategory(row) { return StockView.category(row); }
function stockRows(){const catalog=new Map((db.countCatalog||[]).map(r=>[r.stockId,r]));return db.stock.map(r=>{const pn=catalog.get(r.id)?.pn||r.pn||'';return {...r,pn,photoCount:db.stockPhotos?.[pn]?.length||0};});}
async function openStockPhotos(pn){
 const item=(db.countCatalog||[]).find(r=>r.pn===pn);
 const row=stockRows().find(r=>r.pn===pn)||(item?{name:item.product,code:item.code}:null);if(!row)return;
 let gallery=$('stock-photo-dialog');
 if(!gallery){gallery=document.createElement('dialog');gallery.id='stock-photo-dialog';gallery.className='stock-photo-dialog';gallery.setAttribute('aria-labelledby','stock-photo-title');document.body.append(gallery);}
 gallery.innerHTML=`<div class="dialog-head"><div><h2 id="stock-photo-title">${esc(row.name)}</h2><p>P/N <strong>${esc(pn)}</strong> · MPN ${esc(row.code)}</p></div><button type="button" class="secondary" aria-label="ปิดรูป">✕</button></div><div class="stock-photo-gallery" role="status">กำลังโหลดรูป…</div>`;
 gallery.querySelector('button').onclick=()=>gallery.close();gallery.showModal();
 const target=gallery.querySelector('.stock-photo-gallery');
 try{
  const result=await api('/api/stock-photos?pn='+encodeURIComponent(pn));
  if(!target.isConnected)return;
  target.removeAttribute('role');
  target.innerHTML=result.photos.map((photo,i)=>`<figure><a href="${esc(photo.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(photo.url)}" alt="รูปอะไหล่ P/N ${esc(pn)} มุมที่ ${i+1}" loading="lazy"></a><figcaption>รูป ${i+1} / ${result.photos.length} · กดรูปเพื่อดูขนาดเต็ม</figcaption></figure>`).join('');
  target.querySelectorAll('img').forEach(img=>img.onerror=()=>{img.replaceWith(document.createTextNode('โหลดรูปไม่สำเร็จ กรุณาปิดแล้วเปิดรูปอีกครั้ง'));});
 }catch(err){if(target.isConnected)target.textContent=err.message;}
}
function list(q = searchQuery) {
  if (page === 'stock') return StockView.table(StockView.filter(stockRows(), stockCategory, q), currentUser?.role !== 'viewer', connected, ['admin','engineer'].includes(currentUser?.role));
  const rows = db[page].filter(r => (page!=='setup'||((!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory)&&(!setupModel||r.model===setupModel))) && Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase())));
  if (page === 'cal') return CalView.overview(db.cal,q,calStatus); 
  if (page === 'downtime') return table(['ชื่อรุ่น','Order','วันที่ทำ','อาการ / สาเหตุ','วิธีการแก้'],rows.map(r=>[esc(r.model||r.machine||'—'),esc(r.order||'—'),esc(r.date||r.start?.slice(0,10)||'—'),esc(r.cause),esc(r.action)]));
  return rows.length ? rows.map(r => {const link='setup-guide.html?id='+encodeURIComponent(r.id),manage=['admin','engineer'].includes(currentUser?.role);return `<article class="guide"><a class="guide-direct" href="${esc(link)}"><strong>${esc(r.model)} · ${esc(r.title)}</strong><span class="muted">${esc(r.category||'คู่มือเซ็ตอัพ')}</span><span>เปิดคู่มือพร้อมรูปประกอบ →</span></a>${manage?`<div class="setup-actions"><a class="secondary" href="${esc(link)}#manage">เพิ่ม / ลบรูป</a><button class="secondary" data-edit="${esc(r.id)}" ${!connected?'disabled':''}>แก้ไขข้อมูล</button><button class="secondary" data-delete-setup="${esc(r.id)}" ${!connected?'disabled':''}>ลบคู่มือ</button></div>`:''}</article>`;}).join('') : '<div class="empty">ไม่พบคู่มือ</div>';
}
let stockMode=new URLSearchParams(location.search).get('page')==='count'||new URLSearchParams(location.search).get('view')==='count'?'count':'list';
function stockTabs(){return `<div class="count-tabs" role="group" aria-label="ฟังก์ชัน Stock"><button type="button" data-stock-view="list" class="${stockMode==='list'?'':'secondary'}" aria-pressed="${stockMode==='list'}">รายการ Stock</button><button type="button" data-stock-view="count" class="${stockMode==='count'?'':'secondary'}" aria-pressed="${stockMode==='count'}">นับของห้องเก็บของรายสัปดาห์</button></div>`;}
let stockCategory = '', searchQuery = '', calStatus='all', setupCategory='', setupModel='';
function stockCategories() { return StockView.categories(db.stock); }
function updateResults() {
  $('results').innerHTML = list(searchQuery);
  if ($('result-count')) $('result-count').textContent = `พบ ${StockView.filter(stockRows(), stockCategory, searchQuery).length} รายการ · ${stockCategory || 'ทุกหมวด'}`;
}
let renderDay='';
function render() {
  document.body.classList.toggle('dashboard-page',page==='dashboard');
  renderDay=CalView.today();
  if (!db) { $('content').textContent='ไม่สามารถโหลดข้อมูลได้'; return; }
  const focused = document.activeElement?.id === 'search';
  const selection = focused ? [$('search').selectionStart, $('search').selectionEnd] : null;
  const scrollLeft = document.querySelector('.stock-table-scroll')?.scrollLeft || 0;
  if (stockCategory && !stockCategories().includes(stockCategory)) stockCategory = '';
  $('nav').innerHTML = Object.entries(pages).map(([k,v])=>`<button data-page="${k}" class="${page===k?'active':''}">${v[2]}　${v[0]}</button>`).join('');
  $('title').textContent = $('breadcrumb').textContent = pages[page][0];
  $('subtitle').textContent = pages[page][1];
  $('add').hidden = (page === 'dashboard' || (page === 'stock' && stockMode === 'count')) || !currentUser || currentUser.role === 'viewer' || (['stock','setup'].includes(page) && !['admin','engineer'].includes(currentUser.role));
  $('add').textContent=page==='setup'?'+ เพิ่มคู่มือ':'+ เพิ่มรายการ';
  $('add').disabled = !connected;
  if(page==='stock'&&stockMode==='count'){
    if(!currentUser){$('content').textContent='กำลังโหลดข้อมูล';return;}
    $('content').innerHTML=stockTabs()+'<div id="weekly-count-root"></div>';
    WeeklyCount.mount($('weekly-count-root'),{db,user:currentUser,connected,api,onState:next=>{db=next;}});return;
  }
  WeeklyCount.unmount();
  if (page === 'dashboard') { $('content').innerHTML = dashboard(); return; }
  const stock = page === 'stock';
  $('content').innerHTML = `${stock?stockTabs()+StockView.roomSummary(stockRows(),db.countCatalog||[],roomAlertPolicy)+StockView.summary(stockRows()):''} ${page==='cal'?CalView.summary(db.cal):''}<div class="panel ${stock?'stock-panel':''}">
    ${page==='setup'?`<div class="category-bar"><button class="secondary" data-setup-category="" aria-pressed="${!setupCategory}">ทุกหมวด</button>${[...new Set(db.setup.map(r=>r.category||'คู่มือเซ็ตอัพ'))].map(c=>`<button class="secondary" data-setup-category="${esc(c)}" aria-pressed="${setupCategory===c}">${esc(c)}</button>`).join('')}</div><label>เลือกรุ่น<select id="setup-model"><option value="">ทุกรุ่น</option>${[...new Set(db.setup.filter(r=>!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory).map(r=>r.model))].map(m=>`<option ${setupModel===m?'selected':''} value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label>`:''}${stock ? StockView.categoryBar(db.stock, stockCategory) : ''}${page==='cal'?`<h2>สถานะล่าสุดของแต่ละเครื่อง</h2><label>กรองสถานะ<select id="cal-status">${[['all','ทุกสถานะ'],['fail','ไม่ผ่าน'],['overdue','เกินกำหนด'],['due','ครบกำหนดวันนี้'],['soon','ใกล้ครบกำหนด'],['ok','ปกติ']].map(([v,t])=>`<option value="${v}" ${calStatus===v?'selected':''}>${t}</option>`).join('')}</select></label>`:''}
    <div class="toolbar"><input id="search" aria-label="ค้นหารายการ" placeholder="${stock?'ค้นหารุ่น, P/N, MPN, Part name หรือรายละเอียด…':'ค้นหารหัสเครื่อง รุ่น หรือรายการ…'}" value="${esc(searchQuery)}">${stock?'<span id="result-count" class="muted" role="status"></span>':''}</div>
    <div id="results"></div></div>
    ${stock ? `<details class="panel movement-panel"><summary>ประวัติสโตร์ / ห้องเก็บของ (${db.moves.length} รายการ)</summary>${table(['วันเวลา','MPN','อะไหล่','รายการ','เปลี่ยนสโตร์','เปลี่ยนห้องเก็บของ','ผู้ดำเนินการ','หมายเหตุ'], [...db.moves].reverse().map(r=>[esc(new Date(r.created).toLocaleString('th-TH')),esc(r.code),esc(r.name),esc(({'store-import':'นำเข้ายอดสโตร์',transfer:'เบิกจากสโตร์','room-count':'ตรวจนับห้องเก็บของ','store-in':'รับเข้าสตอร์','store-out':'จ่ายออกสโตร์'})[r.type]||(r.location==='room'?'ห้อง':'สโตร์')),r.location==='room'?'—':esc(r.storeDelta??r.delta),r.location==='store'||!r.location?'—':esc(r.roomDelta??r.delta),esc(r.tech),esc(r.note)]))}</details>` : ''}`;
  updateResults();
  if($('setup-model')) $('setup-model').onchange=e=>{setupModel=e.target.value;updateResults();};
  if($('cal-status')) $('cal-status').onchange=e=>{calStatus=e.target.value;updateResults();};
  if(page==='cal') $('content').insertAdjacentHTML('beforeend',`<details class="panel"><summary>ประวัติการแคลทั้งหมด (${db.cal.length} รายการ)</summary>${calTable([...db.cal].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created))}</details>`);
  document.querySelectorAll('[data-delete-cal]').forEach(button=>button.onclick=()=>deleteCalibration(button));
  $('search').oninput = e => { searchQuery = e.target.value; updateResults(); };
  if (focused) { $('search').focus(); $('search').setSelectionRange(...selection); }
  const scroller = document.querySelector('.stock-table-scroll'); if (scroller) scroller.scrollLeft = scrollLeft;
}
const field=(name,label,type='text',value='',required=true)=>`<label>${label}${required?' *':''}${type==='textarea'?`<textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="0" step="0.001"':''}>`}</label>`;
async function deleteSetupGuide(button){
 const r=db.setup.find(r=>r.id===button.dataset.deleteSetup);
 if(!r||!connected||!['admin','engineer'].includes(currentUser?.role))return;
 if(!confirm(`ลบคู่มือ ${r.model} · ${r.title} พร้อมรูปทั้งหมดออกจากรายการ?`))return;
 button.disabled=true;
 try{db=await api('/api/mutate',{requestId:crypto.randomUUID(),action:'delete',kind:'setup',id:r.id,version:r.version});render();toast();}
 catch(e){alert(e.message);button.disabled=false;}
}
let editing=null,moving=null,pendingSetupBatch=null,setupPreviewUrls=[];
function clearSetupPreview(){for(const url of setupPreviewUrls)URL.revokeObjectURL(url);setupPreviewUrls=[];}
function previewSetupFiles(){clearSetupPreview();const box=$('setup-file-preview');if(!box)return;box.replaceChildren();for(const file of $('form').elements.setupImages.files){const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=file.name;if(['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=5*1024*1024){const img=document.createElement('img');img.src=URL.createObjectURL(file);setupPreviewUrls.push(img.src);img.alt=file.name;figure.append(img);}figure.append(caption);box.append(figure);}}
function openForm(id=null,move=false){if(!currentUser||currentUser.role==='viewer'||!connected||(['stock','setup'].includes(page)&&!move&&!['admin','engineer'].includes(currentUser.role)))return;editing=id;moving=move?id:null;const r=id?db[page].find(r=>r.id===id):{};if(!r)return;pendingRequest=null;pendingSetupBatch=null;clearSetupPreview();formVersion=r.version;$('form-title').textContent=move?`${['admin','engineer'].includes(currentUser.role)?'เบิกจากสโตร์ / ตรวจนับ':'ตรวจนับห้องเก็บของ'} · ${r.name}`:pages[page][0];$('error').textContent='';let f='';if(move)f=`<p class="inventory-balances">สโตร์ <strong>${r.qty??'ยังไม่ระบุ'}</strong> · ห้องเก็บของ <strong>${r.roomQty??'ยังไม่นับ'}</strong></p><label>ประเภท<select name="direction">${['admin','engineer'].includes(currentUser.role)?'<option value="transfer">เบิกจากสโตร์เข้าห้องเก็บของ</option>':''}<option value="room-count">ตรวจนับ / ตั้งยอดห้องเก็บของ</option>${['admin','engineer'].includes(currentUser.role)?'<option value="store-in">รับเข้าเพิ่มที่สโตร์</option><option value="store-out">จ่ายออกจากสโตร์ไปที่อื่น</option>':''}</select></label><p class="field-hint">เบิกจากสโตร์: ลดเฉพาะสโตร์ · ยอดห้องเก็บของเปลี่ยนเมื่อบันทึกผลนับจริงเท่านั้น</p>`+field('qty','จำนวน','number')+field('tech','ผู้ดำเนินการ')+field('note','เหตุผล / เลขที่ใบเบิก');else if(page==='cal')f=field('machine','รหัสเครื่อง')+'<label>ประเภทเครื่อง *<select name="model" required><option value="LF">LF</option><option value="LH">LH</option><option value="IBAS">IBAS</option></select></label>'+field('date','วันที่คาลิเบรต','date',CalView.today())+'<label>ผลการคาลิเบรต<select name="result"><option>Pass</option><option>Fail</option></select></label>'+field('tech','ช่างผู้ดำเนินการ')+field('note','หมายเหตุ','textarea','',false);else if(page==='setup')f=field('category','หมวดคู่มือ','text',r.category||'คู่มือเซ็ตอัพ')+field('model','รุ่นเครื่อง','text',r.model)+field('title','ชื่อคู่มือ','text',r.title)+field('wiring','การต่อสาย: สายใด → ช่องใด','textarea',r.wiring,false)+field('steps','ขั้นตอนการตั้งค่า (แยกบรรทัดตามลำดับ)','textarea',r.steps,false)+'<label>อัปโหลดไฟล์รูปประกอบ<input type="file" name="setupImages" accept="image/jpeg,image/png,image/webp" multiple></label><p class="field-hint">เลือกได้หลายรูป · JPG, PNG, WebP ไม่เกิน 5 MB ต่อรูป · บันทึกแล้วรูปจะเข้าคู่มืออัตโนมัติ</p><div id="setup-file-preview" class="setup-file-preview"></div>'+field('tech','ผู้จัดทำ','text',r.tech);else if(page==='downtime')f=field('model','ชื่อรุ่น')+field('order','Order')+field('date','วันที่ทำ','date',CalView.today())+field('cause','อาการ / สาเหตุ','textarea')+field('action','วิธีการแก้','textarea');else f=StockView.fields(db.stock,stockCategory,r);$('fields').innerHTML=f;if(page==='setup')$('form').elements.setupImages.onchange=previewSetupFiles;if(page==='stock'&&!move)StockView.bindDemandPreview($('form'),r);const tech=$('form').elements.tech;if(tech){tech.value=currentUser.name;tech.readOnly=true;}if(currentUser.role==='viewer')return;$('dialog').showModal();}
$('nav').onclick = e => {
  const button=e.target.closest('[data-page]');
  if(button){ page=button.dataset.page; stockMode='list'; searchQuery=''; render(); }
};
$('add').onclick=()=>openForm();
$('close').onclick=()=>{clearSetupPreview();$('dialog').close();};
$('dialog').addEventListener('close',clearSetupPreview);
$('dialog').addEventListener('cancel',e=>{if($('form').querySelector('button[type="submit"]').disabled)e.preventDefault();});
$('content').onclick=e=>{
  const removeGuide=e.target.closest('[data-delete-setup]');
  if(removeGuide){deleteSetupGuide(removeGuide);return;}
  const photo=e.target.closest('[data-stock-photo]');
  if(photo){openStockPhotos(photo.dataset.stockPhoto);return;}
  const stockTab=e.target.closest('[data-stock-view]');
  if(stockTab){stockMode=stockTab.dataset.stockView;render();return;}
  const full=e.target.closest('[data-fullscreen]');
  if(full){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});return;}
  const jump=e.target.closest('[data-go]');
  if(jump){page=jump.dataset.go;stockMode='list';searchQuery=jump.dataset.machine||jump.dataset.query||'';calStatus=jump.dataset.filter||'all';stockCategory='';render();return;}
  const setupButton=e.target.closest('[data-setup-category]');
  if(setupButton){setupCategory=setupButton.dataset.setupCategory;setupModel='';render();return;}
  const category=e.target.closest('[data-category]');
  if(category){stockCategory=category.dataset.category;render();return;}
  const edit=e.target.closest('[data-edit]'), move=e.target.closest('[data-move]');
  if(edit)openForm(edit.dataset.edit);
  if(move)openForm(move.dataset.move,true);
};
let pendingRequest=null, formVersion=null;
$('form').addEventListener('input',()=>pendingRequest=null);
$('form').onsubmit=async e=>{
 e.preventDefault(); const button=e.target.querySelector('button[type="submit"]');button.disabled=true;$('error').textContent='';
 try{
  if(!connected)throw Error('ขาดการเชื่อมต่อ กรุณารอให้ระบบเชื่อมต่ออีกครั้ง');
  const data=Object.fromEntries(new FormData(e.target));
  if(page==='setup'){
   delete data.setupImages;data.url=editing?(db.setup.find(r=>r.id===editing)?.url||''):'';
   if(!pendingSetupBatch){
    const command={requestId:crypto.randomUUID(),action:editing?'update':'create',kind:'setup',id:editing,version:formVersion,data};
    pendingSetupBatch=SetupUpload.createBatch(command,e.target.elements.setupImages.files,{mutate:input=>api('/api/mutate',input),upload:async form=>{if(window.TestHubCloud)return TestHubCloud.uploadSetupImage(form);const response=await fetch('/api/setup-image',{method:'POST',body:form}),result=await response.json();if(!response.ok)throw Error(result.error||'อัปโหลดไม่สำเร็จ');return result;}});
   }
   e.target.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=true);$('close').disabled=true;
   const guideId=await pendingSetupBatch.save();db=await api('/api/state');pendingSetupBatch=null;pendingRequest=null;$('dialog').close();render();location.assign('setup-guide.html?id='+encodeURIComponent(guideId));return;
  }
  if(!pendingRequest){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);pendingRequest={requestId:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),inventoryVersion:3,action:moving?'move':editing?'update':'create',kind:page,id:moving||editing,version:formVersion,data};}
  db=await api('/api/mutate',pendingRequest);pendingRequest=null;$('dialog').close();render();toast();
 }catch(err){const status=pendingSetupBatch?.status();$('error').textContent=(status?.metadataSaved?'บันทึกข้อมูลคู่มือแล้ว · อัปโหลดรูปสำเร็จ '+status.uploaded+'/'+status.total+' รูป · กดบันทึกเพื่อลองต่อ: ':'')+err.message;}finally{button.disabled=false;$('close').disabled=false;if(!pendingSetupBatch)e.target.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=false);}
};
$('export').onclick=()=>TestHubCloud.download().catch(err=>alert(err.message));
$('logout').onclick=async()=>{try{await api('/api/logout',{});location.replace('login.html');}catch(err){alert(err.message);}};
render();sync();setInterval(()=>{if(!document.hidden)sync();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});

document.addEventListener('fullscreenchange',()=>{const button=document.querySelector('[data-fullscreen]');if(button)button.textContent=document.fullscreenElement?'↙ ออกจากเต็มจอ':'⛶ เต็มจอ';});

