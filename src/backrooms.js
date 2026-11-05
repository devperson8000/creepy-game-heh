import * as T from 'three';
import {createBackroomsWorld} from './backrooms-world.js';
import {createBackroomsPost} from './backrooms-post.js';
import {BACKROOMS_SPEED,createBackroomsRound,roundTarget,interactRound,roundObjective,canMoveRound,advanceRoundPhysics,backroomsMoveSpeed} from './backrooms-round.js';
import {createBackroomsObjectives} from './backrooms-objectives.js';
import {createBackroomsPlayer} from './backrooms-player.js';
import {BACKROOMS_PLAYER_MODEL} from './backrooms-player-config.js';
import {createBackroomsEncounter} from './backrooms-encounter.js';
import {createBackroomsInteractionAudio} from './backrooms-interaction-audio.js';
import {createBackroomsLobby} from './backrooms-lobby.js';
import {createBackroomsCoop} from './backrooms-coop.js';
import {createBackroomsTeam} from './backrooms-team.js';
import {createBackroomsChat} from './backrooms-chat.js';
import {moveInWorld} from './level.js';
import './backrooms.css';

export function startBackrooms(container,{client=null,session=null}={}){
 document.title='The Backrooms — Level 0';container.setAttribute('aria-label','Explore Backrooms Level 0');
 const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.tabIndex=0;container.append(renderer.domElement);
 const classic=true;
 const world=createBackroomsWorld(),round=createBackroomsRound(),objectives=createBackroomsObjectives(world,round),camera=new T.PerspectiveCamera(68,1,.06,120),post=createBackroomsPost(renderer),player={...world.map.spawn,y:0};
 round.hasTorch=!classic;
 let yaw=player.yaw,pitch=0,paused=true,started=false,vhs=true,muted=false,disposed=false,drag=null,time=0,distance=0,context=null,master=null,captured=false,captureElapsed=0,thirdPerson=false,torchOn=!classic,hold=0,holdId=null,latched=false,caughtBy='Bacteria',scareLeft=0,lobby=null,wonShown=false,interactionAudio=null,lastInstalled=0;const heardPickups=new Set();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),keys=new Set(),listeners=[],audioNodes=[];
 const root=document.createElement('div');root.className='br-ui';root.innerHTML=`<div class="br-top"><div><div class="br-rec"><i class="br-dot"></i>REC <span>●</span> TAPE 001</div><small>UNIDENTIFIED LOCATION / LEVEL 0</small></div><div class="br-tools"><button data-action="view">View · V</button><button data-action="torch" aria-pressed="true">Torch · F</button><button data-action="vhs" aria-pressed="true">VHS on</button><button data-action="sound" aria-pressed="true">Sound on</button><button data-action="pause">Pause</button></div></div><div class="br-aim"></div><div class="br-bottom"><div class="br-timestamp">JUL. 04 1991<br><span data-clock>00:00:00</span> <span style="opacity:.5">SP</span></div><div class="br-help">WASD MOVE · SHIFT RUN · E INTERACT<br>Q THROW · F TORCH · ESC PAUSE</div></div><div class="br-center"><section class="br-panel" role="dialog" aria-modal="false" aria-labelledby="br-title"><div class="br-eyebrow">FOUND FOOTAGE / 001</div><h1 id="br-title">The Backrooms<span>LEVEL 0 — EXPLORATION BUILD</span></h1><p>The lights are still on.<br>Find four wooden ladder sections across the rooms.<br>Fit them, climb to the key, and cross the pitfalls.<br>Follow the recovery arrows if you fall.</p><button class="br-start" data-action="start">Enter the Backrooms <span>↗</span></button><button data-action="multiplayer">Multiplayer</button><button data-action="leave-game" hidden>Leave game</button><footer><span>HEADPHONES RECOMMENDED</span><a href="/">Original game</a></footer></section></div><div class="br-touch" aria-label="Movement"><button data-key="KeyW" aria-label="Forward">↑</button><button data-key="KeyA" aria-label="Left">←</button><button data-key="KeyS" aria-label="Backward">↓</button><button data-key="KeyD" aria-label="Right">→</button><button data-key="ShiftLeft">Hold to run</button><button data-action="distract">Throw scrap · Q</button><button data-key="KeyE">Hold to interact · E</button></div><div class="br-objective"><span>LEVEL 0 / ESCAPE ROUTE</span><strong data-objective>0 / 4 LADDER PARTS</strong><small>Search the rooms for four wooden ladder sections.</small></div><div class="br-interaction" hidden><span data-target></span><div><i></i></div></div><div class="br-toast" role="status"></div>`;document.body.append(root);
 const el=s=>root.querySelector(s),on=(target,event,fn,options)=>{target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));};
 const survivor=createBackroomsPlayer(world.scene,{url:BACKROOMS_PLAYER_MODEL,onError:()=>{el('.br-toast').textContent='The hazmat suit could not load. Reload to try again.';}});
 const beam=new T.SpotLight(0xffedbd,28,24,.42,.65,1.5),beamTarget=new T.Object3D();world.scene.add(beam,beamTarget);beam.target=beamTarget;
 el('[data-action="view"]').hidden=survivor.pending;el('[data-action="torch"]').setAttribute('aria-pressed',String(torchOn));
 if(classic){el('[data-action="distract"]').hidden=true;el('.br-help').innerHTML='WASD MOVE · SHIFT RUN · E INTERACT<br>Q / R LEAN · F TORCH · ESC PAUSE';}
 const encounter=createBackroomsEncounter(world);
 function resetCoopView(){encounter.reset();lastInstalled=0;heardPickups.clear();Object.assign(round,net.view());captured=false;captureElapsed=0;scareLeft=0;wonShown=false;hold=0;latched=false;root.classList.remove('br-captured','br-ambush');root.style.setProperty('--capture','0');el('[data-action="start"]').disabled=false;setPause(false);}
 const net=client&&session?createBackroomsCoop({client,session:{...session,classic:true},world,onNotice:text=>{el('.br-toast').textContent=text;},onMove:(d,s,p)=>encounter.movement(d,s,p),onReset:resetCoopView,onInteract:()=>{},onDistract:(p,t)=>encounter.distract(p,p.yaw,t)}):null;
 const team=net?createBackroomsTeam(world.scene,client.id):null;
 const chat=net?createBackroomsChat(client,()=>Object.values(net.state.players)):null;
 if(net){root.append(chat.root);document.body.classList.add('br-network','br-coop-game');el('[data-action="multiplayer"]').hidden=true;el('[data-action="leave-game"]').hidden=false;const roster=document.createElement('div');roster.className='br-team-roster';root.append(roster);}
 function multiplayer(){if(net||lobby)return;setPause(true);el('.br-center').hidden=true;document.exitPointerLock?.();renderer.render(world.scene,camera);const preview=renderer.domElement.toDataURL('image/jpeg',.6);lobby=createBackroomsLobby({preview,onClose:()=>{lobby=null;el('.br-center').hidden=false;},onStart:data=>{lobby=null;dispose();window.backrooms=startBackrooms(container,data);}});}
 on(el('[data-action="multiplayer"]'),'click',multiplayer);
 on(el('[data-action="leave-game"]'),'click',()=>{dispose();window.backrooms=startBackrooms(container);});
 function initAudio(){
  if(!context){try{context=new AudioContext();master=context.createGain();master.gain.value=muted?0:.23;master.connect(context.destination);
   for(const [frequency,gain]of [[60,.11],[120,.045],[180,.016]]){const osc=context.createOscillator(),volume=context.createGain();osc.type='sine';osc.frequency.value=frequency;volume.gain.value=gain;osc.connect(volume);volume.connect(master);osc.start();audioNodes.push(osc,volume);}
   const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.035)/1.035;data[i]=previous;}
   const noise=context.createBufferSource(),filter=context.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=650;noise.connect(filter);filter.connect(master);noise.start();audioNodes.push(noise,filter);
  }catch{el('.br-toast').textContent='Audio unavailable. You can still explore.';return;}}
  interactionAudio??=createBackroomsInteractionAudio(context,master);
  if(!paused)void context?.resume().catch(()=>{});
 }
 function setPause(value){if((captured||round.phase==='won')&&!value){if(net){if(net.host)net.restart();return;}location.reload();return;}paused=value;keys.clear();drag=null;el('.br-center').hidden=!value;el('[data-action="pause"]').textContent=value?'Resume':'Pause';if(value){document.exitPointerLock?.();void context?.suspend();if(started){el('#br-title').innerHTML='Still here.<span>LEVEL 0 — PAUSED</span>';el('.br-panel p').textContent='Take a moment. The rooms can wait.';el('[data-action="start"]').innerHTML='Continue exploring <span>↗</span>';el('[data-action="start"]').focus();}if(captured){el('#br-title').innerHTML=`Signal lost.<span>LEVEL 0 — ${caughtBy.toUpperCase()}</span>`;el('.br-panel p').textContent='Break line of sight and turn consecutive corners. The pit has a lower escape route if you fall.';el('[data-action="start"]').innerHTML=net?(net.host?'Restart team <span>↗</span>':'Waiting for host…'):'Try again <span>↗</span>';}if(round.phase==='won'){el('#br-title').innerHTML='You escaped.<span>EXIT VENT REACHED</span>';el('.br-panel p').textContent='Ladder repaired. Key recovered. Pitfalls cleared. You reached the Level 1 entrance.';el('[data-action="start"]').innerHTML=net?(net.host?'Play again with team <span>↗</span>':'Waiting for host…'):'Play again <span>↗</span>';}el('[data-action="start"]').disabled=!!net&&!net.host&&(captured||round.phase==='won');}else{started=true;renderer.domElement.focus();initAudio();}}
 function capture(){if(matchMedia('(pointer:fine)').matches){try{renderer.domElement.requestPointerLock?.()?.catch?.(()=>{});}catch{}}}
 on(el('[data-action="start"]'),'click',()=>{setPause(false);capture();});
 on(el('[data-action="pause"]'),'click',()=>setPause(!paused));
 const toggleView=()=>{if(!survivor.model)return;thirdPerson=!thirdPerson;el('[data-action="view"]').textContent=thirdPerson?'First person · V':'Third person · V';};on(el('[data-action="view"]'),'click',toggleView);
 const toggleTorch=()=>{if(!round.hasTorch){el('.br-toast').textContent='Find the flashlight near the exit stairs.';return;}torchOn=!torchOn;el('[data-action="torch"]').setAttribute('aria-pressed',String(torchOn));};on(el('[data-action="torch"]'),'click',toggleTorch);
 const distract=()=>{if(!classic&&!paused&&!captured)(net?net.distract():encounter.distract(player,yaw,time));};on(el('[data-action="distract"]'),'click',distract);
 on(el('[data-action="vhs"]'),'click',()=>{vhs=!vhs;el('[data-action="vhs"]').textContent=vhs?'VHS on':'VHS off';el('[data-action="vhs"]').setAttribute('aria-pressed',String(vhs));});
 function toggleSound(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.23,context.currentTime,.08);el('[data-action="sound"]').textContent=muted?'Sound off':'Sound on';el('[data-action="sound"]').setAttribute('aria-pressed',String(!muted));if(!muted)initAudio();}
 on(el('[data-action="sound"]'),'click',toggleSound);
 on(document,'keydown',e=>{if(e.target.closest?.('input,select,textarea'))return;if(e.code==='KeyV'&&!e.repeat){toggleView();return;}if(e.code==='KeyF'&&!e.repeat){toggleTorch();return;}if(e.code==='KeyQ'&&!classic&&!e.repeat){e.preventDefault();distract();return;}if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(started)setPause(!paused);return;}if(e.code==='KeyM'&&!e.repeat){toggleSound();return;}if(e.target.closest?.('button,a,input'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyQ','KeyR'].includes(e.code)){e.preventDefault();if(!paused)keys.add(e.code);}});
 on(document,'keyup',e=>keys.delete(e.code));on(window,'blur',()=>{if(started&&!paused&&!captured)setPause(true);});on(document,'visibilitychange',()=>{if(document.hidden&&started)setPause(true);});
 const look=(dx,dy)=>{if(paused)return;yaw-=dx*.0021;pitch=T.MathUtils.clamp(pitch-dy*.0021,-1.25,1.25);};
 let hadPointerLock=false;on(document,'pointerlockchange',()=>{const locked=document.pointerLockElement===renderer.domElement;if(hadPointerLock&&!locked&&!paused&&!captured)setPause(true);hadPointerLock=locked;});
 on(document,'mousemove',e=>{if(document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
 on(renderer.domElement,'pointerdown',e=>{if(paused)return;if(e.pointerType==='mouse')capture();drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
 on(renderer.domElement,'pointermove',e=>{if(drag?.id===e.pointerId&&document.pointerLockElement!==renderer.domElement){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])on(renderer.domElement,event,()=>drag=null);
 for(const button of root.querySelectorAll('[data-key]')){on(button,'pointerdown',e=>{e.preventDefault();if(paused)return;keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])on(button,event,()=>keys.delete(button.dataset.key));}
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();post.resize(w,h);}on(window,'resize',resize);resize();
 camera.rotation.order='YXZ';let previous=performance.now();
 renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.1,(now-previous)/1000);previous=now;if(lobby)return;let focusTarget=null;
  player.speed=0;player.sprint=false;
  if(net){const previousTorch=round.hasTorch,prevX=player.x,prevZ=player.z,typing=!!document.activeElement?.closest('.br-team-chat');
   net.step(dt,{forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),yaw,pitch,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),torch:torchOn,paused:paused||typing||!net.connected});
   Object.assign(round,net.view());Object.assign(player,net.player);time=net.state.elapsed;distance+=Math.hypot(player.x-prevX,player.z-prevZ);
   if(!previousTorch&&round.hasTorch){torchOn=true;el('[data-action="torch"]').setAttribute('aria-pressed','true');}
   team.update(net.state.players,dt);client.voice?.updateSpatial({listener:{...player,height:player.y,yaw,pitch},players:Object.values(net.state.players).map(p=>({...p,height:p.y,status:'alive'}))});
   el('.br-team-roster').replaceChildren(...Object.values(net.state.players).map(p=>{const row=document.createElement('span');row.textContent=p.name+(p.exitReady?' · AT EXIT':'');return row;}));
   if(round.phase==='won'&&!wonShown){wonShown=true;setPause(true);}
   if(round.phase==='dead'&&!captured){caughtBy=net.state.caughtBy==='Bacteria'?'Bacteria':'Signal lost';captured=true;keys.clear();document.exitPointerLock?.();if(paused)setPause(true);}
  }
  if(!paused&&!captured&&round.phase==='playing'){if(!net){time+=dt;let frameMoved=0;const input={forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))},speed=round.climbing?0:backroomsMoveSpeed(round,player,keys.has('ShiftLeft')||keys.has('ShiftRight'));
   for(let remaining=dt;remaining>0;remaining-=.02){const next=moveInWorld(player,input,yaw,Math.min(.02,remaining),(x,z)=>canMoveRound(round,x,z,world.canMove,player),speed);const moved=Math.hypot(next.x-player.x,next.z-player.z);distance+=moved;frameMoved+=moved;Object.assign(player,next);encounter.movement(moved,speed>BACKROOMS_SPEED.walk,player);}
   player.speed=dt?frameMoved/dt:0;player.sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&frameMoved>0;
   advanceRoundPhysics(round,player,dt);}
   const target=net?net.target():roundTarget(round,player,yaw,encounter.simulation.clear);focusTarget=target?.id??null;el('.br-interaction').hidden=!target;el('[data-target]').textContent=target?(target.disabled?target.label:`Hold E · ${target.label}`):'';
   if(!keys.has('KeyE')){hold=0;holdId=null;latched=false;}else if(target&&!target.disabled&&!latched){if(holdId!==target.id){hold=0;holdId=target.id;}hold+=dt/target.duration;if(hold>=1){latched=!(target.id==='ladder'&&!round.repaired&&round.installed<3);if(net?net.interact(target.id):interactRound(round,target.id)){if(target.id==='flashlight'){torchOn=true;el('[data-action="torch"]').setAttribute('aria-pressed','true');el('.br-toast').textContent='Flashlight recovered. F toggles the beam.';}if(!net&&target.id==='ladder'&&round.climbing){player.x=round.ladder.x;player.z=round.ladder.z+.45;}if(round.phase==='won'){keys.clear();setPause(true);}}hold=0;}}else if(!target){hold=0;holdId=null;}el('.br-interaction i').style.width=`${Math.min(1,hold)*100}%`;
  }else{el('.br-interaction').hidden=true;hold=0;holdId=null;latched=false;}
  const bob=reduced.matches?0:Math.sin(distance*7)*.018;camera.position.set(player.x,player.y+1.68+bob,player.z);
  const lean=Number(keys.has('KeyQ'))-Number(keys.has('KeyR'));
  camera.rotation.set(pitch,yaw,reduced.matches?0:lean*.1+Math.sin(distance*3.5)*.0018);
  survivor.update(player,paused?0:dt,{yaw,pitch,thirdPerson});
  if(thirdPerson&&survivor.model){let d=.3;for(let k=.3;k<=3;k+=.1){if(!canMoveRound(round,player.x+Math.sin(yaw)*k,player.z+Math.cos(yaw)*k,world.canMove,player))break;d=k;}camera.position.set(player.x+Math.sin(yaw)*d,player.y+1.95-pitch*.6,player.z+Math.cos(yaw)*d);camera.lookAt(player.x,player.y+1.4,player.z);}
  beam.visible=torchOn&&!captured;beam.position.copy(camera.position);const aim=camera.getWorldDirection(new T.Vector3());beamTarget.position.copy(camera.position).addScaledVector(aim,8);
  if(!captured&&round.phase==='playing'){const result=net&&!net.host?encounter.replicate(net.monsters,time,player,yaw,paused):encounter.update(dt,time,player,yaw,{paused:net?!net.connected:paused,targets:net?Object.values(net.state.players):null});if(result.scare){scareLeft=.65;root.classList.add('br-ambush');}if(result.caught&&(!net||net.host)){if(net)net.finish(result.caughtBy);caughtBy=result.caughtBy;captured=true;round.phase='dead';keys.clear();document.exitPointerLock?.();}}
  if(!paused&&scareLeft>0){scareLeft=Math.max(0,scareLeft-dt);if(!scareLeft)root.classList.remove('br-ambush');}
  if(captured&&!paused){captureElapsed+=dt;root.style.setProperty('--capture',String(Math.min(1,captureElapsed/1.1)));root.classList.add('br-captured');if(captureElapsed>=1.3)setPause(true);}
  if(net)net.publish(encounter);
  interactionAudio?.listener(player,yaw,pitch);
  for(const p of round.parts)if(p.taken&&!heardPickups.has(p.id)){heardPickups.add(p.id);interactionAudio?.play('pickup',{...p,y:.1});}
  if(round.installed>lastInstalled)interactionAudio?.play('build',{...round.ladder,y:round.installed*.64-.3});lastInstalled=round.installed;
  objectives.update(time,dt,{targetId:focusTarget,progress:hold});const [title,hint]=roundObjective(round,player);el('[data-objective]').textContent=title;el('.br-objective small').textContent=net?.player.ropeClimb?'Climbing rescue rope…':net?.player.exitReady?'Waiting for the rest of the team at the exit…':hint;
  world.update(time,player,reduced.matches);post.render(world.scene,camera,time,{vhs,reduced:reduced.matches});const seconds=Math.floor(time);el('[data-clock]').textContent=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 });
 function dispose(){if(disposed)return;disposed=true;lobby?.dispose();net?.dispose();team?.dispose();chat?.dispose();if(net){client.voice?.dispose();void client.close();document.body.classList.remove('br-network','br-coop-game');}renderer.setAnimationLoop(null);for(const remove of listeners)remove();for(const n of audioNodes){n.stop?.();n.disconnect();}encounter.dispose();interactionAudio?.dispose();objectives.dispose();survivor.dispose();beam.removeFromParent();beamTarget.removeFromParent();void context?.close();post.dispose();world.dispose();renderer.dispose();renderer.domElement.remove();root.remove();}
 on(window,'pagehide',dispose,{once:true});el('[data-action="start"]').focus();
 if(net)setPause(false);else if(new URLSearchParams(location.search).has('join'))setTimeout(()=>{if(!disposed)multiplayer();},0);
 return {net,team,get lobby(){return lobby;},world,camera,renderer,player,round,objectives,survivor,encounter,get paused(){return paused;},get vhs(){return vhs;},dispose};
}
