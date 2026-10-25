import {createTeaserAudio} from './teaser-audio.js';
import {createArrivalAudio} from './arrival-audio.js';
import {gamePreferences} from './preferences.js';
import {reducedMotion} from './preferences.js';
export const ARRIVAL_DURATION=10.8;
export const ARRIVAL_TITLE_AT=4.05;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export function arrivalFrame(time,{halloween=false}={}){
 const t=Math.max(0,Number.isFinite(time)?time:0),wake=ease(9.1,10.7,t);
 let openness=ease(6.75,7.35,t)*.66;
 for(const [a,b,c] of [[7.4,7.58,7.84],[8,8.18,8.48]]){
  if(t>=a&&t<c)openness*=t<b?1-ease(a,b,t):ease(b,c,t);
 }
 openness+=(1-openness)*ease(8.48,9.1,t);
 const glitch=(t>4.65&&t<4.79)||(t>5.3&&t<5.43)||(t>5.86&&t<5.94);
 return {dialogue:halloween&&t>=8.85&&t<ARRIVAL_DURATION?"I wasn’t wearing this suit.":'',done:t>=ARRIVAL_DURATION,black:1-ease(6.55,6.95,t),eyes:t>=3&&t<6.5?1-ease(5.8,6.5,t):0,title:(t>=ARRIVAL_TITLE_AT?1:0)*(1-ease(5.95,6.5,t)),openness:clamp(openness),eyeHeight:.22+1.43*wake,roll:wake===1?0:-.75*(1-wake),pitch:.48*(1-wake)+Math.sin(t*2)*.015*(1-wake),sway:(1-wake)*Math.sin(t*1.7)*.025,glitch};
}
export function createArrival({halloween=false,isMuted=()=>false,createAudio=createArrivalAudio}={}){
 const root=document.createElement('div');root.id='arrival';root.setAttribute('aria-label','Descending into Monochrome');root.innerHTML='<div class="arrival-void"><div class="arrival-eyes"><i></i><i></i></div><div class="arrival-title" data-text="MONOCHROME">MONOCHROME</div></div><div class="arrival-lid arrival-upper"></div><div class="arrival-lid arrival-lower"></div><div class="arrival-haze"></div><p class="arrival-discovery" role="status"></p><button class="arrival-skip" type="button">Skip descent <kbd>Space</kbd></button>';
 document.body.append(root);document.body.classList.add('arrival-active');
 let elapsed=0,active=true,voiceAt=null;const reduced=reducedMotion(),audio=createAudio({volume:()=>gamePreferences().volume,isMuted});
 const caption=root.querySelector('.arrival-discovery'),voice=halloween?createTeaserAudio({voices:[{at:0,end:2,file:'arrival-suit-v1'}],soundCues:[],monsterCue:null,footsteps:false}):null;voice?.resume();
 root.addEventListener('pointerdown',audio.resume);document.addEventListener('keydown',audio.resume);
 const visibility=()=>{if(document.hidden)audio.stop();};document.addEventListener('visibilitychange',visibility);
 const skip=()=>{elapsed=ARRIVAL_DURATION;audio.dispose();};
 const onKey=event=>{if(event.code==='Space'&&!event.repeat){event.preventDefault();skip();}};
 root.querySelector('.arrival-skip').addEventListener('click',skip);document.addEventListener('keydown',onKey);
 if(reduced)elapsed=9.1;
 function update(delta,camera,player,{muted=false,volume=.8}={}){
  if(!active)return false;const before=elapsed;elapsed+=Math.max(0,Math.min(1,delta));
  // A slow fetch may hold the black beat briefly; it must never play the hit late over the title.
  if(!reduced&&before<ARRIVAL_TITLE_AT&&elapsed>=ARRIVAL_TITLE_AT&&!audio.settled&&!audio.muted)elapsed=ARRIVAL_TITLE_AT-.000001;
  const p=arrivalFrame(elapsed,{halloween});if(caption.textContent!==p.dialogue)caption.textContent=p.dialogue;if(p.dialogue){voiceAt??=elapsed;voice?.update(elapsed-voiceAt,{muted,volume});}else voice?.pause();
  if(!reduced&&before<ARRIVAL_TITLE_AT&&elapsed>=ARRIVAL_TITLE_AT&&elapsed<6.5)audio.trigger();audio.update();
  root.style.setProperty('--arrival-black',p.black);root.style.setProperty('--arrival-eyes',p.eyes);root.style.setProperty('--arrival-title',p.title);root.style.setProperty('--arrival-opening',p.openness);root.style.setProperty('--arrival-haze',String((1-p.openness)*.22));root.classList.toggle('is-glitching',p.glitch&&!reduced);
  camera.position.set(player.x+p.sway*(reduced?0:1),player.height+p.eyeHeight,player.z);camera.rotation.set(reduced?0:p.pitch,player.yaw??Math.PI,reduced?0:p.roll,'YXZ');camera.fov=66+(1-p.openness)*4;camera.updateProjectionMatrix();
  if(p.done){dispose();return true;}return false;
 }
 function dispose(){if(!active)return;active=false;voice?.dispose();audio.dispose();document.removeEventListener('keydown',audio.resume);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',onKey);root.remove();document.body.classList.remove('arrival-active');}
 return {update,dispose,pause:()=>{voice?.pause();audio.stop();},get active(){return active;},get elapsed(){return elapsed;}};
}
