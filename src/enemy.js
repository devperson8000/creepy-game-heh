import {gridPoint,worldPoint,pathBetween,lineOfSight,walkable,randomSource} from './level.js';
import {sweepMove} from './navigation.js';
import {huntActive} from './hunt-clock.js';
export const MONSTER_SPEED={patrol:1.8,investigate:2.65,chase:3.95};
export const SIGHT_RANGE=16;
export function createEnemy(layout){
 // The entrance is on the north edge. Use the farthest southern room in all
 // basement sizes, with a deterministic tie-break towards the opposite corner.
 const room=layout.rooms.reduce((far,next)=>next.z>far.z||next.z===far.z&&next.x>far.x?next:far);
 const spawn=worldPoint(room),entrance=layout.entrance?worldPoint(layout.entrance):{x:spawn.x,z:spawn.z-1};
 return {position:{...spawn},yaw:Math.atan2(entrance.x-spawn.x,entrance.z-spawn.z),mode:'patrol',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,patrolIndex:layout.rooms.indexOf(room),searchRemaining:0,sensedBy:null,released:false};
}
export function releaseMonster(run,enemy){
 if(!huntActive(run)||enemy.released)return;
 enemy.released=true;enemy.mode='investigate';enemy.lastHeard=worldPoint(run.layout.entrance);enemy.path=[];enemy.repath=0;
}
function heardNoise(enemy,layout,noises){
 let best=null,bestStrength=-Infinity;
 for(const noise of noises){
  if(!Number.isFinite(noise.radius)||noise.radius<=0||noise.height>=1.5||!walkable(layout,gridPoint(noise)))continue;
  const distance=Math.hypot(noise.x-enemy.position.x,noise.z-enemy.position.z);
  // Walls soften noise, but do not magically silence a nearby drawer or sprint.
  const range=noise.radius*.92*(lineOfSight(layout,enemy.position,noise)?1:.65);
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
// A round gets one rare opportunity. Cover and a short real route are required;
// this director only chooses a target, while tickEnemy owns movement and catches.
export function createAmbush(seed,{chance=.12,minElapsed=90,duration=6,cooldown=2}={}){
 return {eligible:randomSource((seed>>>0)^0xA6B05)()<Math.max(0,Math.min(1,chance)),elapsed:0,minElapsed,remaining:0,duration:Math.max(0,Math.min(6,duration)),cooldown,checkIn:0,used:false,targetId:null};
}
export function tickAmbush(state,{enemy,layout,player,delta,active=true,navigation={}}){
 const result=(silent=false,triggered=false)=>({silent,triggered,targetId:state.targetId});
 const dt=Number.isFinite(delta)?Math.max(0,delta):0;
 const safe=!active||!player||player.height>=1.5||player.hidden||player.dead;
 if(safe){state.remaining=0;return result();}
 if(!state.eligible)return result();
 state.elapsed+=dt;
 const distance=Math.hypot(player.x-enemy.position.x,player.z-enemy.position.z);
 const exposed=lineOfSight(layout,enemy.position,player);
 function stalk(){
  const target={x:player.x,z:player.z};
  if(enemy.mode!=='investigate'||!enemy.lastHeard||Math.hypot(enemy.lastHeard.x-target.x,enemy.lastHeard.z-target.z)>.65){
   enemy.path=[];enemy.repath=0;enemy.lastHeard=target;
  }
  enemy.mode='investigate';enemy.sensedBy='ambush';
 }
 if(state.remaining>0){
  state.remaining=Math.max(0,state.remaining-dt);
  if(state.targetId!==(player.id??null)){state.remaining=0;return result();}
  if(exposed){
   state.remaining=0;enemy.mode='chase';enemy.lastSeen={x:player.x,z:player.z};enemy.lostFor=0;enemy.repath=0;enemy.sensedBy='sight';
   return result(false,true);
  }
  if(!state.remaining||distance>10||enemy.mode==='chase'){state.remaining=0;return result();}
  stalk();return result(true);
 }
 if(state.used||state.elapsed<state.minElapsed||dt===0)return result();
 state.checkIn-=dt;
 if(state.checkIn>0)return result();
 state.checkIn=state.cooldown;
 if(exposed||enemy.mode==='chase'||distance<2.6||distance>8||state.duration<=0)return result();
 const route=routeTo(enemy,layout,player,navigation);
 if(!route.length)return result();
 let length=0,previous=enemy.position;
 for(const point of route){length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
 if(length>12||Math.hypot(previous.x-player.x,previous.z-player.z)>1)return result();
 state.used=true;state.remaining=state.duration;state.targetId=player.id??null;
 stalk();return result(true);
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
  if(enemy.lostFor>6.5){enemy.mode='search';enemy.searchRemaining=4.5;enemy.path=[];}
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
