// Sydney observes AEDT (UTC+11) on this date. Keep one fixed launch instant
// regardless of the visitor's timezone, and never roll it into another year.
import {HALLOWEEN_DEADLINE} from './halloween-release-time.js';
import {halloweenRelease} from './halloween-release.js';
import {createCountdownView} from './halloween-countdown-view.js';
export {HALLOWEEN_DEADLINE};
export function countdownParts(now=Date.now()){
 const total=Math.max(0,Math.ceil((HALLOWEEN_DEADLINE-now)/1000));
 return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60,complete:now>=HALLOWEEN_DEADLINE};
}

export function createHalloweenCountdown({releaseClock=halloweenRelease,onEnter,storage}={}){
 const root=document.createElement('section');root.className='halloween-countdown';root.setAttribute('aria-label','Halloween update countdown');
 root.innerHTML=`
  <div class="halloween-effects" aria-hidden="true">
   <svg class="halloween-pumpkin" viewBox="0 0 100 100"><path class="pumpkin-stem" d="M49 25q-5-17 10-20l3 8q-12 1-8 13"/><path class="pumpkin-shell" d="M50 26C13 7-6 69 23 85q27 15 54 0C106 69 87 7 50 26Z"/><path class="pumpkin-rib" d="M42 27q-18 27-7 58m23-58q18 27 7 58"/><path class="pumpkin-face" d="m22 49 17-10-2 17Zm56 0L61 39l2 17ZM24 64l15 5 4-6 8 10 8-10 4 6 13-5q-18 33-52 0"/></svg>
   <i class="halloween-bat bat-one"></i><i class="halloween-bat bat-two"></i>
   ${Array.from({length:7},(_,i)=>`<i class="halloween-ember" style="--i:${i}"></i>`).join('')}
   <svg class="halloween-web" viewBox="0 0 100 100"><path d="M0 0 100 100M0 0 100 38M0 0 38 100M0 0v100M0 0h100M0 24q12-1 15-9t9-15M0 49q21-3 30-19t19-30M0 76q31-4 46-30t30-46M0 99q41-4 60-39t39-60"/></svg>
  </div>
  <p class="halloween-kicker"><span></span> OCTOBER 31 · HALLOWEEN UPDATE</p>
  <h2 class="halloween-title">Halloween update</h2>
  <div class="halloween-clock" role="timer" aria-live="off">
   ${['days','hours','minutes','seconds'].map(unit=>`<div class="halloween-unit"><strong data-countdown="${unit}">00</strong><span>${unit}</span></div>`).join('')}
  </div>
  <p class="halloween-arrived" hidden>The wait is over.</p>
  <p class="halloween-date"><time datetime="2026-10-31T20:30:00+11:00">31 OCT 2026 · 8:30 PM</time><span>SYDNEY · AEDT</span></p>
  <div class="halloween-countdown-actions"><button type="button" data-countdown-open>Fullscreen timer <span aria-hidden="true">↗</span></button><button type="button" data-countdown-sound aria-pressed="false">Sound off</button><button type="button" data-briefing-watch hidden>Watch briefing</button></div>`;
 const clock=root.querySelector('.halloween-clock'),title=root.querySelector('.halloween-title');
 const values=[...root.querySelectorAll('[data-countdown]')];let timer=null,disposed=false;
 function update(){
  if(disposed)return;
  const release=releaseClock.sample(),parts=countdownParts(release.serverNow??Date.now());const complete=release.released;root.classList.toggle('is-complete',complete);
  for(const value of values)value.textContent=String(parts[value.dataset.countdown]).padStart(2,'0');
  clock.setAttribute('aria-label',`${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds until the Halloween update`);
  clock.hidden=complete;root.querySelector('.halloween-arrived').hidden=!complete;
  root.querySelector('[data-briefing-watch]').hidden=!complete;
  if(complete){title.textContent='Halloween is live.';root.querySelector('.halloween-arrived').textContent='The archive is waiting. Enter a new run.';clearInterval(timer);}
 }
 timer=setInterval(update,1000);update();
 const focusView=createCountdownView(root,{releaseClock,onEnter,storage});
 document.addEventListener('visibilitychange',update);
 return {root,open:focusView.open,dispose(){disposed=true;focusView.dispose();clearInterval(timer);document.removeEventListener('visibilitychange',update);root.remove();}};
}
