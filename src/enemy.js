import {gridPoint,worldPoint,pathBetween,lineOfSight,walkable} from './level.js';
import {sweepMove} from './navigation.js';
export const MONSTER_SPEED={patrol:1.8,investigate:2.65,chase:4.4};
export const SIGHT_RANGE=16;
export function createEnemy(layout){
 const spawn=worldPoint(layout.rooms[3]);
 return {position:{...spawn},yaw:Math.PI,mode:'patrol',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,patrolIndex:3,searchRemaining:0,sensedBy:null};
}
function heardNoise(enemy,layout,noises){
 let best=null,bestStrength=-Infinity;
 for(const noise of noises){
  if(!Number.isFinite(noise.radius)||noise.radius<=0||noise.height>=1.5||!walkable(layout,gridPoint(noise)))continue;
  const distance=Math.hypot(noise.x-enemy.position.x,noise.z-enemy.position.z);
  // Walls soften noise, but do not magically silence a nearby drawer or sprint.
  const range=noise.radius*(lineOfSight(layout,enemy.position,noise)?1:.65);
  const strength=1-distance/range;
  if(strength>=0&&strength>=bestStrength){best=noise;bestStrength=strength;}
 }
 return best;
}
function routeTo(enemy,layout,target,navigation){
 if(navigation.findPath)return navigation.findPath(enemy.position,target);
 if(lineOfSight(layout,enemy.position,target))return [{x:target.x,z:target.z}];
 const route=pathBetween(layout,gridPoint(enemy.position),gridPoint(target)).map(worldPoint);
 if(route.length>1)route.shift();
 if(route.length)route.push({x:target.x,z:target.z});
 return route;
}
export function tickEnemy(enemy,layout,player,delta,active=true,noises=[],navigation={}){
 if(!active)return {caught:false,distance:Infinity,visible:false,heard:false};
 const distance=Math.hypot(player.x-enemy.position.x,player.z-enemy.position.z);
 const direction=Math.atan2(player.x-enemy.position.x,player.z-enemy.position.z);
 const facing=Math.cos(direction-enemy.yaw)>.05;
 const visible=player.height<1.5&&!player.hidden&&distance<SIGHT_RANGE&&(facing||distance<3)&&lineOfSight(layout,enemy.position,player)&&(!navigation.canSee||navigation.canSee(enemy.position,player));
 const sound=heardNoise(enemy,layout,noises);
 if(visible){
  if(enemy.mode!=='chase')enemy.repath=0;
  enemy.mode='chase';enemy.lastSeen={x:player.x,z:player.z};enemy.lostFor=0;enemy.sensedBy='sight';
 }else if(sound){
  enemy.lastHeard={x:sound.x,z:sound.z};enemy.sensedBy='sound';enemy.repath=0;enemy.path=[];
  if(enemy.mode==='chase'){enemy.lastSeen={...enemy.lastHeard};enemy.lostFor=0;}
  else enemy.mode='investigate';
 }else if(enemy.mode==='chase'){
  enemy.lostFor+=delta;
  if(enemy.lostFor>8){enemy.mode='search';enemy.searchRemaining=4.5;enemy.path=[];}
 }
 if(enemy.mode==='search'){
  enemy.yaw+=delta*.95;enemy.searchRemaining-=delta;
  if(enemy.searchRemaining<=0){enemy.mode='patrol';enemy.lastSeen=null;enemy.lastHeard=null;enemy.sensedBy=null;enemy.patrolIndex++;enemy.repath=0;}
  else return {caught:false,distance,visible,heard:!!sound};
 }
 const target=enemy.mode==='chase'?enemy.lastSeen:enemy.mode==='investigate'?enemy.lastHeard:worldPoint(layout.rooms[enemy.patrolIndex%layout.rooms.length]);
 const targetDistance=Math.hypot(target.x-enemy.position.x,target.z-enemy.position.z);
 if((targetDistance<.18||navigation.canMove&&!navigation.canMove(target.x,target.z)&&targetDistance<1.4)&&!visible){
  enemy.path=[];
  if(enemy.mode==='patrol'){enemy.patrolIndex++;enemy.repath=0;}
  else {enemy.mode='search';enemy.searchRemaining=4.5;}
 }else{
  enemy.repath-=delta;
  if(enemy.repath<=0||!enemy.path.length){enemy.path=routeTo(enemy,layout,target,navigation);enemy.repath=enemy.mode==='chase'?.25:enemy.mode==='investigate'?.55:.9;}
  let travel=delta*MONSTER_SPEED[enemy.mode];
  while(enemy.path.length&&travel>0){
   const next=enemy.path[0],dx=next.x-enemy.position.x,dz=next.z-enemy.position.z,d=Math.hypot(dx,dz);
   if(d<.001){enemy.path.shift();continue;}
   enemy.yaw=Math.atan2(dx,dz);const step=Math.min(travel,d);
   const desired={x:enemy.position.x+dx/d*step,z:enemy.position.z+dz/d*step};
   const movedTo=navigation.canMove?sweepMove(enemy.position,desired,navigation.canMove):desired;
   const moved=Math.hypot(movedTo.x-enemy.position.x,movedTo.z-enemy.position.z);enemy.position.x=movedTo.x;enemy.position.z=movedTo.z;travel-=step;
   if(moved<step-.001){enemy.path=[];enemy.repath=0;break;}if(step===d)enemy.path.shift();
  }
 }
 const nowDistance=Math.hypot(player.x-enemy.position.x,player.z-enemy.position.z);
 return {caught:visible&&nowDistance<1.35,distance:nowDistance,visible,heard:!!sound};
}
