'use strict';
(async()=>{
 const status=document.getElementById('status');
 try{
  const model=new URLSearchParams(location.search).get('model')||'';
  const guide=await TestHubCloud.request('/api/setup-guide?model='+encodeURIComponent(model));
  document.title=guide.model+' Setup · TestHub';
  document.getElementById('title').textContent=guide.model+' Setup';
  status.textContent='แตะรูปเพื่อเปิดภาพขนาดเต็มและขยายดูจุดต่อสาย';
  for(const slide of guide.slides){
   const section=document.createElement('section');section.id='slide-'+slide.number;
   const heading=document.createElement('h2');heading.textContent=slide.title;
   const source=document.createElement('p');source.textContent='สไลด์ '+slide.number+' จากคู่มือต้นฉบับ';
   const link=document.createElement('a');link.href=slide.url;link.target='_blank';link.rel='noopener noreferrer';
   const img=document.createElement('img');img.className='slide-image';img.src=slide.url;img.alt=guide.model+' '+slide.title+' พร้อมเส้นแสดงการเชื่อมต่อ';img.loading='lazy';img.width=1600;img.height=900;
   img.onerror=()=>{status.textContent='โหลดรูปบางส่วนไม่สำเร็จ กรุณารีเฟรชหน้าเว็บเพื่อลองใหม่';};
   link.append(img);section.append(heading,source,link);document.getElementById('slides').append(section);
   const anchor=document.createElement('a');anchor.href='#'+section.id;anchor.textContent=slide.title;document.getElementById('contents').append(anchor);
  }
 }catch(error){document.getElementById('title').textContent='เปิดคู่มือไม่สำเร็จ';status.textContent=error.message;}
})();
