import {MONOCHROME2_RELEASE_VERSION,parseReleaseAt} from './monochrome2-release-time.js';

/**
 * Client view of the Monochrome 2 release timer. The server supplies both the release time and its
 * own clock; the client keeps a monotonic offset, so changing the device clock cannot open the gate.
 * Fails closed: with no valid signal the gate stays sealed.
 * (Like the existing map release, this gates the page, not the shipped bundle.)
 */
export function createMonochrome2Release({fetchStatus=async()=>{
 const response=await fetch('/api/monochrome2-release',{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Release signal unavailable');return response.json();
},now=()=>performance.now(),devUnlock=()=>false}={}){
 let anchor=null,at=0,releaseAt=null,pending=null,timer=null,disposed=false,released=false;
 const listeners=new Set();
 function sample(){
  const serverNow=anchor===null?null:anchor+Math.max(0,now()-at);
  const unlocked=!!devUnlock()||released||(releaseAt!==null&&serverNow!==null&&serverNow>=releaseAt);
  return {confirmed:anchor!==null,scheduled:releaseAt!==null,releaseAt,serverNow,released:unlocked,remainingMs:releaseAt!==null&&serverNow!==null?Math.max(0,releaseAt-serverNow):null};
 }
 const notify=()=>{const s=sample();if(s.released)released=true;for(const l of listeners)l(s);};
 async function refresh(){
  if(pending||disposed)return pending;
  pending=(async()=>{try{
   const data=await fetchStatus();
   if(data?.version!==MONOCHROME2_RELEASE_VERSION||!Number.isFinite(data.serverNow))throw new Error('Invalid release signal');
   if(!disposed){anchor=data.serverNow;at=now();releaseAt=parseReleaseAt(data.releaseAt);notify();}
  }catch{/* keep the last confirmed clock; with none, stay sealed */}finally{pending=null;}})();
  return pending;
 }
 return {
  sample,refresh,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(!timer){let ticks=0;timer=setInterval(()=>{notify();if(++ticks%30===0)void refresh();},1000);}return refresh();},
  dispose(){disposed=true;clearInterval(timer);listeners.clear();},
  get released(){return sample().released;}
 };
}
/** Local development only: `?unlock=1` skips the timer so the build can be played. Never in production builds. */
export const devUnlocked=()=>!!(import.meta.env?.DEV&&typeof location!=='undefined'&&new URLSearchParams(location.search).get('unlock')==='1');
export const monochrome2Release=createMonochrome2Release({devUnlock:devUnlocked});
export function countdownParts(remainingMs){
 const total=Math.max(0,Math.ceil((remainingMs??0)/1000));
 return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
}
