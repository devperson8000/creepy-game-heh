import {PITFALLS,gridX,gridZ,inPitGrid,onPitBeam,canWalkPit} from './backrooms-pitfalls.js';

// Authored gameplay tuning, rather than a claim about the reference game's physics.
const MAX_STEP=.025,FALL_ANGLE=.78;
/**
 * Beam balance tuning. Crossing the grid is meant to be hard: the tilt keeps drifting, gusts shove you off
 * line, moving (and above all hurrying) shakes you, and the longer you stay out on the beams the worse it gets.
 * Crossings and stopping to crouch buy a little control back. All of it is authored to be survivable by a
 * careful player and to fail a hurried or inattentive one: see tests/backrooms-balance.test.js.
 */
export const PIT_BALANCE=Object.freeze({
 tip:3.7,lean:2.8,damping:.62,
 /** Extra disturbance when moving at beam walking pace, and when sprinting (sprint is also blocked on beams). */
 moveGain:.8,moveFull:2.2,
 /** Disturbance grows by up to `exposureGain` over `exposureSeconds` on the beams; intersections shed some of it. */
 exposureGain:.9,exposureSeconds:25,exposureShed:.9,
 /** Crouch-walking is steadier, but only a little: it is slower, and slowness is paid for in fatigue. */
 crouchFactor:.9,
 /** A crossing only steadies you fully if you stop on it; walking straight through keeps just this share of it. */
 recoverMoving:.2,recoverFull:1.6,
 /** Gusts: a possible shove every `gustEvery` seconds, lasting `gustLength`, up to `gustPush` of acceleration. */
 gustEvery:2.6,gustChance:.58,gustLength:.7,gustPush:3.1
});
let active=PIT_BALANCE;
/** Swap the tuning (calibration scripts and tests only); pass nothing to restore the shipped values. */
export function usePitBalance(values){active=values?Object.freeze({...PIT_BALANCE,...values}):PIT_BALANCE;}
/** Deterministic hash → [0,1): gusts must replay identically on host, client prediction and tests. */
function hash(n){let x=Math.imul(n^0x9E3779B9,0x85EBCA6B);x^=x>>>13;x=Math.imul(x,0xC2B2AE35);x^=x>>>16;return (x>>>0)/4294967296;}
function gustAt(phase,salt){
 const B=active,slot=Math.floor(phase/B.gustEvery),frac=(phase-slot*B.gustEvery)/B.gustLength;
 if(frac<0||frac>=1||hash(slot*7919+salt)>B.gustChance)return 0;
 const sign=hash(slot*104729+salt+1)<.5?-1:1,power=.55+.45*hash(slot*1299709+salt+2);
 return sign*power*Math.sin(Math.PI*frac)**2;
}
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

export function resetPitBalance(player){
 return player.balance={angle:0,velocity:0,phase:0,active:false,falling:false,intersectionTime:0,exposure:0,salt:0};
}

function startFall(player,state,yaw){
 const g=PITFALLS.grid,margin=g.beam/2+.07;
 const rightX=Math.cos(yaw)*Math.sign(state.angle||1),rightZ=-Math.sin(yaw)*Math.sign(state.angle||1);
 let best=null;
 // Pick an actual neighboring shaft opening. At crossings this yields a short
 // diagonal route off both beams; perimeter beams always tip toward the grid.
 for(let i=0;i<g.columns;i++)for(let j=0;j<g.rows;j++){
  // Land on open floor: at a column intersection the nearest point of a shaft opening lies inside the
  // column's collision zone, so back off until the landing is genuinely walkable (it would pin the player).
  let x=0,z=0,ok=false;
  for(const extra of [0,.2,.4,.6,.8]){
   x=clamp(player.x,g.minX+i*g.cell+margin+extra,g.minX+(i+1)*g.cell-margin-extra);
   z=clamp(player.z,g.minZ+j*g.cell+margin+extra,g.minZ+(j+1)*g.cell-margin-extra);
   if(canWalkPit(x,z,PITFALLS.floorY)){ok=true;break;}
  }
  if(!ok)continue;
  const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
  if(d>g.cell||d===0)continue;
  const score=d-.24*(dx*rightX+dz*rightZ)/d;
  if(!best||score<best.score)best={x,z,score};
 }
 if(best){state.falling=true;state.fallX=best.x;state.fallZ=best.z;}
}

