import {PITFALLS,gridX,gridZ,inPitGrid,onPitBeam,canWalkPit} from './backrooms-pitfalls.js';

// Authored gameplay tuning, rather than a claim about the reference game's physics.
const MAX_STEP=.025,FALL_ANGLE=.78;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

export function resetPitBalance(player){
 return player.balance={angle:0,velocity:0,phase:0,active:false,falling:false,intersectionTime:0};
}

function startFall(player,state,yaw){
 const g=PITFALLS.grid,margin=g.beam/2+.07;
 const rightX=Math.cos(yaw)*Math.sign(state.angle||1),rightZ=-Math.sin(yaw)*Math.sign(state.angle||1);
 let best=null;
 // Pick an actual neighboring shaft opening. At crossings this yields a short
 // diagonal route off both beams; perimeter beams always tip toward the grid.
 for(let i=0;i<g.columns;i++)for(let j=0;j<g.rows;j++){
  const x=clamp(player.x,g.minX+i*g.cell+margin,g.minX+(i+1)*g.cell-margin);
  const z=clamp(player.z,g.minZ+j*g.cell+margin,g.minZ+(j+1)*g.cell-margin);
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
 if(!state.active){state.active=true;state.angle=.035;state.velocity=0;}
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
  const recovery=cross&&state.intersectionTime<1.2;
  if(recovery){
   state.velocity+=(lean*1.8-state.angle*9-state.velocity*6)*h;
  }else{
   const disturbance=.18+.32*Math.sin(state.phase*1.7)+.12*Math.sin(state.phase*3.1);
   const crouch=input.crouch ? .78 : 1;
   state.velocity+=(state.angle*1.85+disturbance*crouch+lean*2.6-state.velocity*.65)*h;
  }
  state.angle=clamp(state.angle+state.velocity*h,-1.1,1.1);
  if(Math.abs(state.angle)>=FALL_ANGLE){startFall(player,state,yaw);if(state.falling)moveFall(player,state,h,canMove);}
 }
 return state;
}
