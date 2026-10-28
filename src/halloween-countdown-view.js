import {gamePreferences} from './preferences.js';
import {HALLOWEEN_VERSION} from './halloween-release-time.js';
import {halloweenRelease} from './halloween-release.js';
import {sampleCountdownPresentation,countdownReadout,createCountdownFocus} from './halloween-countdown-state.js';
import {createCountdownAudio} from './halloween-countdown-audio.js';

export function createCountdownView(card){
 const key=`monochrome.countdown-view.${HALLOWEEN_VERSION}`;
 let seen=false;try{seen=sessionStorage.getItem(key)==='seen';}catch{}
 const gate=createCountdownFocus({seen,onSeen(){try{sessionStorage.setItem(key,'seen');}catch{}}}),audio=createCountdownAudio();
 const view=document.createElement('section');view.id='halloween-timer-view';view.hidden=true;view.className='halloween-timer-view';view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-labelledby','halloween-timer-title');
 view.innerHTML=`<div class="halloween-timer-haze" aria-hidden="true"></div><div class="halloween-timer-embers" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
 <header class="halloween-timer-header"><span>MONOCHROME / HALLOWEEN</span><button type="button" data-countdown-close aria-label="Close fullscreen timer">Close <span aria-hidden="true">×</span></button></header>
 <div class="halloween-timer-content"><div class="halloween-timer-icon" aria-hidden="true"></div><p class="halloween-timer-kicker">31 OCTOBER · 4:00 PM SYDNEY</p><h2 id="halloween-timer-title">Halloween is approaching.</h2><div class="halloween-timer-readout" role="timer" aria-live="off">Syncing…</div><p class="halloween-timer-message" role="status" aria-live="polite">Keep your light close.</p><button type="button" class="halloween-refresh" data-countdown-refresh hidden>Refresh for update</button></div>
 <footer class="halloween-timer-footer"><button type="button" data-countdown-sound aria-pressed="false">Sound off</button><button type="button" data-countdown-fullscreen aria-pressed="false">Enter fullscreen</button><span>ESC TO RETURN</span></footer>`;
 const pumpkin=card.querySelector('.halloween-pumpkin');if(pumpkin)view.querySelector('.halloween-timer-icon').append(pumpkin.cloneNode(true));
 document.body.append(view);
 let disposed=false,open=false,previousFocus=null,menu=null,previousInert=false;
 const readout=view.querySelector('.halloween-timer-readout'),heading=view.querySelector('h2'),message=view.querySelector('.halloween-timer-message'),refresh=view.querySelector('[data-countdown-refresh]');
 const soundButtons=[...card.querySelectorAll('[data-countdown-sound]'),view.querySelector('[data-countdown-sound]')],expand=view.querySelector('[data-countdown-fullscreen]');
 function syncSound(){for(const button of soundButtons){button.textContent=audio.available?(audio.enabled?'Sound on':'Sound off'):'Sound unavailable';button.setAttribute('aria-pressed',String(audio.enabled));button.disabled=!audio.available;}}
 async function toggleSound(){await audio.setEnabled(!audio.enabled);if(disposed)return;syncSound();update();}
 for(const button of soundButtons)button.addEventListener('click',toggleSound);
 function syncFullscreen(){const active=document.fullscreenElement===view;expand.textContent=active?'Exit fullscreen':'Enter fullscreen';expand.setAttribute('aria-pressed',String(active));}
 async function toggleFullscreen(){
  try{if(document.fullscreenElement===view)await document.exitFullscreen();else await view.requestFullscreen?.();}catch{/* The immersive timer remains usable without native fullscreen. */}
  if(disposed){if(document.fullscreenElement===view)void document.exitFullscreen().catch(()=>{});return;}syncFullscreen();
 }
 function setOpen(value){
  if(open===value)return;open=value;view.hidden=!value;
  document.body.classList.toggle('halloween-timer-open',value);
  if(value){previousFocus=document.activeElement;menu=card.closest('.lobby-menu');previousInert=!!menu?.inert;if(menu)menu.inert=true;view.querySelector('[data-countdown-close]').focus({preventScroll:true});}
  else{
   if(menu)menu.inert=previousInert;
   const restore=()=>{if(!open&&previousFocus?.isConnected&&!disposed)previousFocus.focus?.({preventScroll:true});};
   // Leaving native fullscreen may itself move focus to the body. Restore the
   // opener after that transition rather than racing the browser's cleanup.
   if(document.fullscreenElement===view)void document.exitFullscreen().catch(()=>{}).then(restore);else restore();
  }
 }
 function close(){gate.close();setOpen(false);}
 function openFullscreen(){gate.open();update();void toggleFullscreen();}
 const opener=card.querySelector('[data-countdown-open]');opener.addEventListener('click',openFullscreen);
 view.querySelector('[data-countdown-close]').addEventListener('click',close);expand.addEventListener('click',toggleFullscreen);
 refresh.addEventListener('click',()=>location.reload());
 function keys(event){
  if(!open)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const buttons=[...view.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled),first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!view.contains(document.activeElement))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!view.contains(document.activeElement))){event.preventDefault();first?.focus();}
 }
 document.addEventListener('keydown',keys);document.addEventListener('fullscreenchange',syncFullscreen);
 function update(){
  if(disposed||!card.isConnected)return;
  const p=sampleCountdownPresentation(halloweenRelease.sample());
  if(card.dataset.countdownPhase!==p.phase)card.dataset.countdownPhase=p.phase;
  const owner=card.closest('.lobby-menu');if(owner)owner.dataset.halloweenCountdown=p.phase;
  card.style.setProperty('--halloween-intensity',String(p.intensity));
  // Hidden tabs may update the clock, but must not open a dialog or move focus.
  const focus=document.hidden?{open}:gate.update(p);setOpen(focus.open);
  if(open){
   const text=countdownReadout(p.remaining);if(readout.textContent!==text)readout.textContent=text;
   view.dataset.phase=p.phase;view.dataset.long=String(text.length>8);
   view.style.setProperty('--halloween-intensity',String(p.intensity));
   const title=p.phase==='complete'?'Halloween is here.':p.phase==='final'?'Stay close to the light.':'Halloween is approaching.';
   if(heading.textContent!==title)heading.textContent=title;
   const copy=!p.confirmed?'Synchronizing the release clock…':p.phase==='complete'?'The countdown has finished. Refresh to load the update.':p.phase==='final'?'The wait is almost over.':'Keep your light close.';
   if(message.textContent!==copy)message.textContent=copy;
   refresh.hidden=p.phase!=='complete';
  }
  audio.update(p,{volume:gamePreferences().volume,visible:!document.hidden});
 }
 function visibility(){if(!document.hidden&&audio.enabled)void audio.setEnabled(true).then(()=>{if(!disposed)syncSound();update();});update();}
 const timer=setInterval(update,250);document.addEventListener('visibilitychange',visibility);queueMicrotask(update);
 return {dispose(){
  if(disposed)return;disposed=true;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);document.removeEventListener('fullscreenchange',syncFullscreen);
  opener.removeEventListener('click',openFullscreen);for(const button of soundButtons)button.removeEventListener('click',toggleSound);
  setOpen(false);audio.dispose();const owner=card.closest('.lobby-menu');if(owner)delete owner.dataset.halloweenCountdown;view.remove();
 }};
}
