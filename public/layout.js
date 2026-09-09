(() => {
  const stage=document.getElementById('stage'),scene=document.createElement('div');scene.id='scene';
  stage.prepend(scene);
  for(const id of ['background','roomStill','todoRepair','plushies','ahogeLayer','sceneClockHit','chillVisitor'])scene.append(document.getElementById(id));
  const hud=document.createElement('div');hud.id='hud';
  for(const child of [...stage.children])if(child!==scene)hud.append(child);
  stage.append(hud);
  const resolution=document.getElementById('layoutResolution'),taskbar=document.getElementById('taskbarGap');
  const preferenceKey=taskbar?'2233-offline-layout-v1':'2233-web-layout-v1';
  let preferences={resolution:'auto',taskbar:true};
  try{preferences={...preferences,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch(_){}
  resolution.value=preferences.resolution;
  if(!resolution.value)resolution.value='auto';
  if(taskbar)taskbar.checked=preferences.taskbar!==false;
  let uiScale=1,bottomInset=0;
  function resize(){
    stage.style.transform='none';stage.style.width=innerWidth+'px';stage.style.height=innerHeight+'px';
    const automatic=Math.max(1,Math.min(innerWidth/1920,innerHeight/1080));
    const dimensions=resolution.value.split('x').map(Number);
    const requested=resolution.value==='auto'?automatic:Math.min(dimensions[0]/1920,dimensions[1]/1080);
    // Keep manual choices within a usable viewport on smaller displays.
    uiScale=innerWidth<=650?1:Math.min(Math.max(.75,requested),automatic);
    bottomInset=taskbar?.checked&&innerWidth>650?56:0;
    hud.style.width=innerWidth/uiScale+'px';hud.style.height=(innerHeight/uiScale-bottomInset)+'px';
    hud.style.transform=`scale(${uiScale})`;
    const scale=Math.max(innerWidth/1920,innerHeight/1080);
    scene.style.transform=`translate(${(innerWidth-1920*scale)/2}px,${(innerHeight-1080*scale)/2}px) scale(${scale})`;
  }
  window.roomLayout={resize,get uiScale(){return uiScale;},get width(){return innerWidth/uiScale;},get height(){return innerHeight/uiScale-bottomInset;}};resize();
  function saveLayout(){
    try{localStorage.setItem(preferenceKey,JSON.stringify({resolution:resolution.value,taskbar:taskbar?.checked??false}));}catch(_){}
    resize();window.dispatchEvent(new Event('room-layout-change'));
  }
  resolution.addEventListener('change',saveLayout);taskbar?.addEventListener('change',saveLayout);
  const button=document.getElementById('fullscreenToggle');
  button.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){document.getElementById('notice').textContent='当前浏览器暂不支持全屏';document.getElementById('notice').hidden=false;}};
  document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;button.setAttribute('aria-label',active?'退出全屏':'进入全屏');button.title=active?'退出全屏':'进入全屏';button.setAttribute('aria-pressed',String(active));resize();});
})();
