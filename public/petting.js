/* Only transparent character layers deform; the restored windowsill stays fixed. */
(() => {
  'use strict';
  const layer=document.getElementById('plushies');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused=player.enginePaused,frame=0,last=0;
  const dolls=['22','33'].map(id=>({button:layer.querySelector('.pet-'+id),sprite:layer.querySelector('.plush-sprite-'+id),x:0,s:0,vx:0,vs:0,tx:0,ts:0,hover:false,down:false,pointer:null}));
  function tick(now){
    frame=0;if(paused||document.hidden){reset();return;}
    const dt=last?Math.min((now-last)/1000,.04):1/60;last=now;let active=false;
    for(const d of dolls){
      for(const k of ['x','s']){
        d['v'+k]+=(190*(d['t'+k]-d[k])-21*d['v'+k])*dt;d[k]+=d['v'+k]*dt;
        active=active||Math.abs(d[k]-d['t'+k])>.002||Math.abs(d['v'+k])>.01;
      }
      d.sprite.style.transform=`translateX(${d.x}px) rotate(${d.x*.8}deg) scale(${1+d.s*.085},${1-d.s*.09})`;
    }
    if(active)frame=requestAnimationFrame(tick);else last=0;
  }
  function target(d){
    d.button.dataset.state=d.down?'petting':d.hover?'hover':'idle';
    if(!d.down){d.tx=0;d.ts=d.hover?(reduced?.04:.12):0;}
    if(!frame&&!paused&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}
  }
  function release(d,cancel=false){
    const pointer=d.pointer;d.pointer=null;d.down=false;d.hover=!cancel&&d.button.matches(':hover');
    if(pointer!==null&&d.button.hasPointerCapture(pointer))d.button.releasePointerCapture(pointer);
    target(d);
  }
  function reset(){
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;
    for(const d of dolls){
      const pointer=d.pointer;d.pointer=null;d.down=false;d.hover=false;
      if(pointer!==null&&d.button.hasPointerCapture(pointer))d.button.releasePointerCapture(pointer);
      for(const k of ['x','s','vx','vs','tx','ts'])d[k]=0;
      d.sprite.style.transform='none';d.button.dataset.state='idle';
    }
  }
  for(const d of dolls){
    d.button.addEventListener('pointerenter',()=>{d.hover=true;target(d);});
    d.button.addEventListener('pointerleave',()=>{d.hover=false;if(!d.down)target(d);});
    d.button.addEventListener('pointerdown',e=>{
      if(e.button!==0||paused)return;e.preventDefault();
      d.down=true;d.pointer=e.pointerId;d.originX=e.clientX;d.ts=reduced?.3:1;
      d.button.setPointerCapture(e.pointerId);target(d);
    });
    d.button.addEventListener('pointermove',e=>{
      if(d.pointer!==e.pointerId)return;
      const zoom=layer.getBoundingClientRect().width/140;
      d.tx=Math.max(-4,Math.min(4,(e.clientX-d.originX)/zoom*.3))*(reduced?.3:1);target(d);
    });
    d.button.addEventListener('pointerup',()=>release(d));
    d.button.addEventListener('pointercancel',()=>release(d,true));
    d.button.addEventListener('lostpointercapture',()=>{if(d.down)release(d,true);});
    d.button.addEventListener('keydown',e=>{
      if(![' ','Enter'].includes(e.key)||e.repeat||paused)return;e.preventDefault();d.down=true;d.ts=reduced?.3:1;target(d);
    });
    d.button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();release(d);}});
    d.button.addEventListener('blur',()=>{if(d.pointer===null&&d.down)release(d,true);});
  }
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.plushPetting={setPaused(value){paused=!!value;if(paused)reset();}};
})();
