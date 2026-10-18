import * as THREE from 'three';
import {createWaitingRoomScene} from './waiting-room-scene.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createTorch} from './torch.js';
import {moveInWorld} from './level.js';

export function createWaitingRoom(container,{client,room,onTerminal=()=>{}}){
 const world=createWaitingRoomScene(),renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(66,1,.05,40);camera.rotation.order='YXZ';const torch=createTorch(world.scene,camera);
 const abort=new AbortController(),options={signal:abort.signal},keys=new Set(),avatars=new Map(),poses=new Map();
 let current=room,asset,disposed=false,terminal=false,drag=null,last=performance.now(),clock=0,sendClock=0;
 const me=room.members.find(p=>p.id===client.id),own={...world.spawn(me?.slot??0),torch:true,moving:false,status:'alive'};
 function toggleTerminal(value){terminal=value;keys.clear();onTerminal(value);if(value)document.exitPointerLock?.();}
 function capture(){if(terminal)return;renderer.domElement.tabIndex=0;renderer.domElement.focus();const p=renderer.domElement.requestPointerLock?.();p?.catch?.(()=>{});}
 renderer.domElement.addEventListener('click',capture,options);
 document.addEventListener('keydown',event=>{
  if(event.target.closest?.('input'))return;
  if(event.code==='Escape'){toggleTerminal(!terminal);return;}
  if(event.code==='KeyE'){if(Math.hypot(own.x-world.terminalPosition.x,own.z-world.terminalPosition.z)<3)toggleTerminal(!terminal);return;}
  if(event.code==='KeyF'&&!event.repeat&&!terminal){torch.toggle();own.torch=torch.on;}
  if(!terminal&&['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){keys.add(event.code);event.preventDefault();}
 },options);
 document.addEventListener('keyup',event=>keys.delete(event.code),options);
 function look(x,y){own.yaw-=x*.0021;own.pitch=Math.max(-1.3,Math.min(1.3,own.pitch-y*.0021));}
 document.addEventListener('mousemove',event=>{if(document.pointerLockElement===renderer.domElement&&!terminal)look(event.movementX,event.movementY);},options);
 renderer.domElement.addEventListener('pointerdown',e=>{if(!terminal&&!document.pointerLockElement){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}},options);
 renderer.domElement.addEventListener('pointermove',e=>{if(drag&&!terminal){look(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}},options);
 for(const event of ['pointerup','pointercancel'])renderer.domElement.addEventListener(event,()=>{drag=null;},options);
 window.addEventListener('blur',()=>keys.clear(),options);
 const hints=document.createElement('div');hints.id='waiting-controls';hints.innerHTML='<span>WASD move · Mouse look · F torch · Esc terminal</span><strong id="waiting-interaction"></strong><div class="waiting-touch"><button data-direction="KeyW">↑</button><button data-direction="KeyA">←</button><button data-direction="KeyS">↓</button><button data-direction="KeyD">→</button><button id="waiting-terminal-button">Terminal</button></div>';document.body.append(hints);
 for(const button of hints.querySelectorAll('[data-direction]')){
  button.addEventListener('pointerdown',e=>{keys.add(button.dataset.direction);button.setPointerCapture(e.pointerId);},options);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.direction),options);
 }
 hints.querySelector('#waiting-terminal-button').addEventListener('click',()=>toggleTerminal(!terminal),options);
 const hint=hints.querySelector('#waiting-interaction');
 const unsubscribe=client.subscribe(event=>{if(event.type==='waitingPose'&&current.members.some(m=>m.id===event.playerId))poses.set(event.playerId,{...event.pose,height:0,status:'alive'});});
 void loadPlayerAvatarAsset().then(a=>{if(!disposed)asset=a;}).catch(()=>{if(!disposed)hint.textContent='Suit model could not load. Refresh to reconnect.';});
 function setRoom(next){current=next;for(const [id,avatar] of avatars)if(!next.members.some(m=>m.id===id)){avatar.dispose();avatars.delete(id);poses.delete(id);}}
 function resize(){renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();}
 resize();window.addEventListener('resize',resize,options);
 renderer.setAnimationLoop(()=>{
  const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;clock+=dt;sendClock+=dt;
  const input={forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))};
  const before={x:own.x,z:own.z};
  if(!terminal)for(let left=dt;left>0;left-=.025)Object.assign(own,moveInWorld(own,input,own.yaw,Math.min(.025,left),world.canMove,2.5));
  own.moving=Math.hypot(own.x-before.x,own.z-before.z)>.001;
  camera.position.set(own.x,1.65,own.z);camera.rotation.set(own.pitch,own.yaw,0,'YXZ');
  if(sendClock>.12){sendClock=0;client.send('waitingPose',{pose:own});}
  if(asset)for(const member of current.members){
   if(member.id===client.id)continue;
   if(!avatars.has(member.id)){const a=createPlayerAvatar(asset,member);avatars.set(member.id,a);world.scene.add(a.root);}
   avatars.get(member.id).update(poses.get(member.id)??{...world.spawn(member.slot),torch:true,status:'alive'},dt);
  }
  world.update(dt,clock,current);torch.update({time:clock,moving:own.moving});renderer.toneMappingExposure=.95;
  if(asset)hint.textContent=terminal?'Press Esc to return to the room':Math.hypot(own.x-world.terminalPosition.x,own.z-world.terminalPosition.z)<3?'E · Open lobby terminal':current.requests?.length?'New join request · Open terminal with Esc':'Decontamination complete · Prepare for descent';
  renderer.render(world.scene,camera);torch.render(renderer);
 });
 function dispose(){if(disposed)return;disposed=true;abort.abort();unsubscribe();renderer.setAnimationLoop(null);if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();for(const avatar of avatars.values())avatar.dispose();world.dispose();torch.beam.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();hints.remove();}
 return {setRoom,dispose,world,camera,renderer,avatars,own};
}
