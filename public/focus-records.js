(() => {
  'use strict';
  const tabId=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  let identified=false,identifying=false,seq=0,closed=false,chain=Promise.resolve(),latest=null;
  async function request(options={}){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('/api/focus',{...options,cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();return await response.json();}finally{clearTimeout(timeout);}}
  const status=text=>{const el=document.getElementById('focusRecordStatus');if(el)el.textContent=text;};
  function time(ms){const seconds=Math.floor(ms/1000),hours=Math.floor(seconds/3600);return (hours?hours+':':'')+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
  function display(data){
    latest=data;document.getElementById('focusToday').textContent=time(data.todayMs);document.getElementById('focusTotal').textContent=time(data.totalMs);
    status('已保存本地');
  }
  function observe(){
    if(!identified||closed)return;
    const body=JSON.stringify({tabId,seq:++seq,active:!!window.roomFocus?.active});
    chain=chain.then(async()=>{
      if(closed)return;
      try{display(await request({method:'POST',headers:{'Content-Type':'application/json'},body}));}
      catch(_){status('记录暂未同步，连接恢复后重试');}
    });
  }
  async function identify(){
    if(identified||identifying||closed)return;
    identifying=true;
    try{display(await request());identified=true;window.dispatchEvent(new Event('room-identity-ready'));observe();}
    catch(_){status('记录暂不可用，正在重试');}
    finally{identifying=false;}
  }
  window.roomRecords={get identified(){return identified;},get latest(){return latest;},sync:observe};
  window.addEventListener('room-focus-change',observe);
  document.addEventListener('DOMContentLoaded',identify);
  setInterval(()=>identified?observe():identify(),10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(identified)observe();else identify();}});
  window.addEventListener('pagehide',()=>{
    closed=true;if(!identified)return;
    const body=JSON.stringify({tabId,seq:++seq,active:false,leaving:true});
    navigator.sendBeacon('/api/focus',new Blob([body],{type:'application/json'}));
  });
  window.addEventListener('pageshow',event=>{closed=false;if(event.persisted){if(identified)observe();else identify();}});
})();
