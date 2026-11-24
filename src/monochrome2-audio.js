import {createMonochrome2Telegraph} from './monochrome2-telegraph.js';
import {createMonsterAudio,MONSTER_SOUND_URL} from './monster-audio.js';

/**
 * Gameplay audio for the monochrome slot: positional servo whine and jaw clicks on Level 0's own
 * audio context, plus Monochrome 1's metallic call and jumpscare sound. Everything is optional: if
 * audio cannot start, the round plays on silently.
 */
export function createMonochrome2Audio({onError=()=>{}}={}){
 let telegraph=null,calls=null,clack=()=>{},paused=null,disposed=false;
 return {
  attach(context,master){if(disposed||telegraph||!context)return;try{telegraph=createMonochrome2Telegraph(context,master,{onClick:()=>clack()});}catch(error){onError(error);}},
  /** Must run inside the Enter/Continue click. */
  gesture(){if(disposed)return;calls??=createMonsterAudio(MONSTER_SOUND_URL,{maze:true,metallic:true,onError,onScareError:onError});void calls.resume();paused=false;},
  update(frame){
   if(disposed)return;
   clack=frame.onClack??(()=>{});
   if(frame.paused!==paused&&calls){paused=frame.paused;if(paused)calls.pause();else void calls.resume();}
   if(frame.paused)return;
   telegraph?.update(frame);
   const hunting=frame.mode==='chase'||frame.mode==='attack';
   calls?.update(frame.distance,hunting,frame.delta,{listener:frame.listener,source:frame.source,occluded:frame.occluded});
  },
  jumpscare(){calls?.playJumpscare();},
  dispose(){disposed=true;telegraph?.dispose();calls?.dispose();telegraph=calls=null;}
 };
}
