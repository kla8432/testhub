'use strict';
const $=id=>document.getElementById(id);
const pages={dashboard:['ภาพรวมระบบ','ติดตามสถานะเครื่องเทสและงานซ่อมบำรุงในที่เดียว','▦'],cal:['บันทึกคาลิเบรต','บันทึกผลการสอบเทียบ และตรวจสอบประวัติของแต่ละเครื่อง','✓'],setup:['คู่มือเซ็ตอัพ','รวบรวมวิธีต่อสายและขั้นตอนการตั้งค่าแยกตามรุ่น','▤'],downtime:['บันทึก Downtime','บันทึกชื่อรุ่น Order วันที่ทำ อาการและวิธีการแก้','◷'],stock:['จัดการสต็อก','ติดตามอะไหล่คงเหลือและประวัติการเบิกจ่าย','▧']};
let db={cal:[],setup:[],downtime:[],stock:[],moves:[],revision:-1},page=['count','stock'].includes(new URLSearchParams(location.search).get('page'))?'stock':'dashboard',currentUser=null,connected=false;
async function api(url,data){return TestHubCloud.request(url,data);}
function connection(ok) {
  connected = ok;
  WeeklyCount.refresh(db,ok);
  document.querySelector('.local').textContent = ok ? '● เชื่อมต่อข้อมูลกลาง' : '● ขาดการเชื่อมต่อ';
  $('add').disabled = !ok;
  document.querySelectorAll('[data-move]').forEach(button => button.disabled = !ok);
}
async function sync(){
  if(location.protocol==='file:'){$('content').textContent='เว็บเวอร์ชันนี้ใช้เซิร์ฟเวอร์ กรุณารัน npm start แล้วเปิด http://localhost:3000';$('add').hidden=true;return;}
  try{
    if(!currentUser){const session=await api('/api/session');if(!session.user){location.replace('login.html');return;}currentUser=session.user;document.querySelector('.notice').textContent=`${currentUser.name} · ${currentUser.role} · ข้อมูลกลางอัปเดตอัตโนมัติทุก 30 วินาที`;$('export').hidden=currentUser.role!=='admin';$('users-link').hidden=currentUser.role!=='admin';}
    const next=await api('/api/state');connection(true);document.querySelector('.notice').textContent=currentUser.name+' · '+currentUser.role+' · ข้อมูลกลางอัปเดตอัตโนมัติทุก 30 วินาที';
    if(next.revision>db.revision||renderDay!==CalView.today()){db=next;render();}
  }catch{connection(false);document.querySelector('.notice').textContent='ติดต่อเซิร์ฟเวอร์ไม่ได้ ข้อมูลที่แสดงอาจเก่า ระบบจะเชื่อมต่อใหม่อัตโนมัติ';}
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge=(text,bad=false)=>`<span class="badge ${bad?'bad':''}">${esc(text)}</span>`;
const table=(heads,rows)=>rows.length?`<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีข้อมูล · เริ่มต้นด้วยการเพิ่มรายการ</div>';
function toast(){ $('toast').textContent='บันทึกข้อมูลเรียบร้อยแล้ว';$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2500);}
function hours(r){return (new Date(r.end)-new Date(r.start))/3600000;}
function latest(){return CalView.latest(db.cal);}
function dashboard(){
 const today=CalView.today(),month=today.slice(0,7),last=latest().map(r=>({...r,pm:CalView.status(r)}));
 const count=key=>last.filter(r=>r.pm.key===key).length,urgent=count('fail')+count('overdue')+count('due');
 const low=db.stock.filter(r=>Number.isFinite(r.threshold)&&r.qty<=r.threshold).sort((a,b)=>(a.qty>0)-(b.qty>0)||a.qty-b.qty);
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
 <div class="board-side"><section class="board-panel stock-summary"><div class="board-panel-head"><div><h2>สต็อกที่ต้องเติม <span class="board-count">${low.length}</span></h2><p>คงเหลือถึงหรือต่ำกว่า Safety stock</p></div><button class="board-link" data-go="stock">ดูทั้งหมด →</button></div>
 <div class="board-stock-list">${low.length?low.slice(0,3).map(r=>`<button data-go="stock" data-query="${esc(r.code)}" class="board-stock-row"><span><strong>${esc(r.name)}</strong><small>${esc(r.code)}</small></span><span class="stock-amount ${r.qty===0?'stock-zero':''}">${r.qty}<small>ขั้นต่ำ ${r.threshold}</small></span></button>`).join(''):'<div class="board-empty">สต็อกทุกรายการสูงกว่าจุดแจ้งเตือน</div>'}</div>${low.length>3?`<p class="board-footnote">แสดง 3 จาก ${low.length} รายการ · เรียงของหมดก่อน</p>`:''}</section>
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
function list(q = searchQuery) {
  if (page === 'stock') return StockView.table(StockView.filter(db.stock, stockCategory, q), currentUser?.role !== 'viewer', connected, currentUser?.role === 'admin');
  const rows = db[page].filter(r => (page!=='setup'||((!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory)&&(!setupModel||r.model===setupModel))) && Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase())));
  if (page === 'cal') return CalView.overview(db.cal,q,calStatus); 
  if (page === 'downtime') return table(['ชื่อรุ่น','Order','วันที่ทำ','อาการ / สาเหตุ','วิธีการแก้'],rows.map(r=>[esc(r.model||r.machine||'—'),esc(r.order||'—'),esc(r.date||r.start?.slice(0,10)||'—'),esc(r.cause),esc(r.action)]));
  return rows.length ? rows.map(r => /^https:\/\/kla8432\.github\.io\/testhub\/setup-guide\.html\?model=[a-z]+$/.test(r.url||'') ? `<a class="guide guide-direct" href="${r.url==='/guides/santorini/index.html'?'guide.html':esc(r.url)}"><strong>${esc(r.model)} Setup</strong><span class="muted">${esc(r.title)}</span><span>เปิดคู่มือ →</span></a>` : r.url === '/guides/santorini/index.html' ? `<a class="guide guide-direct" href="guide.html"><strong>แคล Santorini</strong><span class="muted">การแคล UA Mitsen · คู่มือพร้อมรูปประกอบ</span><span>เปิดคู่มือ →</span></a>` : `<details class="guide"><summary>${esc(r.model)} <span class="muted">· ${esc(r.title)}</span></summary><p class="muted">ผู้จัดทำ: ${esc(r.tech)}</p><h3>การต่อสาย / จุดเชื่อมต่อ</h3><pre>${esc(r.wiring)}</pre><h3>ขั้นตอนการเซ็ตอัพ</h3><pre>${esc(r.steps)}</pre>${r.url ? `<a href="${r.url==='/guides/santorini/index.html'?'guide.html':esc(r.url)}">เปิดคู่มือพร้อมรูปประกอบ ↗</a>` : ''}</details>`).join('') : '<div class="empty">ไม่พบคู่มือ</div>';
}
let stockMode=new URLSearchParams(location.search).get('page')==='count'||new URLSearchParams(location.search).get('view')==='count'?'count':'list';
function stockTabs(){return `<div class="count-tabs" role="group" aria-label="ฟังก์ชัน Stock"><button type="button" data-stock-view="list" class="${stockMode==='list'?'':'secondary'}" aria-pressed="${stockMode==='list'}">รายการ Stock</button><button type="button" data-stock-view="count" class="${stockMode==='count'?'':'secondary'}" aria-pressed="${stockMode==='count'}">นับสต็อกรายสัปดาห์</button></div>`;}
let stockCategory = '', searchQuery = '', calStatus='all', setupCategory='', setupModel='';
function stockCategories() { return StockView.categories(db.stock); }
function updateResults() {
  $('results').innerHTML = list(searchQuery);
  if ($('result-count')) $('result-count').textContent = `พบ ${StockView.filter(db.stock, stockCategory, searchQuery).length} รายการ · ${stockCategory || 'ทุกหมวด'}`;
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
  $('add').hidden = (page === 'dashboard' || page === 'setup' || (page === 'stock' && stockMode === 'count')) || !currentUser || currentUser.role === 'viewer' || (page === 'stock' && currentUser.role !== 'admin');
  $('add').disabled = !connected;
  if(page==='stock'&&stockMode==='count'){
    if(!currentUser){$('content').textContent='กำลังโหลดข้อมูล';return;}
    $('content').innerHTML=stockTabs()+'<div id="weekly-count-root"></div>';
    WeeklyCount.mount($('weekly-count-root'),{db,user:currentUser,connected,api,onState:next=>{db=next;}});return;
  }
  WeeklyCount.unmount();
  if (page === 'dashboard') { $('content').innerHTML = dashboard(); return; }
  const stock = page === 'stock';
  $('content').innerHTML = `${stock?stockTabs():''} ${page==='cal'?CalView.summary(db.cal):''}<div class="panel ${stock?'stock-panel':''}">
    ${page==='setup'?`<div class="category-bar"><button class="secondary" data-setup-category="" aria-pressed="${!setupCategory}">ทุกหมวด</button>${[...new Set(db.setup.map(r=>r.category||'คู่มือเซ็ตอัพ'))].map(c=>`<button class="secondary" data-setup-category="${esc(c)}" aria-pressed="${setupCategory===c}">${esc(c)}</button>`).join('')}</div><label>เลือกรุ่น<select id="setup-model"><option value="">ทุกรุ่น</option>${[...new Set(db.setup.filter(r=>!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory).map(r=>r.model))].map(m=>`<option ${setupModel===m?'selected':''} value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label>`:''}${stock ? StockView.categoryBar(db.stock, stockCategory) : ''}${page==='cal'?`<h2>สถานะล่าสุดของแต่ละเครื่อง</h2><label>กรองสถานะ<select id="cal-status">${[['all','ทุกสถานะ'],['fail','ไม่ผ่าน'],['overdue','เกินกำหนด'],['due','ครบกำหนดวันนี้'],['soon','ใกล้ครบกำหนด'],['ok','ปกติ']].map(([v,t])=>`<option value="${v}" ${calStatus===v?'selected':''}>${t}</option>`).join('')}</select></label>`:''}
    <div class="toolbar"><input id="search" aria-label="ค้นหารายการ" placeholder="${stock?'ค้นหา MPN, Part name, รายละเอียด หรือผู้ผลิต…':'ค้นหารหัสเครื่อง รุ่น หรือรายการ…'}" value="${esc(searchQuery)}">${stock?'<span id="result-count" class="muted" role="status"></span>':''}</div>
    <div id="results"></div></div>
    ${stock ? `<details class="panel movement-panel"><summary>ประวัติรับเข้า / เบิกออก (${db.moves.length} รายการ)</summary>${table(['วันเวลา','MPN','อะไหล่','จำนวนเปลี่ยนแปลง','ผู้ดำเนินการ','หมายเหตุ'], [...db.moves].reverse().map(r=>[esc(new Date(r.created).toLocaleString('th-TH')),esc(r.code),esc(r.name),r.delta>0?'+'+r.delta:r.delta,esc(r.tech),esc(r.note)]))}</details>` : ''}`;
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
let editing=null,moving=null;
function openForm(id=null,move=false){if(!currentUser||currentUser.role==='viewer'||!connected||(page==='stock'&&!move&&currentUser.role!=='admin'))return;editing=id;moving=move?id:null;const r=id?db[page].find(r=>r.id===id):{};if(!r)return;pendingRequest=null;formVersion=r.version;$('form-title').textContent=move?`รับเข้า / เบิกออก · ${r.name}`:pages[page][0];$('error').textContent='';let f='';if(move)f='<label>ประเภท<select name="direction"><option value="in">รับเข้า</option><option value="out">เบิกออก</option></select></label>'+field('qty','จำนวน','number')+field('tech','ผู้ดำเนินการ')+field('note','เหตุผล / เลขที่งาน');else if(page==='cal')f=field('machine','รหัสเครื่อง')+'<label>ประเภทเครื่อง *<select name="model" required><option value="LF">LF</option><option value="LH">LH</option><option value="IBAS">IBAS</option></select></label>'+field('date','วันที่คาลิเบรต','date',CalView.today())+'<label>ผลการคาลิเบรต<select name="result"><option>Pass</option><option>Fail</option></select></label>'+field('tech','ช่างผู้ดำเนินการ')+field('note','หมายเหตุ','textarea','',false);else if(page==='setup')f=field('category','หมวดคู่มือ','text',r.category||'คู่มือเซ็ตอัพ')+field('model','รุ่นเครื่อง','text',r.model)+field('title','ชื่อคู่มือ','text',r.title)+field('wiring','การต่อสาย: สายใด → ช่องใด','textarea',r.wiring)+field('steps','ขั้นตอนการตั้งค่า (แยกบรรทัดตามลำดับ)','textarea',r.steps)+field('url','ลิงก์รูปการต่อสาย / คู่มือ','text',r.url,false)+field('tech','ผู้จัดทำ','text',r.tech);else if(page==='downtime')f=field('model','ชื่อรุ่น')+field('order','Order')+field('date','วันที่ทำ','date',CalView.today())+field('cause','อาการ / สาเหตุ','textarea')+field('action','วิธีการแก้','textarea');else f=StockView.fields(db.stock,stockCategory,r);$('fields').innerHTML=f;const tech=$('form').elements.tech;if(tech){tech.value=currentUser.name;tech.readOnly=true;}if(currentUser.role==='viewer')return;$('dialog').showModal();}
$('nav').onclick = e => {
  const button=e.target.closest('[data-page]');
  if(button){ page=button.dataset.page; stockMode='list'; searchQuery=''; render(); }
};
$('add').onclick=()=>openForm();
$('close').onclick=()=>$('dialog').close();
$('content').onclick=e=>{
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
  if(!pendingRequest){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);pendingRequest={requestId:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),action:moving?'move':editing?'update':'create',kind:page,id:moving||editing,version:formVersion,data};}
  db=await api('/api/mutate',pendingRequest);pendingRequest=null;$('dialog').close();render();toast();
 }catch(err){$('error').textContent=err.message;}finally{button.disabled=false;}
};
$('export').onclick=()=>TestHubCloud.download().catch(err=>alert(err.message));
$('logout').onclick=async()=>{try{await api('/api/logout',{});location.replace('login.html');}catch(err){alert(err.message);}};
render();sync();setInterval(()=>{if(!document.hidden)sync();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});

document.addEventListener('fullscreenchange',()=>{const button=document.querySelector('[data-fullscreen]');if(button)button.textContent=document.fullscreenElement?'↙ ออกจากเต็มจอ':'⛶ เต็มจอ';});
