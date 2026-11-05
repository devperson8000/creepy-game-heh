export function createBackroomsChat(client,getMembers){
 const root=document.createElement('section');root.className='br-team-chat';root.setAttribute('aria-label','Team text chat');
 root.innerHTML='<ol aria-live="polite"></ol><form><input maxlength="240" placeholder="Press Enter to chat…" aria-label="Team message"><button>Send</button></form><small role="status"></small>';
 const list=root.querySelector('ol'),input=root.querySelector('input'),status=root.querySelector('small');let last=0;const rates=new Map();
 function append(id,text){const row=document.createElement('li'),member=getMembers().find(m=>m.id===id);if(!member)return;row.textContent=member.name+': '+text;list.append(row);while(list.children.length>30)list.firstChild.remove();list.scrollTop=list.scrollHeight;}
 const unsubscribe=client.voice.subscribeGameplay(e=>{if(e.type!=='chat'||Date.now()-(rates.get(e.playerId)??0)<300)return;rates.set(e.playerId,Date.now());append(e.playerId,e.payload.text);});
 root.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text||Date.now()-last<500)return;last=Date.now();const members=getMembers().filter(m=>m.id!==client.id);const sent=members.filter(m=>client.voice.sendGameplay(m.id,'chat',{text})).length;
 if(members.length&&!sent){status.textContent='Chat is connecting. Try again in a moment.';return;}append(client.id,text);input.value='';status.textContent=sent<members.length?'Some teammates are reconnecting.':'';input.blur();});
 const key=e=>{if(e.code==='Enter'&&e.target!==input&&!e.target.closest?.('input,select,button')){e.preventDefault();input.focus();}if(e.target===input)e.stopPropagation();};
 document.addEventListener('keydown',key,true);
 return {root,focus(){input.focus();},dispose(){unsubscribe();document.removeEventListener('keydown',key,true);root.remove();}};
}
