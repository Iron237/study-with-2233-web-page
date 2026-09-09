(() => {
  'use strict';
  const $=id=>document.getElementById(id),stage=$('stage'),clock=$('systemClock'),companions=$('companions');
  const ui=()=>window.roomLayout;
  const D=window.ROOM_DIALOGUE,C=window.ROOM_PET_CONTENT;
  const {poses,labels,timeBand,fill}=window.RoomDialogueScenes;
  const {Conversation,duration}=window.RoomConversation;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,groupPositions=new Map(),resourcePositions=new Map();
  let paused=player.enginePaused,secret=false,pose=0,afterFocus=false;
  const secretTrigger=new window.RoomEasterCore.SecretMinuteTrigger();
  const deck=lines=>{let i=0;return {next:()=>lines[i++%lines.length]};};
  const touch={'22':deck(D.touch['22']),'33':deck(D.touch['33'])},focusTouch={'22':deck(D.focusTouch['22']),'33':deck(D.focusTouch['33'])},moves={'22':deck(D.moves['22']),'33':deck(D.moves['33'])};
  const pets=[...document.querySelectorAll('.companion')].map((el,i)=>({el,who:el.dataset.character,button:el.querySelector('button'),bubble:el.querySelector('.pet-bubble'),x:Math.max(8,ui().width-320+i*145),y:Math.max(80,ui().height-365),pointer:null,moved:false,timer:0}));
  const petById=Object.fromEntries(pets.map(p=>[p.who,p]));
  function clearBubbles(){for(const p of pets){clearTimeout(p.timer);p.bubble.hidden=true;}}
  const conversation=new Conversation({clear:clearBubbles,say:item=>say(petById[item.character],item.text,item.duration+100),onFinish:()=>$('petChat').textContent='聊两句'});
  function position(p){p.el.style.translate=p.x+'px '+p.y+'px';if(p.pointer===null&&!p.bubble.hidden)fitBubble(p);}
  function drawDrag(p){p.dragFrame=null;position(p);p.el.style.setProperty('--lean',p.lean+'deg');}
  function homePets(){pets.forEach((p,i)=>{p.x=Math.max(8,ui().width-320+i*145);p.y=Math.max(65,$('utilityDock').getBoundingClientRect().top/ui().uiScale-190);position(p);});}
  function fitBubble(p){
    p.bubble.style.marginLeft='0px';p.bubble.style.maxWidth=Math.min(230,ui().width-24)+'px';
    const r=p.bubble.getBoundingClientRect();let shift=0;
    if(r.left<12)shift=12-r.left;else if(r.right>innerWidth-12)shift=innerWidth-12-r.right;
    p.bubble.style.marginLeft=(shift/ui().uiScale)+'px';
  }
  function say(p,text,ms=duration(text)){
    clearTimeout(p.timer);p.bubble.replaceChildren();
    for(const part of window.RoomRecommendations.inlineParts(text)){
      if(part.url){
        const a=document.createElement('a');a.href=part.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=part.label;p.bubble.append(a);
      }else p.bubble.append(document.createTextNode(part.text));
    }
    p.bubble.hidden=false;fitBubble(p);p.timer=setTimeout(()=>p.bubble.hidden=true,ms);
  }
  function drawAsset(p){
    const spec=C.assets[poses[pose]],region=spec.characters[p.who],ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',region.viewBox.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');
    const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),polygon=document.createElementNS(ns,'polygon'),img=document.createElementNS(ns,'image');
    const clipId='pet-region-'+p.who;clip.id=clipId;polygon.setAttribute('points',region.clip.map(point=>point.join(',')).join(' '));clip.append(polygon);defs.append(clip);
    img.setAttribute('href',spec.image);img.setAttribute('width',spec.width);img.setAttribute('height',spec.height);img.setAttribute('clip-path','url(#'+clipId+')');
    svg.append(defs,img);p.el.querySelector('.companion-art').replaceChildren(svg);p.el.dataset.assetCharacter=p.who;
  }
  function sceneKey(){
    const focused=!!window.roomFocus?.active,date=window.roomClockSource?window.roomClockSource():new Date();
    return (focused?'focusScene.':'restScene.')+poses[pose]+(!focused&&poses[pose]==='rest'?'.'+timeBand(date.getHours()):'');
  }
  function readyGroups(key,fields={}){
    return window.RoomRecommendations.prepare(C.groups[key]||[],fields,fill);
  }
  function startGroup(group){conversation.start(group);$('petChat').textContent='下一句';}
  function talkScene(){
    const key=sceneKey(),scene=poses[pose],recommendations=window.RoomRecommendations;
    const record=key.startsWith('restScene.')?recommendations.select(window.ROOM_MEDIA_RESOURCES,scene,resourcePositions.get(scene)):null;
    if(record)resourcePositions.set(scene,record.id);
    const fields=recommendations.values(scene,record,window.roomClockSource?window.roomClockSource():new Date());let groups=readyGroups(key,fields);
    companions.dataset.resourceId=record?.id||'';
    if(!groups.length)groups=readyGroups('restScene.rest.generic');
    const index=groupPositions.get(key)||0;groupPositions.set(key,index+1);startGroup(groups[index%groups.length]);
  }
  function setPose(value,speak=true){
    conversation.stop();pose=value;companions.dataset.pose=poses[pose];$('petPose').textContent=labels[pose];$('petPose').title='当前：'+labels[pose]+' · 点击换姿势';
    for(const p of pets)drawAsset(p);if(speak)talkScene();
  }
  function release(p,cancelled=false){
    if(p.pointer===null)return;if(p.dragFrame){cancelAnimationFrame(p.dragFrame);drawDrag(p);}const pointer=p.pointer;p.pointer=null;p.el.classList.remove('dragging');p.el.style.setProperty('--lean','0deg');
    if(p.button.hasPointerCapture(pointer))p.button.releasePointerCapture(pointer);
    if(!cancelled){say(p,p.moved?moves[p.who].next():(afterFocus?focusTouch:touch)[p.who].next());if(!reduced)p.button.animate([{transform:'scale(1.08,.92)'},{transform:'scale(.97,1.03)'},{transform:'scale(1)'}],{duration:420,easing:'ease-out'});}
  }
  for(const p of pets){
    position(p);
    p.button.addEventListener('pointerdown',e=>{if(e.button!==0||paused)return;e.preventDefault();conversation.stop();p.pointer=e.pointerId;p.startX=e.clientX;p.startY=e.clientY;p.originX=p.x;p.originY=p.y;p.moved=false;p.button.setPointerCapture(e.pointerId);p.el.classList.add('dragging');});
    p.button.addEventListener('pointermove',e=>{if(p.pointer!==e.pointerId)return;const dx=(e.clientX-p.startX)/ui().uiScale,dy=(e.clientY-p.startY)/ui().uiScale;p.moved=p.moved||Math.hypot(dx,dy)>5;p.x=Math.max(8,Math.min(ui().width-136,p.originX+dx));p.y=Math.max(65,Math.min(ui().height-180,p.originY+dy));p.lean=Math.max(-12,Math.min(12,dx*.12));if(!p.dragFrame)p.dragFrame=requestAnimationFrame(()=>drawDrag(p));});
    p.button.addEventListener('pointerup',()=>release(p));p.button.addEventListener('pointercancel',()=>release(p,true));p.button.addEventListener('lostpointercapture',()=>release(p,true));
    p.button.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!e.repeat&&!paused){e.preventDefault();conversation.stop();say(p,(afterFocus?focusTouch:touch)[p.who].next());}});
  }
  function clearInteractions(){for(const p of pets)release(p,true);}
  function syncPaused(){stage.classList.toggle('room-paused',paused||document.hidden);if(paused||document.hidden){clearInteractions();conversation.stop();}else updateClock(window.roomClockSource?window.roomClockSource():new Date());}
  function showSecret(){
    afterFocus=false;stage.classList.add('focus-secret');const appearing=companions.hidden;companions.hidden=false;$('companionTools').hidden=false;if(appearing)homePets();
    let first=true;try{first=localStorage.getItem('2233-secret-found-v1')!=='yes';localStorage.setItem('2233-secret-found-v1','yes');}catch(_){}
    const lines=first?D.first:D.returning;startGroup({id:first?'first':'returning',lines:[{'22':lines[0],'33':lines[1]}]});
  }
  clock.addEventListener('click',()=>{
    const date=window.roomClockSource?window.roomClockSource():new Date();updateClock(date,false);if(!secret||paused||document.hidden)return;
    secretTrigger.take(date);showSecret();
  });
  $('petPose').onclick=()=>setPose((pose+1)%poses.length);
  $('petDismiss').onclick=()=>{clearInteractions();conversation.stop();stage.classList.remove('focus-secret');companions.hidden=true;$('companionTools').hidden=true;};
  $('petChat').onclick=()=>{if(conversation.running)conversation.next();else talkScene();};
  function updateClock(date,auto=true){secret=window.RoomEasterCore.isSecretMinute(date);clock.disabled=!secret;clock.classList.toggle('secret-minute',secret);clock.setAttribute('aria-label',secret?'22:33 时间彩蛋，22 和 33 自动出现，点击可再次召出':'系统时间');clock.title=secret?'22:33 · 有人来陪你，点击可再次召出':'电脑本地时间';if(auto&&window.roomFocus&&secretTrigger.take(date,{paused,hidden:document.hidden}))showSecret();}
  window.roomEaster={updateClock,resetAutoTrigger(){secretTrigger.reset();},showFocusComplete(minutes){afterFocus=true;setPose(6,false);companions.hidden=false;$('companionTools').hidden=false;homePets();startGroup({id:'finish',lines:[{'22':D.finish[0].replace('{minutes}',String(minutes)),'33':D.finish[1]}]});},setPaused(value){paused=!!value;syncPaused();},stopConversation(){conversation.stop();}};
  window.addEventListener('room-layout-change',homePets);
  window.addEventListener('resize',()=>pets.forEach(p=>{p.x=Math.max(8,Math.min(ui().width-136,p.x));p.y=Math.max(65,Math.min(ui().height-180,p.y));position(p);}));
  window.addEventListener('blur',clearInteractions);document.addEventListener('visibilitychange',syncPaused);
  document.addEventListener('DOMContentLoaded',()=>updateClock(window.roomClockSource?window.roomClockSource():new Date()));
  setPose(0,false);updateClock(window.roomClockSource?window.roomClockSource():new Date());syncPaused();
})();
