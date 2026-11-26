import {countdownParts} from './monochrome2-release.js';

/** One line describing the gate for a given release sample (used by the gate and the cinematic's button). */
export function gateLabel(s){
 if(s.released)return 'ENTER LEVEL 0';
 if(!s.confirmed)return 'CHECKING THE RELEASE CLOCK…';
 if(!s.scheduled)return 'LEVEL 0 · RELEASE TIME TO BE ANNOUNCED';
 const {days,hours,minutes,seconds}=countdownParts(s.remainingMs),p=n=>String(n).padStart(2,'0');
 return 'LEVEL 0 OPENS IN '+(days?days+'D ':'')+p(hours)+':'+p(minutes)+':'+p(seconds);
}
/** Sealed screen shown at /monochrome2/play until the release clock opens. Resolves when it does. */
export function waitForMonochrome2Release(release){
 return new Promise(resolve=>{
  if(release.sample().released){resolve();return;}
  const root=document.createElement('section');root.className='m2-gate';root.setAttribute('role','status');
  root.innerHTML='<div><small>MONOCHROME 2 · FIELD RECORDING / 002</small><h1>LEVEL 0 IS SEALED</h1><p data-clock></p><button type="button" data-retry>Check again</button><a href="/monochrome2">Watch the introduction</a></div>';
  document.body.append(root);document.body.classList.add('m2-gated');
  const clock=root.querySelector('[data-clock]');
  const draw=s=>{clock.textContent=gateLabel(s);if(s.released){off();root.remove();document.body.classList.remove('m2-gated');resolve();}};
  const off=release.subscribe(draw);root.querySelector('[data-retry]').addEventListener('click',()=>void release.refresh());
  draw(release.sample());void release.start();
 });
}
