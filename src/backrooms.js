import * as T from 'three';
import {createBackroomsWorld} from './backrooms-world.js';
import {createBackroomsPost} from './backrooms-post.js';
import {moveInWorld} from './level.js';
import './backrooms.css';

export function startBackrooms(container){
 document.title='The Backrooms — Level 0';container.setAttribute('aria-label','Explore Backrooms Level 0');
 const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.tabIndex=0;container.append(renderer.domElement);
 const world=createBackroomsWorld(),camera=new T.PerspectiveCamera(68,1,.06,120),post=createBackroomsPost(renderer),player={...world.map.spawn};
 let yaw=player.yaw,pitch=0,paused=true,started=false,vhs=true,muted=false,disposed=false,drag=null,time=0,distance=0,context=null,master=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),keys=new Set(),listeners=[],audioNodes=[];
 const root=document.createElement('div');root.className='br-ui';root.innerHTML=`<div class="br-top"><div><div class="br-rec"><i class="br-dot"></i>REC <span>●</span> TAPE 001</div><small>UNIDENTIFIED LOCATION / LEVEL 0</small></div><div class="br-tools"><button data-action="vhs" aria-pressed="true">VHS on</button><button data-action="sound" aria-pressed="true">Sound on</button><button data-action="pause">Pause</button></div></div><div class="br-aim"></div><div class="br-bottom"><div class="br-timestamp">JUL. 04 1991<br><span data-clock>00:00:00</span> <span style="opacity:.5">SP</span></div><div class="br-help">WASD MOVE · SHIFT RUN · M SOUND<br>ESC PAUSE · DRAG TO LOOK</div></div><div class="br-center"><section class="br-panel" role="dialog" aria-modal="false" aria-labelledby="br-title"><div class="br-eyebrow">FOUND FOOTAGE / 001</div><h1 id="br-title">The Backrooms<span>LEVEL 0 — THE LOBBY</span></h1><p>The lights are still on.<br>There doesn't seem to be anyone here.</p><button class="br-start" data-action="start">Enter the Backrooms <span>↗</span></button><footer><span>HEADPHONES RECOMMENDED</span><a href="/">Original game</a></footer></section></div><div class="br-touch" aria-label="Movement"><button data-key="KeyW" aria-label="Forward">↑</button><button data-key="KeyA" aria-label="Left">←</button><button data-key="KeyS" aria-label="Backward">↓</button><button data-key="KeyD" aria-label="Right">→</button><button data-key="ShiftLeft">Hold to run</button></div><div class="br-toast" role="status"></div>`;document.body.append(root);
 const el=s=>root.querySelector(s),on=(target,event,fn,options)=>{target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));};
 function initAudio(){
  if(!context){try{context=new AudioContext();master=context.createGain();master.gain.value=muted?0:.23;master.connect(context.destination);
   for(const [frequency,gain]of [[60,.11],[120,.045],[180,.016]]){const osc=context.createOscillator(),volume=context.createGain();osc.type='sine';osc.frequency.value=frequency;volume.gain.value=gain;osc.connect(volume);volume.connect(master);osc.start();audioNodes.push(osc,volume);}
   const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.035)/1.035;data[i]=previous;}
   const noise=context.createBufferSource(),filter=context.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=650;noise.connect(filter);filter.connect(master);noise.start();audioNodes.push(noise,filter);
  }catch{el('.br-toast').textContent='Audio unavailable. You can still explore.';return;}}
  if(!paused)void context?.resume().catch(()=>{});
 }
 function setPause(value){paused=value;keys.clear();drag=null;el('.br-center').hidden=!value;el('[data-action="pause"]').textContent=value?'Resume':'Pause';if(value){document.exitPointerLock?.();void context?.suspend();if(started){el('#br-title').innerHTML='Still here.<span>LEVEL 0 — PAUSED</span>';el('.br-panel p').textContent='Take a moment. The rooms can wait.';el('[data-action="start"]').innerHTML='Continue exploring <span>↗</span>';el('[data-action="start"]').focus();}}else{started=true;renderer.domElement.focus();initAudio();}}
 function capture(){if(matchMedia('(pointer:fine)').matches){try{renderer.domElement.requestPointerLock?.()?.catch?.(()=>{});}catch{}}}
 on(el('[data-action="start"]'),'click',()=>{setPause(false);capture();});
 on(el('[data-action="pause"]'),'click',()=>setPause(!paused));
 on(el('[data-action="vhs"]'),'click',()=>{vhs=!vhs;el('[data-action="vhs"]').textContent=vhs?'VHS on':'VHS off';el('[data-action="vhs"]').setAttribute('aria-pressed',String(vhs));});
 function toggleSound(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.23,context.currentTime,.08);el('[data-action="sound"]').textContent=muted?'Sound off':'Sound on';el('[data-action="sound"]').setAttribute('aria-pressed',String(!muted));if(!muted)initAudio();}
 on(el('[data-action="sound"]'),'click',toggleSound);
 on(document,'keydown',e=>{if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(started)setPause(!paused);return;}if(e.code==='KeyM'&&!e.repeat){toggleSound();return;}if(e.target.closest?.('button,a,input'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();if(!paused)keys.add(e.code);}});
 on(document,'keyup',e=>keys.delete(e.code));on(window,'blur',()=>{if(started&&!paused)setPause(true);});on(document,'visibilitychange',()=>{if(document.hidden&&started)setPause(true);});
 const look=(dx,dy)=>{if(paused)return;yaw-=dx*.0021;pitch=T.MathUtils.clamp(pitch-dy*.0021,-1.25,1.25);};
 let hadPointerLock=false;on(document,'pointerlockchange',()=>{const locked=document.pointerLockElement===renderer.domElement;if(hadPointerLock&&!locked&&!paused)setPause(true);hadPointerLock=locked;});
 on(document,'mousemove',e=>{if(document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
 on(renderer.domElement,'pointerdown',e=>{if(paused)return;if(e.pointerType==='mouse')capture();drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
 on(renderer.domElement,'pointermove',e=>{if(drag?.id===e.pointerId&&document.pointerLockElement!==renderer.domElement){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])on(renderer.domElement,event,()=>drag=null);
 for(const button of root.querySelectorAll('[data-key]')){on(button,'pointerdown',e=>{e.preventDefault();if(paused)return;keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])on(button,event,()=>keys.delete(button.dataset.key));}
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();post.resize(w,h);}on(window,'resize',resize);resize();
 camera.rotation.order='YXZ';let previous=performance.now();
 renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(!paused){time+=dt;const input={forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))},speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?4.3:2.55;
   for(let remaining=dt;remaining>0;remaining-=.02){const next=moveInWorld(player,input,yaw,Math.min(.02,remaining),world.canMove,speed);distance+=Math.hypot(next.x-player.x,next.z-player.z);Object.assign(player,next);}}
  const bob=reduced.matches?0:Math.sin(distance*7)*.018;camera.position.set(player.x,1.68+bob,player.z);camera.rotation.set(pitch,yaw,reduced.matches?0:Math.sin(distance*3.5)*.0018);
  world.update(time,player,reduced.matches);post.render(world.scene,camera,time,{vhs,reduced:reduced.matches});const seconds=Math.floor(time);el('[data-clock]').textContent=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 });
 function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);for(const remove of listeners)remove();for(const n of audioNodes){n.stop?.();n.disconnect();}void context?.close();post.dispose();world.dispose();renderer.dispose();renderer.domElement.remove();root.remove();}
 on(window,'pagehide',dispose,{once:true});el('[data-action="start"]').focus();
 return {world,camera,renderer,player,get paused(){return paused;},get vhs(){return vhs;},dispose};
}
