'use strict';
document.getElementById('user-form').hidden=true;
const message=document.getElementById('user-message');
const hint=document.createElement('p');hint.textContent='เวอร์ชันออนไลน์: เพิ่มบัญชีและกำหนดสิทธิ์ผ่าน Supabase Dashboard โดยเจ้าของโปรเจค';document.getElementById('user-list').before(hint);
TestHubCloud.request('/api/users').then(users=>{const list=document.getElementById('user-list');list.replaceChildren();for(const user of users){const p=document.createElement('p');p.textContent=`${user.name} · ${user.role}`;list.append(p);}}).catch(err=>{hint.textContent=err.message;});
