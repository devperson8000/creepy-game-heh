export function readTestSession(search){
 const p=new URLSearchParams(search);if(p.get('mode')!=='coop-test')return null;
 const role=p.get('role')==='guest'?'guest':'host',id=p.get('session');
 if(role==='guest'&&(!id||!/^[-a-zA-Z0-9]{8,80}$/.test(id)))return null;
 return {role,id};
}
export function testPartnerUrl(base,id){const url=new URL(base);url.search='';url.searchParams.set('mode','coop-test');url.searchParams.set('role','guest');url.searchParams.set('session',id);return url.href;}

/** Pairs two ordinary authenticated players. It never simulates gameplay or audio. */
export function createTwoTabTest({session,makeMenu}){
 const role=session.role,id=session.id||crypto.randomUUID(),channel=new BroadcastChannel(`monochrome-test:${id}`);
 let menu,client,room=null,partner=null,partnerId=null,joined=false,created=false,ready=false,approved=null,closed=false,off=null,otherPresent=false;
 const root=document.createElement('aside');root.id='two-tab-test';root.innerHTML='<strong></strong><p role="status"></p><button id="test-launch">Open two-player test</button><button id="test-other" hidden>Other player tab</button><a href="/">Exit test</a>';
 document.body.append(root);root.querySelector('strong').textContent=`TWO-TAB CO-OP TEST / ${role==='host'?'PLAYER 1 · HOST':'PLAYER 2'}`;
 const status=root.querySelector('p'),launch=root.querySelector('#test-launch'),other=root.querySelector('#test-other');
 function note(text){status.textContent=text;}
 function post(type,data={}){channel.postMessage({type,...data});}
 function approve(){
  if(role==='host'&&partnerId&&room?.requests?.some(r=>r.id===partnerId)&&approved!==partnerId){approved=partnerId;client.send('approve',{requestId:partnerId,accept:true});}
 }
 function boot(){
  if(menu)return;
  menu=makeMenu({initialPlayerName:role==='host'?'Test player 1':'Test player 2',onClient:c=>{
   client=c;off=client.subscribe(e=>{
    if(e.type==='welcome'){
     if(role==='host'&&!created){created=true;client.send('create',{name:'Two-tab test '+id.slice(0,6),playerName:'Test player 1'});}
     if(role==='guest')post('hello',{playerId:client.id});
    }
    if(e.type==='lobby'&&e.lobby){
     room=e.lobby;
     if(role==='host'){post('invite',{lobbyId:room.id});approve();}
     else if(!ready&&room.status==='waiting'){ready=true;client.send('ready',{ready:true});}
     note(room.status==='running'?'Full gameplay active · Move in either tab. Test running, torch, interactions and voice.':'Both players can explore the room. Turn on a mic; host presses Begin descent when ready.');
    }
    if(e.type==='started')note('Full gameplay active · WASD move · Shift run · F torch · E interact. Switch tabs to see the other player.');
    if(e.type==='roomClosed')note('The host left. Exit the test and open a fresh pair.');
    if(e.type==='error'){if(e.code==='ROOM_NOT_FOUND'){joined=false;}note(e.message);}
   });
  }});
  void menu.openMultiplayer();
 }
 channel.onmessage=({data:d})=>{
  if(closed||!d||typeof d!=='object')return;
  if(d.type==='hello'&&role==='host'&&typeof d.playerId==='string'){
   if(partnerId&&partnerId!==d.playerId)return;
   partnerId=d.playerId;otherPresent=true;if(room)post('invite',{lobbyId:room.id});approve();
  }
  if(d.type==='invite'&&role==='guest'&&typeof d.lobbyId==='string'&&client?.connected&&!joined){joined=true;client.send('join',{lobbyId:d.lobbyId,playerName:'Test player 2'});note('Joining player 1. Test partner approval is automatic.');}
  if(d.type==='goodbye'){otherPresent=false;note('The other test tab closed. Exit and launch a fresh pair.');}
 };
 launch.addEventListener('click',()=>{
  if(partner&&!partner.closed){partner.focus();return;}
  partner=window.open(testPartnerUrl(location.href,id),`monochrome-test-${id}`);
  if(!partner){note('Allow pop-ups for this site, then press Open two-player test again.');return;}
  launch.hidden=true;other.hidden=false;note('Opening the second player and creating a real multiplayer lobby…');boot();
 });
 other.addEventListener('click',()=>{if(role==='guest')window.opener?.focus();else partner?.focus();});
 const timer=setInterval(()=>{
  if(role==='guest'&&client?.connected&&!room)post('hello',{playerId:client.id});
  if(role==='host'&&room&&!otherPresent)post('invite',{lobbyId:room.id});
 },1500);
 function dispose(){if(closed)return;closed=true;post('goodbye');clearInterval(timer);off?.();menu?.dispose();void client?.close();channel.close();root.remove();window.removeEventListener('pagehide',dispose);}
 window.addEventListener('pagehide',dispose,{once:true});
 if(role==='guest'){launch.hidden=true;other.hidden=false;note('Connecting player 2…');boot();}
 else note('Opens two real players in this browser. Use headphones; enable one microphone at a time to avoid feedback. Both tabs must stay open.');
 return {dispose,get client(){return client;},get waitingRoom(){return menu?.waitingRoom;}};
}
