'use strict';
document.getElementById('user-form').hidden=true;
const list=document.getElementById('user-list'),message=document.createElement('p');message.setAttribute('role','status');list.before(message);
const hint=document.createElement('p');hint.textContent='ตรวจสอบผู้สมัครว่าเป็นสมาชิกทีมก่อนอนุมัติ · Engineer แก้ไขสโตร์และ Demand ได้ · ช่างบันทึกงานและตรวจนับในห้องได้ · ผู้ดูดูข้อมูลได้อย่างเดียว';list.before(hint);
const refresh=document.createElement('button');refresh.textContent='รีเฟรชรายชื่อ';refresh.className='secondary';list.before(refresh);refresh.onclick=loadUsers;
async function loadUsers(){
 try{
  const users=await TestHubCloud.request('/api/users');list.replaceChildren();
  for(const user of users){
   const row=document.createElement('div');row.className='panel';const text=document.createElement('p');text.textContent=`${user.name} · ${user.email||''} · ${user.role||'รออนุมัติ'}`;row.append(text);
   if(user.role!=='admin'){
    const select=document.createElement('select');select.setAttribute('aria-label','สิทธิ์ของ '+user.email);
    for(const [value,label] of [['technician','ช่าง'],['engineer','Engineer'],['viewer','ดูข้อมูล']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
    select.value=user.role||'technician';
    const button=document.createElement('button');button.textContent=user.role?'บันทึกสิทธิ์':'อนุมัติ';button.onclick=async()=>{
     if(!confirm(`${user.role?'เปลี่ยนสิทธิ์':'อนุมัติ'} ${user.email} เป็น ${select.selectedOptions[0].textContent}?`))return;
     button.disabled=true;try{await TestHubCloud.request(user.role?'/api/users/role':'/api/users/approve',{id:user.id,role:select.value,previousRole:user.role});message.textContent='บันทึกสิทธิ์แล้ว ให้ผู้ใช้รีเฟรชหน้าเว็บ';await loadUsers();}catch(e){message.textContent=e.message;button.disabled=false;}
    };row.append(select,button);
   }list.append(row);
  }
 }catch(e){message.textContent=e.message;}
}
loadUsers();
