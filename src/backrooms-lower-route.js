import {PITFALLS,canWalkPit,gridX,gridZ,inStairwell} from './backrooms-pitfalls.js';
import {createNavigator} from './navigation.js';

/**
 * The dark lower layer's guided route. Every glowing arrow points along the real shortest walkable
 * path to the foot of the recovery stairwell, so following arrows can never lead into a dead end,
 * wherever you land. Built from the same collision the player walks on.
 */
export const LOWER_BOUNDS=Object.freeze({minX:42.45,maxX:73.7,minZ:-29.5,maxZ:-2.5});
/** Foot of the stairwell, centred in its 1.8 m corridor. */
export const STAIR_FOOT=Object.freeze({x:(PITFALLS.stairwell.minX+PITFALLS.stairwell.maxX)/2,z:PITFALLS.stairwell.minZ+.55});
export const FLASHLIGHT_DOOR=Object.freeze({x:PITFALLS.flashRoom.maxX+.9,z:PITFALLS.flashRoom.doorZ});
/** Lower-layer walkability for routing: the staircase itself is entered only at its foot (the rest is overhead). */
const CLEARANCE=.12;
export const lowerWalkable=(x,z)=>x>=LOWER_BOUNDS.minX&&!(inStairwell(x,z,0)&&z>PITFALLS.stairwell.minZ+.7)
 // Keep paths a hand's width off every wall and column so a player following them never clips a corner.
 &&[[0,0],[CLEARANCE,0],[-CLEARANCE,0],[0,CLEARANCE],[0,-CLEARANCE]].every(([dx,dz])=>canWalkPit(x+dx,z+dz,PITFALLS.floorY));

let cached=null;
export function lowerNavigator(){return cached??=createNavigator(lowerWalkable,{...LOWER_BOUNDS,spacing:.5});}
const pathLength=(from,path)=>{let d=0,p=from;for(const q of path){d+=Math.hypot(q.x-p.x,q.z-p.z);p=q;}return d;};
/** Walking distance (m) and waypoints from a lower-layer point to a goal, or null if unreachable. */
export function lowerRoute(from,goal=STAIR_FOOT){
 const path=lowerNavigator().findPath(from,goal);
 return path.length?{path,distance:pathLength(from,path)}:null;
}
/** Where the flashlight is relative to a landing point: walking distance to its pickup. */
export function flashlightDistance(from){return lowerRoute(from,PITFALLS.flashlight)?.distance??Infinity;}
/**
 * One arrow per lattice cell: {x,z,angle,distance}. `angle` is the view rotation (about y) that makes
 * the arrow model, whose head points to local -z, face the way to walk.
 */
export function lowerArrows(step=3.2){
 const out=[],fl=PITFALLS.flashRoom;
 for(let x=LOWER_BOUNDS.minX+1.2;x<LOWER_BOUNDS.maxX-.6;x+=step)for(let z=LOWER_BOUNDS.minZ+1;z<LOWER_BOUNDS.maxZ-.4;z+=step){
  if(!lowerWalkable(x,z)||x>fl.minX-.4&&x<fl.maxX+.4&&z>fl.minZ-.4&&z<fl.maxZ+.4)continue;
  if(Math.hypot(x-STAIR_FOOT.x,z-STAIR_FOOT.z)<1.5)continue;
  const route=lowerRoute({x,z});if(!route)continue;
  const next=route.path[0],dx=next.x-x,dz=next.z-z,d=Math.hypot(dx,dz);if(d<.4)continue;
  out.push({x,z,angle:Math.atan2(-dx/d,-dz/d),distance:route.distance});
 }
 return out;
}
/** Every shaft opening centre: where a fall can plausibly land you. */
export function fallSites(){
 const g=PITFALLS.grid,xs=gridX(),zs=gridZ(),sites=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;if(lowerWalkable(x,z))sites.push({x,z});}
 return sites;
}
