import {MONSTER,NOISE} from './monochrome2-tuning.js';
import {voiceNoise} from './microphone-noise.js';

/** A noise is {x,z,radius,type,urgent?,playerId?,at}. Radii are nominal; the monster applies walls. */
export function footstepEmitter(){
 const trackers=new Map();
 return {
  /** Returns a noise when a stride completes. Crouch-walking is nearly silent. */
  step(id,movedDistance,{sprint=false,crouch=false,x,z}={}){
   if(!Number.isFinite(movedDistance)||movedDistance<=0)return null;
   const kind=crouch?'crouch':sprint?'sprint':'walk',t=trackers.get(id)??{distance:0};trackers.set(id,t);
   t.distance+=movedDistance;const stride=NOISE.stride[kind];
   if(t.distance<stride)return null;t.distance%=stride;
   return {x,z,radius:NOISE[kind],type:kind,playerId:id};
  },
  reset(){trackers.clear();}
 };
}
export function interactionNoise(targetId,position){
 const key=targetId?.startsWith?.('part-')?'part':targetId?.startsWith?.('revive:')?'revive':targetId;
 const radius=NOISE.interact[key];if(!radius)return null;
 // The lit exit door's hydraulics are the loudest thing in Level 0: it is a deliberate alarm.
 return {x:position.x,z:position.z,radius,type:key,urgent:key==='pit-exit-door',playerId:position.id};
}
/** Wobbling on a beam carries; falling is a shout. `state` is per-player {at,fell}. */
export function balanceNoise(player,state,time){
 const b=player.balance;if(!b?.active)return null;
 if(b.falling&&!state.fell){state.fell=true;return {x:player.x,z:player.z,radius:NOISE.fall.radius,type:'fall',urgent:true,playerId:player.id};}
 if(!b.falling)state.fell=false;
 if(Math.abs(b.angle)>=NOISE.wobble.threshold&&time-(state.at??-Infinity)>=NOISE.wobble.every){state.at=time;return {x:player.x,z:player.z,radius:NOISE.wobble.radius,type:'wobble',playerId:player.id};}
 return null;
}
/** Microphone loudness tier 1–4 (never recorded audio) → a noise, scaled for Level 0's rooms. */
export function microphoneNoise(level,player){
 const n=voiceNoise(level,{...player,hidden:false,status:'alive',sprint:!!player.sprint,moving:(player.speed??0)>.1});
 return n?{...n,radius:n.radius*NOISE.voiceScale}:null;
}

/**
 * The loudest audible noise, or null. Each wall between source and monster multiplies reach, and a
 * closed pitfall door counts as a wall. Urgent noise (screams, the exit alarm) outranks everything.
 */
export function strongestHeard(monster,noises,space,{scale=1}={}){
 let best=null,bestScore=-Infinity;
 for(const noise of noises){
  if(!Number.isFinite(noise.radius)||noise.radius<=0||!Number.isFinite(noise.x)||!Number.isFinite(noise.z))continue;
  const distance=Math.hypot(noise.x-monster.x,noise.z-monster.z),walls=space.wallsBetween(monster,noise);
  const range=noise.radius*scale*MONSTER.hearing.base*Math.pow(MONSTER.hearing.wallFactor,Math.min(walls,MONSTER.hearing.maxWalls));
  const strength=1-distance/range;if(strength<0)continue;
  const score=strength+(noise.urgent?2:0);
  if(score>bestScore){best=noise;bestScore=score;}
 }
 return best;
}
