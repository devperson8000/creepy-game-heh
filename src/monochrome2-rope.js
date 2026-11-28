import {PITFALLS as P,gridX,gridZ,canWalkPit} from './backrooms-pitfalls.js';
import {lowerRoute} from './backrooms-lower-route.js';

/**
 * The rescue rope. A rescuer standing on a beam clamps an anchor bar to the beam edge so it juts over a shaft
 * opening, and the rope hangs from its tip clear of the shaft wall. The fallen player walks to the rope's foot,
 * climbs it hand over hand, pulls themself up above the beam, and slides onto it. Everything is plain geometry so the
 * climb can be checked against the shaft walls for clipping.
 */
export const ROPE=Object.freeze({
 /** The rescuer must be within this of a shaft opening's edge. */
 reach:1.5,
 /** How far the rope hangs inside the opening, measured from its nearest wall (body radius is .22). */
 inset:.5,barY:.07,
 /** The fallen player must be within this of the rope's foot to grab it. */
 grab:1.9,
 foot:.9,climb:4.2,lift:.5,slide:.7,
 throwSeconds:1.5,unrollSeconds:1.6,
 liftHeight:.14,climbTop:-.42
});
export const ROPE_CLIMB_SECONDS=ROPE.foot+ROPE.climb+ROPE.lift+ROPE.slide;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

/** Every open shaft cell of the pit grid: the rectangle you could fall through. */
export function openingCells(){
 const xs=gridX(),zs=gridZ(),h=P.grid.beam/2,cells=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++)cells.push({i,j,x0:xs[i]+h,x1:xs[i+1]-h,z0:zs[j]+h,z1:zs[j+1]-h});
 return cells;
}
/** Rope plans from a rescuer's spot: for each reachable opening edge, a lip on the edge and a hang point inset from it. */
export function ropeCandidates(rescuer){
 const out=[],m=ROPE.inset;
 for(const c of openingCells()){
  const edges=[
   {lip:{x:clamp(rescuer.x,c.x0+m,c.x1-m),z:c.z0},inward:{x:0,z:1}},{lip:{x:clamp(rescuer.x,c.x0+m,c.x1-m),z:c.z1},inward:{x:0,z:-1}},
   {lip:{x:c.x0,z:clamp(rescuer.z,c.z0+m,c.z1-m)},inward:{x:1,z:0}},{lip:{x:c.x1,z:clamp(rescuer.z,c.z0+m,c.z1-m)},inward:{x:-1,z:0}}
  ];
  for(const e of edges){
   const d=Math.hypot(rescuer.x-e.lip.x,rescuer.z-e.lip.z);if(d>ROPE.reach)continue;
   const hang={x:e.lip.x+e.inward.x*m,z:e.lip.z+e.inward.z*m};
   if(hang.x<c.x0+m-1e-9||hang.x>c.x1-m+1e-9||hang.z<c.z0+m-1e-9||hang.z>c.z1-m+1e-9)continue;
   if(!canWalkPit(hang.x,hang.z,P.floorY))continue;
   out.push({cell:c,lip:e.lip,hang,d});
  }
 }
 return out.sort((a,b)=>a.d-b.d);
}
/**
 * Choose where the rope hangs for a fallen player: the reachable opening whose foot is closest to them by walking.
 * Returns {anchor,lip,hang,bottom,outward} or null when no opening beside the rescuer has a walkable foot.
 */
export function planRope(rescuer,victim){
 let best=null;
 for(const c of ropeCandidates(rescuer)){
  const route=lowerRoute(victim,c.hang);if(!route)continue;
  if(!best||route.distance<best.route)best={route:route.distance,c};
 }
 if(!best)return null;
 const {lip,hang}=best.c,ox=lip.x-hang.x,oz=lip.z-hang.z,len=Math.hypot(ox,oz)||1;
 return {anchor:{x:rescuer.x,z:rescuer.z},lip:{...lip},hang:{...hang},bottom:{...hang},outward:{x:ox/len,z:oz/len}};
}
/** The climber hangs a little inside the opening from the rope, so the rope is in front of them rather than through them. */
export const ropeStand=rope=>({x:rope.hang.x-rope.outward.x*.3,z:rope.hang.z-rope.outward.z*.3});
/** Where the climber ends up: on the beam a little past the opening's edge. */
export const ropeTop=rope=>({x:rope.lip.x+rope.outward.x*.3,z:rope.lip.z+rope.outward.z*.3});
/** The anchor bar: a clamp on the beam and a pole out over the opening to the rope's tip. */
export function ropeBar(rope){const top=ropeTop(rope);return {from:{x:top.x,y:ROPE.barY,z:top.z},to:{x:rope.hang.x,y:ROPE.barY,z:rope.hang.z}};}

