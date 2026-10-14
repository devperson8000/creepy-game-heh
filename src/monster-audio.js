// Full audio extracted from the user-provided monster sound video.
export const MONSTER_SOUND_URL = '/audio/monster.mp3';
export const JUMPSCARE_SOUND_URL='/audio/jumpscare.mp3';
export const AUDIBLE_DISTANCE = 32;
export const FULL_VOLUME_DISTANCE = 1.5;

export function monsterGain(distance,active=true){
 if(!active||!Number.isFinite(distance)||distance>=AUDIBLE_DISTANCE)return 0;
 const proximity=Math.max(0,Math.min(1,(AUDIBLE_DISTANCE-Math.max(0,distance))/(AUDIBLE_DISTANCE-FULL_VOLUME_DISTANCE)));
 return .85*Math.pow(proximity,2.4);
}

export function createMonsterAudio(url,{onError=()=>{},onScareError=()=>{}}={}){
 let context,gain,effectsGain,source,loading,noiseBuffer,wanted=false,muted=false,disposed=false,failed=false,volume=0;
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
  const sound=context.createBufferSource();sound.buffer=scareBuffer;sound.loop=false;sound.connect(scareGain);scareGain.gain.value=.95;scareSource=sound;sound.start(0,offset);
  sound.onended=()=>{sound.disconnect();if(scareSource===sound){scareSource=null;scaring=false;if(!wanted&&context.state==='running')context.suspend().catch(()=>{});}};
 }
 async function resume(){
  if(!url||disposed)return false;
  wanted=true;stopScare();
  try{
   if(!context){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser does not support Web Audio.');
    context=new AudioContext();gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);effectsGain=context.createGain();effectsGain.gain.value=muted?0:.8;effectsGain.connect(context.destination);
    scareGain=context.createGain();scareGain.gain.value=0;scareGain.connect(context.destination);
   }
   // Called directly from the Enter/Continue gesture, including on mobile.
   effectsGain.gain.value=muted?0:.8;
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
 function update(distance,active=true,delta=1/60){
  if(!url||!gain||failed||disposed)return;
  const target=monsterGain(distance,active&&wanted&&!muted);
  if(target===0){silence();return;}
  volume+=(target-volume)*(1-Math.exp(-Math.max(0,Math.min(delta,.25))/.25));
  gain.gain.setTargetAtTime(volume,context.currentTime,.025);
 }
 function playNoise(type){
  if(!context||context.state!=='running'||!wanted||muted||disposed)return;
  noiseBuffer??=(()=>{const buffer=context.createBuffer(1,context.sampleRate*.5,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.5;return buffer;})();
  const moving=type==='walk'||type==='sprint',duration=moving?.13:type==='key'||type==='clue'?.08:type==='drawer'?.24:.35;
  const sound=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
  sound.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=moving?type==='sprint'?650:420:950;filter.Q.value=moving?.7:1.8;
  const now=context.currentTime;envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(moving?.11:type==='key'||type==='clue'?.03:.07,now+.01);envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
  sound.connect(filter);filter.connect(envelope);envelope.connect(effectsGain);effects.add(sound);sound.start();sound.stop(now+duration+.01);
  sound.onended=()=>{effects.delete(sound);sound.disconnect();filter.disconnect();envelope.disconnect();};
 }
 function setMuted(value){muted=!!value;if(effectsGain)effectsGain.gain.value=muted?0:.8;if(muted){silence();stopScare();for(const sound of effects)sound.stop();}}
 function dispose(){disposed=true;wanted=false;abort.abort();silence();stopScare();source?.stop();context?.close().catch(()=>{});}
 return {resume,pause,update,playNoise,playJumpscare,setMuted,dispose,get volume(){return volume;},get muted(){return muted;},get configured(){return !!url;}};
}
