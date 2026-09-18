'use strict';
const $=id=>document.getElementById(id);
const pages={dashboard:['ภาพรวมระบบ','ติดตามสถานะเครื่องเทสและงานซ่อมบำรุงในที่เดียว','▦'],cal:['บันทึกคาลิเบรต','บันทึกผลการสอบเทียบ และตรวจสอบประวัติของแต่ละเครื่อง','✓'],setup:['คู่มือเซ็ตอัพ','รวบรวมวิธีต่อสายและขั้นตอนการตั้งค่าแยกตามรุ่น','▤'],downtime:['บันทึก Downtime','บันทึกปัญหา เวลาหยุดเครื่อง และงานที่ช่างดำเนินการ','◷'],stock:['จัดการสต็อก','ติดตามอะไหล่คงเหลือและประวัติการเบิกจ่าย','▧']};
let db={cal:[],setup:[],downtime:[],stock:[],moves:[],revision:-1},page='dashboard',currentUser=null,connected=false;
async function api(url,data){return TestHubCloud.request(url,data);}
function connection(ok) {
  connected = ok;
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
function dashboard(){const now=new Date(),month=new Date(now.getFullYear(),now.getMonth(),1),next=new Date(now.getFullYear(),now.getMonth()+1,1);const overlap=(r,s,e)=>Math.max(0,Math.min(new Date(r.end),e)-Math.max(new Date(r.start),s))/3600000;const total=db.downtime.reduce((s,r)=>s+overlap(r,month,next),0);const low=db.stock.filter(r=>r.qty<=r.threshold),last=latest();const counts=[['เครื่องที่มีประวัติคาลิเบรต',last.length,'นับตามรหัสเครื่อง'],['ผลคาลิเบรตล่าสุด',`${last.filter(r=>r.result==='Pass').length} / ${last.filter(r=>r.result==='Fail').length}`,'ผ่าน / ไม่ผ่าน'],['Downtime เดือนนี้',total.toFixed(1),'ชั่วโมง · นับเวลาที่อยู่ในเดือนนี้'],['อะไหล่ถึงจุดแจ้งเตือน',low.length,'รายการที่ต้องตรวจสอบ']];let bars=[];for(let i=5;i>=0;i--){const s=new Date(now.getFullYear(),now.getMonth()-i,1),e=new Date(now.getFullYear(),now.getMonth()-i+1,1);bars.push({label:s.toLocaleDateString('th-TH',{month:'short'}),value:db.downtime.reduce((n,r)=>n+overlap(r,s,e),0)});}const max=Math.max(1,...bars.map(r=>r.value));return `${CalView.summary(db.cal)}<div class="cards">${counts.map(r=>`<div class="card"><span class="muted">${r[0]}</span><div class="value">${r[1]}</div><small>${r[2]}</small></div>`).join('')}</div><div class="grid"><div class="panel"><h2>Downtime ย้อนหลัง 6 เดือน</h2><p class="muted">เวลาหยุดเครื่องรวม (ชั่วโมง)</p>${bars.map(r=>`<div class="bar-row"><span>${r.label}</span><div class="bar"><span style="width:${r.value/max*100}%"></span></div><span>${r.value.toFixed(1)} ชม.</span></div>`).join('')}</div><div class="panel"><h2>อะไหล่ที่ต้องเติม</h2><p class="muted">จำนวนคงเหลือน้อยกว่าหรือเท่ากับจุดแจ้งเตือน</p>${low.length?low.map(r=>`<div class="row"><span>${esc(r.name)}<br><small class="muted">${esc(r.code)}</small></span>${badge(`เหลือ ${r.qty}`,true)}</div>`).join(''):'<div class="empty">ไม่มีรายการที่ต้องเติม</div>'}</div></div><div class="panel"><h2>สถานะคาลิเบรตล่าสุดของแต่ละเครื่อง</h2>${CalView.overview(db.cal)}</div>`;}
function calTable(rows){return table(['รหัสเครื่อง','รุ่น / ชื่อเครื่อง','วันที่คาลิเบรต','ผล','ช่างผู้ดำเนินการ','หมายเหตุ'],rows.map(r=>[esc(r.machine),esc(r.model),esc(r.date),badge(r.result,r.result==='Fail'),esc(r.tech),esc(r.note)]));}
function rowCategory(row) { return StockView.category(row); }
function list(q = searchQuery) {
  if (page === 'stock') return StockView.table(StockView.filter(db.stock, stockCategory, q), currentUser?.role !== 'viewer', connected);
  const rows = db[page].filter(r => (page!=='setup'||((!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory)&&(!setupModel||r.model===setupModel))) && Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase())));
  if (page === 'cal') return CalView.overview(db.cal,q,calStatus); 
  if (page === 'downtime') return table(['เครื่อง','เริ่ม / สิ้นสุด','สาเหตุ','สิ่งที่ดำเนินการ','ชั่วโมง','ช่าง'],rows.map(r=>[esc(r.machine),`${esc(r.start.replace('T',' '))}<br>${esc(r.end.replace('T',' '))}`,esc(r.cause),esc(r.action),hours(r).toFixed(2),esc(r.tech)]));
  return rows.length ? rows.map(r => r.url === '/guides/santorini/index.html' ? `<a class="guide guide-direct" href="guide.html"><strong>แคล Santorini</strong><span class="muted">การแคล UA Mitsen · คู่มือพร้อมรูปประกอบ</span><span>เปิดคู่มือ →</span></a>` : `<details class="guide"><summary>${esc(r.model)} <span class="muted">· ${esc(r.title)}</span></summary><p class="muted">ผู้จัดทำ: ${esc(r.tech)}</p><h3>การต่อสาย / จุดเชื่อมต่อ</h3><pre>${esc(r.wiring)}</pre><h3>ขั้นตอนการเซ็ตอัพ</h3><pre>${esc(r.steps)}</pre>${r.url ? `<a href="${r.url==='/guides/santorini/index.html'?'guide.html':esc(r.url)}" target="_blank" rel="noopener noreferrer">เปิดคู่มือพร้อมรูปประกอบ ↗</a>` : ''}${currentUser?.role !== 'viewer' ? `<p><button class="secondary" data-edit="${esc(r.id)}">แก้ไขคู่มือ</button></p>` : ''}</details>`).join('') : '<div class="empty">ไม่พบคู่มือ</div>';
}
let stockCategory = '', searchQuery = '', calStatus='all', setupCategory='', setupModel='';
function stockCategories() { return StockView.categories(db.stock); }
function updateResults() {
  $('results').innerHTML = list(searchQuery);
  if ($('result-count')) $('result-count').textContent = `พบ ${StockView.filter(db.stock, stockCategory, searchQuery).length} รายการ · ${stockCategory || 'ทุกหมวด'}`;
}
let renderDay='';
function render() {
  renderDay=CalView.today();
  if (!db) { $('content').textContent='ไม่สามารถโหลดข้อมูลได้'; return; }
  const focused = document.activeElement?.id === 'search';
  const selection = focused ? [$('search').selectionStart, $('search').selectionEnd] : null;
  const scrollLeft = document.querySelector('.stock-table-scroll')?.scrollLeft || 0;
  if (stockCategory && !stockCategories().includes(stockCategory)) stockCategory = '';
  $('nav').innerHTML = Object.entries(pages).map(([k,v])=>`<button data-page="${k}" class="${page===k?'active':''}">${v[2]}　${v[0]}</button>`).join('');
  $('title').textContent = $('breadcrumb').textContent = pages[page][0];
  $('subtitle').textContent = pages[page][1];
  $('add').hidden = page === 'dashboard' || !currentUser || currentUser.role === 'viewer' || (page === 'stock' && currentUser.role !== 'admin');
  $('add').disabled = !connected;
  if (page === 'dashboard') { $('content').innerHTML = dashboard(); return; }
  const stock = page === 'stock';
  $('content').innerHTML = ` ${page==='cal'?CalView.summary(db.cal):''}<div class="panel ${stock?'stock-panel':''}">
    ${page==='setup'?`<div class="category-bar"><button class="secondary" data-setup-category="" aria-pressed="${!setupCategory}">ทุกหมวด</button>${[...new Set(db.setup.map(r=>r.category||'คู่มือเซ็ตอัพ'))].map(c=>`<button class="secondary" data-setup-category="${esc(c)}" aria-pressed="${setupCategory===c}">${esc(c)}</button>`).join('')}</div><label>เลือกรุ่น<select id="setup-model"><option value="">ทุกรุ่น</option>${[...new Set(db.setup.filter(r=>!setupCategory||(r.category||'คู่มือเซ็ตอัพ')===setupCategory).map(r=>r.model))].map(m=>`<option ${setupModel===m?'selected':''} value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label>`:''}${stock ? StockView.categoryBar(db.stock, stockCategory) : ''}${page==='cal'?`<h2>สถานะล่าสุดของแต่ละเครื่อง</h2><label>กรองสถานะ<select id="cal-status">${[['all','ทุกสถานะ'],['fail','ไม่ผ่าน'],['overdue','เกินกำหนด'],['due','ครบกำหนดวันนี้'],['soon','ใกล้ครบกำหนด'],['ok','ปกติ']].map(([v,t])=>`<option value="${v}" ${calStatus===v?'selected':''}>${t}</option>`).join('')}</select></label>`:''}
    <div class="toolbar"><input id="search" aria-label="ค้นหารายการ" placeholder="${stock?'ค้นหา MPN, Part name, รายละเอียด หรือผู้ผลิต…':'ค้นหารหัสเครื่อง รุ่น หรือรายการ…'}" value="${esc(searchQuery)}">${stock?'<span id="result-count" class="muted" role="status"></span>':''}</div>
    <div id="results"></div></div>
    ${stock ? `<details class="panel movement-panel"><summary>ประวัติรับเข้า / เบิกออก (${db.moves.length} รายการ)</summary>${table(['วันเวลา','MPN','อะไหล่','จำนวนเปลี่ยนแปลง','ผู้ดำเนินการ','หมายเหตุ'], [...db.moves].reverse().map(r=>[esc(new Date(r.created).toLocaleString('th-TH')),esc(r.code),esc(r.name),r.delta>0?'+'+r.delta:r.delta,esc(r.tech),esc(r.note)]))}</details>` : ''}`;
  updateResults();
  if($('setup-model')) $('setup-model').onchange=e=>{setupModel=e.target.value;updateResults();};
  if($('cal-status')) $('cal-status').onchange=e=>{calStatus=e.target.value;updateResults();};
  if(page==='cal') $('content').insertAdjacentHTML('beforeend',`<details class="panel"><summary>ประวัติการแคลทั้งหมด (${db.cal.length} รายการ)</summary>${calTable([...db.cal].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created))}</details>`);
  $('search').oninput = e => { searchQuery = e.target.value; updateResults(); };
  if (focused) { $('search').focus(); $('search').setSelectionRange(...selection); }
  const scroller = document.querySelector('.stock-table-scroll'); if (scroller) scroller.scrollLeft = scrollLeft;
}
const field=(name,label,type='text',value='',required=true)=>`<label>${label}${required?' *':''}${type==='textarea'?`<textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="0" step="0.001"':''}>`}</label>`;
let editing=null,moving=null;
function openForm(id=null,move=false){if(!currentUser||currentUser.role==='viewer'||!connected)return;editing=id;moving=move?id:null;const r=id?db[page].find(r=>r.id===id):{};if(!r)return;pendingRequest=null;formVersion=r.version;$('form-title').textContent=move?`รับเข้า / เบิกออก · ${r.name}`:pages[page][0];$('error').textContent='';let f='';if(move)f='<label>ประเภท<select name="direction"><option value="in">รับเข้า</option><option value="out">เบิกออก</option></select></label>'+field('qty','จำนวน','number')+field('tech','ผู้ดำเนินการ')+field('note','เหตุผล / เลขที่งาน');else if(page==='cal')f=field('machine','รหัสเครื่อง')+'<label>ประเภทเครื่อง *<select name="model" required><option value="LF">LF</option><option value="LH">LH</option><option value="IBAS">IBAS</option></select></label>'+field('date','วันที่คาลิเบรต','date',CalView.today())+'<label>ผลการคาลิเบรต<select name="result"><option>Pass</option><option>Fail</option></select></label>'+field('tech','ช่างผู้ดำเนินการ')+field('note','หมายเหตุ','textarea','',false);else if(page==='setup')f=field('category','หมวดคู่มือ','text',r.category||'คู่มือเซ็ตอัพ')+field('model','รุ่นเครื่อง','text',r.model)+field('title','ชื่อคู่มือ','text',r.title)+field('wiring','การต่อสาย: สายใด → ช่องใด','textarea',r.wiring)+field('steps','ขั้นตอนการตั้งค่า (แยกบรรทัดตามลำดับ)','textarea',r.steps)+field('url','ลิงก์รูปการต่อสาย / คู่มือ','text',r.url,false)+field('tech','ผู้จัดทำ','text',r.tech);else if(page==='downtime')f=field('machine','รหัสเครื่อง')+field('start','วันเวลาเริ่มหยุด','datetime-local')+field('end','วันเวลากลับมาใช้งาน','datetime-local')+field('cause','อาการ / สาเหตุ','textarea')+field('action','งานที่ดำเนินการ / อะไหล่ที่เปลี่ยน','textarea')+field('tech','ช่างผู้ดำเนินการ');else f=StockView.fields(db.stock,stockCategory);$('fields').innerHTML=f;const tech=$('form').elements.tech;if(tech){tech.value=currentUser.name;tech.readOnly=true;}if(currentUser.role==='viewer')return;$('dialog').showModal();}
$('nav').onclick = e => {
  const button=e.target.closest('[data-page]');
  if(button){ page=button.dataset.page; searchQuery=''; render(); }
};
$('add').onclick=()=>openForm();
$('close').onclick=()=>$('dialog').close();
$('content').onclick=e=>{
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
