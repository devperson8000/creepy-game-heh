import * as THREE from 'three';
import {createHalloweenEndingScene} from './halloween-ending-scene.js';
import {createHalloweenEndingAudio} from './halloween-ending-audio.js';
import {HALLOWEEN_ENDING_DURATION} from './halloween-ending-timeline.js';
import {loadPlayerAvatarAsset} from './player-avatar.js';
import {gamePreferences,reducedMotion} from './preferences.js';
export function createHalloweenEndingPlayer({container,renderer:borrowed,asset,cast,runnerId,muted=false,preview=false,onComplete=()=>{},onMuteChange=()=>{}}){
 const owned=!borrowed,renderer=borrowed??new THREE.WebGLRenderer({antialias:true});if(owned){renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.toneMapping=THREE.ACESFilmicToneMapping;container.append(renderer.domElement);}
 const makeScene=()=>createHalloweenEndingScene({asset,cast,runnerId,reducedMotion:reducedMotion(),quality:gamePreferences().quality});let scene=makeScene(),audio=createHalloweenEndingAudio({muted,volume:gamePreferences().volume});void audio.resume();
 const root=document.createElement('section');root.className='finale-ui halloween-ending-ui';root.setAttribute('aria-label',preview?'Halloween house ending preview':'Halloween house escape');
 root.innerHTML='<div class="finale-grain"></div><div class="finale-fade"></div><div class="finale-title" role="status" hidden><h1>YOU ESCAPED THE HOUSE.</h1><p>KEEP WALKING.</p></div><div class="finale-top"><span>MONOCHROME</span><span>THE HOUSE REMEMBERS</span></div><p class="ending-caption" role="status"></p><div class="finale-controls"><button class="finale-button ending-sound" type="button">Enable sound</button></div>';
 document.body.append(root);document.body.classList.add('finale-active');const fade=root.querySelector('.finale-fade'),title=root.querySelector('.finale-title'),caption=root.querySelector('.ending-caption'),sound=root.querySelector('.ending-sound');
 let disposed=false,complete=false,time=0,origin=performance.now(),warmed=false,failure=null;
 function startClock(){if(disposed)return;origin=performance.now()-time*1000;sample(time);if(owned)renderer.setAnimationLoop(()=>sample((performance.now()-origin)/1000));}
 const ready=Promise.resolve().then(()=>renderer.compileAsync(scene.scene,scene.camera)).then(()=>{if(disposed)return;warmed=true;startClock();}).catch(error=>{failure=error;if(disposed)return;warmed=false;root.style.backgroundColor='#030606';if(preview){const notice=document.createElement('p');notice.className='ending-preview-error';notice.setAttribute('role','alert');notice.textContent='Animation preview could not render. Try replaying with lower graphics.';root.append(notice);}startClock();});
 function label(){sound.textContent=audio.muted?'Sound off':audio.unlocked?'Sound on':'Enable sound';sound.setAttribute('aria-pressed',String(audio.unlocked&&!audio.muted));sound.setAttribute('aria-label',audio.muted?'Unmute ending':audio.unlocked?'Mute ending':'Enable ending sound');}
 function setMuted(value){audio.setMuted(value);label();}sound.onclick=()=>{setMuted(sound.getAttribute('aria-pressed')==='true');onMuteChange(audio.muted);void audio.resume().then(label);};
 const unlock=event=>{if(event?.target===sound)return;void audio.resume().then(()=>{if(!disposed)label();});};document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
 function sample(seconds){if(disposed)return;time=Math.max(0,Math.min(HALLOWEEN_ENDING_DURATION,seconds));const f=scene.sample(time);fade.style.opacity=String(f.fade);title.hidden=!f.title;caption.textContent=f.subtitle;root.dataset.shot=f.shot;root.dataset.time=time.toFixed(2);audio.setVolume(gamePreferences().volume);audio.sample(time);
  if(warmed&&!document.hidden){renderer.toneMappingExposure=(f.time<18?.9:1)*gamePreferences().brightness;renderer.render(scene.scene,scene.camera);}if(f.complete&&!complete){complete=true;onComplete();}return f;
 }
 function resize(){if(disposed)return;const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight;renderer.setSize(w,h);scene.resize(w/h);sample(time);}
 function command(value){if(!preview)return false;if(value.startsWith('ending:cast:')){const count=Number(value.split(':').at(-1));if(![1,2,3,4].includes(count))return false;scene.dispose();cast=Array.from({length:count},(_,slot)=>({id:`ending-${slot}`,name:slot?'Survivor':'You',slot}));runnerId=cast[0].id;scene=makeScene();resize();return true;}
  if(!value.startsWith('ending:'))return false;const t=Number(value.slice(7));if(!Number.isFinite(t))return false;audio.dispose();audio=createHalloweenEndingAudio({muted:audio.muted,volume:gamePreferences().volume});void audio.resume();complete=false;origin=performance.now()-t*1000;sample(t);return true;
 }
 function dispose(){if(disposed)return;disposed=true;if(owned)renderer.setAnimationLoop(null);audio.dispose();scene.dispose();root.remove();window.removeEventListener('resize',resize);document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.body.classList.remove('finale-active');if(owned){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}}
 window.addEventListener('resize',resize);resize();label();
 return {sample,resize,dispose,setMuted,command,ready,renderer,get error(){return failure;},get scene(){return scene;},get time(){return time;},get castCount(){return cast.length;}};
}
export async function startHalloweenEndingPreview(container,{onComplete=()=>{}}={}){
 const loading=document.createElement('p');loading.className='round-loading';loading.textContent='Preparing the way back…';document.body.append(loading);try{const asset=await loadPlayerAvatarAsset(),cast=[0,1].map(slot=>({id:`ending-${slot}`,name:slot?'Survivor':'You',slot}));const player=createHalloweenEndingPlayer({container,asset,cast,runnerId:cast[0].id,preview:true,onComplete});await player.ready;return player;}finally{loading.remove();}
}
