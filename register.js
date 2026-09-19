'use strict';
const form=document.getElementById('register-form'),message=document.getElementById('register-status');
form.onsubmit=async event=>{
 event.preventDefault();const button=form.querySelector('button');message.textContent='';
 if(form.elements.password.value!==form.elements.confirm.value){message.textContent='รหัสผ่านทั้งสองช่องไม่ตรงกัน';return;}
 button.disabled=true;
 try{await TestHubCloud.register(form.elements.email.value.trim(),form.elements.password.value,form.elements.name.value.trim());form.reset();message.textContent='สมัครเรียบร้อยแล้ว กรุณาแจ้งผู้ดูแลให้อนุมัติบัญชีก่อนเข้าสู่ระบบ';}
 catch(e){message.textContent=e.message;}finally{button.disabled=false;}
};
