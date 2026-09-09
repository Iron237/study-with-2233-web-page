(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RoomFocusCore=factory();})(typeof window==='undefined'?this:window,function(){
  'use strict';
  class FocusTimer{
    constructor(){this.session=null;}
    start(minutes,now,mode='list'){
      if(!Number.isInteger(minutes)||minutes<1||minutes>180)throw new RangeError('请输入 1—180 的整数分钟。');
      this.session={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),minutes,end:now+minutes*60000,startedAt:now,elapsedMs:0,mode};return this.session;
    }
    startUnlimited(now,mode='list'){
      this.session={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),minutes:null,end:null,startedAt:now,elapsedMs:0,mode};return this.session;
    }
    elapsed(now){return this.session?this.session.elapsedMs+Math.max(0,now-this.session.startedAt):0;}
    snapshot(now){if(!this.session)return null;return {...this.session,elapsedMs:this.elapsed(now),startedAt:now,end:this.session.minutes===null?null:now+this.remaining(now)*1000};}
    restore(value,now=Date.now()){
      if(!value||!(value.minutes===null||(Number.isInteger(value.minutes)&&value.minutes>=1&&value.minutes<=180)))return;
      const legacyElapsed=Number.isFinite(value.end)&&value.minutes!==null?Math.max(0,Math.min(value.minutes*60000,value.minutes*60000-(value.end-now))):0;
      const elapsedMs=Number.isFinite(value.elapsedMs)&&value.elapsedMs>=0?value.elapsedMs:legacyElapsed;
      this.session={id:typeof value.id==='string'?value.id:'restored-'+now,minutes:value.minutes,startedAt:now,elapsedMs,mode:['list','one','shuffle'].includes(value.mode)?value.mode:'list',end:value.minutes===null?null:now+Math.max(0,value.minutes*60000-elapsedMs)};
    }
    remaining(now){return !this.session||this.session.minutes===null?0:Math.max(0,Math.ceil((this.session.minutes*60000-this.elapsed(now))/1000));}
    takeFinished(now){if(!this.session||this.session.minutes===null||this.remaining(now)>0)return null;const result=this.session;this.session=null;return result;}
  }
  const clockIsFace=seconds=>Number.isFinite(seconds)&&seconds>=6.75&&seconds<10;
  return {FocusTimer,clockIsFace};
});