function moveFall(player,state,dt,canMove){
 if(!onPitBeam(player.x,player.z))return;
 const dx=state.fallX-player.x,dz=state.fallZ-player.z,distance=Math.hypot(dx,dz);
 if(!distance)return;
 const travel=Math.min(distance,1.4*dt),segments=Math.max(1,Math.ceil(travel/.035));
 const mx=dx/distance*travel/segments,mz=dz/distance*travel/segments;
 for(let i=0;i<segments;i++){
  const x=player.x+mx,z=player.z+mz;
  if(!canMove(x,z))break;
  player.x=x;player.z=z;
  if(!onPitBeam(x,z))break;
 }
}

/** Run after horizontal movement and before gravity, using the same collision
 * callback as walking. Positive angle/lean is camera-right (E), negative is Q.
 * The returned state lives on player so host, solo and prediction use one model.
 */
export function stepPitBalance(player,input={},dt=0,{canMove=(x,z)=>canWalkPit(x,z,player.y??0)}={}){
 if((player.y??0)<-.25||player.climbing||player.ropeClimb||!inPitGrid(player.x,player.z))return resetPitBalance(player);
 const state=player.balance??resetPitBalance(player);
 if(!state.falling&&!onPitBeam(player.x,player.z))return resetPitBalance(player);
 if(!state.active){state.active=true;state.angle=.035;state.velocity=0;state.exposure=state.exposure??0;state.salt=Math.floor(Math.abs(player.x*13.7+player.z*7.3))%997;}
 const lean=clamp(finite(input.lean),-1,1),yaw=finite(input.yaw,finite(player.yaw));
 let remaining=Math.max(0,finite(dt));
 while(remaining>1e-10){
  const h=Math.min(MAX_STEP,remaining);remaining-=h;
  state.phase+=h;
  if(state.falling){moveFall(player,state,h,canMove);continue;}
  const cross=gridX().some(x=>Math.abs(player.x-x)<=PITFALLS.grid.beam/2)&&gridZ().some(z=>Math.abs(player.z-z)<=PITFALLS.grid.beam/2);
  state.intersectionTime=cross?state.intersectionTime+h:0;
  // Crossings catch a wobble briefly. Staying put exhausts that recovery and
  // restores ordinary instability, preventing an indefinitely safe resting spot.
  const B=active,recovery=cross&&state.intersectionTime<1.2;
  state.exposure=Math.max(0,state.exposure+(cross?-B.exposureShed:1)*h);
  if(recovery){
   const hold=1-(1-B.recoverMoving)*clamp(finite(player.speed)/B.recoverFull,0,1);
   state.velocity+=(lean*1.8-hold*(state.angle*9+state.velocity*6))*h;
  }else{
   const base=.18+.32*Math.sin(state.phase*1.7)+.12*Math.sin(state.phase*3.1);
   const move=1+B.moveGain*clamp(finite(player.speed)/B.moveFull,0,2),tired=1+B.exposureGain*clamp(state.exposure/B.exposureSeconds,0,1);
   const disturbance=base*move*tired*(input.crouch?B.crouchFactor:1)+gustAt(state.phase,state.salt)*B.gustPush;
   state.velocity+=(state.angle*B.tip+disturbance+lean*B.lean-state.velocity*B.damping)*h;
  }
  state.angle=clamp(state.angle+state.velocity*h,-1.1,1.1);
  if(Math.abs(state.angle)>=FALL_ANGLE){startFall(player,state,yaw);if(state.falling)moveFall(player,state,h,canMove);}
 }
 return state;
}
