(() => {
 const output=document.getElementById('onlineCount');let source=null;
 function sync(){
  if(!window.roomFocus?.active){source?.close();source=null;output.textContent='摸了。';output.dataset.state='rest';return;}
  if(source||!window.roomRecords?.identified)return;output.textContent='正在寻找专注伙伴…';
  const connection=new EventSource('/api/online?mode=focus');source=connection;
  connection.addEventListener('online',e=>{
   if(source!==connection||!window.roomFocus?.active)return;
   try{const {focusing}=JSON.parse(e.data);if(!Number.isSafeInteger(focusing)||focusing<0)return;output.textContent=`有${focusing}人和你一样在努力`;output.dataset.state='connected';}catch(_){}
  });
  connection.onerror=()=>{if(source===connection){output.textContent='正在连接专注伙伴…';output.dataset.state='reconnecting';}};
 }
 window.addEventListener('room-focus-change',sync);window.addEventListener('room-identity-ready',sync);
 window.addEventListener('pagehide',()=>{source?.close();source=null;});window.addEventListener('pageshow',sync);
 const heartbeat=()=>{if(source)fetch('/api/heartbeat',{cache:'no-store'}).catch(()=>{});};setInterval(heartbeat,20000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();heartbeat();}});
 document.addEventListener('DOMContentLoaded',sync);
})();
