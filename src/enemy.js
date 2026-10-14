import {gridPoint,worldPoint,pathBetween,lineOfSight} from './level.js';
export function createEnemy(layout){const spawn=worldPoint(layout.rooms[3]);return {position:{...spawn},yaw:Math.PI,mode:'patrol',path:[],repath:0,lastSeen:null,lostFor:0,patrolIndex:3,roomWait:0};}
export function tickEnemy(enemy,layout,player,delta,active=true){
 if(!active)return {caught:false,distance:Infinity,visible:false};
 const distance=Math.hypot(player.x-enemy.position.x,player.z-enemy.position.z);
 const direction=Math.atan2(player.x-enemy.position.x,player.z-enemy.position.z);
 const facing=Math.cos(direction-enemy.yaw)>.05;
 const visible=player.height<1.5&&!player.hidden&&distance<12&&(facing||distance<2.7)&&lineOfSight(layout,enemy.position,player);
 if(visible){enemy.mode='chase';enemy.lastSeen={x:player.x,z:player.z};enemy.lostFor=0;}
 else if(enemy.mode==='chase'){enemy.lostFor+=delta;if(enemy.lostFor>5){enemy.mode='patrol';enemy.lastSeen=null;enemy.path=[];}}
 enemy.repath-=delta;
 if(enemy.repath<=0||!enemy.path.length){
  let target;
  if(enemy.mode==='chase'&&enemy.lastSeen)target=gridPoint(enemy.lastSeen);
  else {target=layout.rooms[enemy.patrolIndex%layout.rooms.length];if(Math.hypot(worldPoint(target).x-enemy.position.x,worldPoint(target).z-enemy.position.z)<.4){enemy.patrolIndex++;target=layout.rooms[enemy.patrolIndex%layout.rooms.length];}}
  enemy.path=pathBetween(layout,gridPoint(enemy.position),target).map(worldPoint);
  if(enemy.path.length>1)enemy.path.shift();
  enemy.repath=enemy.mode==='chase'?.45:1.2;
 }
 let travel=delta*(enemy.mode==='chase'?3.15:1.1);
 while(enemy.path.length&&travel>0){const next=enemy.path[0],dx=next.x-enemy.position.x,dz=next.z-enemy.position.z,d=Math.hypot(dx,dz);if(d<.001){enemy.path.shift();continue;}enemy.yaw=Math.atan2(dx,dz);const step=Math.min(travel,d);enemy.position.x+=dx/d*step;enemy.position.z+=dz/d*step;travel-=step;if(step===d)enemy.path.shift();}
 return {caught:visible&&distance<.8,distance,visible};
}
