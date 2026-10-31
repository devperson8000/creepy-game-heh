import {gamePreferences} from './preferences.js';
import {OPENING_LINES,openingLineAt} from './opening-dialogue.js';

// Original synthesized Foley and small prerecorded neural lines. This soundtrack
// is independent of the gameplay monster and the sequel's metallic mix.
export function createOpeningAudio(){
 let context,master,noise,reverb,room,last=0,muted=false,disposed=false,wind=null,activeVoice=null;const sources=new Set(),voices=new Map(),spoken=new Set(),abort=new AbortController();
 function init(){if(context||disposed)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  context=new Audio();master=context.createGain();master.gain.value=gamePreferences().volume*.65;master.connect(context.destination);
  noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=noise.getChannelData(0);let state=19;for(let i=0;i<data.length;i++){state=(state*1664525+1013904223)>>>0;data[i]=state/2147483648-1;}
 }
 function burst({frequency=200,duration=.15,volume=.15,tone=false,endFrequency=frequency}={}){
  if(!context||context.state!=='running'||disposed||muted)return;
  const source=tone?context.createOscillator():context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),now=context.currentTime;
  if(tone){source.type='sine';source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),now+duration);}else{source.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;}
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(master);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(now+duration+.02);return {source,gain,filter};
 }
 // A quiet, short room response preserves consonants; the dry voice stays clear.
 function setupRoom(){
  reverb=context.createConvolver();room=context.createGain();room.gain.value=.07;
  const impulse=context.createBuffer(1,Math.floor(context.sampleRate*.26),context.sampleRate),data=impulse.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=noise.getChannelData(0)[i]*Math.exp(-i/(context.sampleRate*.048))*.32;
  reverb.buffer=impulse;reverb.connect(room);room.connect(master);
 }
 function syncVoice(time){
  if(disposed||muted||context?.state!=='running')return;
  const line=openingLineAt(time),buffer=line&&voices.get(line.file);
  if(!buffer||time-line.at>=buffer.duration||spoken.has(line.file))return;
  if(activeVoice){try{activeVoice.source.stop();}catch{}}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=1.35;
  source.connect(gain);gain.connect(master);gain.connect(reverb);sources.add(source);spoken.add(line.file);activeVoice={source,line};room.gain.value=line.file==='where'?.1:.07;
  source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();if(activeVoice?.source===source)activeVoice=null;};
  source.start(0,Math.max(0,time-line.at));
 }
 let ready;
 try{init();if(context){setupRoom();ready=Promise.allSettled(OPENING_LINES.map(async line=>{
  const response=await fetch(`/audio/opening/${line.file}.mp3`,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(8000)])});if(!response.ok)throw new Error('Opening dialogue unavailable');
  const data=await response.arrayBuffer();if(disposed)return;const buffer=await context.decodeAudioData(data);if(!disposed)voices.set(line.file,buffer);
 }));}}catch{/* Unsupported audio never prevents the film or captions. */}
 ready??=Promise.resolve();
 const cues=[
  [7.85,()=>burst({frequency:165,duration:1.9,volume:.12,tone:true,endFrequency:68})],
  [10.9,()=>burst({frequency:110,duration:.28,volume:.17})],
  [14.03,()=>burst({frequency:2700,duration:.065,volume:.1})],
  [22.4,()=>burst({frequency:650,duration:.22,volume:.08})],
  [23.05,()=>{burst({frequency:1800,duration:.22,volume:.11});burst({frequency:48,duration:.8,volume:.12,tone:true,endFrequency:29});}],
  [27.1,()=>burst({frequency:900,duration:.4,volume:.075})],
  [30.3,()=>burst({frequency:42,duration:2.3,volume:.13,tone:true,endFrequency:27})],
  [38.05,()=>{burst({frequency:170,duration:.3,volume:.32});burst({frequency:1600,duration:.45,volume:.17});}],
  [38.45,()=>{wind=burst({frequency:1600,duration:4.3,volume:.27});}],
 ];
 function resume(){if(disposed)return;try{init();if(context&&!muted)void context.resume().then(()=>syncVoice(last)).catch(()=>{});}catch{/* Visual playback does not depend on autoplay permission. */}}
 function pause(){if(context?.state==='running')void context.suspend().catch(()=>{});}
 function setEnabled(value){if(disposed)return;init();muted=!value;if(master)master.gain.value=muted?0:gamePreferences().volume*.65;if(!muted)resume();}
 return {ready,update(frame){const t=frame.time;if(t<last){last=t;return;}
  for(const [at,play]of cues)if(last<at&&t>=at)play();
  if(t<8&&Math.floor(last/.42)!==Math.floor(t/.42)){const note=[196,246.94,293.66,246.94][Math.floor(t/.42)%4];burst({frequency:note,endFrequency:note,duration:.3,volume:.014,tone:true});}
  const walking=t<20||(t>28.8&&t<38);if(walking&&Math.floor(last/.58)!==Math.floor(t/.58))burst({frequency:t<8?1000:270,duration:.13,volume:t<8?.06:.09});
  syncVoice(t);
  if(wind)wind.filter.frequency.value=1600*(.3+.7*frame.light);last=t;
 },resume,pause,setEnabled,toggle(){if(disposed)return;const wasEnabled=!muted&&context?.state==='running';init();muted=wasEnabled;if(master)master.gain.value=muted?0:gamePreferences().volume*.65;if(!muted)resume();},get enabled(){return !muted&&context?.state==='running';},dispose(){if(disposed)return;disposed=true;abort.abort();for(const s of sources){try{s.stop();}catch{}s.disconnect();}sources.clear();voices.clear();spoken.clear();activeVoice=null;reverb?.disconnect();room?.disconnect();master?.disconnect();if(context)void context.close().catch(()=>{});context=null;}};
}
