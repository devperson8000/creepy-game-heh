import {createUpdateSamples,UPDATE_SAMPLES} from './update-samples.js';
/** Original elevator/CRT score with a restrained licensed monitor-interference accent. */
export function createHalloweenAudio(){
 let samples,staticKey=null;
 let context,master,hum,noise,noiseGain,drone,droneGain,muted=false,volume=.8,lastStage='',disposed=false;const sounds=new Set();
 function start(){if(disposed||context)return;try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();master=context.createGain();master.gain.value=0;master.connect(context.destination);samples=createUpdateSamples(context,{files:{static:UPDATE_SAMPLES.static}});
  hum=context.createOscillator();hum.frequency.value=48;hum.connect(master);hum.start();
  drone=context.createOscillator();drone.frequency.value=31;droneGain=context.createGain();droneGain.gain.value=0;drone.connect(droneGain);droneGain.connect(master);drone.start();
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let n=0;for(let i=0;i<data.length;i++){n=(n+Math.random()*.2-.1)/1.03;data[i]=n;}
  noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;noiseGain=context.createGain();noiseGain.gain.value=.1;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1500;noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(master);noise.start();
 }catch{}}
 function chime(frequency,level=.5,duration=.6){if(!context||context.state!=='running')return;const o=context.createOscillator(),g=context.createGain(),at=context.currentTime;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(level,at+.012);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(master);o.start();o.stop(at+duration+.03);sounds.add(o);o.onended=()=>{sounds.delete(o);o.disconnect();g.disconnect();};}
 return {resume(){start();void context?.resume().catch(()=>{});},update(stage,elapsed,options={}){muted=!!options.muted;volume=options.volume??.8;if(!context)return;
  if(stage!==lastStage){staticKey=null;samples.stop();}
  const quiet=muted||document.hidden;samples.volume(quiet?0:volume);if(quiet)samples.stop();
  const inSwitch=stage==='conversation'&&elapsed>=11.2&&elapsed<11.85,cycle=Math.floor(elapsed/37),inArchive=stage==='archive'&&elapsed%37>=17&&elapsed%37<17.7,key=inSwitch?'switch':inArchive?'archive:'+cycle:null;
  if(!quiet&&key&&key!==staticKey&&samples.play('static',{gain:inSwitch?.065:.025,duration:inSwitch?.55:.4,offset:.3,pan:-.35,fade:.035}))staticKey=key;
  const target=muted||document.hidden?0:volume*.03;master.gain.setTargetAtTime(target,context.currentTime,.12);droneGain.gain.setTargetAtTime(stage==='archive'?.12:.5,context.currentTime,.2);noiseGain.gain.setTargetAtTime(.12,context.currentTime,.1);if(stage!==lastStage){if(stage==='archive')chime(660,.5);else if(stage==='descent'||stage==='return')chime(105,.6,.9);lastStage=stage;}},pause(){samples?.stop();samples?.volume(0);if(master)master.gain.setTargetAtTime(0,context.currentTime,.05);},dispose(){disposed=true;samples?.dispose();for(const s of sounds)s.stop();hum?.stop();noise?.stop();drone?.stop();void context?.close();}};
}
