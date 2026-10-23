import {recapFrame} from './teaser-recap-timeline.js';
import {sampleNeedlelimbsTeaser} from './needlelimbs-timeline.js';
const defaultLoad=()=>import('./teaser-playback.js').then(m=>m.createTeaserPlayback());
/** An archive visit owns the loaded picture/audio pair; ordinary B1 play loads neither. */
export function createDeferredTeaser({load=defaultLoad}={}){
 let inner=null,pending=null,disposed=false,failure=null,wanted=false,latest=null;
 function release(film){film.audio.dispose();film.scene.dispose();}
 function prepare(){if(disposed)return Promise.resolve();pending??=Promise.resolve().then(load).then(async film=>{if(disposed){release(film);return;}inner=film;if(wanted)film.audio.resume();if(latest)film.audio.update(latest.time,latest.options);await film.scene.ready;}).catch(error=>{failure=error;});return pending;}
 function sample(time){const f=recapFrame(time);return f.phase==='teaser'?sampleNeedlelimbsTeaser(f.teaserTime):{...f,time,shot:f.phase,subtitle:f.subtitle};}
 function dispose(){if(disposed)return;disposed=true;wanted=false;latest=null;if(inner)release(inner);inner=null;}
 const audio={resume(){if(disposed)return;wanted=true;if(inner)return inner.audio.resume();void prepare();},update(time,options={}){if(disposed)return;wanted=true;latest={time,options};if(inner)inner.audio.update(time,options);else void prepare();},pause(){wanted=false;latest=null;inner?.audio.pause();},dispose};
 const scene={get target(){return inner?.scene.target??null;},get ready(){return prepare();},get error(){return failure??inner?.scene.error??null;},get historical(){return inner?.scene.historical;},get film(){return inner?.scene.film;},get needlelimbsPending(){return inner?.scene.needlelimbsPending??true;},render(renderer,time,options){if(disposed)return false;void prepare();if(!inner)return false;inner.scene.render(renderer,time,options);return true;},sample,dispose};return {scene,audio,sample,prepare};
}
