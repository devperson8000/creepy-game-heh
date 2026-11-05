import {createLobbyClient} from './lobby-client.js';
import {createVoiceChat} from './voice-chat.js';
import {encodeBackroomsRoom,parseBackroomsRoom,backroomsRoomCode} from './backrooms-room.js';
import {createBackroomsChat} from './backrooms-chat.js';
import './voice-chat.css';
import './backrooms-lobby.css';
export function createBackroomsLobby({onStart,onClose,preview='',createClient=()=>createLobbyClient({game:'backrooms',restoreSession:false})}={}){
 const client=createClient();client.voice=createVoiceChat({client});const voicePanel=document.querySelector('#voice-chat');document.body.classList.add('br-network');
 const root=document.createElement('div');root.className='br-lobby';root.setAttribute('role','dialog');root.setAttribute('aria-label','Backrooms multiplayer');
 root.innerHTML='<header><button data-back>← Back</button><h1>Multiplayer</h1><span data-code></span></header><p class="br-lobby-status" role="status">Connecting…</p><main></main><footer><small>LEVEL 0 · 2–4 PLAYERS · BROWSER CO-OP</small></footer>';document.body.append(root);
 const main=root.querySelector('main'),status=root.querySelector('[role="status"]'),code=root.querySelector('[data-code]');let room=null,lobbies=[],name='Wanderer',disposed=false,connected=false,screen='browse',chat=null,pending=false;const approved=new Set();try{name=localStorage.getItem('backrooms.playerName')||name;}catch{}
 let image=preview;if(image)root.style.setProperty('--lobby-background','url("'+image+'")');
 function button(label,action,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.addEventListener('click',action);return b;}
 function send(type,data){if(!client.send(type,data))status.textContent='Not connected. Please retry.';}
 function notice(text){status.textContent=text;}
 function browser(){
  chat?.dispose();chat=null;screen='browse';root.scrollTop=0;main.className='br-server-browser';main.innerHTML='<div class="br-browser-heading"><label>Player name <input data-name maxlength="24" autocomplete="nickname"></label><button data-refresh>Refresh</button></div><div class="br-server-table"><div class="br-table-head"><span>Server</span><span>Players</span><span>Game</span><span></span></div><div data-rooms></div></div><div class="br-browser-actions"><button data-create>Create server</button><form data-join-code><input aria-label="Room code" placeholder="ROOM CODE" maxlength="8" pattern="[a-fA-F0-9]{8}" required><button>Enter with room code</button></form></div>';
  const input=main.querySelector('[data-name]');input.value=name;input.addEventListener('input',()=>{name=input.value.trim().slice(0,24);try{localStorage.setItem('backrooms.playerName',name);}catch{}});
  main.querySelector('[data-refresh]').addEventListener('click',()=>{notice('Refreshing the server list…');void client.refresh().then(()=>notice('Server list updated.')).catch(e=>notice(e.message));});
  main.querySelector('[data-create]').addEventListener('click',create);
  main.querySelector('[data-join-code]').addEventListener('submit',e=>{e.preventDefault();const value=e.target.querySelector('input').value.trim().toUpperCase(),found=lobbies.filter(l=>backroomsRoomCode(l.id)===value);if(found.length!==1){notice('That room code was not found. Check the code and try again.');return;}join(found[0]);});
  drawRooms();
 }
 function join(l){if(!name){notice('Enter a player name first.');return;}if(l.status!=='waiting'){notice('This game has already started.');return;}pending=true;send('join',{lobbyId:l.id,playerName:name});notice('Waiting for the host to accept your join request…');}
 function drawRooms(){if(screen!=='browse')return;const rows=main.querySelector('[data-rooms]');rows.replaceChildren();const visible=lobbies.filter(l=>{const meta=parseBackroomsRoom(l.name);return meta&&!meta.friendsOnly;});
  for(const l of visible){const meta=parseBackroomsRoom(l.name);const row=document.createElement('div');row.className='br-server-row';for(const text of [meta.name,l.count+' / 4',l.status==='running'?'In game':meta.classic?'Level 0':'Ambush']){const cell=document.createElement('span');cell.textContent=text;row.append(cell);}const b=button('Join',()=>join(l));b.disabled=l.status!=='waiting'||l.count>=4||pending;row.append(b);rows.append(row);}
  if(!visible.length){const p=document.createElement('p');p.className='br-empty';p.textContent=connected?'No public servers found. Create a server or enter a friend’s room code.':'Connecting to the server list…';rows.append(p);}
 }
 function create(){
  if(!connected){notice('Wait for the connection before creating a server.');return;}if(!name){notice('Enter a player name first.');return;}screen='create';root.scrollTop=0;main.className='br-create-server';main.innerHTML='<form><h2>Create server</h2><label>Server name<input name="name" maxlength="36" required></label><label>Privacy<select name="privacy"><option value="public">Public</option><option value="friends">Friends only · code and host approval</option></select></label><label>Level<select name="mode"><option value="classic">Level 0 · Classic route</option><option value="ambush">Level 0 · Ambush mode</option></select></label><label>Players<span>2–4 players</span></label><p>Normal co-op: shared progress, team restart on capture, everyone must reach the exit.</p><div><button type="button" data-cancel>Cancel</button><button class="br-green" type="submit">Create server</button></div></form>';
  main.querySelector('[name="name"]').value=name+"'s lobby";
  main.querySelector('[data-cancel]').addEventListener('click',browser);
  main.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);send('create',{name:encodeBackroomsRoom(data.get('name'),{classic:data.get('mode')==='classic',friendsOnly:data.get('privacy')==='friends'}),playerName:name});notice('Creating server…');e.target.querySelector('[type="submit"]').disabled=true;});
 }
 async function invite(){const url=new URL('/backrooms',location.origin);url.searchParams.set('join',backroomsRoomCode(room.id));try{await navigator.clipboard.writeText(url.href);notice('Invite link copied. Your friend can open it in their browser.');}catch{notice('Share this room code: '+backroomsRoomCode(room.id));}}
 function waiting(){
  if(!room)return;const entering=screen!=='room';screen='room';if(entering)requestAnimationFrame(()=>root.scrollTop=0);const own=room.members.find(m=>m.id===client.id),host=room.ownerId===client.id,meta=parseBackroomsRoom(room.name);
  main.className='br-waiting-lobby';main.innerHTML='<div class="br-player-panel"><button class="br-green" data-invite>Invite Friends</button><p data-count></p><table><thead><tr><th>Player</th><th>Status</th></tr></thead><tbody></tbody></table><div data-requests></div><div data-voice></div><div data-chat></div></div><section class="br-level-panel"><div class="br-level-preview"><span>Co-op</span></div><div class="br-level-select">Level 0</div><div class="br-level-select">Normal</div><p>Play through Level 0 with a group of friends (Max 4 players).<br><br>Every player must reach the exit to continue. If one player is captured, the whole team restarts the level.</p><button class="br-green" data-start></button><button data-leave>Leave lobby</button></section>';
  code.textContent='Room code: '+backroomsRoomCode(room.id);main.querySelector('[data-invite]').addEventListener('click',invite);
  main.querySelector('[data-count]').textContent=room.members.length+' / 4 Player(s)';
  const tbody=main.querySelector('tbody');for(const m of room.members){const tr=document.createElement('tr'),nameCell=document.createElement('td'),ready=document.createElement('td');nameCell.textContent=m.name+(m.id===room.ownerId?'  Host ♛':'');ready.textContent=m.ready?'Ready':'Not Ready';ready.className=m.ready?'is-ready':'';tr.append(nameCell,ready);tbody.append(tr);}
  const start=main.querySelector('[data-start]');start.textContent=host?'Start game':own?.ready?'Not ready':'Ready';start.disabled=host&&(room.members.length<2||!room.members.every(m=>m.ready));start.addEventListener('click',()=>send(host?'start':'ready',host?{}:{ready:!own?.ready}));
  main.querySelector('[data-leave]').addEventListener('click',()=>send('leave'));
  const requests=room.requests??[],requestIds=new Set(requests.map(r=>r.id));for(const id of approved)if(!requestIds.has(id))approved.delete(id);
  for(const r of requests){if(host){if(!meta.friendsOnly&&!approved.has(r.id)){approved.add(r.id);send('approve',{requestId:r.id,accept:true});}else if(meta.friendsOnly){const row=document.createElement('div');row.className='br-join-request';const label=document.createElement('span');label.textContent=r.name+' wants to join';row.append(label,button('Accept',()=>send('approve',{requestId:r.id,accept:true})),button('Decline',()=>send('approve',{requestId:r.id,accept:false})));main.querySelector('[data-requests]').append(row);}}}
  if(voicePanel)main.querySelector('[data-voice]').append(voicePanel);
  chat??=createBackroomsChat(client,()=>room?.members??[]);main.querySelector('[data-chat]').append(chat.root);
  notice(host?'Waiting for everyone to be ready…':'Waiting for the host to start the game…');
  if(image)main.querySelector('.br-level-preview').style.backgroundImage='url("'+image+'")';
 }
 const unsubscribe=client.subscribe(e=>{
  if(disposed)return;
  if(e.type==='lobbies'){lobbies=e.lobbies;drawRooms();}
  if(e.type==='lobby'){room=e.lobby;pending=false;if(room)waiting();else{code.textContent='';browser();}}
  if(e.type==='started'){const meta=parseBackroomsRoom(room?.name);const activeClient=client;const data={...e,classic:meta?.classic??true};dispose(false);onStart({client:activeClient,session:data});}
  if(e.type==='error'){pending=false;notice(e.message);if(screen==='create')main.querySelector('[type="submit"]').disabled=false;drawRooms();}
  if(e.type==='rejected'){pending=false;notice(e.reason==='declined'?'The host declined your request.':'That lobby is no longer available.');drawRooms();}
  if(e.type==='roomClosed'){room=null;pending=false;code.textContent='';browser();notice('The host left the lobby.');}
  if(e.type==='connection'){connected=e.status==='connected';if(e.status==='reconnecting')notice('Reconnecting…');}
 });
 root.querySelector('[data-back]').addEventListener('click',()=>{if(room){send('leave');return;}dispose();onClose();});
 function dispose(close=true){if(disposed)return;disposed=true;unsubscribe();chat?.dispose();if(!close&&voicePanel)document.body.append(voicePanel);root.remove();if(close){client.voice.dispose();void client.close();document.body.classList.remove('br-network');}}
 browser();void client.connect().then(()=>{connected=true;notice('Choose a server, enter a room code, or create a server.');drawRooms();const inviteCode=new URLSearchParams(location.search).get('join');if(inviteCode){const form=main.querySelector('[data-join-code]');form.querySelector('input').value=inviteCode.toUpperCase();}}).catch(e=>notice(e.message));
 return {client,get room(){return room;},root,dispose};
}
