'use strict';
const $ = id => document.getElementById(id);
const {Player,locate,format,clamp} = window.Lofi;
const tracks=window.TRACK_DATA.tracks;
const audio=$('music'), video=$('background');
const KEY='2233-website-v1';
let saved={};
try { saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch (_) {}
let settings={quality:'auto',scale:'1',controls:true,animate:true,autoplay:true,clock:true,...saved.settings};
if(!saved.autoplayV3){settings.autoplay=true;settings.quality='auto';settings.controls=true;}
let seekPreview=null, albumPreview=null, ringDragging=false, oldIndex=-1, ready=false;
let noticeTimer, lastSave=0;
const modeNames={list:'列表循环',one:'单曲循环',shuffle:'随机播放'};
const player=new Player(audio,tracks,()=>{if(ready) render();});

function save() {
  try {localStorage.setItem(KEY,JSON.stringify({player:player.serialize(),settings,autoplayV3:true}));} catch (_) {}
  lastSave=Date.now();
}
function showNotice(message) {
  $('notice').textContent=message; $('notice').hidden=!message;
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);
}
function setFill(input,ratio){input.style.setProperty('--fill',`${clamp(ratio,0,1)*100}%`);}
function render() {
  const t=tracks[player.index], offset=seekPreview===null?player.offset:seekPreview;
  const totalPosition=albumPreview===null?player.position:albumPreview;
  if(oldIndex!==player.index){
    $('trackTitle').textContent=t.title; $('trackArtist').textContent='原曲作者：'+t.artist;
    const count=String(player.index+1).padStart(2,'0')+' / '+String(tracks.length).padStart(2,'0');
    $('trackNumber').textContent=count; $('albumCount').textContent=count;
    $('trackDuration').textContent=format(Math.round(t.duration));
    $('trackSeek').max=t.duration;
    document.querySelectorAll('#trackList button').forEach((b,i)=>b.setAttribute('aria-current',String(i===player.index)));
    oldIndex=player.index;
  }
  $('trackSeek').value=offset; setFill($('trackSeek'),offset/t.duration);
  $('trackSeek').setAttribute('aria-valuetext',`${format(offset)} / ${format(Math.round(t.duration))}`);
  $('trackTime').textContent=format(offset);
  $('albumTime').textContent=format(totalPosition);
  $('albumDuration').textContent=format(Math.round(player.total));
  $('albumPercent').textContent=Math.floor(totalPosition/player.total*100)+'%';
  $('albumSeek').setAttribute('aria-valuemax',player.total);
  $('albumSeek').setAttribute('aria-valuenow',totalPosition.toFixed(2));
  const target=locate(tracks,totalPosition);
  $('albumSeek').setAttribute('aria-valuetext',`${format(totalPosition)}，${tracks[target.index].title}，${format(target.offset)}`);
  $('ringProgress').style.strokeDasharray=`${clamp(totalPosition/player.total,0,1)} 1`;
  document.querySelectorAll('.play-toggle').forEach(b=>{
    b.setAttribute('aria-label',player.wantsPlayback?'暂停':'播放');
    b.querySelector('use').setAttribute('href',player.wantsPlayback?'#i-pause':'#i-play');
  });
  $('volume').value=Math.round(audio.volume*100); setFill($('volume'),audio.muted?0:audio.volume);
  $('volume').setAttribute('aria-valuetext',audio.muted?'已静音':`${Math.round(audio.volume*100)}%`);
  $('mute').setAttribute('aria-label',audio.muted?'取消静音':'静音');
  $('mute').setAttribute('aria-pressed',String(audio.muted));
  $('mute').querySelector('use').setAttribute('href',audio.muted||audio.volume===0?'#i-muted':'#i-volume');
  $('mode').setAttribute('aria-label','播放模式：'+modeNames[player.mode]); $('mode').title=modeNames[player.mode];
  $('mode').querySelector('use').setAttribute('href',player.mode==='shuffle'?'#i-shuffle':'#i-repeat');
  $('repeatOne').hidden=player.mode!=='one';
  $('playbackState').textContent=player.error||(player.enginePaused?'播放已暂停':player.wantsPlayback?(player.pending!==null?'正在加载…':modeNames[player.mode]):'');
  if(player.error){if($('notice').textContent!==player.error)showNotice(player.error);$('notice').dataset.playbackError=player.error;}
  else if($('notice').dataset.playbackError){if($('notice').textContent===$('notice').dataset.playbackError)showNotice('');delete $('notice').dataset.playbackError;}
}
tracks.forEach((t,i)=>{
  const li=document.createElement('li'), b=document.createElement('button');
  b.setAttribute('aria-label',`播放第 ${i+1} 首 ${t.title}`);
  const n=document.createElement('span'); n.className='number'; n.textContent=String(i+1).padStart(2,'0');
  const song=document.createElement('span');song.className='song';
  const title=document.createElement('strong');title.textContent=t.title;
  const artist=document.createElement('small');artist.textContent=t.artist;
  song.append(title,artist);
  const time=document.createElement('time');time.textContent=format(Math.round(t.duration));
  b.append(n,song,time);b.addEventListener('click',()=>{seekPreview=null;player.select(i,0,true);save();});li.append(b);$('trackList').append(li);
});
function togglePlaylist(force){if(force!==false&&$('focusPanel'))$('focusPanel').hidden=true;$('playlist').hidden=force===undefined?!$('playlist').hidden:!force;$('settings').hidden=true;$('openPlaylist').setAttribute('aria-expanded',String(!$('playlist').hidden));}
$('openPlaylist').onclick=()=>togglePlaylist();$('listToggle').onclick=()=>togglePlaylist();$('closePlaylist').onclick=()=>togglePlaylist(false);
document.querySelectorAll('.play-toggle').forEach(b=>b.onclick=()=>{player.toggle();save();});
document.querySelectorAll('.next').forEach(b=>b.onclick=()=>{seekPreview=null;player.next();save();});
$('previous').onclick=()=>{seekPreview=null;player.previous();save();};
$('reset').onclick=()=>{seekPreview=null;albumPreview=null;player.select(0,0,false);save();};
$('mode').onclick=()=>{const modes=['list','one','shuffle'];player.mode=modes[(modes.indexOf(player.mode)+1)%3];render();save();showNotice(modeNames[player.mode]);};
$('mute').onclick=()=>{audio.muted=!audio.muted;render();save();};
$('volume').addEventListener('input',()=>{audio.muted=false;player.setVolume(Number($('volume').value)/100);save();});
$('trackSeek').addEventListener('input',()=>{seekPreview=Number($('trackSeek').value);$('trackHint').hidden=false;$('trackHint').textContent=format(seekPreview);$('trackHint').style.left=`${clamp(seekPreview/player.duration,.035,.965)*100}%`;render();});
$('trackSeek').addEventListener('change',()=>{const value=Number($('trackSeek').value);seekPreview=null;$('trackHint').hidden=true;player.seekTrack(value);save();});
$('trackSeek').addEventListener('pointercancel',()=>{seekPreview=null;$('trackHint').hidden=true;render();});
const ring=$('albumSeek'), path=$('ringHit'), length=path.getTotalLength();
const ringPoints=Array.from({length:1201},(_,i)=>path.getPointAtLength(length*i/1200));
function ringValue(event){
  const bounds=ring.getBoundingClientRect();
  const x=(event.clientX-bounds.left)/bounds.width*300,y=(event.clientY-bounds.top)/bounds.height*142;
  let index=0,distance=Infinity;
  ringPoints.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<distance){distance=d;index=i;}});
  // At the joined start/end point retain the endpoint closest to the drag's prior value.
  if((index<3||index>1197)&&albumPreview!==null&&albumPreview>player.total*.8) index=1200;
  return player.total*index/1200;
}
function showAlbumPreview(value){const target=locate(tracks,value);$('albumHint').hidden=false;$('albumHint').textContent=`${format(value)} · ${tracks[target.index].title} · ${format(target.offset)}`;}
path.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();ring.focus();ringDragging=true;albumPreview=null;
  path.setPointerCapture(event.pointerId);albumPreview=ringValue(event);showAlbumPreview(albumPreview);render();
});
path.addEventListener('pointermove',event=>{if(!ringDragging)return;albumPreview=ringValue(event);showAlbumPreview(albumPreview);render();});
path.addEventListener('pointerup',event=>{if(!ringDragging)return;const value=albumPreview;ringDragging=false;albumPreview=null;path.releasePointerCapture(event.pointerId);$('albumHint').hidden=true;seekPreview=null;player.seekAlbum(value);save();});
function cancelRing(){ringDragging=false;albumPreview=null;$('albumHint').hidden=true;render();}
path.addEventListener('pointercancel',cancelRing);
path.addEventListener('lostpointercapture',()=>{if(ringDragging)cancelRing();});
ring.addEventListener('keydown',e=>{
  const deltas={ArrowRight:15,ArrowUp:15,ArrowLeft:-15,ArrowDown:-15,PageUp:60,PageDown:-60};
  if(e.key in deltas||e.key==='Home'||e.key==='End'){
    e.preventDefault();player.seekAlbum(e.key==='Home'?0:e.key==='End'?player.total:player.position+deltas[e.key]);save();
  }
});
let resizeMediaTimer;
function resize(){window.roomLayout.resize();if(ready&&settings.quality==='auto'){clearTimeout(resizeMediaTimer);resizeMediaTimer=setTimeout(applySettings,250);}}
window.addEventListener('resize',resize);resize();
function updateClock(){
  const now=window.roomClockSource?window.roomClockSource():new Date();
  window.roomEaster?.updateClock(now);
  if(!settings.clock)return;
  $('systemTime').textContent=[now.getHours(),now.getMinutes(),now.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
  $('systemTime').dateTime=now.toISOString();
}
function applySettings(){
  if(!['auto','720','1920','3840'].includes(settings.quality))settings.quality='auto';
  if(!['0.85','1','1.15'].includes(String(settings.scale)))settings.scale='1';
  document.documentElement.style.setProperty('--ui-scale',settings.scale);
  document.body.classList.toggle('controls-hidden',!settings.controls);
  $('quality').value=settings.quality;$('uiScale').value=settings.scale;$('showControls').checked=settings.controls;$('animate').checked=settings.animate;$('autoplaySetting').checked=settings.autoplay;
  $('showClock').checked=settings.clock;$('systemClock').hidden=!settings.clock;updateClock();
  const desired=window.roomMedia.background(settings.quality);
  if(video.dataset.media!==desired){const position=video.currentTime;video.dataset.quality=settings.quality;video.dataset.media=desired;video.src=desired;video.load();if(position)video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(position,video.duration||30);},{once:true});}
  if(settings.animate&&!player.enginePaused)video.play().catch(()=>{});else video.pause();
}
$('settingsToggle').onclick=()=>{if($('focusPanel'))$('focusPanel').hidden=true;const open=$('settings').hidden;togglePlaylist(false);$('settings').hidden=!open;};
$('closeSettings').onclick=()=>$('settings').hidden=true;
[['quality','quality','value'],['uiScale','scale','value'],['showControls','controls','checked'],['animate','animate','checked'],['showClock','clock','checked'],['autoplaySetting','autoplay','checked']].forEach(([id,key,attr])=>{$(id).addEventListener('change',()=>{settings[key]=$(id)[attr];applySettings();save();});});
video.addEventListener('error',()=>{if(settings.quality==='3840'){settings.quality='1920';applySettings();showNotice('4K 背景暂不可用，已切换至 1080p。');}else showNotice('背景视频加载失败，请检查 assets 文件夹。');});
document.addEventListener('keydown',e=>{
  if(window.roomFocus?.active)return;
  if(e.key==='Escape'){$('playlist').hidden=true;$('settings').hidden=true;$('openPlaylist').setAttribute('aria-expanded','false');}
  if(e.target.matches('input,select,button,[role=slider]'))return;
  if(e.code==='Space'){e.preventDefault();player.toggle();save();}
});
let initialProperties=true;
window.wallpaperPropertyListener={
  applyUserProperties(properties){
    const first=initialProperties;initialProperties=false;
    if(properties.volume&&(!first||!saved.player)){player.setVolume(Number(properties.volume.value)/100);audio.muted=false;}
    if(properties.autoplay){settings.autoplay=!!properties.autoplay.value;if(first&&settings.autoplay&&!player.wantsPlayback)player.toggle();}
    if(properties.quality)settings.quality=String(properties.quality.value);
    if(properties.uiscale)settings.scale=String(properties.uiscale.value);
    if(properties.showcontrols)settings.controls=!!properties.showcontrols.value;
    if(properties.animate)settings.animate=!!properties.animate.value;
    if(properties.showclock&&(!first||saved.settings?.clock===undefined))settings.clock=!!properties.showclock.value;
    if(properties.playmode&&(!first||!saved.player))player.mode=['list','one','shuffle'].includes(properties.playmode.value)?properties.playmode.value:'list';
    applySettings();render();save();
  },
  setPaused(paused){player.setEnginePaused(paused);const frozen=paused||window.roomFocus?.active;window.plushPetting?.setPaused(frozen);window.roomEaster?.setPaused(paused);window.ahogePetting?.setPaused(frozen);if(paused){video.pause();save();}else {updateClock();if(settings.animate)video.play().catch(()=>{});}}
};
ready=true;player.restore(saved.player,settings.autoplay);applySettings();render();
for(const [name,value] of window.wallpaperStartupEvents||[])window.wallpaperPropertyListener[name](value);
window.wallpaperStartupEvents=[];
setInterval(()=>{if(!player.enginePaused){render();if(Date.now()-lastSave>5000)save();}},250);
window.addEventListener('pagehide',save);
setInterval(updateClock,1000);
window.addEventListener('focus',updateClock);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});

function unlockAutoplay(e){if(player.error==='点击播放，开始自习。'&&settings.autoplay&&e.isTrusted&&!e.target.closest('.play-toggle,#focusMusic,#startFocus,#untimedFocus'))player.toggle();}
document.addEventListener('pointerdown',unlockAutoplay);
