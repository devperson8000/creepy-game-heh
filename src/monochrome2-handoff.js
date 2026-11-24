import {MONOCHROME2_PLAY_PATH} from './monochrome2-route.js';
import {monochrome2Release} from './monochrome2-release.js';
import {gateLabel} from './monochrome2-gate.js';

/**
 * Adds "ENTER LEVEL 0" to the finished cinematic's title card. The cinematic itself is untouched:
 * this only appends a button, then (once the release clock allows) disposes the cinematic and starts
 * Level 0 in the same page, with no reload.
 */
export function installMonochrome2Handoff(runtime,{start=async()=>{const {startMonochrome2Play}=await import('./monochrome2-play.js');return startMonochrome2Play({alreadyReleased:true});}}={}){
 const host=document.querySelector('.m2-title-inner');if(!host)return {dispose(){}};
 const button=document.createElement('button');button.type='button';button.className='m2-replay m2-enter';
 host.append(button);
 const draw=s=>{button.textContent=gateLabel(s);button.disabled=!s.released;};
 const off=monochrome2Release.subscribe(draw);draw(monochrome2Release.sample());void monochrome2Release.start();
 let entering=false;
 button.addEventListener('click',async()=>{
  if(entering||!monochrome2Release.released)return;entering=true;button.disabled=true;
  try{runtime.dispose();history.pushState({m2:'play'},'',MONOCHROME2_PLAY_PATH);window.monochrome2=await start();}
  catch(error){console.error(error);location.assign(MONOCHROME2_PLAY_PATH);}
 });
 return {dispose(){off();button.remove();}};
}
