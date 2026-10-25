import {TEASER_VOICES,TEASER_SOUND_CUES,TEASER_MONSTER_CUE} from './teaser-timeline.js';
import {MONSTER_SOUND_URL} from './monster-audio.js';
import {createMetallicTeaserVoice} from './teaser-metallic-voice.js';
/** Schedule dialogue on the audio clock, so a slow rendered frame cannot miss a line. */
export function createTeaserAudio({voices=TEASER_VOICES,soundCues=TEASER_SOUND_CUES,monsterCue=TEASER_MONSTER_CUE,recordedCues=[],footsteps=true}={}){
 let context,master,noise,anchor=null,last=-1,lastAt=0,disposed=false,active=false;
 const buffers=new Map(),scheduled=new Set(),nodes=new Set(),cleanups=new Map(),abort=new AbortController();
 function track(source,gain,filter,extraCleanup){
  nodes.add(source);const release=()=>{if(!nodes.delete(source))return;cleanups.delete(source);source.disconnect();gain?.disconnect();filter?.disconnect();extraCleanup?.();};
  cleanups.set(source,release);source.onended=release;return source;
 }
 function schedule(){
  if(disposed||!active||context?.state!=='running'||anchor===null||document.hidden)return;
  const time=context.currentTime-anchor;
  for(const [i,cue] of [...voices,monsterCue,...recordedCues].filter(Boolean).entries()){
   const buffer=buffers.get(cue.file);if(!buffer||scheduled.has(i))continue;
   const offset=Math.max(0,time-cue.at)+(cue.offset??0);if(time>=cue.end||offset>=buffer.duration){scheduled.add(i);continue;}
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=cue.file==='monster';gain.gain.value=cue.gain??(cue.file==='monster'?.34:.86);
   let panner,filter;const end=Math.min(Math.max(context.currentTime,anchor+cue.at)+buffer.duration-offset,anchor+cue.end);
   if(cue.gain!==undefined){const level=cue.gain,begin=Math.max(context.currentTime,anchor+cue.at),fade=Math.min(.09,(end-begin)/3);gain.gain.setValueAtTime(0,begin);gain.gain.linearRampToValueAtTime(level,begin+fade);gain.gain.setValueAtTime(level,end-fade);gain.gain.linearRampToValueAtTime(0,end);}
   if(cue.lowpass){filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cue.lowpass;source.connect(filter);filter.connect(gain);}else source.connect(gain);
   const metal=cue.file==='monster'?createMetallicTeaserVoice(context,master):null;
   if(cue.pan!==undefined&&context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=cue.pan;gain.connect(panner);panner.connect(master);}else gain.connect(metal?.input??master);track(source,gain,filter,()=>{metal?.dispose();panner?.disconnect();});
   const when=Math.max(context.currentTime,anchor+cue.at);source.start(when,offset);source.stop(Math.min(when+buffer.duration-offset,anchor+cue.end));scheduled.add(i);
  }
  for(const [i,cue] of soundCues.entries()){const key=`fx:${i}`;if(scheduled.has(key))continue;scheduled.add(key);if(time<cue.at+.2)sound(cue.kind,Math.max(context.currentTime,anchor+cue.at));}
 }
 function resume(){
  if(disposed)return;try{
   if(!context){
    const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    for(const file of new Set([...voices.map(v=>v.file),...recordedCues.map(v=>v.file),...(monsterCue?['monster']:[])]))void fetch(file==='monster'?MONSTER_SOUND_URL:`/audio/halloween/${file}.mp3`,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Tape audio unavailable');return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{if(!disposed){buffers.set(file,buffer);schedule();}}).catch(()=>{});
   }
   void context.resume().then(()=>{if(!disposed&&active&&anchor===null){anchor=context.currentTime-(last+Math.max(0,(performance.now()-lastAt)/1000));}schedule();}).catch(()=>{});
  }catch{}
 }
 function sound(kind,when){
  if(!context||context.state!=='running')return;const at=when??context.currentTime,g=context.createGain(),f=context.createBiquadFilter();let source,duration=.17,level=.09;
  if(['breath','scrape','scuttle'].includes(kind)){source=context.createBufferSource();source.buffer=noise;duration=kind==='breath'?.65:kind==='scrape'?.55:.28;level=kind==='breath'?.055:.075;f.type='bandpass';f.frequency.value=kind==='breath'?750:kind==='scrape'?2600:1200;f.Q.value=.8;}
  else {source=context.createOscillator();source.type='triangle';source.frequency.setValueAtTime(kind==='metal'?740:100,at);source.frequency.exponentialRampToValueAtTime(35,at+.16);f.type='lowpass';f.frequency.value=650;if(kind==='metal'){level=.05;duration=.65;}}
  g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(level,at+.018);g.gain.exponentialRampToValueAtTime(.001,at+duration);source.connect(f);f.connect(g);g.connect(master);track(source,g,f);source.start(at);source.stop(at+duration+.02);
 }
 function pause(){
  active=false;anchor=null;scheduled.clear();for(const source of [...nodes]){try{source.stop();}catch{}cleanups.get(source)?.();}if(master)master.gain.setTargetAtTime(0,context.currentTime,.025);
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
  if(footsteps&&time>=0&&time<10&&time-last<.65&&Math.floor(time*1.7)!==Math.floor(last*1.7))sound('step');
  last=time;lastAt=performance.now();
 }
 const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
 function dispose(){if(disposed)return;disposed=true;pause();abort.abort();document.removeEventListener('visibilitychange',visibility);void context?.close().catch(()=>{});buffers.clear();}
 return {resume,update,pause,dispose};
}
