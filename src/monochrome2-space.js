import {canWalkLevelZero} from './backrooms-layout.js';
import {PITFALLS,canWalkPit,inPitGrid,onPitBeam} from './backrooms-pitfalls.js';
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
export function createMonochrome2Space(map,round=()=>({})){
 const bounds={minX:map.bounds.minX,maxX:MONSTER_EAST_LIMIT+.5,minZ:map.bounds.minZ,maxZ:map.bounds.maxZ};
 const doorOpen=()=>!!round().doorOpen;
 /** True if a point of width `radius` fits. Beams need the centre on the beam, so radius there is 0. */
 function canStand(x,z,radius=MONSTER.radius,open=doorOpen()){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(x<DOOR_X)return canWalkLevelZero(map,x,z,radius);
  if(!open||x>MONSTER_EAST_LIMIT)return false;
  if(x<42.3)return z>-16.75&&z<-15.25;
  if(!canWalkPit(x,z,0))return false;
  return !inPitGrid(x,z)||onPitBeam(x,z);
 }
 /** Sound and sight pass through anything a zero-width point cannot occupy. */
 function pointOpen(x,z,open=doorOpen()){
  if(x<DOOR_X)return canWalkLevelZero(map,x,z,0);
  if(!open)return false;
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
