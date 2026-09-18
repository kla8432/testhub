'use strict';
window.TestHubCloud=(()=>{
 const config=window.TESTHUB_CONFIG||{},base=new URL('.',document.currentScript.src);
 const storageKey='testhub-session:'+config.url;let refreshing=null;
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{return null;}};
 const save=s=>sessionStorage.setItem(storageKey,JSON.stringify({...s,expires_at:Date.now()+s.expires_in*1000}));
 const clear=()=>sessionStorage.removeItem(storageKey);
 function settings(){if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')||!config.publishableKey)throw Error('ยังไม่ได้เชื่อม Supabase กรุณาตั้งค่าแล้วเผยแพร่เว็บอีกครั้ง');}
 async function auth(path,body,token){settings();const res=await fetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=res.status===204?{}:await res.json();if(!res.ok)throw Error(data.msg||data.error_description||data.message||'เข้าสู่ระบบไม่สำเร็จ');return data;}
 async function session(){
  let s=read();if(!s)return null;
  if(s.expires_at>Date.now()+60000)return s;
  if(!refreshing)refreshing=auth('token?grant_type=refresh_token',{refresh_token:s.refresh_token}).then(next=>{save(next);return read();}).catch(e=>{clear();throw e;}).finally(()=>refreshing=null);
  return refreshing;
 }
 async function request(path,data){
  settings();
  if(path==='/api/logout'){const s=read();try{if(s)await auth('logout',{},s.access_token);}finally{clear();}return {};}
  const s=await session();if(!s){if(path==='/api/session')return {user:null,setupRequired:false};location.replace(new URL('login.html',base));throw Error('กรุณาเข้าสู่ระบบ');}
  const res=await fetch(config.url+'/functions/v1/testhub'+path,{method:data?'POST':'GET',headers:{apikey:config.publishableKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  const result=await res.json();if(res.status===401){clear();location.replace(new URL('login.html',base));}if(!res.ok)throw Error(result.error||'เชื่อมต่อระบบไม่ได้');return result;
 }
 async function login(email,password){const s=await auth('token?grant_type=password',{email,password});save(s);try{await request('/api/session');}catch(e){clear();throw e;}}
 async function download(){const state=await request('/api/export');const href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download='testhub-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
 return {request,login,download,base};
})();
