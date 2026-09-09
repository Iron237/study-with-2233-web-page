(() => {
  const visitor=document.getElementById('chillVisitor'),head=document.getElementById('chillHead'),sprite=document.querySelector('#chillBody img'),word=visitor.querySelector('.chill-word');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused=!!window.roomFocus?.active,pointer=null,frame=0,last=0,timer=0,origin=0,x=0,s=0,vx=0,vs=0,tx=0,ts=0;
  function draw(now){
    frame=0;if(paused||document.hidden||visitor.hidden){reset();return;}
    const dt=last?Math.min((now-last)/1000,.04):1/60;last=now;
    vx+=(180*(tx-x)-22*vx)*dt;vs+=(180*(ts-s)-22*vs)*dt;x+=vx*dt;s+=vs*dt;
    sprite.style.setProperty('--chill-soft',`skewX(${x*.6}deg) scale(${1+s*.055},${1-s*.06})`);
    if(Math.abs(tx-x)+Math.abs(ts-s)+Math.abs(vx)+Math.abs(vs)>.003)frame=requestAnimationFrame(draw);else last=0;
  }
  function wake(){if(!frame&&!paused){last=0;frame=requestAnimationFrame(draw);}}
  function greet(){clearTimeout(timer);word.textContent='电量+1';timer=setTimeout(()=>word.textContent='chill~',1600);}
  function release(){const old=pointer;pointer=null;if(old!==null&&head.hasPointerCapture(old))head.releasePointerCapture(old);head.classList.remove('petting');tx=0;ts=0;wake();}
  function reset(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;const captured=pointer;pointer=null;if(captured!==null&&head.hasPointerCapture(captured))head.releasePointerCapture(captured);x=s=vx=vs=tx=ts=0;sprite.style.setProperty('--chill-soft','none');head.classList.remove('petting');}
  head.addEventListener('pointerenter',()=>{if(paused)return;ts=reduced?.02:.12;wake();});
  head.addEventListener('pointerleave',()=>{if(pointer===null){ts=0;wake();}});
  head.addEventListener('pointerdown',e=>{if(e.button!==0||paused)return;e.preventDefault();pointer=e.pointerId;origin=e.clientX;head.setPointerCapture(pointer);head.classList.add('petting');ts=reduced?.15:1;greet();wake();});
  head.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const scale=visitor.getBoundingClientRect().width/88;tx=Math.max(-2,Math.min(2,(e.clientX-origin)/scale*.15))*(reduced?.2:1);wake();});
  for(const name of ['pointerup','pointercancel'])head.addEventListener(name,release);
  head.addEventListener('lostpointercapture',()=>{if(pointer!==null)release();});
  head.addEventListener('click',()=>{if(paused)return;s=reduced?.07:.6;vs=0;tx=0;ts=0;greet();wake();});
  head.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key)||e.repeat||paused)return;e.preventDefault();ts=reduced?.15:1;greet();wake();});
  head.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key))release();});
  window.addEventListener('blur',()=>{release();reset();});document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.chillPetting={setPaused(value){paused=!!value;if(paused)reset();}};
})();
