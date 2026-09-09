(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.RoomDialogueScenes=factory();
})(typeof window==='undefined'?this:window,function(){
  'use strict';
  const poses=['anime','dance','game','study','show','sing','rest'];
  const labels=['一起追番','一起跳舞','一起打游戏','一起学习','一起看演出','一起唱歌','一起休息'];
  function timeBand(hour){return hour>=23||hour<5?'late':hour<11?'morning':hour<14?'noon':hour<18?'afternoon':'evening';}
  function fill(text,values={}){
    let missing=false;
    const result=text.replace(/\{([^{}]+)\}/g,(_,key)=>{
      const v=values[key];if(typeof v!=='string'||!v.trim()){missing=true;return '';}
      return v.trim();
    });
    return missing?null:result;
  }
  function sceneLines(data,pose,focused,hour,values={}){
    if(!poses.includes(pose))pose='rest';
    let lines=focused?data.focusScene?.[pose]:data.restScene?.[pose];
    if(!focused&&pose==='rest')lines=lines?.[timeBand(hour)]||lines?.generic;
    const ready=(lines||[]).map(pair=>pair.map(line=>fill(line,values))).filter(pair=>pair.length===2&&pair.every(Boolean));
    return ready.length?ready:(focused?data.focusChats:data.chats);
  }
  return {poses,labels,timeBand,fill,sceneLines};
});
