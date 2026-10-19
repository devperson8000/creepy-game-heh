import {MONSTER_SOUND_URL} from './monster-audio.js';
import {finalePlaybackTime,finaleChoreographyTime} from './finale-state.js';
const EVENTS=[{time:21.3,type:'dive'},{time:22.25,type:'button'},{time:23,type:'doors'},{time:30,type:'motor'},{time:35.3,type:'cut'},{time:35.95,type:'head'},{time:36.4,type:'head'},{time:45,type:'arrival'}];
for(let t=.8;t<19;t+=.31)EVENTS.push({time:t,type:'step'});
for(let t=.4;t<20;t+=.72)EVENTS.push({time:t,type:'breath'});
for(let t=46;t<52;t+=.56)EVENTS.push({time:t,type:'exit-step'});
EVENTS.sort((a,b)=>a.time-b.time);
for(const event of EVENTS)event.time=finalePlaybackTime(event.time);
export function finaleAudioEvents(previous,time){return time>=previous&&time-previous<=.6?EVENTS.filter(e=>e.time>previous&&e.time<=time):[];}
export function finaleMonsterGain(seconds){const time=finaleChoreographyTime(seconds);if(time<.5||time>=39.3)return 0;if(time<23)return .15+.55*Math.min(1,time/12);if(time<35.3)return .9;return .8*Math.exp(-(time-35.3)*2);}
export function createFinaleAudio({volume=.8,muted=false}={}){
 let context,master,monsterGain,monster,noise,loading,disposed=false,last=0,level=Math.max(0,Math.min(1,volume)),quiet=muted;
 const abort=new AbortController(),sounds=new Set();
 function effect(type){
  if(!context||context.state!=='running'||quiet||!noise)return;
  const breath=type==='breath',foot=type==='step'||type==='exit-step',length=breath?.32:foot?.12:type==='motor'?1.8:.55;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;source.loop=length>.5;filter.type=breath?'bandpass':'lowpass';filter.frequency.value=breath?1100:foot?350:type==='button'?1800:750;filter.Q.value=breath?.8:.6;
  const intensity=breath?.12:foot?type==='exit-step'?.045:.13:type==='button'?.04:type==='motor'?.11:.36;
  const now=context.currentTime;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(intensity,now+(breath?.09:.009));gain.gain.exponentialRampToValueAtTime(.0001,now+length);
  source.connect(filter);filter.connect(gain);gain.connect(master);sounds.add(source);source.onended=()=>{sounds.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(now+length+.01);
  if(['doors','cut','head','motor'].includes(type)){
   const oscillator=context.createOscillator(),bass=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(type==='motor'?46:92,now);oscillator.frequency.exponentialRampToValueAtTime(29,now+length);bass.gain.setValueAtTime(.0001,now);bass.gain.linearRampToValueAtTime(.16,now+.015);bass.gain.exponentialRampToValueAtTime(.0001,now+length);oscillator.connect(bass);bass.connect(master);sounds.add(oscillator);oscillator.onended=()=>{sounds.delete(oscillator);oscillator.disconnect();bass.disconnect();};oscillator.start();oscillator.stop(now+length+.02);
  }
 }
 async function resume(){
  if(disposed)return false;
  try{
   if(!context){const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return false;
    context=new AudioContext();master=context.createGain();master.gain.value=quiet?0:level;master.connect(context.destination);monsterGain=context.createGain();monsterGain.gain.value=0;monsterGain.connect(master);
    noise=context.createBuffer(1,Math.floor(context.sampleRate*.5),context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   }
   await context.resume();
   loading??=fetch(MONSTER_SOUND_URL,{signal:abort.signal}).then(response=>{if(!response.ok)throw new Error('audio unavailable');return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{if(disposed)return;monster=context.createBufferSource();monster.buffer=buffer;monster.loop=true;monster.connect(monsterGain);monster.start(0,last%buffer.duration);}).catch(()=>{});
   return !disposed;
  }catch{return false;}
 }
 function sample(time){if(disposed)return;if(monsterGain)monsterGain.gain.setTargetAtTime(finaleMonsterGain(time),context.currentTime,.035);for(const e of finaleAudioEvents(last,time))effect(e.type);last=Math.max(0,time);}
 function setVolume(value){level=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));if(master)master.gain.setTargetAtTime(quiet?0:level,context.currentTime,.03);}
 function setMuted(value){quiet=!!value;setVolume(level);}
 function dispose(){if(disposed)return;disposed=true;abort.abort();for(const sound of sounds){try{sound.stop();}catch{}}sounds.clear();try{monster?.stop();}catch{}context?.close().catch(()=>{});}
 return {resume,sample,setVolume,setMuted,dispose,get unlocked(){return context?.state==='running';},get muted(){return quiet;},get volume(){return level;}};
}
