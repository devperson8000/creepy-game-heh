import {openingLineAt} from './opening-dialogue.js';
/** The introduction owns only the first page-load handoff, never a game round. */
export const OPENING_TITLE_AT=43;
export const OPENING_DURATION=49.2;
export const OPENING_SKIP_HOLD=2;
export const openingEase=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
const ease=openingEase;
// Camera and gaze are authored together. Positions share the same continuous set,
// including crossing the solid rear wall and falling below the passage floor.
const shots=[
 [0,[-4.4,1.68,18],[0,2,0]], [7,[0,1.67,3.8],[0,1.7,-3]],
 [12,[0,1.65,-1.5],[-.6,1.7,-6]], [15,[.25,1.65,-3],[-4,1.6,-4]],
 [18,[.25,1.65,-4.5],[3.8,1.8,-6]], [21,[.1,1.65,-8.05],[0,1.6,-10]],
 [22.7,[.08,1.61,-8.17],[-.2,1.42,-9]], [23.3,[.12,1.69,-7.83],[-.35,1.45,-9]],
 [25,[.1,1.65,-8.03],[-.18,1.45,-9]], [28,[.08,1.65,-8.13],[-.18,1.5,-10]],
 [32,[.05,1.65,-10.7],[0,1.5,-18]], [34,[.05,1.65,-12.2],[-1.5,1.8,-16]],
 [37.8,[0,1.65,-17.4],[.2,1.4,-24]], [38.5,[.08,1.25,-18.4],[.2,-1,-22]],
 [40,[.15,-6,-20],[.1,-15,-23]], [43,[.15,-37,-21],[0,-52,-22]],
];
function sample(time){
 let i=0;while(i<shots.length-2&&time>shots[i+1][0])i++;
 const a=shots[i],b=shots[i+1],p=ease(a[0],b[0],time);
 return [1,2].map(k=>a[k].map((v,j)=>v+(b[k][j]-v)*p));
}
export function openingFrame(value){
 const time=Math.max(0,Math.min(OPENING_DURATION,Number.isFinite(value)?value:0));
 const [camera,look]=sample(time);
 const shot=time<8?'street':time<13?'entry':time<20?'empty-house':time<23?'first-touch':time<25?'recoil':time<28.5?'second-touch':time<32?'through-wall':time<38?'alley':time<43?'fall':'title';
 return {time,shot,camera,look,
  reach:ease(20.2,22.3,time)*(1-ease(22.85,23.22,time))+ease(25,27.2,time)*(1-ease(29,31,time)),
  torch:ease(13.4,14.5,time),light:ease(14,14.15,time)*(1-ease(39.1,42.75,time)),
  title:ease(43,44.5,time)*(1-ease(47.2,48.9,time)),
  fade:Math.min(1,1-ease(0,1.5,time)+.48*ease(29,30,time)*(1-ease(30,31,time))+ease(41,43,time)),
  done:time>=OPENING_DURATION};
}
export function createOpeningClock(onComplete,{reducedMotion=false}={}){
 let elapsed=reducedMotion?OPENING_TITLE_AT:0,ended=false,held=0;
 function skip(){if(ended||elapsed>=OPENING_TITLE_AT)return;elapsed=OPENING_TITLE_AT;held=0;}
 return {update(delta,{hidden=false,holding=false,ready=true,holdDelta=delta}={}){
  if(ended)return;if(hidden){held=0;return;}
  const dt=Math.max(0,Number.isFinite(delta)?delta:0);
  held=holding?held+Math.max(0,Number.isFinite(holdDelta)?holdDelta:0):0;
  if(held>=OPENING_SKIP_HOLD&&elapsed<OPENING_TITLE_AT){skip();return;}
  if(!ready&&elapsed<OPENING_TITLE_AT)return;
  elapsed=Math.min(OPENING_DURATION,elapsed+dt);
  if(elapsed>=OPENING_DURATION){ended=true;onComplete();}
 },skip,cancel(){ended=true;held=0;},get elapsed(){return elapsed;},get skipProgress(){return Math.min(1,held/OPENING_SKIP_HOLD);},get frame(){return openingFrame(elapsed);}};
}
export function playOpeningBeforeMenu({container,onComplete,createFilm=null,reducedMotion=false}={}){
 if(!createFilm){onComplete();return {dispose(){}};}
 let film,frameId,disposed=false,finished=false,last=null,ready=false,holdStart=0;
 const holds=new Set(),root=document.createElement('section');root.className='opening-sequence';root.setAttribute('aria-label','Monochrome introduction');
 root.innerHTML='<div class="opening-shade"></div><div class="opening-vignette"></div><p class="opening-date">OCTOBER 31 <span>11:47 PM</span></p><div class="opening-title"><p>A DESCENT INTO THE UNKNOWN</p><h1>MONOCHROME</h1><span>KEEP YOUR LIGHT CLOSE.</span></div><p class="opening-status" role="status">Preparing the Halloween arrival…</p><p class="opening-caption" aria-live="polite"></p><div class="opening-controls"><button class="opening-audio" type="button" aria-label="Enable introduction sound">Enable sound</button><button class="opening-skip" type="button" aria-label="Hold to skip introduction"><span class="opening-skip-fill"></span><span>Hold to skip <small>2s · Space</small></span></button></div>';
 document.body.append(root);
 const caption=root.querySelector('.opening-caption');
 const skip=root.querySelector('.opening-skip'),sound=root.querySelector('.opening-audio'),status=root.querySelector('.opening-status'),title=root.querySelector('.opening-title'),shade=root.querySelector('.opening-shade'),date=root.querySelector('.opening-date');
 const clock=createOpeningClock(finish,{reducedMotion});sound.disabled=!ready;
 function disposeFilm(){const current=film;film=null;current?.dispose();}
 function beginHold(source){if(!holds.size)holdStart=performance.now();holds.add(source);skip.classList.add('is-holding');}
 function clearHold(){holds.clear();clock.update(0,{holding:false});skip.classList.remove('is-holding');}
 function cleanup(){cancelAnimationFrame(frameId);document.removeEventListener('keydown',keyDown);document.removeEventListener('keyup',keyUp);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',clearHold);document.removeEventListener('pointerdown',unlock);disposeFilm();root.remove();}
 function finish(){if(disposed||finished)return;finished=true;cleanup();
  const veil=document.createElement('div');veil.className='opening-menu-reveal';document.body.append(veil);
  onComplete();setTimeout(()=>veil.remove(),1100);
 }
 function unlock(event){if(event?.target===sound)return;film?.resume?.();setTimeout(()=>{if(!disposed&&!finished)syncSound();},50);}
 function syncSound(){sound.disabled=!ready;sound.textContent=film?.soundEnabled?'Sound on':'Enable sound';sound.setAttribute('aria-label',film?.soundEnabled?'Mute introduction sound':'Enable introduction sound');sound.setAttribute('aria-pressed',String(!!film?.soundEnabled));}
 sound.onclick=()=>{const enabled=sound.getAttribute('aria-pressed')!=='true';if(film?.setSoundEnabled)film.setSoundEnabled(enabled);else film?.toggleSound?.();setTimeout(syncSound,50);};
 function keyDown(event){if(event.code!=='Space'&&event.code!=='Escape')return;if(event.code==='Space'&&event.target===sound)return;event.preventDefault();if(clock.elapsed>=OPENING_TITLE_AT)return;beginHold(event.code);unlock();}
 function keyUp(event){if(holds.has(event.code)){event.preventDefault();holds.delete(event.code);}if(!holds.size)skip.classList.remove('is-holding');}
 skip.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();skip.setPointerCapture(event.pointerId);beginHold('pointer');unlock();};
 skip.onpointerup=skip.onpointercancel=skip.onlostpointercapture=()=>{holds.delete('pointer');if(!holds.size)skip.classList.remove('is-holding');};
 // A click alone never skips. Keyboard and pointer holds share the same clock.
 function visibility(){last=null;clearHold();if(document.hidden)film?.pause?.();else film?.resume?.();}
 function tick(now){if(disposed||finished)return;
  const previous=last,dt=last===null?0:Math.max(0,(now-last)/1000);last=now;
  const holdDelta=Math.max(0,(now-Math.max(previous??now,holdStart))/1000);
  clock.update(Math.min(dt,.25),{hidden:document.hidden,holding:holds.size>0,ready,holdDelta});if(finished)return;
  const frame=clock.frame,line=openingLineAt(frame.time),inTitle=frame.time>=OPENING_TITLE_AT;
  if(caption.textContent!==(line?.text??''))caption.textContent=line?.text??'';
  root.classList.toggle('is-title',inTitle);skip.disabled=inTitle;root.style.setProperty('--skip-progress',String(clock.skipProgress));
  title.style.opacity=String(frame.title);shade.style.opacity=String(inTitle?1:frame.fade);date.style.opacity=String(1-ease(5.5,8,frame.time));
  if(inTitle){status.remove();disposeFilm();}
  else if(ready&&!document.hidden){try{film?.render(frame,{reducedMotion});}catch{clock.skip();}}
  frameId=requestAnimationFrame(tick);
 }
 document.addEventListener('keydown',keyDown);document.addEventListener('keyup',keyUp);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',clearHold);document.addEventListener('pointerdown',unlock);
 frameId=requestAnimationFrame(tick);
 // Title-only mode does not allocate a WebGL context or start any audio.
 if(!reducedMotion)void Promise.resolve().then(()=>createFilm(container)).then(async value=>{
  film=value;if(disposed||finished||clock.elapsed>=OPENING_TITLE_AT){disposeFilm();return;}
  await film.ready;if(disposed||finished||clock.elapsed>=OPENING_TITLE_AT){disposeFilm();return;}
  ready=true;last=null;status.remove();syncSound();
 }).catch(()=>{disposeFilm();clock.skip();});
 return {dispose(){if(disposed)return;disposed=true;clock.cancel();cleanup();}};
}
