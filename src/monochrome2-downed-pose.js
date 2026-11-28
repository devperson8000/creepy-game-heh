import {TEAM} from './monochrome2-tuning.js';

/**
 * What a downed player looks like to their friends. The hazmat suit has no downed clip, so the whole figure is
 * laid down as one body, differently depending on what hit them:
 *  - Monochrome slams them flat on their back, head thrown back, arms and legs where they landed;
 *  - the Bacteria leaves them curled on their side, folded forward.
 * Each pose returns the root's rotation/scale and the lift that makes the body rest exactly on the floor at
 * every moment of the fall, so it never sinks into the carpet or hovers.
 */
export const DOWNED_RADIUS=.24,BODY_HEIGHT=1.7;
const KINDS={
 Monochrome:{rx:Math.PI/2,rz:.12,sy:1},
 Bacteria:{rx:-.5,rz:-1.4,sy:.82},
 default:{rx:Math.PI/2,rz:.08,sy:1}
};
export const downedKind=by=>KINDS[by]?by:'default';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Points on the body's surface (axis plus a ring of the body radius) after scale and Euler 'YXZ' rotation (x then z). */
export function bodyPoints({rx,rz,sy},dy=0){
 const pts=[],cx=Math.cos(rx),sx=Math.sin(rx),cz=Math.cos(rz),sz=Math.sin(rz);
 for(let i=0;i<=12;i++){const h=BODY_HEIGHT*i/12*sy;
  for(const [ox,oz] of [[0,0],[DOWNED_RADIUS,0],[-DOWNED_RADIUS,0],[0,DOWNED_RADIUS],[0,-DOWNED_RADIUS]]){
   // Rz first, then Rx (Euler YXZ applies Z, then X, then Y); yaw does not change heights.
   let x=ox,y=h,z=oz;
   const x1=x*cz-y*sz,y1=x*sz+y*cz;x=x1;y=y1;
   const y2=y*cx-z*sx,z2=y*sx+z*cx;y=y2;z=z2;
   pts.push({x,y:y+dy,z});
  }}
 return pts;
}
/** Pose at fall progress `k` (0 standing, 1 on the floor) for what downed them. */
export function downedPose(by,k){
 const base=KINDS[downedKind(by)],e=smooth(k),pose={rx:base.rx*e,rz:base.rz*e,sy:1+(base.sy-1)*e};
 const lowest=Math.min(...bodyPoints(pose).map(p=>p.y));
 return {...pose,dy:Math.max(0,-lowest)};
}
/** Share of the bleed-out window still left, 1 → 0, for the revive ring around a downed body. */
export const bleedRemaining=p=>Math.max(0,Math.min(1,1-(p.downedFor??0)/TEAM.bleedOutSeconds));
/** Is `rescuer` kneeling to help `victim`? Crouched and close: lean toward them. */
export function rescuerLean(rescuer,victim){
 if(!rescuer.crouch||!victim.downed||victim.lost)return null;
 const dx=victim.x-rescuer.x,dz=victim.z-rescuer.z,d=Math.hypot(dx,dz);
 return d<1.4?{yaw:Math.atan2(-dx,-dz),lean:Math.min(.45,.12+.3*(1-d/1.4))}:null;
}
