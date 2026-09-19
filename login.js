'use strict';
const form=document.getElementById('login-form'),error=document.getElementById('login-error');
document.getElementById('login-hint').textContent='ใช้อีเมลและรหัสผ่านของบัญชีที่ได้รับอนุมัติ';
const signup=document.createElement('p'),signupLink=document.createElement('a');signupLink.href='register.html';signupLink.textContent='ยังไม่มีบัญชี? สมัครสมาชิก';signup.append(signupLink);form.after(signup);
const username=form.elements.username;username.type='email';username.removeAttribute('pattern');username.previousSibling.textContent='อีเมล';
form.onsubmit=async e=>{e.preventDefault();const button=document.getElementById('login-submit');button.disabled=true;error.textContent='';try{await TestHubCloud.login(username.value,form.elements.password.value);location.replace('./');}catch(err){error.textContent=err.message;}finally{button.disabled=false;}};
TestHubCloud.request('/api/session').then(s=>{if(s.user)location.replace('./');}).catch(err=>error.textContent=err.message);
