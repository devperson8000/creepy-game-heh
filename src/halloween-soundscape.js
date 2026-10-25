import {createUpdateSamples,UPDATE_SAMPLES} from './update-samples.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export function updateAmbienceCues(time,{threat=0,hidden=false,hush=1,yaw=0}={}){
 const duck=(1-clamp(threat)*.7)*(hidden?.55:1)*clamp(hush),rows=[];
 for(const spec of [{id:'room',period:43,start:1,length:12,level:.13,pan:-.45},{id:'wind',period:57,start:17,length:7,level:.15,pan:.65}]){
  const cycle=Math.floor(time/spec.period),phase=time-cycle*spec.period-spec.start;
  if(phase>=0&&phase<spec.length&&duck>.01)rows.push({id:spec.id,key:spec.id+cycle,offset:phase+cycle*3,duration:spec.length-phase,gain:spec.level,pan:Math.sin(yaw+(spec.pan>0?1:-1))*.65,duck});
 }
 return rows;
}
export function createHalloweenSoundscape(context){
 const bank=createUpdateSamples(context,{files:{room:UPDATE_SAMPLES.room,wind:UPDATE_SAMPLES.wind}}),played=new Set();let time=0;
 return {update(options={}){
  if(options.muted||globalThis.document?.hidden){bank.volume(0);bank.stop();return;}
  time+=Math.max(0,Math.min(.2,options.delta??0));const cues=updateAmbienceCues(time,options),duck=(1-clamp(options.threat??0)*.7)*(options.hidden?.55:1)*clamp(options.hush??1);bank.volume(clamp(options.volume??.8)*duck);
  for(const cue of cues)if(!played.has(cue.key)&&bank.play(cue.id,cue)){played.add(cue.key);if(played.size>16)played.delete(played.values().next().value);}
 },pause(){bank.volume(0);bank.stop();},dispose:()=>bank.dispose(),get ready(){return bank.ready;}};
}
