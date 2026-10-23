const cues=[{at:.8,kind:'latch'},{at:1.6,kind:'door'},{at:11.5,kind:'knock'},{at:12.15,kind:'knock'},{at:17.6,kind:'wall'},{at:20.2,kind:'glass'},{at:21,kind:'door'},{at:22,kind:'drag'},{at:23.5,kind:'glass'},{at:26,kind:'glass'},{at:27.2,kind:'board'},{at:30.5,kind:'strain'},{at:33.2,kind:'board'},{at:34,kind:'door'},{at:39.7,kind:'door'},{at:47.4,kind:'knock'}];
for(let at=2.6;at<10;at+=.48)cues.push({at,kind:'step'});for(let at=20.5;at<27;at+=.38)cues.push({at,kind:'step'});for(let at=35;at<39;at+=.4)cues.push({at,kind:'step'});cues.sort((a,b)=>a.at-b.at);
export function endingAudioEvents(previous,time){return time>=previous&&time-previous<=.7?cues.filter(c=>c.at>previous&&c.at<=time):[];}
export function createHalloweenEndingAudio({muted=false,volume=.8}={}){
 let context,master,noise,drone,droneGain,disposed=false,last=0,quiet=muted,level=volume;const sources=new Set();
 function stop(){for(const s of [...sources]){try{s.stop();}catch{}}sources.clear();}
 function effect(kind){if(!context||context.state!=='running'||quiet)return;const at=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;
  const step=kind==='step',glass=kind==='glass',length=step?.13:kind==='drag'?1.4:kind==='strain'?.65:.48;source.loop=length>.5;
  filter.type=glass?'highpass':kind==='strain'?'bandpass':'lowpass';filter.frequency.value=glass?2800:step?220:kind==='strain'?650:900;filter.Q.value=.7;
  const power=step?.1:kind==='knock'?.13:kind==='strain'?.08:glass?.11:.2;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(power,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  source.connect(filter);filter.connect(gain);gain.connect(master);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(at+length+.02);
 }
 async function resume(){if(disposed)return false;try{if(!context){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;context=new C();master=context.createGain();master.gain.value=quiet?0:level;master.connect(context.destination);noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const d=noise.getChannelData(0);let seed=71;for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=(seed/4294967296*2-1)*.8;}
   drone=context.createOscillator();drone.type='sine';drone.frequency.value=47;droneGain=context.createGain();droneGain.gain.value=0;drone.connect(droneGain);droneGain.connect(master);drone.start();}
  await context.resume();return !disposed;}catch{return false;}}
 function sample(time){if(disposed)return;if(time<last-.3||time-last>1)stop();if(master){master.gain.setTargetAtTime(quiet?0:Math.max(0,Math.min(1,level)),context.currentTime,.035);droneGain.gain.setTargetAtTime(time<39?(time>=20?.035:.015):0,context.currentTime,.2);for(const cue of endingAudioEvents(last,time))effect(cue.kind);}last=time;}
 function setMuted(value){quiet=!!value;if(quiet)stop();if(master)master.gain.setTargetAtTime(quiet?0:level,context.currentTime,.025);}
 function dispose(){if(disposed)return;disposed=true;stop();try{drone?.stop();}catch{}void context?.close().catch(()=>{});}
 return {resume,sample,setMuted,setVolume:value=>{level=Math.max(0,Math.min(1,value));},dispose,get muted(){return quiet;},get unlocked(){return context?.state==='running';}};
}
