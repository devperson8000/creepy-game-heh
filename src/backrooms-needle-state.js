import {canWalkLevelZero} from './backrooms-layout.js';
import {createNavigator,sweepMove} from './navigation.js';
const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function createNeedleSimulation(map,{grace=14,spawn={x:-5,z:3}}={}){
 const canMove=(x,z)=>canWalkLevelZero(map,x,z,.42),nav=createNavigator(canMove,{...map.bounds,spacing:.5});
 const state={position:{...spawn},yaw:0,speed:0,travel:0,walk:0,mode:'patrol',elapsed:0,lastHeard:null,caught:false,active:false};
 let path=[],patrol=1,wait=0,memory=0,noiseCooldown=0;
 function destination(target){path=nav.findPath(state.position,target);}
 function noise(event){
  if(state.elapsed<grace||state.caught||!event||!Number.isFinite(event.x)||!Number.isFinite(event.z)||!Number.isFinite(event.radius)||event.radius<=0)return false;
  const range=event.radius*(nav.clear(state.position,event)?1:.58),distance=Math.hypot(event.x-state.position.x,event.z-state.position.z);
  if(distance>range||noiseCooldown>0&&!event.distraction)return false;
  state.lastHeard={x:event.x,z:event.z};state.mode='investigate';memory=8;wait=0;noiseCooldown=.35;destination(state.lastHeard);return true;
 }
 function tick(delta,player){
  if(!Number.isFinite(delta)||delta<=0||state.caught)return state;
  let remaining=Math.min(delta,.2);
  while(remaining>0){const dt=Math.min(.025,remaining);remaining-=dt;state.elapsed+=dt;state.active=state.elapsed>=grace;if(!state.active)continue;
   noiseCooldown=Math.max(0,noiseCooldown-dt);
   if(state.lastHeard){memory-=dt;if(memory<=0){state.lastHeard=null;state.mode='patrol';path=[];wait=1;}}
   if(path.length&&Math.hypot(path[0].x-state.position.x,path[0].z-state.position.z)<.13)path.shift();
   if(!path.length){wait-=dt;if(state.mode==='investigate'){state.mode='listen';wait=3.5;}else if(wait<=0){state.mode='patrol';state.lastHeard=null;const area=map.areas[(patrol++)%map.areas.length];destination(area);wait=1;}}
   const target=path[0],desired=target?(state.mode==='investigate'?3.2:1.05):0;
   state.speed=damp(state.speed,desired,desired>state.speed?2.8:7,dt);
   if(target){const dx=target.x-state.position.x,dz=target.z-state.position.z,angle=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(angle-state.yaw),Math.cos(angle-state.yaw));state.yaw+=difference*(1-Math.exp(-5*dt));
    const length=Math.hypot(dx,dz),step=Math.min(length,state.speed*dt),next=sweepMove(state.position,{x:state.position.x+dx/length*step,z:state.position.z+dz/length*step},canMove);
    state.travel+=Math.hypot(next.x-state.position.x,next.z-state.position.z);state.position=next;
   }
   state.walk=damp(state.walk,target?Math.min(1,state.speed/.9):0,6,dt);
   if(player&&Math.hypot(player.x-state.position.x,player.z-state.position.z)<.82){state.caught=true;state.speed=0;state.mode='caught';break;}
  }return state;
 }
 return {state,tick,noise,clear:nav.clear};
}
