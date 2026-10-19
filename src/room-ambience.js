import {HUNT_START_SECONDS} from './hunt-clock.js';
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function ambienceMix({huntElapsed=0,threat=0,hidden=false,sprinting=false}={}){
 const hunting=huntElapsed>=HUNT_START_SECONDS,danger=hunting?clamp(threat):0;
 const hush=!hunting?clamp((huntElapsed-(HUNT_START_SECONDS-2.5))/2.5):0;
 return {room:1-hush*.9,heartbeat:clamp((danger-.25)/.75),breath:clamp((sprinting?.7:0)+danger*.25)*(hidden?.25:1),drone:hunting?.15+danger*.55:0};
}
/** Generated room tone, exertion and restrained threat cues. Gesture-gated. */
export function createRoomAmbience(){
 let context,master,hum,air,drone,droneGain,breath,breathGain,disposed=false,muted=false,nextKnock=0,nextBeat=0,volume=1,mix=ambienceMix(),breathPhase=0,lastBus=null;
 const sounds=new Set();
 function bus(){if(!master||context.state==='closed')return;const target=muted?0:.028*volume*mix.room;if(target===lastBus)return;lastBus=target;master.gain.setTargetAtTime(target,context.currentTime,.12);}
 async function resume(){
  if(disposed||muted)return;
  try{
   if(!context){
    const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();master=context.createGain();master.gain.value=.028*volume;master.connect(context.destination);
    hum=context.createOscillator();hum.type='sine';hum.frequency.value=54;hum.connect(master);hum.start();
    const buffer=context.createBuffer(1,Math.floor(context.sampleRate*3),context.sampleRate),data=buffer.getChannelData(0);let previous=0;
    for(let i=0;i<data.length;i++){previous=(previous+.035*(Math.random()*2-1))/1.025;data[i]=previous*.6;}
    air=context.createBufferSource();air.buffer=buffer;air.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620;air.connect(filter);filter.connect(master);air.start();
    drone=context.createOscillator();drone.frequency.value=35;droneGain=context.createGain();droneGain.gain.value=0;drone.connect(droneGain);droneGain.connect(master);drone.start();
    const breathBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate),breathData=breathBuffer.getChannelData(0);for(let i=0;i<breathData.length;i++)breathData[i]=(Math.random()*2-1)*.25;
    breath=context.createBufferSource();breath.buffer=breathBuffer;breath.loop=true;const breathFilter=context.createBiquadFilter();breathFilter.type='bandpass';breathFilter.frequency.value=920;breathFilter.Q.value=.65;breathGain=context.createGain();breathGain.gain.value=0;breath.connect(breathFilter);breathFilter.connect(breathGain);breathGain.connect(master);breath.start();
    nextKnock=performance.now()+11000+Math.random()*9000;
   }
   await context.resume();bus();
  }catch{}
 }
 function pulse(frequency,duration,level,delay=0,pan=0){
  const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime+delay;
  oscillator.type=frequency>100?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(frequency>100?48:32,now+duration*.6);
  gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  const panner=context.createStereoPanner?.();oscillator.connect(gain);if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(master);}else gain.connect(master);
  oscillator.start(now);oscillator.stop(now+duration+.02);sounds.add(oscillator);oscillator.onended=()=>{sounds.delete(oscillator);oscillator.disconnect();gain.disconnect();panner?.disconnect();};
 }
 function update(options={}){
  mix=ambienceMix(options);if(!context||context.state!=='running'||disposed)return;bus();
  const dt=Math.max(0,Math.min(.2,options.delta??1/60));breathPhase+=dt*(options.sprinting?1.1:.65)*Math.PI*2;
  droneGain.gain.setTargetAtTime(mix.drone*.5,context.currentTime,.4);breathGain.gain.setTargetAtTime(muted?0:mix.breath*.45*Math.pow(Math.max(0,Math.sin(breathPhase)),1.8),context.currentTime,.045);
  if(muted)return;
  const now=performance.now();
  if(mix.heartbeat>.02&&now>=nextBeat){nextBeat=now+1100-mix.heartbeat*430;pulse(64,.16,mix.heartbeat*.65);pulse(54,.14,mix.heartbeat*.4,.19);}
  if(now<nextKnock||mix.room<.5)return;nextKnock=now+14000+Math.random()*18000;pulse(145+Math.random()*35,.5,.1,0,(Math.random()-.5)*1.5);
 }
 function setMuted(value){muted=!!value;bus();if(muted)for(const sound of sounds)sound.stop();}
 function toggle(){setMuted(!muted);if(!muted)void resume();return !muted;}
 function setVolume(value){const next=clamp(value);if(next===volume)return;volume=next;bus();}
 function pause(){for(const sound of sounds)sound.stop();if(context?.state==='running')void context.suspend().catch(()=>{});}
 function dispose(){if(disposed)return;disposed=true;hum?.stop();air?.stop();drone?.stop();breath?.stop();for(const sound of sounds)sound.stop();sounds.clear();void context?.close();}
 return {resume,update,toggle,setMuted,setVolume,pause,dispose,get muted(){return muted;}};
}
