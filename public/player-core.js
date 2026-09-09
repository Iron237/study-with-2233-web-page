(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Lofi = api;
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
  function locate(tracks, seconds) {
    const total = tracks.reduce((s, t) => s + t.duration, 0);
    const position = clamp(seconds, 0, Math.max(0, total - 0.001));
    let start = 0;
    for (let i = 0; i < tracks.length; i++) {
      if (position < start + tracks[i].duration || i === tracks.length - 1)
        return { index: i, offset: position - start };
      start += tracks[i].duration;
    }
  }
  function format(seconds, hours = false) {
    const s = Math.floor(Math.max(0, Number(seconds) || 0) + 0.00001);
    const mm = Math.floor(s / 60) % 60, ss = s % 60;
    return (hours ? String(Math.floor(s / 3600)).padStart(2,'0') + ':' : '') +
      String(hours ? mm : Math.floor(s / 60)).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
  }
  class Player {
    constructor(audio, tracks, notify = () => {}) {
      this.audio = audio; this.tracks = tracks; this.notify = notify;
      this.index = 0; this.mode = 'list'; this.wantsPlayback = false;
      this.enginePaused = false; this.pending = null; this.error = ''; this.revision = 0;
      this.total = tracks.reduce((s, t) => s + t.duration, 0);
      audio.addEventListener('loadedmetadata', () => {
        if (this.pending !== null) {
          audio.currentTime = clamp(this.pending, 0, Math.max(0, this.duration - 0.001));
          this.pending = null;
        }
        if (this.wantsPlayback && !this.enginePaused) this.startAudio();
        this.changed();
      });
      audio.addEventListener('ended', () => {
        if (!this.wantsPlayback || this.enginePaused || this.pending !== null) return;
        if (this.mode === 'one') this.seekTrack(0);
        else this.next();
      });
      for (const name of ['timeupdate','play','pause','volumechange','seeked'])
        audio.addEventListener(name, () => this.changed());
      audio.addEventListener('error', () => {
        const errors={1:'音频加载被中断，请点击重试。',2:'网络加载失败，请点击重试。',3:'音频解码失败，请点击重试。',4:'浏览器无法加载此音频，请点击重试或更换浏览器。'};
        this.error = errors[audio.error?.code]||'音频加载失败，请点击重试。';
        this.wantsPlayback = false; this.changed();
      });
    }
    get duration() { return this.tracks[this.index].duration; }
    get offset() { return this.pending === null ? clamp(this.audio.currentTime,0,this.duration) : this.pending; }
    get position() { return this.tracks.slice(0,this.index).reduce((s,t)=>s+t.duration,0) + this.offset; }
    changed() { this.notify(this); }
    select(index, offset = 0, play = this.wantsPlayback) {
      this.revision++; this.index = Math.trunc(clamp(index,0,this.tracks.length-1));
      this.pending = clamp(offset,0,Math.max(0,this.duration-0.001));
      this.wantsPlayback = !!play; this.error = '';
      this.audio.pause(); this.audio.src = this.tracks[this.index].file; this.audio.load();
      this.changed();
    }
    startAudio() {
      if (this.enginePaused || !this.wantsPlayback) return;
      const revision = this.revision;
      const promise = this.audio.play();
      if (promise && promise.catch) promise.catch(e => {
        if (revision !== this.revision || e.name === 'AbortError' || this.enginePaused || !this.wantsPlayback) return;
        this.wantsPlayback = false;
        this.error = e.name === 'NotAllowedError' ? '点击播放，开始自习。' : '暂时无法播放，请再点一次播放。';
        this.changed();
      });
    }
    toggle() {
      if (!this.wantsPlayback && this.audio.error) {
        const offset=this.offset;
        this.select(this.index,offset,true);
        this.startAudio();
        return;
      }
      this.wantsPlayback = !this.wantsPlayback; this.error = '';
      if (this.wantsPlayback) this.startAudio(); else this.audio.pause();
      this.changed();
    }
    seekTrack(offset) {
      offset = clamp(offset,0,Math.max(0,this.duration-0.001));
      if (this.pending !== null) this.pending = offset; else this.audio.currentTime = offset;
      if (this.wantsPlayback) this.startAudio();
      this.changed();
    }
    seekAlbum(seconds) {
      const target = locate(this.tracks,seconds);
      if (target.index === this.index) this.seekTrack(target.offset);
      else this.select(target.index,target.offset);
    }
    next() {
      const count=this.tracks.length;
      const target=this.mode==='shuffle' && count>1 ? (this.index+1+Math.floor(Math.random()*(count-1)))%count : (this.index+1)%count;
      this.select(target,0);
    }
    previous() { this.select((this.index-1+this.tracks.length)%this.tracks.length,0); }
    setEnginePaused(paused) {
      this.enginePaused=!!paused;
      if (paused) this.audio.pause(); else if (this.wantsPlayback) this.startAudio();
      this.changed();
    }
    setVolume(value) { this.audio.volume=clamp(value,0,1); this.changed(); }
    serialize() { return {version:1,index:this.index,offset:this.offset,volume:this.audio.volume,muted:this.audio.muted,mode:this.mode}; }
    restore(value, autoplay=false) {
      value=value&&value.version===1?value:{};
      this.mode=['list','one','shuffle'].includes(value.mode)?value.mode:'list';
      this.setVolume(value.volume===undefined?.35:value.volume);
      this.audio.muted=!!value.muted;
      this.select(value.index||0,value.offset||0,autoplay);
    }
  }
  return {Player,locate,format,clamp};
});
