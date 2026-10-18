import {createFinaleClock} from './finale-state.js';
import {createFinalePlayer} from './finale-player.js';
import {gamePreferences,createRenderQuality} from './preferences.js';
import {createRoomAmbience} from './room-ambience.js';
import * as THREE from 'three';
import {createCoopState,applyCoopSnapshot} from './coop-state.js';
import {createCoopSimulation} from './coop-simulation.js';
import {createWorld} from './world.js';
import {createCreature,applyIdle,applyRunning} from './creature.js';
import {idlePose} from './idle.js';
import {groundHeight} from './level.js';
import {createGameUI} from './game-ui.js';
import {gameInput} from './game-input.js';
import {createMonsterAudio,MONSTER_SOUND_URL} from './monster-audio.js';
import {createTorch} from './torch.js';
import {createJumpscare,JUMPSCARE_MOUTH_URL} from './jumpscare.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createMovementPrediction,createPoseBuffer} from './coop-motion.js';
import {createArrival} from './arrival.js';

export function startCoopGame(container,{client,session}){
 const ambience=createRoomAmbience();
 const arrival=createArrival();
 const state=createCoopState(session.seed,session.players),run=state.run;
 state.ownerId=session.ownerId;
 const localId=client.id,isHost=localId===session.ownerId;
 if(!state.players.has(localId))throw new Error('You are not a member of this round.');
 const world=createWorld(run),ui=createGameUI();
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const quality=createRenderQuality(renderer,{pixelRatio:Math.min(devicePixelRatio,1.4)});
 const camera=new THREE.PerspectiveCamera(66,1,.06,120),creature=createCreature();world.scene.add(creature.root);
 creature.root.traverse(mesh=>{if(mesh.isMesh){mesh.userData.actor=true;world.rayMeshes.push(mesh);}});
 const torch=createTorch(world.scene,camera);
 const audio=createMonsterAudio(MONSTER_SOUND_URL,{onError:()=>ui.toast('Monster sound could not load.'),onScareError:()=>ui.toast('The jumpscare sound could not load.')});
 const mouthTexture=new THREE.TextureLoader().load(JUMPSCARE_MOUTH_URL);
 const jumpscare=createJumpscare({mouthTexture});
 const raycaster=new THREE.Raycaster(),point=new THREE.Vector3(),direction=new THREE.Vector3();
 world.scene.updateMatrixWorld(true);
 for(const target of world.targets.values()){
  target.mesh.getWorldPosition(point);target.position={x:point.x,z:point.z,height:groundHeight(point)};
  if(target.hide)target.hide.height=groundHeight(target.hide);
  if(target.exit)target.exit.height=groundHeight(target.exit);
 }
 const solids=()=>world.rayMeshes.filter(mesh=>{if(mesh.userData.actor)return false;for(let p=mesh;p;p=p.parent)if(!p.visible)return false;return true;});
 world.canSeeInteraction=(player,target)=>{
  const at=target.position;if(!at)return false;
  const start=new THREE.Vector3(player.x,player.height+1.65,player.z);
  if(target.mesh)target.mesh.getWorldPosition(point);else point.set(at.x,(at.height??0)+.7,at.z);
  const length=start.distanceTo(point);raycaster.set(start,direction.copy(point).sub(start).normalize());raycaster.far=length+.05;
  const first=raycaster.intersectObjects(solids(),false)[0];
  return !first||first.object.userData.interactId===target.id||first.distance>length-.08;
 };
 const simulation=isHost?createCoopSimulation(state,world):null;
 let enemyView={position:{...(simulation?.enemy.position??{x:13,z:13})},yaw:Math.PI,mode:'patrol',moving:false,silent:false,reveal:0};
 let latestSequence=-1,lastNotice=0,scareStatus=null,lastStatus='alive',outcome=null,spectateId=null,lastSnapshotAt=performance.now(),leaving=false;
 let hold=0,holdId=null,latched=false,buffer='',inputClock=0,snapshotClock=0,disconnected=false;
 const avatars=new Map(),noiseSequences=new Map(),poseBuffers=new Map(),enemyBuffer=createPoseBuffer({adaptive:true});let avatarAsset;
 const prediction=createMovementPrediction(state.players.get(localId),world.canMove);
 let peerProofAt=0,proofSnapshotClock=0;
 const finaleClock=createFinaleClock({now:()=>performance.now()/1000});
 let finalePlayer=null,finaleFinishedAt=null,finaleError=null,finaleStarted=false;
 const peerFingerprints=new Map();let ownerFingerprint=null,acceptedFingerprint=null;
 // Public voice signalling cannot authenticate game authority. Bind DTLS certificates
 // through authenticated member actions and owner-only database snapshots first.
 function peerReady(id){return !!client.voice?.gameConnected(id)&&client.voice.remoteFingerprint(id)===(isHost?peerFingerprints.get(id):ownerFingerprint)&&(isHost||client.voice.localFingerprint(id)===acceptedFingerprint);}
 const correction={x:0,z:0};
 function recordPoses(){
  const at=performance.now()/1000;
  for(const [id,player] of state.players){if(id===localId)continue;if(!poseBuffers.has(id))poseBuffers.set(id,createPoseBuffer({adaptive:true}));poseBuffers.get(id).push(at,player);}
  enemyBuffer.push(at,{...enemyView,...enemyView.position});
 }
 const team=document.createElement('aside');team.id='coop-team';team.innerHTML='<small>SURVIVORS</small><ul></ul><p id="coop-status"></p><button id="coop-next" hidden>Next teammate · Tab</button><button id="coop-leave">Leave session</button>';ui.root.append(team);
 const roster=team.querySelector('ul'),teamStatus=team.querySelector('#coop-status'),nextButton=team.querySelector('#coop-next');
 const rosterRows=new Map();
 function local(){return state.players.get(localId);}
 function viewRun(watched=local()){const own=local();return {...run,carried:own?.carried??new Set(),hidden:!!watched?.hidden,teamKeyCount:run.banked.size+[...state.players.values()].reduce((n,p)=>n+p.carried.size,0)};}
 async function leave(){if(leaving)return;leaving=true;finalePlayer?.dispose();finalePlayer=null;await Promise.race([client.close(),new Promise(resolve=>setTimeout(resolve,2000))]);location.assign(location.pathname);}
 function resume(){ui.hideScreen();input.capture();void audio.resume();void ambience.resume();}
 function screen(kind){
  if(kind==='lost')arrival.dispose();
  audio.pause();ambience.pause();input?.clear();document.exitPointerLock?.();ui.screen(kind==='menu'?'menu':kind==='won'?'won':kind==='dead'?'dead':'pause',viewRun());
  const card=ui.el('screen-content'),heading=card.querySelector('h1'),description=card.querySelector('p'),primary=ui.el('screen-primary');
  if(kind==='menu'){heading.textContent='STAY TOGETHER';description.textContent=`${session.players.length} survivors. Shared keys. One creature that sees and hears every one of you.`;primary.firstChild.textContent='Enter with your team';}
  if(kind==='pause'){description.textContent='Your teammates and the creature keep moving while this menu is open.';primary.firstChild.textContent='Return to your team';}
  if(kind==='spectate'){
   const own=local();heading.textContent=own?.status==='downed'?'HOLD ON':own?.status==='escaped'?'YOU MADE IT':'KEEP WATCHING';description.textContent=own?.status==='downed'?'A teammate can rescue you for a short time. Your unbanked keys returned to their drawers.':own?.status==='escaped'?'Wait for the remaining survivors to reach the elevator.':'Watch a teammate. The round ends when the team escapes or no one remains standing.';primary.firstChild.textContent='Watch your team';
  }
  if(kind==='dead'){heading.textContent='THE SIGNAL IS GONE';description.textContent='No survivor remains standing. Return to the menu and create a new lobby.';primary.firstChild.textContent='Return to menu';}
  if(kind==='won'){description.textContent=`The surviving team escaped in ${Math.floor(run.elapsed/60)}:${String(Math.floor(run.elapsed%60)).padStart(2,'0')}.`;primary.firstChild.textContent='Return to menu';}
  if(kind==='lost'){heading.textContent='CONNECTION LOST';description.textContent='The lobby connection ended. Return to the menu to join another team.';primary.firstChild.textContent='Return to menu';}
  primary.addEventListener('click',()=>['dead','won','lost'].includes(kind)?leave():resume());
  card.querySelector('a')?.remove();
  const secondary=ui.el('new-run');if(secondary){secondary.textContent='Leave this session';secondary.addEventListener('click',leave);}
 }
 function pause(){if(ui.overlay==='keypad'){closeKeypad();return;}if(disconnected||run.phase!=='playing')return;if(ui.overlay==='pause')resume();else if(!ui.overlay)screen('pause');}
 const input=gameInput(camera,renderer.domElement,ui,pause,()=>{void audio.resume();void ambience.resume();});
 input.setView(local().yaw);
 function cycleSpectator(){const available=[...state.players.values()].filter(p=>p.id!==localId&&p.status==='alive');if(!available.length){spectateId=null;return;}const at=available.findIndex(p=>p.id===spectateId);spectateId=available[(at+1)%available.length].id;}
 nextButton.addEventListener('click',cycleSpectator);team.querySelector('#coop-leave').addEventListener('click',leave);
 function toggleTorch(){if(ui.overlay||local()?.status!=='alive')return;torch.toggle();ui.el('torch-toggle').textContent=torch.on?'Torch on':'Torch off';ui.el('torch-toggle').setAttribute('aria-pressed',String(torch.on));ui.el('torch-toggle').setAttribute('aria-label',torch.on?'Turn torch off (F)':'Turn torch on (F)');}
 function toggleSound(){audio.setMuted(!audio.muted);ambience.setMuted(audio.muted);ui.el('sound-toggle').textContent=audio.muted?'Sound off':'Sound on';ui.el('sound-toggle').setAttribute('aria-pressed',String(audio.muted));ui.el('sound-toggle').setAttribute('aria-label',audio.muted?'Unmute game sound':'Mute game sound');}
 ui.el('torch-toggle').addEventListener('click',toggleTorch);ui.el('sound-toggle').hidden=!audio.configured;ui.el('sound-toggle').addEventListener('click',toggleSound);ui.el('pause-game').addEventListener('click',pause);
 document.addEventListener('keydown',event=>{
  if(event.repeat||event.target.closest?.('input'))return;
  if(event.code==='KeyF'&&!ui.overlay){event.preventDefault();toggleTorch();}
  if(event.code==='KeyM'&&ui.overlay!=='keypad')toggleSound();
  if(event.code==='Tab'&&local()?.status!=='alive'){event.preventDefault();cycleSpectator();}
  if(ui.overlay==='keypad'){if(/^\d$/.test(event.key)){event.preventDefault();digit(event.key);}else if(event.key==='Backspace'){event.preventDefault();digit('←');}else if(event.key==='Enter'){event.preventDefault();digit('✓');}}
 });
 function sendAction(targetId,code='interact'){
  if(isHost)simulation.interact(localId,{targetId,code});else if(!client.send('action',{action:{targetId,code}}))ui.toast('Waiting for the connection. Release E and try again.');
 }
 function closeKeypad(){ui.el('keypad-dialog').hidden=true;ui.overlay=null;input.clear();input.capture();void audio.resume();void ambience.resume();}
 function digit(value){
  if(value==='✓'){if(buffer.length!==4){ui.el('keypad-feedback').textContent='Enter four digits.';return;}sendAction('keypad',buffer);closeKeypad();return;}
  buffer=value==='←'?buffer.slice(0,-1):buffer.length<4?buffer+value:buffer;ui.el('code-display').textContent=buffer.padEnd(4,'—').split('').join(' ');
 }
 function openKeypad(){buffer='';ui.overlay='keypad';ui.el('code-display').textContent='— — — —';ui.el('keypad-feedback').textContent='';ui.el('keypad-dialog').hidden=false;input.clear();document.exitPointerLock?.();ui.root.querySelector('[data-digit="1"]').focus();}
 ui.root.querySelectorAll('[data-digit]').forEach(button=>button.addEventListener('click',()=>digit(button.dataset.digit)));ui.el('close-keypad').addEventListener('click',closeKeypad);
 function targetInfo(target){
  if(!target)return null;const labels={boards:['Pry away the boards',1.8],closet:['Hide in closet',.25],clue:['Read the four-digit clue',.2],locks:[`Bank your keys · ${run.banked.size} / 4 filled`,.6],keypad:[run.codeAccepted?'Keypad · code accepted':'Enter elevator code',.15],elevator:[run.exitOpen?'Step into the elevator':'Open elevator · four keys + code',.6]};
  if(target.type==='drawer'){const drawer=run.drawers[target.drawerId];return {...target,label:drawer.opened?(drawer.key&&!drawer.taken?'Take the key':'Close searched drawer'):'Search drawer',duration:drawer.opened?.15:.45};}
  if(target.type==='boards'&&run.boardsOpen)return null;
  if(!labels[target.type])return null;return {...target,label:labels[target.type][0],duration:labels[target.type][1]};
 }
 function currentTarget(){
  const own=local();if(own?.status!=='alive')return null;
  if(own.hidden)return{id:'leave',type:'leave',label:'Leave the closet',duration:.2};
  camera.updateMatrixWorld();camera.getWorldDirection(direction);
  for(const player of state.players.values())if(player.status==='downed'&&Math.hypot(player.x-own.x,player.z-own.z,player.height-own.height)<2){
   point.set(player.x-own.x,0,player.z-own.z).normalize();
   const looking=new THREE.Vector3(direction.x,0,direction.z).normalize();
   const target={id:`revive:${player.id}`,type:'revive',position:player};
   if(point.dot(looking)>.65&&world.canSeeInteraction(own,target))return {...target,label:`Rescue ${player.name}`,duration:2.5};
  }
  raycaster.setFromCamera(new THREE.Vector2(),camera);raycaster.far=2.5;const hit=raycaster.intersectObjects(world.rayMeshes.filter(mesh=>{if(mesh.userData.actor)return false;for(let p=mesh;p;p=p.parent)if(!p.visible)return false;return true;}),false)[0];
  return hit?targetInfo(world.targets.get(hit.object.userData.interactId)):null;
 }
 function startScare(){
  if(jumpscare.active)return;ui.overlay='jumpscare';ui.el('game-screen').hidden=true;ui.el('keypad-dialog').hidden=true;ui.el('jumpscare-border').hidden=false;document.body.classList.add('jumpscare-active');input.clear();document.exitPointerLock?.();jumpscare.start();audio.playJumpscare();scareStatus=true;
 }
 function receiveSnapshot(snapshot,authenticated=false){
  if(authenticated&&snapshot?.state?.seed===state.seed){const proof=snapshot.peerProofs?.[localId];if(typeof proof==='string'&&/^[a-f0-9]{64}$/.test(proof))ownerFingerprint=proof;
   const accepted=snapshot.peerAcknowledged?.[localId];if(typeof accepted==='string'&&/^[a-f0-9]{64}$/.test(accepted))acceptedFingerprint=accepted;
  }
  if(isHost||!snapshot||!Number.isFinite(snapshot.sequence)||snapshot.sequence<=latestSequence||snapshot.state?.seed!==state.seed)return;
  const before=local()?{...local()}:null;latestSequence=snapshot.sequence;lastSnapshotAt=performance.now();
  applyCoopSnapshot(state,snapshot.state);
  const after=local();
  if(!after){disconnected=true;screen('lost');return;}
  const transition=before?.status!==after?.status||before?.hidden!==after?.hidden||before?.closetId!==after?.closetId;
  prediction.reconcile({...after},before);
  if(before&&!transition){correction.x+=before.x-after.x;correction.z+=before.z-after.z;}
  else{correction.x=0;correction.z=0;}
  enemyView=snapshot.enemy??enemyView;recordPoses();
  for(const notice of snapshot.notices??[])if(notice.id>lastNotice){if(notice.playerId===localId)ui.toast(notice.message);lastNotice=Math.max(lastNotice,notice.id);}
 }
 const offGameplay=client.voice?.subscribeGameplay(event=>{
  if(event.type==='snapshot'&&event.playerId===session.ownerId&&peerReady(event.playerId))receiveSnapshot(event.payload.snapshot);
  if(isHost&&event.type==='input'&&state.players.has(event.playerId)&&peerReady(event.playerId))simulation.setInput(event.playerId,event.payload.input);
 });
 const unsubscribe=client.subscribe(event=>{
  if(event.type==='snapshot')receiveSnapshot(event.snapshot,true);
  if(isHost&&event.type==='input')simulation.setInput(event.playerId,event.input);
  if(isHost&&event.type==='action'){
   if(event.action?.targetId==='peer-channel'&&/^[a-f0-9]{64}$/.test(event.action.code??''))peerFingerprints.set(event.playerId,event.action.code);
   else simulation.interact(event.playerId,event.action);
  }
  if(isHost&&event.type==='lobby'&&event.lobby){const ids=new Set(event.lobby.members.map(p=>p.id));for(const id of state.players.keys())if(!ids.has(id))simulation.removePlayer(id);}
  if(!leaving&&(event.type==='roomClosed'||event.type==='connection'&&event.status==='closed'||event.type==='error'&&event.code==='REALTIME_ERROR')){disconnected=true;screen('lost');}
  if(event.type==='error'&&event.code!=='RATE_LIMIT')ui.toast(event.message);
 });
 void loadPlayerAvatarAsset().then(asset=>{
  avatarAsset=asset;
  const enter=ui.el('screen-primary');if(enter&&ui.overlay==='menu'){enter.disabled=false;enter.firstChild.textContent='Enter with your team';}
 }).catch(()=>{
  disconnected=true;screen('lost');ui.el('screen-content').querySelector('p').textContent='The hazmat models could not load. Return to the menu and try again.';
 });
 function updateAvatars(delta){
  for(const [id,player] of state.players){
   if(id===localId)continue;
   if(!avatars.has(id)&&avatarAsset){const avatar=createPlayerAvatar(avatarAsset,player);avatars.set(id,avatar);world.scene.add(avatar.root);}
   const avatar=avatars.get(id);if(avatar){const pose=poseBuffers.get(id)?.sample(performance.now()/1000)??player;avatar.update({...pose,interpolated:true,resetPose:avatarResume,speaking:client.voice?.isSpeaking(id)},delta);if(id===spectateId&&local()?.status!=='alive')avatar.root.visible=false;}
  }
  for(const [id,avatar] of avatars)if(!state.players.has(id)){avatar.dispose();avatars.delete(id);}
 }
 function updateTeam(){
  for(const [id,player] of state.players){
   if(!rosterRows.has(id)){const row=document.createElement('li');roster.append(row);rosterRows.set(id,row);}
   const suffix=player.status==='downed'?`rescue ${Math.max(0,Math.ceil(player.downedUntil-run.elapsed))}s`:player.status==='alive'?(player.hidden?'hiding':`${player.carried.size} keys`):player.status;
   const text=`${player.slot+1} · ${player.name}${id===localId?' (you)':''} — ${suffix}`;const row=rosterRows.get(id);if(row.textContent!==text)row.textContent=text;row.dataset.status=player.status;
  }
  for(const [id,row] of rosterRows)if(!state.players.has(id)){row.remove();rosterRows.delete(id);}
  nextButton.hidden=local()?.status==='alive';
 }
 let renderDirty=true,lastOverlay=null,wasHidden=document.hidden,avatarResume=false;
 function resize(){renderDirty=true;renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();jumpscare.resize(camera.aspect);}resize();window.addEventListener('resize',resize);
 window.addEventListener('pagehide',()=>{finalePlayer?.dispose();client.send('leave');client.close();audio.dispose();ambience.dispose();unsubscribe();offGameplay?.();renderer.setAnimationLoop(null);for(const avatar of avatars.values())avatar.dispose();},{once:true});
 function broadcastSnapshot(wallDelta){
  if(!isHost||disconnected)return;
  snapshotClock+=wallDelta;proofSnapshotClock+=wallDelta;
  if(snapshotClock<.05)return;
  snapshotClock%=.05;
  const snapshot=simulation.snapshot();
  snapshot.peerAcknowledged=Object.fromEntries(peerFingerprints);
  snapshot.peerProofs=Object.fromEntries([...state.players.keys()].filter(id=>id!==localId).map(id=>[id,client.voice?.localFingerprint?.(id)]));
  recordPoses();let fallback=false;
  for(const id of state.players.keys())if(id!==localId&&(!peerReady(id)||!client.voice?.sendGameplay(id,'snapshot',{snapshot})))fallback=true;
  if(fallback||proofSnapshotClock>=1){if(client.send('snapshot',{snapshot}))proofSnapshotClock=0;}
  for(const notice of snapshot.notices)if(notice.id>lastNotice){
   if(notice.playerId===localId)ui.toast(notice.message);lastNotice=Math.max(lastNotice,notice.id);
  }
 }
 function showFinale(now){
  if(!run.finale)return false;
  finaleClock.sync(run.finale);
  if(!finaleStarted){
   finaleStarted=true;arrival.dispose();input.clear();document.exitPointerLock?.();
   ui.el('keypad-dialog').hidden=true;ui.el('jumpscare-border').hidden=true;document.body.classList.remove('jumpscare-active');
   ui.hideScreen();audio.pause();ambience.pause();torch.beam.intensity=0;
  }
  if(!finalePlayer&&!finaleError&&avatarAsset){
   try{
    finalePlayer=createFinalePlayer({container,renderer,asset:avatarAsset,cast:run.finale.cast,runnerId:run.finale.runnerId,buttonId:run.finale.buttonId,preview:false});
    void finalePlayer.audio.resume();
   }catch(error){finaleError=error;console.warn('Finale scene could not initialize',error);}
  }
  if(finaleError||(!avatarAsset&&run.phase==='won')){
   if(outcome!=='won'){outcome='won';screen('won');}return true;
  }
  if(finalePlayer){
   const elapsed=run.phase==='won'?52:finaleClock.sample();
   if(!document.hidden)finalePlayer.sample(elapsed);
   if(elapsed>=52){
    if(finaleFinishedAt===null)finaleFinishedAt=now;
    if(now-finaleFinishedAt>1600){
     finalePlayer.dispose();finalePlayer=null;
     if(outcome!=='won'){outcome='won';screen('won');}
    }
   }
  }
  return true;
 }
 screen('menu');ui.hideScreen();ui.overlay='arrival';let previous=performance.now(),time=0;
 function frame(){
  const now=performance.now(),wallDelta=Math.min(1,(now-previous)/1000),delta=Math.min(.2,wallDelta);previous=now;time+=delta;
  avatarResume=wasHidden&&!document.hidden;wasHidden=document.hidden;
  let own=local();if(!own)return;
  const command={...input.movement,yaw:input.yaw,pitch:input.pitch,sprint:input.sprint,torch:torch.on,paused:!!ui.overlay||disconnected||own.status!=='alive'};
  if(!isHost&&!disconnected&&now-lastSnapshotAt>(latestSequence<0?20000:10000)){disconnected=true;screen('lost');}
  if(isHost){simulation.setInput(localId,command);if(!disconnected){for(let left=document.hidden?wallDelta:delta;left>0;left-=.2)simulation.advance(Math.min(.2,left));}enemyView=simulation.enemySnapshot();}
  else if(!disconnected){
   const fingerprint=client.voice?.localFingerprint?.(session.ownerId);
   const direct=peerReady(session.ownerId);
   if(!direct&&fingerprint&&client.voice?.gameConnected(session.ownerId)&&now-peerProofAt>2000){if(client.send('action',{action:{targetId:'peer-channel',code:fingerprint}}))peerProofAt=now;}
   prediction.step(command,delta);
   inputClock+=wallDelta;
   if(inputClock>=.05){inputClock%=.05;
    const packet=prediction.packet(command);
    if(!direct||!client.voice.sendGameplay(session.ownerId,'input',{input:packet}))client.send('input',{input:packet});
   }
  }
  own=local();
  if(run.finale){showFinale(now);broadcastSnapshot(wallDelta);return;}
  if(own.status!==lastStatus){
   if(lastStatus==='alive'&&(own.status==='downed'||own.status==='dead'))startScare();
   if(own.status==='alive'){spectateId=null;if(scaredOrWatching()){ui.hideScreen();void audio.resume();void ambience.resume();}if(torch.on!==own.torch)torch.toggle();}
   else if(own.status==='escaped'&&!jumpscare.active)screen('spectate');
   else if(lastStatus==='downed'&&own.status==='dead'&&ui.overlay==='pause'&&!jumpscare.active)screen('spectate');
   lastStatus=own.status;
  }
  if(jumpscare.active){jumpscare.update(delta);if(!jumpscare.active){scareStatus=null;ui.el('jumpscare-border').hidden=true;document.body.classList.remove('jumpscare-active');if(run.phase==='playing')screen('spectate');}}
  if(!jumpscare.active&&!disconnected&&run.phase!=='playing'&&outcome!==run.phase){outcome=run.phase;screen(run.phase==='won'?'won':'dead');}
  if(own.status!=='alive'&&!state.players.get(spectateId)?.status?.match(/^alive$/))cycleSpectator();
  const watched=own.status==='alive'?own:state.players.get(spectateId)??own;
  input.updateView();
  if(own.status!=='alive'){camera.rotation.set(watched.pitch??0,watched.yaw??Math.PI,0,'YXZ');teamStatus.textContent=watched.id!==localId?`Watching ${watched.name}`:'No teammate remains standing.';}
  else teamStatus.textContent='Four keys · one code · get everyone out';
  const view=watched.id===localId?watched:poseBuffers.get(watched.id)?.sample(performance.now()/1000)??watched;
  const settle=Math.exp(-delta*14);correction.x*=settle;correction.z*=settle;
  if(watched.id!==localId)camera.rotation.set(view.pitch??0,view.yaw??Math.PI,0,'YXZ');
  camera.position.set(view.x+(watched.id===localId?correction.x:0),view.height+1.65,view.z+(watched.id===localId?correction.z:0));
  for(const player of state.players.values())if(player.noiseSequence>(noiseSequences.get(player.id)??0)){
   noiseSequences.set(player.id,player.noiseSequence);
   const close=Math.hypot(player.x-watched.x,player.z-watched.z,player.height-watched.height)<6;
   if(!ui.overlay&&run.elapsed-player.noiseAt<.45&&close)audio.playNoise(player.noiseType);
  }
  if(watched.hidden&&watched.closetId){world.targets.get(watched.closetId).mesh.visible=false;}
  for(const closet of world.closets)if(!(watched.hidden&&watched.closetId===closet.id))closet.mesh.visible=true;
  const target=!ui.overlay&&!document.hidden?currentTarget():null;
  if(!input.interact){hold=0;holdId=null;latched=false;}
  else if(target&&!latched){if(holdId!==target.id){hold=0;holdId=target.id;}hold=Math.min(1,hold+delta/target.duration);if(hold>=1){if(target.type==='keypad'&&!run.codeAccepted)openKeypad();else sendAction(target.id);latched=true;hold=0;}}
  else if(!target){hold=0;holdId=null;}
  if(!document.hidden){ui.update(viewRun(watched),watched,target,hold);updateTeam();updateAvatars(delta);}
  applyIdle(creature,idlePose(time));if(enemyView.moving)applyRunning(creature,time*(enemyView.mode==='chase'?1.2:.7),enemyView.mode==='chase'?1:.65);
  const enemyPose=!isHost?enemyBuffer.sample(performance.now()/1000):null;
  const monsterPosition=enemyPose??enemyView.position;
  creature.root.position.set(monsterPosition.x,creature.root.position.y+groundHeight(monsterPosition),monsterPosition.z);creature.root.rotation.y=enemyPose?.yaw??enemyView.yaw;
  const distance=run.boardsOpen?Math.hypot(enemyView.position.x-watched.x,enemyView.position.z-watched.z,watched.height-groundHeight(enemyView.position)):Infinity;
  const threat=watched.height<1.5?Math.max(0,1-distance/12):0;
  const silent=enemyView.silent&&enemyView.silentTargetId===watched.id;
  audio.update(silent?Infinity:distance,!ui.overlay&&!disconnected&&run.phase==='playing',delta);
  world.update(disconnected?0:delta,time,watched,threat,hold,{position:{...enemyView.position,height:groundHeight(enemyView.position)},hunting:enemyView.mode==='chase',active:run.boardsOpen});
  torch.update({ceilingPower:world.lighting.visibility,time,moving:own.status==='alive'&&!own.hidden&&!ui.overlay&&(input.movement.forward!==0||input.movement.right!==0)});
  torch.beam.intensity=(own.status==='alive'?torch.on:watched.torch)?140:0;
  const prefs=gamePreferences();if(!document.hidden)quality.update(delta,prefs.quality);audio.setVolume(prefs.volume);ambience.setVolume(prefs.volume);if(!ui.overlay&&!disconnected)ambience.update();
  renderer.toneMappingExposure=(own.status==='alive'?torch.exposure:.95*(watched.torch?1:world.lighting.visibility))*prefs.brightness;
  document.documentElement.style.setProperty('--power',String(world.lighting.visibility));document.documentElement.style.setProperty('--danger',String(threat*.38));
  if(arrival.active){
   torch.model.position.y-=.35*Math.max(0,Math.min(1,(10.7-arrival.elapsed)/1.2));
   torch.beam.intensity=arrival.elapsed>6.7&&torch.on?140:0;
   if((avatarAsset||arrival.elapsed<6.4)&&arrival.update(document.hidden?wallDelta:delta,camera,own)){ui.hideScreen();input.capture();void audio.resume();void ambience.resume();}
  }
  if(!document.hidden&&jumpscare.active){renderer.toneMappingExposure=1;jumpscare.render(renderer);const border=ui.el('jumpscare-border');border.style.opacity=String(jumpscare.borderOpacity);border.style.setProperty('--scare-impact',String(jumpscare.impactOpacity));document.documentElement.style.setProperty('--scare-glitch',`${(jumpscare.glitch*6).toFixed(2)}px`);}
  else if(!document.hidden&&(!ui.overlay||arrival.active||renderDirty||lastOverlay!==ui.overlay)){renderer.render(world.scene,camera);renderDirty=false;if(own.status==='alive'&&(!arrival.active||arrival.elapsed>9.5))torch.render(renderer);}
  lastOverlay=ui.overlay;
  broadcastSnapshot(wallDelta);
 }
 renderer.setAnimationLoop(frame);
 // A second tab must remain playable while the owner's canvas is hidden.
 const backgroundTimer=setInterval(()=>{if(document.hidden)frame();},100);
 window.addEventListener('pagehide',()=>clearInterval(backgroundTimer),{once:true});
 function scaredOrWatching(){return scareStatus||ui.overlay==='pause'||local()?.status==='alive';}
 return {state,run,world,simulation,camera,renderer,ui,input,torch,monsterAudio:audio,jumpscare,avatars,client,session,arrival,get finale(){return finalePlayer;},get finaleError(){return finaleError;}};
}
