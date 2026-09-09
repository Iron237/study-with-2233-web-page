(() => {
  const base=(window.MEDIA_BASE||'').replace(/\/$/,'');
  const url=path=>base?base+'/'+path.replace(/^\//,''):path;
  for(const track of window.TRACK_DATA.tracks){track.file=`/api/audio/${track.id}`;}
  window.roomMedia={url,background(quality){
    let size=quality;
    if(size==='auto')size=(navigator.connection?.saveData||innerWidth<800)?'720':'1920';
    const label={'720':'720','1920':'1080','3840':'2160'}[size]||'1080';
    return url(`assets/room-${label}-v3.mp4`);
  }};
})();
