import * as T from 'three';
import {createFinaleScene} from './finale-scene.js';
import {createFinaleAudio} from './finale-audio.js';
import {loadPlayerAvatarAsset} from './player-avatar.js';
import {gamePreferences,reducedMotion,createRenderQuality} from './preferences.js';
function node(tag,className,text){const el=document.createElement(tag);el.className=className;if(text)el.textContent=text;return el;}
export function createFinalePlayer({container,renderer:borrowedRenderer,asset,cast,runnerId,buttonId,preview=false,muted=false,audio:initialAudio,onExit=()=>{},onComplete=()=>{},onMuteChange=()=>{}}){
 const renderer=borrowedRenderer??new T.WebGLRenderer({antialias:true}),owned=!borrowedRenderer;
 if(owned){renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.append(renderer.domElement);}
 const quality=owned?createRenderQuality(renderer):null,prefs=gamePreferences();let scene=createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion:reducedMotion(),quality:prefs.quality});
 let audio=initialAudio??createFinaleAudio({volume:prefs.volume,muted});void audio.resume();
 let disposed=false,completed=false,time=0,origin=performance.now(),previous=origin;
 const root=node('section','finale-ui');root.setAttribute('aria-label',preview?'Finale preview':'Team escape finale');
 const fade=node('div','finale-fade'),grain=node('div','finale-grain'),title=node('div','finale-title');title.setAttribute('role','status');title.setAttribute('aria-live','polite');
 const titleMain=node('h1','','YOU ESCAPED.'),titleSub=node('p','','TOGETHER.');title.append(titleMain,titleSub);title.hidden=true;
 const top=node('div','finale-top'),brand=node('span','','MONOCHROME');top.append(brand,node('span','',preview?'FINALE PREVIEW':'THE LAST ASCENT'));
 const controls=node('div','finale-controls'),sound=node('button','finale-button');sound.type='button';
 function soundLabel(){sound.textContent=audio.muted?'Sound off':audio.unlocked?'Sound on':'Enable sound';sound.setAttribute('aria-label',audio.muted?'Unmute finale':audio.unlocked?'Mute finale':'Enable finale sound');sound.setAttribute('aria-pressed',String(audio.muted));}soundLabel();sound.addEventListener('click',()=>{if(audio.unlocked||audio.muted){setMuted(!audio.muted);onMuteChange(audio.muted);}void audio.resume().then(()=>{if(!disposed)soundLabel();});soundLabel();});void audio.resume().then(()=>{if(!disposed)soundLabel();});
 const progress=node('div','finale-progress'),bar=node('i','');progress.append(bar);root.append(grain,fade,title,top,controls,progress);document.body.append(root);document.body.classList.add('finale-active');
 function setMuted(value){if(disposed)return;audio.setMuted(value);soundLabel();}
 function exit(){dispose();onExit();}
 if(preview){
  const label=node('label','finale-cast','Survivors '),select=node('select','');select.setAttribute('aria-label','Preview survivors');for(const count of [2,3,4]){const option=node('option','',String(count));option.value=String(count);select.append(option);}select.value=String(cast.length);label.append(select);
  const replay=node('button','finale-button','Replay'),back=node('button','finale-button','Back to menu');replay.type=back.type='button';replay.addEventListener('click',()=>restart(Number(select.value)));back.addEventListener('click',exit);select.addEventListener('change',()=>restart(Number(select.value)));controls.append(label,replay,sound,back);
 }else controls.append(sound);
 function sample(seconds){
  if(disposed)return;time=Math.max(0,Math.min(52,seconds));const frame=scene.sample(time);audio.setVolume(gamePreferences().volume);audio.sample(time);fade.style.opacity=String(frame.fade);root.dataset.shot=frame.shot;root.dataset.time=time.toFixed(2);bar.style.transform=`scaleX(${time/52})`;
  title.hidden=!frame.title.length;titleSub.hidden=frame.title.length<2;
  if(!document.hidden){renderer.toneMappingExposure=.85*gamePreferences().brightness;renderer.render(scene.scene,scene.camera);}
  if(frame.complete&&!completed){completed=true;onComplete();if(preview)renderer.setAnimationLoop(null);}return frame;
 }
 function resize(){if(disposed)return;renderer.setSize(container.clientWidth||innerWidth,container.clientHeight||innerHeight);scene.resize((container.clientWidth||innerWidth)/(container.clientHeight||innerHeight));sample(time);}
 function frame(){const now=performance.now();quality?.update(Math.min(.2,(now-previous)/1000),gamePreferences().quality);previous=now;sample((now-origin)/1000);}
 function restart(count){
  const wasMuted=audio.muted;audio.dispose();
  if(count!==cast.length){
   scene.dispose();cast=Array.from({length:count},(_,slot)=>({id:`preview-${slot}`,name:`Survivor ${slot+1}`,slot}));runnerId=cast[0].id;buttonId=cast[1].id;
   scene=createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion:reducedMotion(),quality:gamePreferences().quality});
  }
  audio=createFinaleAudio({volume:gamePreferences().volume,muted:wasMuted});void audio.resume().then(()=>{if(!disposed)soundLabel();});completed=false;time=0;resize();origin=previous=performance.now();renderer.setAnimationLoop(frame);
 }

 function key(event){if(preview&&event.code==='Escape'){event.preventDefault();exit();}}
 function dispose(){if(disposed)return;disposed=true;if(owned)renderer.setAnimationLoop(null);audio.dispose();scene.dispose();root.remove();window.removeEventListener('resize',resize);document.removeEventListener('keydown',key);window.removeEventListener('pagehide',dispose);if(owned){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}document.body.classList.remove('finale-active');}
 window.addEventListener('resize',resize);document.addEventListener('keydown',key);window.addEventListener('pagehide',dispose,{once:true});try{resize();if(preview){origin=previous=performance.now();renderer.setAnimationLoop(frame);}}catch(error){dispose();throw error;}
 return {sample,resize,dispose,setMuted,get ready(){return !disposed;},get time(){return time;},get audio(){return audio;},get scene(){return scene;},get castCount(){return cast.length;}};
}
export async function startFinalePreview(container,{onExit=()=>{}}={}){
 const audio=createFinaleAudio({volume:gamePreferences().volume});void audio.resume();
 const panel=node('section','finale-loading');panel.setAttribute('role','status');panel.append(node('small','','MONOCHROME'),node('h1','','Preparing the last ascent…'));
 const back=node('button','finale-button','Back to menu');panel.append(back);document.body.append(panel);let cancelled=false;
 const cancel=()=>{cancelled=true;audio.dispose();panel.remove();document.removeEventListener('keydown',escape);onExit();};const escape=e=>{if(e.code==='Escape')cancel();};back.addEventListener('click',cancel);document.addEventListener('keydown',escape);
 try{
  const asset=await loadPlayerAvatarAsset();if(cancelled)return null;panel.remove();document.removeEventListener('keydown',escape);
  const cast=[0,1].map(slot=>({id:`preview-${slot}`,name:`Survivor ${slot+1}`,slot}));return createFinalePlayer({container,asset,cast,runnerId:cast[0].id,buttonId:cast[1].id,preview:true,audio,onExit});
 }catch{
  audio.dispose();if(cancelled)return null;if(!panel.isConnected)document.body.append(panel);document.addEventListener('keydown',escape);panel.setAttribute('role','alert');panel.querySelector('h1').textContent='The finale could not load.';const retry=node('button','finale-button','Try again');panel.append(retry);retry.addEventListener('click',()=>{cancelled=true;panel.remove();document.removeEventListener('keydown',escape);void startFinalePreview(container,{onExit}).then(value=>{window.monochromeFinale=value;});});return null;
 }
}
