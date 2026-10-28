// This adapter is imported only after the private test-frame password check.
// It uses the real countdown and film, with an isolated clock and session store.
import {createHalloweenCountdown} from './halloween-countdown.js';
import {HALLOWEEN_DEADLINE} from './halloween-release-time.js';
import {createLaunchBriefingPlayer} from './launch-briefing-player.js';
export function startLaunchBriefingPreview(container,{scenario='launch-briefing',onComplete=()=>{}}={}){
 const root=document.createElement('div');root.className='launch-private-preview';Object.assign(root.style,{position:'fixed',inset:'0',background:'#080706',overflow:'auto',zIndex:'200'});container.append(root);
 let current=null,disposed=false,finished=false;
 function clear(){current?.dispose();current=null;root.replaceChildren();}
 function finish(){if(disposed||finished)return;finished=true;clear();onComplete();}
 function countdown(seconds){
  if(disposed)return;finished=false;clear();const anchor=performance.now(),store=new Map();
  const releaseClock={sample(){const serverNow=HALLOWEEN_DEADLINE-seconds*1000+performance.now()-anchor;return {confirmed:true,serverNow,released:serverNow>=HALLOWEEN_DEADLINE};}};
  const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  const menu=document.createElement('div');menu.className='lobby-menu';Object.assign(menu.style,{position:'relative',minHeight:'100%',padding:'24px',boxSizing:'border-box',display:'grid',placeItems:'center'});root.append(menu);
  current=createHalloweenCountdown({releaseClock,storage,onEnter:finish});menu.append(current.root);current.open();
 }
 function briefing(startAt=0){
  if(disposed)return;finished=false;clear();const view=document.createElement('section');view.className='halloween-timer-view';
  view.innerHTML='<header class="halloween-timer-header"><span>MONOCHROME / LAUNCH BRIEFING</span><button type="button" data-preview-close>Close</button></header><div class="halloween-timer-footer"><button type="button" data-preview-sound>Sound off</button><span>USE THE TEST BUTTONS TO INSPECT THE SEQUENCE</span></div>';root.append(view);
  const sound=view.querySelector('[data-preview-sound]');let player;
  const sync=()=>{sound.textContent=player.muted?'Sound off':'Sound on';sound.setAttribute('aria-pressed',String(!player.muted));};
  player=createLaunchBriefingPlayer(view,{startAt,muted:true,onSkip:finish,onProceed:finish,onMuteChange:sync});
  sound.onclick=()=>{player.setMuted(!player.muted);sync();};view.querySelector('[data-preview-close]').onclick=finish;
  current={dispose(){player.dispose();view.remove();}};
 }
 if(scenario==='launch-countdown')countdown(30);else briefing();
 return {command(value){
  if(disposed||typeof value!=='string')return false;
  const match=/^launch:timer:(300|60|30|10)$/.exec(value);if(match){countdown(Number(match[1]));return true;}
  if(value==='launch:briefing'){briefing();return true;}if(value==='launch:ending'){briefing(92);return true;}if(value==='launch:titles'){briefing(96.25);return true;}return false;
 },dispose(){if(disposed)return;disposed=true;clear();root.remove();}};
}
