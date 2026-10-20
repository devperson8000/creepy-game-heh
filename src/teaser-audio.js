import {TEASER_VOICES} from './teaser-timeline.js';
import {MONSTER_SOUND_URL} from './monster-audio.js';
/** Schedule dialogue on the audio clock, so a slow rendered frame cannot miss a line. */
export function createTeaserAudio(){
 let context,master,noise,anchor=null,last=-1,lastAt=0,disposed=false,active=false;
 const buffers=new Map(),scheduled=new Set(),nodes=new Set(),abort=new AbortController();
 function track(source,gain,filter){nodes.add(source);source.onended=()=>{nodes.delete(source);source.disconnect();gain?.disconnect();filter?.disconnect();};return source;}
 function schedule(){
  if(disposed||!active||context?.state!=='running'||anchor===null||document.hidden)return;
  const time=context.currentTime-anchor;
  for(const [i,cue] of [...TEASER_VOICES,{at:17,end:20.4,file:'monster'}].entries()){
   const buffer=buffers.get(cue.file);if(!buffer||scheduled.has(i))continue;
   const offset=Math.max(0,time-cue.at);if(time>=cue.end||offset>=buffer.duration){scheduled.add(i);continue;}
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=cue.file==='monster';gain.gain.value=cue.file==='monster'?.34:i===1?.67:.86;
   source.connect(gain);gain.connect(master);track(source,gain);const when=Math.max(context.currentTime,anchor+cue.at);source.start(when,offset);source.stop(Math.min(when+buffer.duration-offset,anchor+cue.end));scheduled.add(i);
  }
 }
 function resume(){
  if(disposed)return;try{
   if(!context){
    const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    for(const file of ['radio-out','help','monster'])void fetch(file==='monster'?MONSTER_SOUND_URL:`/audio/halloween/${file}.mp3`,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Tape audio unavailable');return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{if(!disposed){buffers.set(file,buffer);schedule();}}).catch(()=>{});
   }
   void context.resume().then(()=>{if(!disposed&&active&&anchor===null){anchor=context.currentTime-(last+Math.max(0,(performance.now()-lastAt)/1000));}schedule();}).catch(()=>{});
  }catch{}
 }
 function sound(kind){
  if(!context||context.state!=='running')return;const at=context.currentTime,g=context.createGain(),f=context.createBiquadFilter();let source,duration=.17,level=.09;
  if(kind==='breath'||kind==='radio'){source=context.createBufferSource();source.buffer=noise;duration=kind==='breath'?.38:.12;level=kind==='breath'?.045:.025;f.type='bandpass';f.frequency.value=kind==='breath'?1000:2200;f.Q.value=.8;}
  else {source=context.createOscillator();source.type='triangle';source.frequency.setValueAtTime(kind==='impact'?170:100,at);source.frequency.exponentialRampToValueAtTime(35,at+.16);f.type='lowpass';f.frequency.value=650;if(kind==='impact'){level=.18;duration=.4;}}
  g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(level,at+.018);g.gain.exponentialRampToValueAtTime(.001,at+duration);source.connect(f);f.connect(g);g.connect(master);track(source,g,f);source.start();source.stop(at+duration+.02);
 }
 function pause(){
  active=false;anchor=null;scheduled.clear();for(const source of nodes){try{source.stop();}catch{}}nodes.clear();if(master)master.gain.setTargetAtTime(0,context.currentTime,.025);
 }
 function update(time,{muted=false,volume=.8}={}){
  if(disposed)return;resume();
  if(document.hidden){pause();last=time;return;}
  if(time<last-.75||(last>=0&&time-last>2))pause();
  if(context){
   if(context.state!=='running'&&anchor!==null)pause();
   if(context.state==='running'&&anchor===null){pause();active=true;anchor=context.currentTime-time;}
   active=true;master.gain.setTargetAtTime(muted?0:volume,context.currentTime,.04);schedule();
  }
  if(time>=0&&time<20.4&&time-last<.65){const running=time>=17,rate=running?4:1.8;if((time<5||time>=15)&&Math.floor(time*rate)!==Math.floor(last*rate))sound('step');if(running&&Math.floor(time*1.55)!==Math.floor(last*1.55))sound('breath');if(last<19.65&&time>=19.65)sound('impact');}
  last=time;lastAt=performance.now();
 }
 const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
 function dispose(){if(disposed)return;disposed=true;pause();abort.abort();document.removeEventListener('visibilitychange',visibility);void context?.close().catch(()=>{});buffers.clear();}
 return {resume,update,pause,dispose};
}
