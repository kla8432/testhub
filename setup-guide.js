'use strict';
(async()=>{
 const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 const query=params.has('id')?'id='+encodeURIComponent(params.get('id')):'model='+encodeURIComponent(params.get('model')||'');
 let guide=null,pending=null,previewUrl=null,busy=false;
 async function request(path,data){
  if(window.TestHubCloud)return TestHubCloud.request(path,data);
  const res=await fetch(path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});
  const result=await res.json();if(res.status===401)location.replace('login.html');if(!res.ok)throw Error(result.error||'เชื่อมต่อระบบไม่ได้');return result;
 }
 function setBusy(value){busy=value;document.querySelectorAll('button,input').forEach(el=>el.disabled=value);}
 function render(){
  document.title=guide.model+' · '+guide.title+' · TestHub';$('title').textContent=guide.model;$('subtitle').textContent=guide.title;
  $('manage').hidden=!guide.canManage;$('notes').hidden=!(guide.wiring||guide.steps);$('wiring').textContent=guide.wiring||'—';$('steps').textContent=guide.steps||'—';
  $('slides').replaceChildren();$('contents').replaceChildren();
  $('status').textContent=guide.slides.length?'รูปประกอบ '+guide.slides.length+' รูป · แตะรูปเพื่อเปิดภาพขนาดเต็ม':'ยังไม่มีรูปประกอบ'+(guide.canManage?' · เพิ่มรูปได้จากแบบฟอร์มด้านบน':'');
  for(const [index,slide] of guide.slides.entries()){
   const section=document.createElement('section');section.id='image-'+index;
   const head=document.createElement('div');head.className='image-heading';const h=document.createElement('h2');h.textContent=(index+1)+'. '+slide.title;head.append(h);
   if(guide.canManage){const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='ลบรูป';button.setAttribute('aria-label','ลบรูป '+slide.title);button.onclick=()=>removeImage(slide);head.append(button);}
   const link=document.createElement('a');link.href=slide.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','เปิดรูป '+slide.title+' ขนาดเต็ม');
   if(slide.crop){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),img=document.createElementNS(ns,'image');svg.setAttribute('viewBox',slide.crop);svg.classList.add('slide-image');svg.setAttribute('role','img');svg.setAttribute('aria-label',guide.model+' '+slide.title);img.setAttribute('href',slide.url);img.setAttribute('width','2048');img.setAttribute('height','1152');svg.append(img);link.append(svg);
   }else{
    const img=document.createElement('img');img.className='slide-image';img.src=slide.url;img.alt=guide.model+' '+slide.title;img.loading='lazy';img.onerror=()=>{$('status').textContent='โหลดรูปบางส่วนไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุด';$('reload').hidden=false;};link.append(img);
   }
   section.append(head,link);$('slides').append(section);
   const anchor=document.createElement('a');anchor.href='#'+section.id;anchor.textContent=(index+1)+'. '+slide.title;$('contents').append(anchor);
  }
 }
 async function load(){guide=await request('/api/setup-guide?'+query);render();$('reload').hidden=true;}
 async function removeImage(slide){
  if(busy||!guide.canManage||!confirm('ลบรูป “'+slide.title+'” ออกจากคู่มือนี้?'))return;
  setBusy(true);try{await request('/api/mutate',{requestId:crypto.randomUUID(),kind:'setup',action:'setup-image-delete',id:guide.id,version:guide.version,data:{imageId:slide.id}});await load();$('status').textContent='ลบรูปออกจากคู่มือแล้ว';}catch(e){$('status').textContent=e.message;$('reload').hidden=false;}finally{setBusy(false);}
 }
 $('upload-form').addEventListener('input',()=>{pending=null;$('upload-error').textContent='';});
 $('upload-form').elements.file.addEventListener('change',()=>{
  if(previewUrl)URL.revokeObjectURL(previewUrl);const file=$('upload-form').elements.file.files[0];$('preview').hidden=!file;
  if(file){previewUrl=URL.createObjectURL(file);$('preview').src=previewUrl;}
 });
 $('upload-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!guide?.canManage)return;const file=e.target.elements.file.files[0];$('upload-error').textContent='';
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){$('upload-error').textContent='กรุณาเลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB';return;}
  if(!pending)pending={requestId:crypto.randomUUID(),version:guide.version,title:e.target.elements.title.value.trim()||file.name.replace(/\.[^.]+$/,''),file};
  const form=new FormData();form.set('id',guide.id);form.set('version',String(pending.version));form.set('requestId',pending.requestId);form.set('title',pending.title);form.set('file',pending.file);
  setBusy(true);$('status').textContent='กำลังอัปโหลดรูป…';
  try{
   if(window.TestHubCloud)await TestHubCloud.uploadSetupImage(form);else{const res=await fetch('/api/setup-image',{method:'POST',body:form}),result=await res.json();if(!res.ok)throw Error(result.error||'อัปโหลดไม่สำเร็จ');}
   pending=null;e.target.reset();$('preview').hidden=true;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}await load();$('status').textContent='เพิ่มรูปในคู่มือแล้ว';
  }catch(e){$('upload-error').textContent=e.message;$('status').textContent='ยังอัปโหลดไม่สำเร็จ';$('reload').hidden=false;}finally{setBusy(false);}
 };
 $('reload').onclick=async()=>{if(busy)return;setBusy(true);try{await load();pending=null;$('upload-error').textContent='';}catch(e){$('status').textContent=e.message;}finally{setBusy(false);}};
 try{await load();}catch(e){$('title').textContent='เปิดคู่มือไม่สำเร็จ';$('status').textContent=e.message;$('reload').hidden=false;}
})();
