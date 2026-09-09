(() => {
  'use strict';
  const key='2233-todos-v2',root=document.getElementById('todoPanel'),{normalize,clean,limit,migrate}=window.RoomTodoCore;
  let state={'you':[]};
  try{const saved=localStorage.getItem(key);state=saved?normalize(JSON.parse(saved)):migrate(JSON.parse(localStorage.getItem('2233-todos-v1')||'null'));}catch(_){}
  const status=document.getElementById('todoStatus');
  function save(){try{localStorage.setItem(key,JSON.stringify(state));status.textContent='已保存到此浏览器';}catch(_){status.textContent='当前浏览器无法保存，关闭页面后会丢失';}}
  function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
  function renderGroup(who){
    const list=root.querySelector(`[data-todo-list="${who}"]`);list.replaceChildren();
    for(const row of state[who]){
      const li=make('li','todo-row'),check=make('input'),label=make('input','todo-text'),remove=make('button','todo-delete','×');
      check.type='checkbox';check.checked=row.done;check.setAttribute('aria-label','完成：'+row.text);
      label.type='text';label.value=row.text;label.maxLength=80;label.setAttribute('aria-label','你的待办内容');
      li.classList.toggle('done',row.done);
      check.onchange=()=>{row.done=check.checked;li.classList.toggle('done',row.done);save();updateCount(who);};
      label.onchange=()=>{const value=clean(label.value);if(value){row.text=value;check.setAttribute('aria-label','完成：'+value);remove.setAttribute('aria-label','删除：'+value);save();}label.value=row.text;};
      label.onkeydown=e=>{if(e.key==='Enter'){label.onchange();label.blur();}};
      remove.type='button';remove.setAttribute('aria-label','删除：'+row.text);
      remove.onclick=()=>{state[who]=state[who].filter(x=>x.id!==row.id);save();renderGroup(who);root.querySelector(`[data-todo-add="${who}"]`).focus();};
      li.append(check,label,remove);list.append(li);
    }
    if(!state[who].length)list.append(make('li','todo-empty','写下今天想完成的一件事'));
    updateCount(who);
  }
  function updateCount(who){root.querySelector(`[data-todo-count="${who}"]`).textContent=state[who].filter(x=>x.done).length+'/'+state[who].length;}
  for(const who of ['you']){
    const form=root.querySelector(`[data-todo-form="${who}"]`),input=form.querySelector('input');
    root.querySelector(`[data-todo-add="${who}"]`).onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)input.focus();};
    form.onsubmit=e=>{
      e.preventDefault();const text=clean(input.value);if(!text)return;
      if(state[who].length>=limit){status.textContent='每组最多 12 项，先完成手边的一件事吧';return;}
      state[who].push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),text,done:false});
      input.value='';save();renderGroup(who);input.focus();
    };
    renderGroup(who);
  }
  const toggle=document.getElementById('todoToggle');
  if(innerWidth<650){root.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.onclick=()=>{root.hidden=!root.hidden;toggle.setAttribute('aria-expanded',String(!root.hidden));};
  window.addEventListener('storage',e=>{if(e.key===key){try{state=normalize(JSON.parse(e.newValue||'null'));}catch(_){return;}for(const who of ['you'])renderGroup(who);}});
})();
