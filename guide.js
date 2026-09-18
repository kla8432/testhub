'use strict';
(async()=>{
 const status=document.getElementById('status');
 try{
  const assets=await TestHubCloud.request('/api/guide');
  const [html,css]=await Promise.all(['index.html','guide.css'].map(async name=>{const r=await fetch(assets[name]);if(!r.ok)throw Error('โหลดคู่มือไม่สำเร็จ');return r.text();}));
  const doc=new DOMParser().parseFromString(html,'text/html');const main=doc.querySelector('main');if(!main)throw Error('รูปแบบคู่มือไม่ถูกต้อง');
  const tags=new Set(['MAIN','A','P','H1','H2','ASIDE','STRONG','NAV','SECTION','DIV','SPAN','svg','image']);
  for(const node of [...main.querySelectorAll('*')]){
   if(!tags.has(node.tagName)){node.remove();continue;}
   for(const attr of [...node.attributes])if(!['class','id','href','viewBox','width','height','role','aria-label'].includes(attr.name))node.removeAttribute(attr.name);
   const href=node.getAttribute('href');if(href){if(assets[href]&&node.tagName==='image')node.setAttribute('href',assets[href]);else if(!href.startsWith('#'))node.removeAttribute('href');}
  }
  // The frame has no scripts, forms, same-origin privilege or navigation permission.
  document.getElementById('guide').srcdoc=`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.replace(/<\/style/gi,'')}</style>${main.outerHTML}</html>`;
  status.textContent='คู่มือ Santorini';
 }catch(e){status.textContent=e.message;}
})();
