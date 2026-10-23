import {createMonsterSpatialBus} from './monster-spatial-audio.js';
import {createMetallicTeaserVoice} from './teaser-metallic-voice.js';
import {playInteractionSound} from './interaction-sounds.js';
// Full audio extracted from the user-provided monster sound video.
export const MONSTER_SOUND_URL = '/audio/monster.mp3';
export const JUMPSCARE_SOUND_URL='/audio/jumpscare.mp3';
export const AUDIBLE_DISTANCE = 32;
export const FULL_VOLUME_DISTANCE = 1.5;

export function monsterGain(distance,active=true,{maze=false,elapsed=0}={}){
 const range=maze?28:AUDIBLE_DISTANCE;
 if(!active||!Number.isFinite(distance)||distance>=range)return 0;
 const proximity=Math.max(0,Math.min(1,(range-Math.max(0,distance))/(range-FULL_VOLUME_DISTANCE)));
 const phase=elapsed%22,call=phase<.35?phase/.35:phase<4.7?1:phase<5.2?(5.2-phase)/.5:0;
 const nearby=Math.max(0,Math.min(1,(4.8-distance)/1.5));
 return .85*Math.pow(proximity,maze?1.45:2.4)*(maze?Math.max(call,nearby):1);
}

export function createMonsterAudio(url,{onError=()=>{},onScareError=()=>{},maze=false,metallic=maze}={}){
 let context,gain,effectsGain,source,loading,noiseBuffer,wanted=false,muted=false,disposed=false,failed=false,volume=0;
 let masterVolume=1,elapsed=0,metalBus,scareMetal,spatialBus;
 let scareGain,scareBuffer,scareLoading,scareSource,scaring=false,scareStartedAt=0;
 const abort=new AbortController(),effects=new Set();
 function silence(){volume=0;if(gain&&context?.state!=='closed'){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(0,context.currentTime);}}
 async function load(){
  const response=await fetch(url,{signal:abort.signal});
  if(!response.ok)throw new Error(`Monster sound request failed (${response.status}).`);
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  if(disposed)return;
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();
  if(!wanted&&!scaring)await context.suspend();
 }
 async function loadScare(){
  const response=await fetch(JUMPSCARE_SOUND_URL,{signal:abort.signal});
  if(!response.ok)throw new Error(`Jumpscare sound request failed (${response.status}).`);
  const buffer=await context.decodeAudioData(await response.arrayBuffer());if(!disposed){scareBuffer=buffer;startScareSound();}
 }
 function stopScare(){const old=scareSource;scareSource=null;scaring=false;old?.stop();if(scareGain)scareGain.gain.value=0;}
 function startScareSound(){
  if(!scaring||scareSource||!scareBuffer||muted||disposed)return;
  const offset=Math.max(0,context.currentTime-scareStartedAt);
  if(offset>=scareBuffer.duration){stopScare();return;}
  const sound=context.createBufferSource();sound.buffer=scareBuffer;sound.loop=false;sound.connect(scareGain);scareGain.gain.value=.95*masterVolume;scareSource=sound;sound.start(0,offset);
  sound.onended=()=>{sound.disconnect();if(scareSource===sound){scareSource=null;scaring=false;if(!wanted&&context.state==='running')context.suspend().catch(()=>{});}};
 }
 async function resume(){
  if(!url||disposed)return false;
  wanted=true;stopScare();
  try{
   if(!context){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser does not support Web Audio.');
    context=new AudioContext();gain=context.createGain();gain.gain.value=0;spatialBus=maze?createMonsterSpatialBus(context,context.destination):null;metalBus=metallic?createMetallicTeaserVoice(context,spatialBus?.input??context.destination):null;gain.connect(metalBus?.input??spatialBus?.input??context.destination);effectsGain=context.createGain();effectsGain.gain.value=muted?0:.8*masterVolume;effectsGain.connect(context.destination);
    scareGain=context.createGain();scareGain.gain.value=0;scareMetal=metallic?createMetallicTeaserVoice(context,context.destination):null;scareGain.connect(scareMetal?.input??context.destination);
   }
   // Called directly from the Enter/Continue gesture, including on mobile.
   effectsGain.gain.value=muted?0:.8*masterVolume;
   await context.resume();
   scareLoading??=loadScare().catch(error=>{stopScare();if(!disposed)onScareError(error);});
   if(!failed){
    loading??=load();
    try{await loading;}catch(error){if(!disposed){failed=true;silence();onError(error);}}
   }
   if(!wanted&&!scaring&&!disposed)await context.suspend();
   return !disposed;
  }catch(error){
   if(!disposed){failed=true;silence();if(!scaring)context?.suspend().catch(()=>{});onError(error);}
   return false;
  }
 }
 function pause(){wanted=false;silence();stopScare();if(effectsGain)effectsGain.gain.value=0;for(const sound of effects)sound.stop();if(context?.state==='running')context.suspend().catch(()=>{});}
 function playJumpscare(){
  if(scaring)return false;
  wanted=false;silence();if(effectsGain)effectsGain.gain.value=0;for(const sound of effects)sound.stop();stopScare();
  if(!context||context.state!=='running'||muted||disposed)return false;
  scaring=true;scareStartedAt=context.currentTime;startScareSound();
  return true;
 }
 function update(distance,active=true,delta=1/60,spatial){
  if(!url||!gain||failed||disposed)return;
  if(active&&wanted)elapsed+=Math.max(0,Math.min(delta,.25));
  const target=monsterGain(distance,active&&wanted&&!muted,{maze,elapsed})*masterVolume;
  if(target===0){silence();return;}
  if(spatial)spatialBus?.update({...spatial,occluded:typeof spatial.occluded==='function'?spatial.occluded():spatial.occluded});
  volume+=(target-volume)*(1-Math.exp(-Math.max(0,Math.min(delta,.25))/.25));
  gain.gain.setTargetAtTime(volume,context.currentTime,.025);
 }
 function playNoise(type){
  if(!context||context.state!=='running'||!wanted||muted||disposed)return;
  noiseBuffer??=(()=>{const buffer=context.createBuffer(1,context.sampleRate*.5,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.5;return buffer;})();
  playInteractionSound(context,effectsGain,noiseBuffer,type,effects);
 }
 function setMuted(value){muted=!!value;if(effectsGain)effectsGain.gain.value=muted?0:.8*masterVolume;if(muted){silence();stopScare();for(const sound of effects)sound.stop();}}
 function setVolume(value){
  const next=Math.max(0,Math.min(1,Number.isFinite(value)?value:1));if(next===masterVolume)return;masterVolume=next;
  if(effectsGain)effectsGain.gain.value=muted?0:.8*masterVolume;
  if(scareGain&&scaring)scareGain.gain.value=muted?0:.95*masterVolume;
 }
 function dispose(){disposed=true;wanted=false;abort.abort();silence();stopScare();source?.stop();for(const sound of effects)sound.stop();effects.clear();metalBus?.dispose();scareMetal?.dispose();spatialBus?.dispose();context?.close().catch(()=>{});}
 return {resume,pause,update,playNoise,playJumpscare,setMuted,setVolume,dispose,get volume(){return volume;},get muted(){return muted;},get configured(){return !!url;}};
}
