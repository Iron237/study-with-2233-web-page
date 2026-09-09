(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RoomRecommendations=factory();})(typeof window==='undefined'?this:window,function(){
  'use strict';
  function select(resources,scene,previousId,random=Math.random){
    const all=resources.scenes?.[scene]||[];
    const candidates=all.length>1?all.filter(r=>r.id!==previousId):all;
    if(!candidates.length)return null;
    const record=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)))];
    if(scene==='sing'&&record.links?.length){const link=record.links[Math.min(record.links.length-1,Math.max(0,Math.floor(random()*record.links.length)))];return {...record,url:link.url,bvid:link.bvid};}
    return record;
  }
  function currentOriginal(resources,trackId){
    return (resources.chillOriginals||[]).find(record=>record.trackId===trackId)||null;
  }
  function linked(label,url){
    if(typeof url!=='string'||!/^https:\/\/[^\s()<>]+$/.test(url))return label;
    return '['+label.replace(/[\[\]\r\n]/g,' ')+']('+url+')';
  }
  function values(scene,record,date=new Date()){
    if(!record)return {};
    if(scene==='sing')return {song_title:record.title,song_artist:record.artist,song_bvid:linked(record.bvid,record.url),song_url:record.url,song_link:linked(record.title+' · 原曲',record.url)};
    if(scene==='show'){
      const match=/^(\d{4})\s*(.*)$/.exec(record.title);
      const label=match?'BML '+match[1]+'年'+(match[2]?' · '+match[2]:''):record.title;
      return {bml_title:record.title,bml_url:record.url,bml_link:linked(label,record.url),bml_time_label:date.getMonth()<=6?'今年':'明年'};
    }
    return {};
  }
  function inlineParts(text){
    const pattern=/\[([^\]\n]+)\]\((https:\/\/[^\s()<>]+)\)|(https:\/\/[^\s<>]+|BV[0-9A-Za-z]{10})/g;
    const parts=[];let offset=0,match;
    while((match=pattern.exec(text))){
      if(match.index>offset)parts.push({text:text.slice(offset,match.index)});
      const value=match[2]||match[3];
      parts.push({label:match[1]||(value.startsWith('BV')?value:'打开看看 ↗'),url:value.startsWith('BV')?'https://www.bilibili.com/video/'+value:value});
      offset=pattern.lastIndex;
    }
    if(offset<text.length)parts.push({text:text.slice(offset)});
    return parts;
  }
  function prepare(groups,fields,fill){
    return groups.map(group=>({...group,lines:group.lines.map(pair=>({'22':fill(pair['22'],fields),'33':fill(pair['33'],fields)}))})).filter(g=>g.lines.length&&g.lines.every(pair=>pair['22']&&pair['33']));
  }
  return {select,currentOriginal,values,prepare,inlineParts};
});
