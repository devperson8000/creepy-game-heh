import './launch-briefing.css';
import {gamePreferences,reducedMotion} from './preferences.js';
import {createBriefingTimeline,STATIC_START} from './launch-briefing-timeline.js';
import {createLaunchBriefingAudio,LAUNCH_SCORE,LAUNCH_DIALOGUE} from './launch-briefing-audio.js';
import {createLaunchBriefingScene} from './launch-briefing-scene.js';

export {createLaunchBriefingAudio};
export function createLaunchBriefingPlayer(container,{audio=createLaunchBriefingAudio({volume:()=>gamePreferences().volume}),muted=true,startAt=0,onSkip=()=>{},onProceed=()=>{},onMuteChange=()=>{}}={}){
 const timeline=createBriefingTimeline({accents:LAUNCH_SCORE.accents,musicDuration:LAUNCH_SCORE.duration,dialogue:LAUNCH_DIALOGUE});
 const root=document.createElement('div');root.className='launch-briefing';root.dataset.launchBriefing='';
 root.innerHTML=`<div class="launch-briefing-scene"></div><div class="launch-briefing-fallback" hidden><div class="briefing-corridor-lines"></div><span>MONOCHROME / HALLOWEEN</span></div><canvas class="launch-briefing-static" aria-hidden="true"></canvas><div class="launch-outro-glow" aria-hidden="true"></div>
 <div class="launch-briefing-label"><span>MONOCHROME</span><span>SEASONAL BRIEFING</span></div><p class="launch-briefing-caption" role="status" aria-live="off"></p>
 <div class="launch-briefing-loading" role="status">Preparing the briefing…</div><button type="button" class="launch-enable-voice" data-briefing-unmute>Enable narration</button><button type="button" class="launch-skip" data-briefing-skip>Skip briefing</button>
 <div class="launch-title" aria-label="Halloween has arrived"><strong data-launch-word="0">HALLOWEEN</strong><strong data-launch-word="1">HAS</strong><strong data-launch-word="2">ARRIVED</strong><button type="button" data-briefing-proceed hidden>Enter the Halloween Update <span aria-hidden="true">↗</span></button></div>`;
 container.append(root);
 const sceneHost=root.querySelector('.launch-briefing-scene'),caption=root.querySelector('.launch-briefing-caption'),loading=root.querySelector('.launch-briefing-loading'),staticCanvas=root.querySelector('canvas'),words=[...root.querySelectorAll('[data-launch-word]')],title=root.querySelector('.launch-title'),proceed=root.querySelector('[data-briefing-proceed]'),unmute=root.querySelector('[data-briefing-unmute]');
 let scene=null,disposed=false,started=false,frame=null,fadeStart=null,lastGrain=-1;
 let isMuted=!!muted;const lowMotion=reducedMotion();root.classList.toggle('reduced',lowMotion);
 if(startAt<STATIC_START)try{scene=createLaunchBriefingScene(sceneHost,{reducedMotion:lowMotion});}catch{root.querySelector('.launch-briefing-fallback').hidden=false;}
 const context=staticCanvas.getContext('2d'),grain=context?.createImageData(160,90);staticCanvas.width=160;staticCanvas.height=90;
 function drawStatic(time){
  if(!context||!grain)return;
  const step=lowMotion?0:Math.floor(time*18);if(step===lastGrain)return;lastGrain=step;
  let seed=(step+1)*48271;
  for(let i=0;i<grain.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const level=24+(seed%100);grain.data[i]=level;grain.data[i+1]=level;grain.data[i+2]=level;grain.data[i+3]=255;}
  context.putImageData(grain,0,0);
 }
 function render(time){
  const p=timeline.sample(time);root.dataset.phase=p.phase;root.dataset.wordCount=String(p.wordCount);root.dataset.shot=p.shot;
  sceneHost.hidden=p.phase!=='briefing';root.querySelector('.launch-briefing-fallback').hidden=p.phase!=='briefing'||!!scene;
  if(p.phase==='briefing'){
   try{scene?.sample(time);}catch{scene?.dispose();scene=null;root.querySelector('.launch-briefing-fallback').hidden=false;}
  }else if(scene){scene.dispose();scene=null;}
  staticCanvas.hidden=p.phase!=='static';staticCanvas.style.opacity=String(p.staticOpacity);if(p.phase==='static')drawStatic(time);
  if(caption.textContent!==p.subtitle)caption.textContent=p.subtitle;
  caption.hidden=!p.subtitle;root.querySelector('.launch-briefing-label').hidden=p.phase!=='briefing';
  title.hidden=!['outro','complete'].includes(p.phase);root.querySelector('.launch-outro-glow').hidden=title.hidden;
  root.style.setProperty('--launch-score',String(Math.min(1,p.scoreTime/LAUNCH_SCORE.accents[0])));
  for(let i=0;i<words.length;i++){words[i].classList.toggle('visible',i<p.wordCount);words[i].classList.toggle('landed',!lowMotion&&i===p.wordCount-1&&p.impact>0);}
  proceed.hidden=!p.canProceed;unmute.hidden=!isMuted||p.phase!=='briefing';
  root.querySelector('[data-briefing-skip]').hidden=p.canProceed;
 }
 function tick(now){
  if(disposed)return;
  if(!document.hidden){
   if(started)render(audio.time);else render(startAt);
   if(fadeStart!==null){const t=Math.min(1,(now-fadeStart)/800);root.style.opacity=String(1-t);audio.setVolume(gamePreferences().volume*(1-t));if(t>=1){audio.pause();onProceed();return;}}
   else audio.update();
  }
  frame=requestAnimationFrame(tick);
 }
 function visibility(){if(disposed||!started)return;if(document.hidden)audio.pause();else void audio.resume();}
 document.addEventListener('visibilitychange',visibility);
 function setMuted(value){isMuted=!!value;void audio.setMuted(isMuted);unmute.hidden=!isMuted;}
 unmute.addEventListener('click',()=>{setMuted(false);onMuteChange(false);});
 root.querySelector('[data-briefing-skip]').addEventListener('click',onSkip);
 proceed.addEventListener('click',()=>{if(fadeStart!==null)return;fadeStart=performance.now();proceed.disabled=true;});
 const ready=audio.ready.then(()=>{if(disposed)return;started=true;loading.hidden=true;void audio.start({at:startAt,muted:isMuted});if(document.hidden)audio.pause();});
 render(startAt);frame=requestAnimationFrame(tick);
 return {root,ready,setMuted,get muted(){return isMuted;},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);audio.dispose();scene?.dispose();scene=null;root.remove();}};
}
