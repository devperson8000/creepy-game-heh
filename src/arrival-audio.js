export const ARRIVAL_HIT_URL='/audio/arrival/title-hit.wav';
export function impactOffset(buffer){
 if(!buffer.getChannelData)return 0;
 const frames=Math.min(buffer.length,Math.floor(buffer.sampleRate*.25));
 for(let i=0;i<frames;i++)for(let c=0;c<buffer.numberOfChannels;c++)if(Math.abs(buffer.getChannelData(c)[i])>=.001)return i/buffer.sampleRate;
 return 0;
}
/** Decode before the title cue. One render update owns both the visual cut and audio start. */
export function createArrivalAudio({volume=()=>.8,isMuted=()=>false,createContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},fetchAudio=(url,signal)=>fetch(url,{signal})}={}){
 let context,buffer,source,gain,disposed=false,settled=false,fired=false;
 const abort=new AbortController();
 function resume(){if(disposed)return;try{context??=createContext();void context?.resume()?.catch(()=>{});}catch{}}
 resume();
 const loadTimer=setTimeout(()=>abort.abort(),5000);
 const ready=(async()=>{try{if(!context)return;const response=await fetchAudio(ARRIVAL_HIT_URL,abort.signal);if(!response.ok)throw Error('Title hit unavailable');const decoded=await context.decodeAudioData(await response.arrayBuffer());if(!disposed)buffer=decoded;}catch{}finally{clearTimeout(loadTimer);settled=true;}})();
 function stop(){try{source?.stop();}catch{}source?.disconnect();gain?.disconnect();source=null;gain=null;}
 function trigger(){
  if(disposed||fired)return;fired=true;
  if(isMuted()||globalThis.document?.hidden||!buffer||context?.state!=='running')return;
  source=context.createBufferSource();source.buffer=buffer;gain=context.createGain();gain.gain.value=Math.max(0,Math.min(1,volume()))*.75;source.connect(gain);gain.connect(context.destination);source.start(context.currentTime,impactOffset(buffer));
 }
 function update(){if(gain)gain.gain.value=isMuted()?0:Math.max(0,Math.min(1,volume()))*.75;}
 function dispose(){if(disposed)return;disposed=true;clearTimeout(loadTimer);abort.abort();stop();void context?.close()?.catch(()=>{});}
 return {ready,resume,trigger,update,stop,dispose,get settled(){return settled;},get muted(){return isMuted();},get fired(){return fired;}};
}
