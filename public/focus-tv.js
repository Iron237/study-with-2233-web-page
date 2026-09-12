(() => {
  'use strict';
  const $=id=>document.getElementById(id),stage=$('stage');
  const {FocusTimer,clockIsFace}=window.RoomFocusCore;
  const timer=new FocusTimer(),key='2233-web-focus-session-v1';
  const now=()=>window.focusTimeSource?window.focusTimeSource():performance.timeOrigin+performance.now();
  let active=false,applyingExternal=false;
  function remember(){if(applyingExternal)return;try{localStorage.setItem(key,JSON.stringify({state:active&&timer.session?'focus':'rest',session:timer.snapshot(now())}));}catch(_){}}
  function interactivePaused(value){
    const frozen=value||player.enginePaused;
    window.chillPetting?.setPaused(frozen);window.plushPetting?.setPaused(frozen);window.ahogePetting?.setPaused(frozen);window.roomEaster?.setPaused(player.enginePaused);
  }
  function setLocked(value){for(const id of ['plushies','ahogeLayer','focusPanel','sceneClockHit','chillVisitor'])$(id).inert=value;}
  function lock(){
    active=true;window.roomEaster?.stopConversation();setLocked(true);stage.classList.remove('focus-secret');stage.classList.add('focus-active');
    $('focusToggle').textContent='休息';$('focusToggle').setAttribute('aria-label','休息');
    $('companions').hidden=true;$('companionTools').hidden=true;$('focusShield').hidden=false;
    $('focusPanel').hidden=true;$('settings').hidden=true;$('playlist').hidden=true;
    $('chillVisitor').hidden=true;
    interactivePaused(true);updateCountdown();window.dispatchEvent(new Event('room-focus-change'));
  }
  function finish(session,celebrate=true){
    window.roomEaster?.stopConversation();active=false;timer.session=null;remember();setLocked(false);$('focusMusic').hidden=true;
    $('focusToggle').textContent='继续专注';$('focusToggle').setAttribute('aria-label','继续专注');
    stage.classList.remove('focus-secret');stage.classList.remove('focus-active');$('focusShield').hidden=true;
    player.mode=session?.mode||'list';if(!celebrate||!session)window.roomEaster?.showRest();interactivePaused(false);render();save();window.dispatchEvent(new Event('room-focus-change'));
    if(celebrate&&session)window.roomEaster?.showFocusComplete(session.minutes);
  }
  function updateCountdown(){
    if(!active)return;
    const done=timer.takeFinished(now());
    if(done){finish(done);return;}
    const unlimited=timer.session?.minutes===null;
    $('focusRemaining').textContent=timer.session?format(unlimited?Math.floor(timer.elapsed(now())/1000):timer.remaining(now())):'';
    $('focusRemaining').setAttribute('aria-label',unlimited?'本次专注时长':'专注剩余时间');
    $('focusMusic').hidden=!active;
    $('focusMusic').textContent=player.wantsPlayback?'暂停音乐':'播放音乐';
    if(player.error&&!player.wantsPlayback)$('focusMusic').textContent='点击重试播放';
  }
  function start(){
    const minutes=Number($('focusMinutes').value);
    try{timer.start(minutes,now(),player.mode);}catch(e){showNotice(e.message);return;}
    player.mode='list';if(!player.wantsPlayback)player.toggle();else player.startAudio();
    lock();remember();save();
  }
  $('focusToggle').onclick=()=>{if(active){finish(timer.session,false);$('focusMusic').hidden=true;return;}togglePlaylist(false);$('settings').hidden=true;$('focusPanel').hidden=!$('focusPanel').hidden;};
  $('closeFocus').onclick=()=>$('focusPanel').hidden=true;
  document.querySelectorAll('[data-minutes]').forEach(b=>b.onclick=()=>$('focusMinutes').value=b.dataset.minutes);
  $('startFocus').onclick=start;
  $('untimedFocus').onclick=()=>{timer.startUnlimited(now(),player.mode);player.mode='list';if(!player.wantsPlayback)player.toggle();lock();remember();};
  $('focusMusic').onclick=()=>{player.toggle();updateCountdown();};
  window.roomFocus={get active(){return active;},refresh:updateCountdown};
  // Capturing guards back up inert on older embedded Chromium versions.
  for(const name of ['pointerover','pointerenter','pointermove','pointerdown','pointerup','click','dblclick','contextmenu','wheel','keydown','keyup']){
    document.addEventListener(name,e=>{
      const allowed=(name==='pointerdown'&&player.error==='点击播放，开始自习。')||e.key==='Tab'||e.target.closest?.('#focusToggle,#focusMusic,#systemClock,#settingsToggle,#settings,#qaPanel,#fullscreenToggle,#player,#album,#playlist,#todoPanel,#todoToggle')||(stage.classList.contains('focus-secret')&&e.target.closest?.('#companions,#companionTools'));
      if(active&&!allowed&&(stage.contains(e.target)||name==='keydown'||name==='keyup')){
        e.preventDefault();e.stopImmediatePropagation();
      }
    },{capture:true,passive:false});
  }
  setInterval(updateCountdown,250);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCountdown();});
  window.addEventListener('focus',updateCountdown);
  function faceAvailable(){return !active&&!player.enginePaused&&clockIsFace(video.currentTime)&&video.readyState>=2;}
  function clockState(){
    const available=faceAvailable();$('sceneClockHit').disabled=!available;
    $('sceneClockHit').dataset.face=available?'ready':'waiting';
    $('sceneClockHit').title=available?'chill~ · 点我':'';
  }
  video.addEventListener('timeupdate',clockState);video.addEventListener('loadeddata',clockState);video.addEventListener('emptied',clockState);
  $('sceneClockHit').onclick=()=>{if(faceAvailable())$('chillVisitor').hidden=!$('chillVisitor').hidden;};
  $('dismissChill').onclick=()=>$('chillVisitor').hidden=true;
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){$('settings').hidden=true;if(!active)$('focusPanel').hidden=true;}
  });
  let restoredRest=false;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');restoredRest=saved?.state==='rest';if(!restoredRest)timer.restore(saved?.state==='focus'?saved.session:saved,now());}catch(_){}
  if(restoredRest)finish(null,false);
  let restoredFinished=false;
  if(timer.session){
    const finished=timer.takeFinished(now());
    if(finished){finish(finished);restoredFinished=true;}
    else{player.mode='list';lock();}
  }
  if(!timer.session&&!active&&!restoredFinished&&!restoredRest){timer.startUnlimited(now(),player.mode);player.mode='list';lock();remember();}
  setInterval(()=>{if(active)remember();},5000);
  window.addEventListener('pagehide',remember);
  window.addEventListener('pageshow',e=>{if(e.persisted&&active){try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.state==='focus')timer.restore(saved.session,now());else finish(timer.session,false);}catch(_){}updateCountdown();}});
  window.addEventListener('storage',e=>{
    if(e.key!==key||!e.newValue)return;
    try{const saved=JSON.parse(e.newValue);applyingExternal=true;
      if(saved.state==='rest'&&active)finish(timer.session,false);
      else if(saved.state==='focus'&&saved.session&&(!active||saved.session.id!==timer.session?.id)){timer.restore(saved.session,now());if(timer.session)lock();}
    }catch(_){}finally{applyingExternal=false;}
  });
  clockState();
})();