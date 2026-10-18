import * as THREE from 'three';
import {loadPlayerAvatarAsset} from './player-avatar.js';
import {gamePreferences,reducedMotion} from './preferences.js';
import {FINALE_DURATION} from './finale-state.js';
import {createFinaleScene} from './finale-scene.js';
import {createFinaleAudio} from './finale-audio.js';

function element(tag,className,text){
 const node=document.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=text;return node;
}
const demos=count=>Array.from({length:count},(_,slot)=>({id:`preview-${slot}`,slot,name:`Survivor ${slot+1}`}));
/** Shared cinematic presenter. A borrowed renderer is never disposed by this controller. */
export function createFinalePlayer({container,renderer,asset,cast,runnerId,buttonId,preview=false,onExit=()=>{},onComplete=()=>{},audio:providedAudio}={}){
 if(!container)throw new Error('A finale container is required.');
 const ownsRenderer=!renderer;
 const display=renderer??new THREE.WebGLRenderer({antialias:true,alpha:false});
 if(ownsRenderer){display.setPixelRatio(Math.min(devicePixelRatio||1,1.5));display.toneMapping=THREE.ACESFilmicToneMapping;container.append(display.domElement);}
 const prefs=gamePreferences(),audio=providedAudio??createFinaleAudio({volume:prefs.volume});
 let stage;
 try{stage=createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion:reducedMotion(),quality:prefs.quality});}
 catch(error){if(ownsRenderer){display.domElement.remove();display.dispose();}if(!providedAudio)audio.dispose();throw error;}
 const overlay=element('section','finale-overlay');overlay.setAttribute('aria-label','Co-op escape cinematic');
 const fade=element('div','finale-fade'),title=element('h1','finale-title'),hud=element('div','finale-hud');
 const heading=element('span','','MONOCHROME / FINAL EXIT'),timeLabel=element('span','finale-time','00 / 52');
 hud.append(heading,timeLabel);overlay.append(fade,title,hud);
 let seconds=0,playing=true,disposed=false,completed=false,frame=null,raf=0,started=0,previewCount=cast.length;
 function resize(){
  if(disposed)return;
  const w=Math.max(1,container.clientWidth||window.innerWidth),h=Math.max(1,container.clientHeight||window.innerHeight);
  if(ownsRenderer)display.setSize(w,h);stage.resize(w/h);
 }
 const cleanupListeners=[];
 function on(node,type,handler){node.addEventListener(type,handler);cleanupListeners.push(()=>node.removeEventListener(type,handler));}
 function present(t){
  if(disposed)return frame;
  seconds=Math.min(FINALE_DURATION,Math.max(0,Number.isFinite(t)?t:0));
  frame=stage.sample(seconds);
  const prefs=gamePreferences();audio.setVolume(prefs.volume);audio.sample(seconds);
  display.render(stage.scene,stage.camera);
  fade.style.opacity=String(frame.fade);title.textContent=frame.title||'';
  title.hidden=!frame.title;timeLabel.textContent=`${String(Math.floor(seconds)).padStart(2,'0')} / 52`;
  if(frame.complete&&!completed){completed=true;onComplete();}
  return frame;
 }
 function loop(stamp){
  if(disposed||!preview||!playing)return;
  if(!started)started=stamp-seconds*1000;
  present((stamp-started)/1000);
  if(seconds<FINALE_DURATION)raf=requestAnimationFrame(loop);
 }
 function replay(){
  if(disposed)return;completed=false;seconds=0;audio.reset();started=0;playing=true;present(0);
  if(preview){cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
 }
 function leave(){if(disposed)return;dispose();onExit();}
 function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);for(const stop of cleanupListeners)stop();
  overlay.remove();stage.dispose();audio.dispose();
  if(ownsRenderer){display.domElement.remove();display.dispose();}
 }
 if(preview){
  overlay.classList.add('finale-preview');
  const tools=element('div','finale-tools');
  const replayButton=element('button','','Replay'),backButton=element('button','','Back to menu');
  const castLabel=element('label','', 'Survivors '),picker=element('select');
  picker.setAttribute('aria-label','Preview cast size');
  for(const n of [2,3,4]){const option=element('option','',`${n} survivors`);option.value=String(n);option.selected=n===cast.length;picker.append(option);}
  castLabel.append(picker);tools.append(replayButton,castLabel,backButton);overlay.append(tools);
  on(replayButton,'click',()=>{void audio.resume();replay();});
  on(backButton,'click',leave);
  on(picker,'change',()=>{onExit({castSize:Number(picker.value)});dispose();});
  on(document,'keydown',event=>{if(event.code==='Escape'){event.preventDefault();leave();}});
  on(window,'resize',resize);
 }
 container.parentElement?.append(overlay);if(!overlay.isConnected)document.body.append(overlay);
 resize();present(0);
 if(preview){void audio.resume();raf=requestAnimationFrame(loop);}
 return {sample:present,replay,resize,dispose,leave,get frame(){return frame;},get elapsed(){return seconds;},get scene(){return stage;},get audio(){return audio;}};
}

/** Click-from-menu entry path unlocks audio before asynchronous model loading. */
export function startFinalePreview(container,{onExit=()=>{},castSize=2}={}){
 const shell=element('div','finale-preview-shell'),loading=element('div','finale-loading','LOADING FINALE...');shell.append(loading);document.body.append(shell);
 const audio=createFinaleAudio({volume:gamePreferences().volume});void audio.resume();
 let disposed=false,active=null;
 const exit=options=>{if(disposed)return;disposed=true;active?.dispose();audio.dispose();shell.remove();onExit(options);};
 function load(){return loadPlayerAvatarAsset().then(asset=>{
  if(disposed)return null;
  const cast=demos([2,3,4].includes(castSize)?castSize:2);
  try{active=createFinalePlayer({container:shell,asset,cast,runnerId:cast[0].id,buttonId:cast[1].id,preview:true,audio,onExit:exit});loading.remove();return active;}
  catch(error){showError(error);return null;}
 }).catch(showError);}
 const ready=load();
 function showError(error){
  if(disposed)return;
  loading.textContent='Could not load the cinematic. Check the model connection and retry.';
  const retry=element('button','','Retry'),back=element('button','','Back to menu');loading.append(retry,back);
  retry.addEventListener('click',()=>{loading.textContent='LOADING FINALE...';if(!loading.isConnected)shell.append(loading);void audio.resume();void load();});
  back.addEventListener('click',()=>exit());
  console.warn('Finale preview unavailable',error);
 }
 return {ready,dispose:()=>exit(),get active(){return active;}};
}
