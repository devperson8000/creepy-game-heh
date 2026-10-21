/** Prepared pre-menu slot for the Monochrome I introduction. No unfinished film autoplays. */
export const OPENING_DURATION=7.5;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
export function openingFrame(value){
 const time=Math.max(0,Math.min(OPENING_DURATION,Number.isFinite(value)?value:0));
 return {time,title:ease(3.9,4.8,time)*(1-ease(6.3,7.4,time)),fade:1-ease(0,.8,time)+ease(6.5,7.5,time),done:time>=OPENING_DURATION};
}
export function createOpeningClock(onComplete,{reducedMotion=false}={}){
 let elapsed=reducedMotion?4.8:0,ended=false;
 function complete(){if(ended)return;ended=true;elapsed=OPENING_DURATION;onComplete();}
 return {update(delta,{hidden=false}={}){if(ended||hidden)return;elapsed+=Math.max(0,Number.isFinite(delta)?delta:0);if(elapsed>=OPENING_DURATION)complete();},skip:complete,cancel(){ended=true;},get elapsed(){return elapsed;},get frame(){return openingFrame(elapsed);}};
}
/** Future film owns its rendering/audio. This slot owns skipping, visibility and the one menu handoff. */
export function playOpeningBeforeMenu({container,onComplete,createFilm=null,reducedMotion=false}={}){
 if(!createFilm){onComplete();return {dispose(){}};}
 let film,frameId,disposed=false,finished=false,last=null;
 const root=document.createElement('section');root.className='opening-sequence';root.setAttribute('aria-label','Monochrome introduction');
 const status=document.createElement('p');status.className='opening-status';status.setAttribute('role','status');status.textContent='Entering the sublevel…';root.append(status);
 const skip=document.createElement('button');skip.className='opening-skip';skip.type='button';skip.textContent='Skip introduction · Space';root.append(skip);document.body.append(root);
 const clock=createOpeningClock(finish,{reducedMotion});
 function disposeFilm(){const current=film;film=null;current?.dispose();}
 function cleanup(){cancelAnimationFrame(frameId);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);disposeFilm();root.remove();}
 function finish(){if(disposed||finished)return;finished=true;cleanup();onComplete();}
 function key(event){if(event.repeat)return;if(event.code==='Space'||event.code==='Escape'){event.preventDefault();clock.skip();}}
 function visibility(){last=null;if(document.hidden)film?.pause?.();else film?.resume?.();}
 function tick(now){if(disposed||finished)return;const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;clock.update(dt,{hidden:document.hidden});if(finished)return;if(!document.hidden)film.render(clock.frame,{reducedMotion});frameId=requestAnimationFrame(tick);}
 skip.onclick=()=>clock.skip();document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
 void Promise.resolve().then(()=>createFilm(container)).then(async value=>{film=value;if(disposed||finished){disposeFilm();return;}await film.ready;if(disposed||finished)return;status.remove();skip.focus({preventScroll:true});frameId=requestAnimationFrame(tick);}).catch(()=>finish());
 return {dispose(){if(disposed)return;disposed=true;clock.cancel();cleanup();}};
}
