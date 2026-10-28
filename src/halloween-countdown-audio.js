// Optional, locally generated timer atmosphere. No recordings or game audio
// are changed; the menu owns and disposes this entire graph.
export function createCountdownAudio(){
 let context=null,master=null,bed=null,bedGain=null,enabled=false,disposed=false,available=true,nextBeat=0,target=-1;
 const sources=new Set();
 function stopSources(){
  for(const source of sources)try{source.stop();}catch{}
  sources.clear();bed=null;bedGain=null;nextBeat=0;
 }
 function silence(){if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(0,context.currentTime);target=0;}stopSources();}
 async function setEnabled(value){
  if(disposed)return false;enabled=!!value;
  if(!enabled){silence();return false;}
  try{
   if(!context){const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Constructor){available=false;enabled=false;return false;}context=new Constructor();master=context.createGain();master.gain.value=0;master.connect(context.destination);}
   await context.resume();
   if(disposed||!enabled){silence();return false;}
   return context.state==='running';
  }catch{enabled=false;silence();return false;}
 }
 function startBed(){
  const source=context.createBufferSource(),buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.6;
  source.buffer=buffer;source.loop=true;
  const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=160;filter.Q.value=.6;
  const gain=context.createGain();gain.gain.value=.008;source.connect(filter);filter.connect(gain);gain.connect(master);
  bed=source;bedGain=gain;sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();if(bed===source){bed=null;bedGain=null;}};source.start();
 }
 function pulse(when,level){
  const source=context.createOscillator(),gain=context.createGain();source.type='sine';source.frequency.setValueAtTime(62,when);source.frequency.exponentialRampToValueAtTime(35,when+.14);
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.018);gain.gain.exponentialRampToValueAtTime(.0001,when+.18);
  source.connect(gain);gain.connect(master);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};source.start(when);source.stop(when+.2);
 }
 function update(presentation,{volume=0,visible=true}={}){
  if(!context||disposed)return;
  const active=enabled&&visible&&context.state==='running'&&presentation.confirmed&&['approaching','urgent','final'].includes(presentation.phase)&&volume>0;
  if(!active){silence();return;}
  const now=context.currentTime,nextVolume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:0));
  if(nextVolume!==target){master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(nextVolume,now,.04);target=nextVolume;}
  if(!bed)startBed();bedGain.gain.setTargetAtTime(.008+presentation.intensity*.018,now,.1);
  if(presentation.phase==='approaching'){nextBeat=0;return;}
  const interval=.95-presentation.intensity*.43;
  if(nextBeat<now)nextBeat=now+.02;
  while(nextBeat<now+.3){pulse(nextBeat,.07+presentation.intensity*.045);pulse(nextBeat+.17,.032);nextBeat+=interval;}
 }
 function dispose(){if(disposed)return;disposed=true;enabled=false;silence();master?.disconnect();void context?.close().catch(()=>{});}
 return {setEnabled,update,dispose,get enabled(){return enabled;},get available(){return available;}};
}
