// Full audio extracted from the user-provided monster sound video.
export const MONSTER_SOUND_URL = '/audio/monster.mp3';
export const AUDIBLE_DISTANCE = 18;
export const FULL_VOLUME_DISTANCE = 1.5;

export function monsterGain(distance,active=true){
 if(!active||!Number.isFinite(distance)||distance>=AUDIBLE_DISTANCE)return 0;
 const proximity=Math.max(0,Math.min(1,(AUDIBLE_DISTANCE-Math.max(0,distance))/(AUDIBLE_DISTANCE-FULL_VOLUME_DISTANCE)));
 return .85*proximity*proximity*(3-2*proximity);
}

export function createMonsterAudio(url,{onError=()=>{}}={}){
 let context,gain,source,loading,wanted=false,muted=false,disposed=false,failed=false,volume=0;
 const abort=new AbortController();
 function silence(){volume=0;if(gain&&context?.state!=='closed'){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(0,context.currentTime);}}
 async function load(){
  const response=await fetch(url,{signal:abort.signal});
  if(!response.ok)throw new Error(`Monster sound request failed (${response.status}).`);
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  if(disposed)return;
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();
  if(!wanted)await context.suspend();
 }
 async function resume(){
  if(!url||disposed||failed)return false;
  wanted=true;
  try{
   if(!context){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser does not support Web Audio.');
    context=new AudioContext();gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
   }
   // Called directly from the Enter/Continue gesture, including on mobile.
   await context.resume();
   loading??=load();await loading;
   if(!wanted&&!disposed)await context.suspend();
   return !disposed;
  }catch(error){
   if(!disposed){failed=true;silence();context?.suspend().catch(()=>{});onError(error);}
   return false;
  }
 }
 function pause(){wanted=false;silence();if(context?.state==='running')context.suspend().catch(()=>{});}
 function update(distance,active=true,delta=1/60){
  if(!url||!gain||failed||disposed)return;
  const target=monsterGain(distance,active&&wanted&&!muted);
  if(target===0){silence();return;}
  volume+=(target-volume)*(1-Math.exp(-Math.max(0,Math.min(delta,.25))/.09));
  gain.gain.setTargetAtTime(volume,context.currentTime,.025);
 }
 function setMuted(value){muted=!!value;if(muted)silence();}
 function dispose(){disposed=true;wanted=false;abort.abort();silence();source?.stop();context?.close().catch(()=>{});}
 return {resume,pause,update,setMuted,dispose,get volume(){return volume;},get muted(){return muted;},get configured(){return !!url;}};
}
