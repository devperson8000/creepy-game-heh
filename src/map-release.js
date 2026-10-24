import {MAP_RELEASE_DEADLINE,MAP_RELEASE_VERSION} from './map-release-time.js';
export function createMapRelease({fetchStatus=async()=>{
 const response=await fetch('/api/map-release',{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Release signal unavailable');return response.json();
},now=()=>performance.now()}={}){
 let anchor=null,at=0,released=false,pending=null,timer=null,disposed=false;
 const listeners=new Set();
 function sample(){const serverNow=anchor===null?null:anchor+Math.max(0,now()-at);return {confirmed:serverNow!==null,serverNow,released:released||serverNow!==null&&serverNow>=MAP_RELEASE_DEADLINE};}
 function tick(){const state=sample();if(state.released&&!released){released=true;for(const listener of listeners)listener(state);}}
 async function refresh(){
  if(pending||disposed)return pending;
  pending=(async()=>{try{
   const data=await fetchStatus();
   if(data.version!==MAP_RELEASE_VERSION||data.releaseAt!==MAP_RELEASE_DEADLINE||!Number.isFinite(data.serverNow))throw new Error('Invalid release signal');
   if(!disposed){anchor=data.serverNow;at=now();tick();for(const listener of listeners)listener(sample());}
  }catch{/* Keep a confirmed monotonic clock, or fail closed until a valid signal. */}finally{pending=null;}})();
  return pending;
 }
 return {sample,refresh,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},start(){if(!timer){let ticks=0;timer=setInterval(()=>{tick();if(++ticks%30===0)void refresh();},1000);}return refresh();},dispose(){disposed=true;clearInterval(timer);listeners.clear();},get released(){return sample().released;}};
}
export const mapRelease=createMapRelease();
