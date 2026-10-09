(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SetupUpload=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function createBatch(command,files,{mutate,upload,uuid=()=>crypto.randomUUID()}){
  files=Array.from(files||[]);
  if(files.length>100)throw Error('เลือกได้ไม่เกิน 100 รูปต่อคู่มือ');
  for(const file of files)if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024)throw Error('รูป '+file.name+' ต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
  const items=files.map(file=>({file,requestId:uuid()}));let guide=null,index=0;
  return {
   status:()=>({metadataSaved:!!guide,uploaded:index,total:items.length}),
   async save(){
    if(!guide){const state=await mutate(command);const id=command.action==='create'?command.requestId:command.id,found=state.setup.find(r=>r.id===id);if(!found)throw Error('ไม่พบคู่มือที่บันทึก กรุณาโหลดเว็บล่าสุด');guide={...found,images:[...(found.images||[])]};}
    if((guide.images||[]).length+items.length>100)throw Error('คู่มือมีรูปได้ไม่เกิน 100 รูป กรุณาลบรูปเดิมบางส่วนก่อน');
    while(index<items.length){
     const item=items[index],form=new FormData();
     for(const [key,value] of Object.entries({id:guide.id,version:String(guide.version),requestId:item.requestId,title:item.file.name.replace(/\.[^.]+$/,'').slice(0,200)||'รูปประกอบ'}))form.set(key,value);
     form.set('file',item.file);await upload(form);guide={...guide,version:guide.version+1};index++;
    }
    return guide.id;
   }
  };
 }
 return {createBatch};
});