/** The climber's feet position at time t (seconds since they grabbed the rope). `start` is where they stood. */
export function ropeClimbPose(rope,t,start){
 const R=ROPE,floor=P.floorY,stand=ropeStand(rope),top=ropeTop(rope);let x,y,z,phase;
 if(t<R.foot){const k=smooth(t/R.foot);x=lerp(start.x,stand.x,k);z=lerp(start.z,stand.z,k);y=floor;phase='foot';}
 else if(t<R.foot+R.climb){const k=(t-R.foot)/R.climb;x=stand.x;z=stand.z;y=lerp(floor,R.climbTop,smooth(k));phase='climb';}
 else if(t<R.foot+R.climb+R.lift){const k=smooth((t-R.foot-R.climb)/R.lift);x=stand.x;z=stand.z;y=lerp(R.climbTop,R.liftHeight,k);phase='lift';}
 else{const k=clamp((t-R.foot-R.climb-R.lift)/R.slide,0,1),m=smooth(k);x=lerp(stand.x,top.x,m);z=lerp(stand.z,top.z,m);y=lerp(R.liftHeight,0,smooth(k*k));phase='slide';}
 return {x,y,z,phase,done:t>=ROPE_CLIMB_SECONDS};
}
/** Hands gripping the rope while climbing: world points just above the climber's shoulders, taking turns. */
export function ropeHands(rope,t,feetY){
 const cycle=Math.max(0,t-ROPE.foot)*1.5,climbing=t>=ROPE.foot&&t<ROPE.foot+ROPE.climb+ROPE.lift;
 if(!climbing)return null;
 const high=feetY+1.62+.13*Math.sin(cycle*Math.PI*2),low=feetY+1.62+.13*Math.sin(cycle*Math.PI*2+Math.PI);
 const near=(dy,side)=>({x:rope.hang.x,y:Math.min(dy,ROPE.barY+.02),z:rope.hang.z+side*0});
 return {left:near(high,-1),right:near(low,1)};
}
/**
 * A rope's visible polyline from the bar tip to the floor, for rendering: `unroll` (0–1) is how much has paid out
 * and `tension` (0–1) damps the sway while someone is climbing it.
 */
export function ropePoints(rope,time,unroll=1,tension=0,segments=16){
 const bar=ropeBar(rope),top=bar.to,floor=P.floorY+.04,pts=[];
 const len=(top.y-floor)*clamp(unroll,0,1),sway=(1-tension*.85)*(1-clamp(unroll,0,1)*.0);
 for(let i=0;i<=segments;i++){
  const f=i/segments,y=top.y-f*len,settle=1-clamp(unroll,0,1),amp=(.02+settle*.35)*sway*f*Math.min(1,f*3);
  pts.push({x:top.x+Math.sin(time*2.1+f*4.2)*amp*.7,y,z:top.z+Math.cos(time*1.7+f*3.1)*amp*.7});
 }
 return pts;
}
/** Where the throw puts the hand: camera-space keyframes for the rescuer's overhand lower, release at `releaseAt`. */
export const THROW={releaseAt:.8};
export function throwPose(t){
 const k=(a,b,u)=>({x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),z:lerp(a.z,b.z,u)});
 const low={x:-.26,y:-.72,z:-.42},ready={x:-.2,y:-.32,z:-.52},out={x:-.06,y:-.5,z:-.95};
 let pos,coil=true;
 if(t<.35)pos=k(low,ready,smooth(t/.35));else if(t<THROW.releaseAt)pos=k(ready,out,smooth((t-.35)/(THROW.releaseAt-.35)));else{pos=k(out,low,smooth((t-THROW.releaseAt)/(ROPE.throwSeconds-THROW.releaseAt)));coil=false;}
 return {visible:t<ROPE.throwSeconds,pos,coil};
}
/** True when the fallen player can grab this rope from where they are: near its foot with open floor between. */
export function ropeGrabOk(rope,pos){
 if(Math.hypot(pos.x-rope.bottom.x,pos.z-rope.bottom.z)>ROPE.grab)return false;
 const n=Math.max(1,Math.ceil(Math.hypot(rope.bottom.x-pos.x,rope.bottom.z-pos.z)/.1));
 for(let i=0;i<=n;i++){const f=i/n;if(!canWalkPit(lerp(pos.x,rope.bottom.x,f),lerp(pos.z,rope.bottom.z,f),P.floorY))return false;}
 return true;
}
