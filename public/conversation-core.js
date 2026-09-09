(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RoomConversation=factory();})(typeof window==='undefined'?this:window,function(){
  'use strict';
  function duration(text){return Math.min(20000,Math.max(2200,Array.from(text).length*180+900));}
  function steps(group){
    return group.lines.flatMap(pair=>['22','33'].filter(who=>pair[who]).map(who=>({character:who,text:pair[who],duration:duration(pair[who])})));
  }
  class Conversation{
    constructor({say,clear=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),onFinish=()=>{}}){this.say=say;this.clear=clear;this.schedule=schedule;this.cancel=cancel;this.onFinish=onFinish;this.token=0;this.timer=null;this.queue=[];this.position=0;this.running=false;}
    start(group){this.stop();this.queue=steps(group);this.position=0;this.running=!!this.queue.length;this.next();}
    next(){
      if(this.timer!==null)this.cancel(this.timer);this.timer=null;
      if(!this.running)return;
      if(this.position>=this.queue.length){this.running=false;this.clear();this.onFinish();return;}
      const item=this.queue[this.position++],token=this.token;
      this.clear();this.say(item);this.timer=this.schedule(()=>{if(token===this.token)this.next();},item.duration);
    }
    stop(){this.token++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.running=false;this.queue=[];this.clear();}
  }
  return {Conversation,steps,duration};
});
