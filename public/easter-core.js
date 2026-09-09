(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.RoomEasterCore=factory();
})(typeof window==='undefined'?this:window,function(){
  'use strict';
  const isSecretMinute=date=>date.getHours()===22&&date.getMinutes()===33;
  class SecretMinuteTrigger{
    constructor(){this.shown=new Set();}
    take(date,{paused=false,hidden=false}={}){
      if(paused||hidden||!isSecretMinute(date))return false;
      const key=[date.getFullYear(),date.getMonth(),date.getDate()].join('-');
      if(this.shown.has(key))return false;
      this.shown.add(key);return true;
    }
    reset(){this.shown.clear();}
  }
  class DialogDeck{
    constructor(lines,random=Math.random){this.lines=lines;this.random=random;this.remaining=[];this.last=null;}
    next(){
      if(!this.lines.length)return '';
      if(!this.remaining.length){
        this.remaining=this.lines.slice();
        for(let i=this.remaining.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.remaining[i],this.remaining[j]]=[this.remaining[j],this.remaining[i]];}
        const end=this.remaining.length-1;
        if(end>0&&this.remaining[end]===this.last)[this.remaining[0],this.remaining[end]]=[this.remaining[end],this.remaining[0]];
      }
      this.last=this.remaining.pop();return this.last;
    }
  }
  return {isSecretMinute,SecretMinuteTrigger,DialogDeck};
});
