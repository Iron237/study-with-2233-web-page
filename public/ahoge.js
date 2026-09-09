/* The cowlick is an independent transparent layer pivoting at its root. */
(() => {
  'use strict';
  const hit=document.getElementById('ahogeHit'),sprite=document.getElementById('ahogeSprite');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angle=0,velocity=0,frame=0,last=0,lastKick=0,lastX=0,paused=player.enginePaused;
  function reset(){
    if(frame)cancelAnimationFrame(frame);frame=0;angle=0;velocity=0;last=0;
    sprite.style.transform='none';hit.dataset.state='idle';
  }
  function tick(now){
    frame=0;if(paused||document.hidden){reset();return;}
    const dt=last?Math.min((now-last)/1000,.035):1/60;last=now;
    velocity+=(-125*angle-8*velocity)*dt;angle+=velocity*dt;
    angle=Math.max(-23,Math.min(23,angle));
    sprite.style.transform=`rotate(${angle}deg)`;
    if(Math.abs(angle)<.025&&Math.abs(velocity)<.08){reset();return;}
    frame=requestAnimationFrame(tick);
  }
  function nudge(direction=1,power=120){
    if(paused||document.hidden)return;
    velocity=Math.max(-220,Math.min(220,velocity+direction*power*(reduced?.22:1)));
    hit.dataset.state='sway';
    if(!frame){last=0;frame=requestAnimationFrame(tick);}
  }
  hit.addEventListener('pointerenter',e=>{
    lastX=e.clientX;lastKick=performance.now();const box=hit.getBoundingClientRect();
    nudge(e.clientX<box.left+box.width/2?1:-1);
  });
  hit.addEventListener('pointermove',e=>{
    const now=performance.now(),dx=e.clientX-lastX;
    if(now-lastKick>140&&Math.abs(dx)>1){nudge(Math.sign(dx),65);lastKick=now;}
    lastX=e.clientX;
  });
  hit.addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();nudge(1,150);}});
  hit.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat){e.preventDefault();nudge();}});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.ahogePetting={setPaused(value){paused=!!value;if(paused)reset();}};
})();
