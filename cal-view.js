(function(root){
  'use strict';
  const DAY=86400000;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function latest(rows){const map=new Map();[...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created).forEach(r=>map.set(r.machine.trim().toUpperCase(),r));return [...map.values()];}
  function status(r,day=today()){
    const due=new Date(Date.parse(r.date+'T00:00:00Z')+30*DAY).toISOString().slice(0,10);
    const days=Math.round((Date.parse(due)-Date.parse(day))/DAY);
    const key=r.result==='Fail'?'fail':days<0?'overdue':days===0?'due':days<=7?'soon':'ok';
    return {due,days,key,label:{fail:'ไม่ผ่าน · ต้องดำเนินการ',overdue:'เกินกำหนด',due:'ครบกำหนดวันนี้',soon:'ใกล้ครบกำหนด',ok:'ปกติ'}[key]};
  }
  function summary(rows){const records=latest(rows);const statuses=records.map(r=>status(r));return `<div class="panel"><h2>แจ้งเตือน PM · รอบ 30 วัน</h2><p class="muted">เตือนล่วงหน้า 7 วัน · นับจากวันที่แคลล่าสุด · วันที่ตามเวลาไทย · แสดงเฉพาะเครื่องที่มีประวัติ</p><div class="cards">${[['fail','ไม่ผ่าน'],['overdue','เกินกำหนด'],['due','ครบกำหนดวันนี้'],['soon','ใกล้ครบกำหนด']].map(([k,label])=>`<div class="card"><span>${label}</span><div class="value">${statuses.filter(s=>s.key===k).length}</div><small>เครื่อง</small></div>`).join('')}</div></div>`;}
  function overview(rows,query='',filter='all'){
    const priority={fail:0,overdue:1,due:2,soon:3,ok:4};
    const selected=latest(rows).map(r=>({...r,pm:status(r)})).filter(r=>(filter==='all'||r.pm.key===filter)&&[r.machine,r.model,r.tech].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>priority[a.pm.key]-priority[b.pm.key]||a.pm.days-b.pm.days);
    if(!selected.length)return '<div class="empty">ไม่พบเครื่องตามเงื่อนไข · เพิ่มผลแคลครั้งแรกเพื่อเริ่มติดตาม</div>';
    return `<div class="stock-table-scroll"><table><thead><tr>${['รหัสเครื่อง','ประเภท / รุ่น','แคลล่าสุด','ผลล่าสุด','ครบกำหนด PM','ระยะเวลา','สถานะ','ช่าง'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${selected.map(r=>`<tr><td>${esc(r.machine)}</td><td>${esc(r.model)}</td><td>${esc(r.date)}</td><td>${r.result==='Pass'?'ผ่าน':'ไม่ผ่าน'}</td><td>${r.pm.due}</td><td>${r.pm.days<0?'เกิน '+-r.pm.days+' วัน':r.pm.days===0?'วันนี้':'อีก '+r.pm.days+' วัน'}</td><td><span class="badge ${r.pm.key==='ok'?'':'bad'}">${r.pm.label}</span></td><td>${esc(r.tech)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const api={today,latest,status,summary,overview};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CalView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
