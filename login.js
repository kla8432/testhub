'use strict';
const form=document.getElementById('login-form'),error=document.getElementById('login-error');
document.getElementById('login-hint').textContent='ใช้อีเมลและรหัสผ่านที่ผู้ดูแลตั้งให้';
const username=form.elements.username;username.type='email';username.removeAttribute('pattern');username.previousSibling.textContent='อีเมล';
form.onsubmit=async e=>{e.preventDefault();const button=document.getElementById('login-submit');button.disabled=true;error.textContent='';try{await TestHubCloud.login(username.value,form.elements.password.value);location.replace('./');}catch(err){error.textContent=err.message;}finally{button.disabled=false;}};
TestHubCloud.request('/api/session').then(s=>{if(s.user)location.replace('./');}).catch(err=>error.textContent=err.message);
