'use strict';
const tracks=require('./netease-tracks.json');
function safeMediaUrl(raw){
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)||!/^m\d+\.music\.126\.net$/.test(u.hostname)||u.port||u.username||u.password)throw new Error('Unexpected media origin');
  u.protocol='https:';return u.href;
}
function createMusicResolver({fetcher=fetch,now=Date.now}={}){
  const cache=new Map();let pending=null,retryAt=0;
  async function refresh(){
    const ids=tracks.map(t=>t.songId);
    const endpoint='https://music.163.com/api/song/enhance/player/url?'+new URLSearchParams({ids:JSON.stringify(ids),br:'320000'});
    const r=await fetcher(endpoint,{signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!r.ok)throw new Error('Music provider unavailable');
    const data=await r.json();
    if(data.code!==200||!Array.isArray(data.data))throw new Error('Music provider unavailable');
    for(const item of data.data){
      if(!ids.includes(item.id)||item.code!==200||!item.url||item.freeTrialInfo)continue;
      try{
        const url=safeMediaUrl(item.url),ttl=Math.min(1200,Number(item.expi)||0)-60;
        if(ttl<=0)continue;
        cache.set(item.id,{url,expires:now()+ttl*1000});
      }catch(_){}
    }
    retryAt=now()+15000;
  }
  return async function resolve(trackNumber){
    const track=tracks.find(t=>t.track===trackNumber);if(!track)return null;
    let hit=cache.get(track.songId);if(hit?.expires>now())return hit.url;
    if(!pending){
      if(now()<retryAt)throw new Error('Music provider temporarily unavailable');
      pending=refresh().catch(e=>{retryAt=now()+30000;throw e;}).finally(()=>pending=null);
    }
    await pending;hit=cache.get(track.songId);
    if(!hit||hit.expires<=now())throw new Error('Track temporarily unavailable');
    return hit.url;
  };
}
module.exports={createMusicResolver,safeMediaUrl};
