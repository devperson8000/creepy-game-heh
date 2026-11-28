import {canWalkLevelZero} from './backrooms-layout.js';
import {PITFALLS,canWalkPit,inPitGrid,onPitBeam,gridX,gridZ,inStairwell} from './backrooms-pitfalls.js';
import {createNavigator} from './navigation.js';
import {MONSTER} from './monochrome2-tuning.js';

/** Monochrome stops short of the lit exit door: the exit corridor is the players' safe finish. */
export const MONSTER_EAST_LIMIT=73.6;
const DOOR_X=41.5;

/**
 * Where Monochrome can stand and what blocks sound and sight on the upper layer.
 * The lower layer (pitfall fall route) belongs to the reserved bacteria slot.
 * `round` is read live, so the pitfall door opening changes his world.
 */
/** Where the lower (dark) layer's Monochrome may walk: the pit footprint, never the stairwell or the west house. */
export const LOWER_REGION=Object.freeze({minX:42.5,maxX:73.5,minZ:-29.3,maxZ:-2.7});
const LOWER_COLUMN_HALF=.3;
function lowerColumn(x,z,half){return gridX().some((v,i)=>i>0&&i<PITFALLS.grid.columns&&i%2===0&&Math.abs(x-v)<half)&&gridZ().some((v,i)=>i>0&&i<PITFALLS.grid.rows&&i%2===0&&Math.abs(z-v)<half);}
/** Zero-width test used for sight and sound on the lower layer: walls and columns block, the stairwell is closed off. */
function lowerPointOpen(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 const r=LOWER_REGION;if(x<r.minX-.1||x>r.maxX+.1||z<r.minZ-.1||z>r.maxZ+.1)return false;
 if(inStairwell(x,z,.0))return false;
 if(PITFALLS.lowerWalls.some(w=>Math.abs(x-w.x)<w.w/2&&Math.abs(z-w.z)<w.d/2))return false;
 return !lowerColumn(x,z,LOWER_COLUMN_HALF);
}
/**
 * Where a monster can stand and what blocks sound and sight. `region` picks the world:
 *  - 'all'   the whole upper layer, including the pit room once its door is open (legacy default);
 *  - 'maze'  only the normal Level 0 rooms west of the pit door: the Bacteria's and the rare upper Monochrome's world;
 *  - 'lower' only the dark layer beneath the pit grid: the lower Monochrome's world.
 */
export function createMonochrome2Space(map,round=()=>({}),{region='all'}={}){
 if(region==='lower')return createLowerSpace();
 const bounds={minX:map.bounds.minX,maxX:region==='maze'?DOOR_X:MONSTER_EAST_LIMIT+.5,minZ:map.bounds.minZ,maxZ:map.bounds.maxZ};
 const maze=region==='maze';
 const doorOpen=()=>!!round().doorOpen;
 /** True if a point of width `radius` fits. Beams need the centre on the beam, so radius there is 0. */
 function canStand(x,z,radius=MONSTER.radius,open=doorOpen()){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(x<DOOR_X)return canWalkLevelZero(map,x,z,radius);
  if(maze||!open||x>MONSTER_EAST_LIMIT)return false;
  if(x<42.3)return z>-16.75&&z<-15.25;
  if(!canWalkPit(x,z,0))return false;
  return !inPitGrid(x,z)||onPitBeam(x,z);
 }
 /** Sound and sight pass through anything a zero-width point cannot occupy. */
 function pointOpen(x,z,open=doorOpen()){
  if(x<DOOR_X)return canWalkLevelZero(map,x,z,0);
  if(maze||!open)return false;
  if(x<42.3)return z>-17&&z<-15;
  const room=PITFALLS.room;
  return x>=room.minX&&x<=79.78&&z>=room.minZ&&z<=room.maxZ&&!PITFALLS.upperWalls.some(w=>Math.abs(x-w.x)<w.w/2&&Math.abs(z-w.z)<w.d/2);
 }
 function lineClear(a,b,open=doorOpen()){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
  for(let i=0;i<=n;i++){const f=i/n;if(!pointOpen(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,open))return false;}
  return true;
 }
 /** Distinct solid regions between two points; a closed door counts as one. */
 function wallsBetween(a,b,open=doorOpen()){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));let walls=0,inside=false;
  for(let i=0;i<=n;i++){const f=i/n,solid=!pointOpen(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,open);if(solid&&!inside)walls++;inside=solid;}
  return walls;
 }
 const navs=new Map();
 function navigator(open=doorOpen()){
  if(!navs.has(open))navs.set(open,createNavigator((x,z)=>canStand(x,z,MONSTER.radius,open),{...bounds,spacing:.5}));
  return navs.get(open);
 }
 const onBeam=(x,z)=>x>=42.3&&inPitGrid(x,z)&&onPitBeam(x,z);
 /** Nearest standable point to a wanted one (patrol goals can land inside furniture or a wall). */
 function nearestStandable(p,maxRadius=4){
  if(canStand(p.x,p.z))return {x:p.x,z:p.z};
  for(let r=.25;r<=maxRadius;r+=.25)for(let a=0;a<16;a++){const x=p.x+Math.cos(a/16*Math.PI*2)*r,z=p.z+Math.sin(a/16*Math.PI*2)*r;if(canStand(x,z))return {x,z};}
  return null;
 }
 return {bounds,canStand,pointOpen,lineClear,wallsBetween,navigator,onBeam,nearestStandable,get doorOpen(){return doorOpen();}};
}

function createLowerSpace(){
 const r=LOWER_REGION,bounds={minX:r.minX-.1,maxX:r.maxX+.1,minZ:r.minZ-.1,maxZ:r.maxZ+.1};
 const off=Math.max(0,MONSTER.radius-.22);
 function canStand(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<r.minX||x>r.maxX||z<r.minZ||z>r.maxZ)return false;
  if(inStairwell(x,z,MONSTER.radius+.2))return false;
  const y=PITFALLS.floorY;
  return canWalkPit(x,z,y)&&[[off,0],[-off,0],[0,off],[0,-off]].every(([dx,dz])=>canWalkPit(x+dx,z+dz,y));
 }
 function lineClear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));for(let i=0;i<=n;i++){const f=i/n;if(!lowerPointOpen(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f))return false;}return true;}
 function wallsBetween(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));let walls=0,inside=false;for(let i=0;i<=n;i++){const f=i/n,solid=!lowerPointOpen(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f);if(solid&&!inside)walls++;inside=solid;}return walls;}
 let nav=null;const navigator=()=>nav??=createNavigator(canStand,{...bounds,spacing:.5});
 function nearestStandable(p,maxRadius=4){
  if(canStand(p.x,p.z))return {x:p.x,z:p.z};
  for(let rad=.25;rad<=maxRadius;rad+=.25)for(let a=0;a<16;a++){const x=p.x+Math.cos(a/16*Math.PI*2)*rad,z=p.z+Math.sin(a/16*Math.PI*2)*rad;if(canStand(x,z))return {x,z};}
  return null;
 }
 return {region:'lower',bounds,canStand,pointOpen:lowerPointOpen,lineClear,wallsBetween,navigator,onBeam:()=>false,nearestStandable,get doorOpen(){return true;}};
}
