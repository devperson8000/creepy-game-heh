import {TELEGRAPH} from './monochrome2-tuning.js';
import {createMonsterSpatialBus} from './monster-spatial-audio.js';

const clamp01=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*t;
/**
 * Servo whine and jaw clicks that grow louder, faster and higher as he nears, well before he is
 * in sight. Pure so the curve is testable; walls only muffle it (the spatial bus filters further).
 */
export function telegraphMix({distance,occluded=false,mode='patrol',speed=0}={}){
 const range=TELEGRAPH.range;
 if(!Number.isFinite(distance)||distance>=range||mode==='dormant')return {audible:false,whineGain:0,clickGain:0,clickPeriod:Infinity,whineHz:TELEGRAPH.whineHz.idle,near:0};
 const near=clamp01((range-Math.max(0,distance))/range),muffle=occluded?.55:1;
 const hunting=mode==='chase'||mode==='attack';
 return {
  audible:true,near,
  whineGain:Math.pow(near,1.5)*.17*muffle,
  clickGain:Math.pow(near,1.35)*.34*muffle,
  clickPeriod:lerp(TELEGRAPH.jawClickPeriod.far,TELEGRAPH.jawClickPeriod.near,Math.pow(near,.8))*(hunting?.8:1),
  whineHz:lerp(TELEGRAPH.whineHz.idle,TELEGRAPH.whineHz.chase,hunting?1:clamp01(speed/9))+near*140
 };
}

/** WebAudio voice for the servo whine and jaw clicks, positioned at the monster. */
export function createMonochrome2Telegraph(context,destination,{onClick=()=>{}}={}){
 const bus=createMonsterSpatialBus(context,destination),out=context.createGain();out.gain.value=1;out.connect(bus.input);
 const whine=context.createGain(),band=context.createBiquadFilter(),a=context.createOscillator(),b=context.createOscillator(),tremolo=context.createOscillator(),tremoloDepth=context.createGain();
 a.type='sawtooth';b.type='triangle';band.type='bandpass';band.Q.value=5;whine.gain.value=0;
 tremolo.frequency.value=7.5;tremoloDepth.gain.value=.35;tremolo.connect(tremoloDepth);tremoloDepth.connect(whine.gain);
 a.connect(band);b.connect(band);band.connect(whine);whine.connect(out);a.start();b.start();tremolo.start();
 const noise=context.createBuffer(1,Math.max(1,Math.floor(context.sampleRate*.02)),context.sampleRate),data=noise.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*.22));
 let clock=0,disposed=false;
 function click(volume){
  if(disposed||context.state!=='running')return;
  const at=context.currentTime,src=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain(),thump=context.createOscillator(),tg=context.createGain();
  src.buffer=noise;f.type='bandpass';f.frequency.value=2200+Math.random()*900;f.Q.value=9;g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+.05);
  src.connect(f);f.connect(g);g.connect(out);src.start(at);
  thump.type='sine';thump.frequency.setValueAtTime(110,at);thump.frequency.exponentialRampToValueAtTime(55,at+.04);tg.gain.setValueAtTime(volume*.6,at);tg.gain.exponentialRampToValueAtTime(.0001,at+.06);thump.connect(tg);tg.connect(out);thump.start(at);thump.stop(at+.08);
  src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};thump.onended=()=>{thump.disconnect();tg.disconnect();};
 }
 return {
  mix:telegraphMix,
  update({listener,source,distance,occluded=false,mode,speed=0,delta=0,volume=1}){
   if(disposed||!listener||!source)return null;
   const mix=telegraphMix({distance,occluded,mode,speed}),now=context.currentTime;
   bus.update({listener,source,occluded});
   whine.gain.setTargetAtTime(mix.whineGain*volume,now,.12);
   a.frequency.setTargetAtTime(mix.whineHz,now,.2);b.frequency.setTargetAtTime(mix.whineHz*1.498,now,.2);band.frequency.setTargetAtTime(mix.whineHz*1.3,now,.2);
   if(mix.audible){clock+=Math.max(0,Math.min(.25,delta));if(clock>=mix.clickPeriod){clock=0;click(mix.clickGain*volume);onClick(mix);}}else clock=0;
   return mix;
  },
  dispose(){if(disposed)return;disposed=true;for(const o of [a,b,tremolo]){try{o.stop();}catch{}o.disconnect();}for(const n of [band,whine,tremoloDepth,out])n.disconnect();bus.dispose();}
 };
}
