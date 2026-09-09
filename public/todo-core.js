(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.RoomTodoCore=factory();
})(typeof window==='undefined'?this:window,function(){
  'use strict';
  const limit=12,maxLength=80;
  function clean(value){return typeof value==='string'?value.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,maxLength):'';}
  function normalize(value){
    const out={'you':[]};
    for(const who of ['you']){
      if(!Array.isArray(value?.[who]))continue;
      const seen=new Set();
      for(const row of value[who]){
        if(!row||typeof row.id!=='string'||!/^[-\w]{1,64}$/.test(row.id)||seen.has(row.id)||!clean(row.text))continue;
        out[who].push({id:row.id,text:clean(row.text),done:row.done===true});seen.add(row.id);
        if(out[who].length===limit)break;
      }
    }
    return out;
  }
  function migrate(value){return normalize({you:[...(Array.isArray(value?.['22'])?value['22']:[]),...(Array.isArray(value?.['33'])?value['33']:[])]});}
  return {limit,maxLength,clean,normalize,migrate};
});
