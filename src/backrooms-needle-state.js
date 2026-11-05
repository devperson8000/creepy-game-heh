import {BACKROOMS_SPEED} from './backrooms-round.js';
import {canWalkLevelZero} from './backrooms-layout.js';
import {createNavigator,sweepMove} from './navigation.js';
const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function createNeedleSimulation(map,{grace=14,spawn={x:-5,z:3},sight=false,patrolSpeed=BACKROOMS_SPEED.needlePatrol,huntSpeed=BACKROOMS_SPEED.needleHunt,bodyRadius=.42,tactics=false}={}){
 const canMove=(x,z)=>canWalkLevelZero(map,x,z,bodyRadius),nav=createNavigator(canMove,{...map.bounds,spacing:.5});
 const state={position:{...spawn},yaw:0,speed:0,travel:0,walk:0,mode:'patrol',elapsed:0,lastHeard:null,caught:false,active:false,scareCount:0,radius:bodyRadius};
 let path=[],patrol=1,wait=0,memory=0,noiseCooldown=0,decision=0,stage=0,cooldown=0,chaseTime=0;
 function destination(target){path=nav.findPath(state.position,target);}
 function noise(event){
  if((tactics&&cooldown>0)||state.elapsed<grace||state.caught||!event||!Number.isFinite(event.x)||!Number.isFinite(event.z)||!Number.isFinite(event.radius)||event.radius<=0)return false;
  const range=event.radius*(nav.clear(state.position,event)?1:.58),distance=Math.hypot(event.x-state.position.x,event.z-state.position.z);
  if(distance>range||noiseCooldown>0&&!event.distraction)return false;
  state.lastHeard={x:event.x,z:event.z};if(!tactics||state.mode==='investigate'){state.mode='investigate';}else if(state.mode!=='stalk'&&state.mode!=='ambush'){state.mode='stalk';decision=0;stage=0;}memory=8;wait=0;noiseCooldown=.35;if(!tactics||state.mode==='investigate')destination(state.lastHeard);return true;
 }
 function tick(delta,player,peers=[]){
  const safe=(x,z)=>canMove(x,z)&&peers.every(p=>Math.hypot(x-p.position.x,z-p.position.z)>=bodyRadius+(p.radius??.6)+.6);
  function cover(target){let best=null,score=-Infinity;for(let x=target.x-10;x<=target.x+10;x+=2)for(let z=target.z-10;z<=target.z+10;z+=2){
   const d=Math.hypot(x-target.x,z-target.z);if(d<3||d>12||!safe(x,z)||nav.clear({x,z},target))continue;
   const value=-Math.abs(d-5)-Math.hypot(x-state.position.x,z-state.position.z)*.15;
   if(value>score&&nav.findPath(state.position,{x,z}).length){score=value;best={x,z};}
  }return best;}

  if(!Number.isFinite(delta)||delta<=0||state.caught)return state;
  let remaining=Math.min(delta,.2);
  while(remaining>0){const dt=Math.min(.025,remaining);remaining-=dt;state.elapsed+=dt;state.active=state.elapsed>=grace;if(!state.active&&!tactics)continue;
   noiseCooldown=Math.max(0,noiseCooldown-dt);cooldown=Math.max(0,cooldown-dt);decision-=dt;
   if(tactics){
    const distance=player?Math.hypot(player.x-state.position.x,player.z-state.position.z):Infinity;
    if(state.mode==='investigate'){chaseTime+=dt;if(chaseTime>7){state.mode='retreat';cooldown=26;state.lastHeard=null;path=[];decision=0;}}
    if(state.mode==='stalk'){stage+=dt;if(decision<=0){decision=1.4;const point=cover(state.lastHeard);if(point)destination(point);else path=[];}
     if(!path.length||stage>4){state.mode='ambush';stage=0;path=[];}}
    if(state.mode==='ambush'){stage+=dt;if(stage>1.2&&stage<4&&!path.length&&state.lastHeard)destination(state.lastHeard);if(stage>.65&&state.active&&distance<7&&nav.clear(state.position,player)){
      state.mode='investigate';state.scareCount++;chaseTime=0;memory=7;destination(player);
     }else if(stage>7){state.mode='retreat';cooldown=20;state.lastHeard=null;decision=0;path=[];}}
    if((state.mode==='patrol'||state.mode==='retreat')&&decision<=0){
     decision=2.5;const choices=map.areas.filter(a=>Math.hypot(a.x-state.position.x,a.z-state.position.z)>8).sort((a,b)=>{
      const score=p=>(player?Math.hypot(p.x-player.x,p.z-player.z):0)+(player&&!nav.clear(p,player)?25:0);
      return score(b)-score(a);
     });const area=choices[(patrol++)%Math.min(3,choices.length)];if(area)destination(area);
    }
   }
   if(sight&&player&&(!tactics||state.active&&cooldown<=0&&state.mode!=='ambush')){const dx=player.x-state.position.x,dz=player.z-state.position.z,distance=Math.hypot(dx,dz),facing=distance<2||Math.cos(Math.atan2(dx,dz)-state.yaw)>.12;if(distance<22&&facing&&nav.clear(state.position,player)){noiseCooldown=0;noise({...player,radius:24});memory=5.5;}}
   if(state.lastHeard&&(!tactics||state.mode==='investigate')){memory-=dt;if(memory<=0){state.lastHeard=null;state.mode=tactics?'retreat':'patrol';if(tactics){cooldown=26;decision=0;}path=[];wait=1;}}
   if(path.length&&Math.hypot(path[0].x-state.position.x,path[0].z-state.position.z)<.13)path.shift();
   if(!path.length&&!tactics){wait-=dt;if(state.mode==='investigate'){state.mode='listen';wait=3.5;}else if(wait<=0){state.mode='patrol';state.lastHeard=null;const area=map.areas[(patrol++)%map.areas.length];destination(area);wait=1;}}
   const target=path[0],desired=target?(state.mode==='investigate'?huntSpeed:patrolSpeed):0;
   state.speed=damp(state.speed,desired,desired>state.speed?2.8:7,dt);
   if(target){const dx=target.x-state.position.x,dz=target.z-state.position.z,angle=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(angle-state.yaw),Math.cos(angle-state.yaw));state.yaw+=difference*(1-Math.exp(-5*dt));
    const length=Math.hypot(dx,dz),step=Math.min(length,state.speed*dt),next=sweepMove(state.position,{x:state.position.x+dx/length*step,z:state.position.z+dz/length*step},safe);
    const moved=Math.hypot(next.x-state.position.x,next.z-state.position.z);
    state.travel+=moved;state.position=next;
    if(tactics&&moved<step*.2){path=[];decision=0;}

   }
   state.walk=damp(state.walk,target?Math.min(1,state.speed/.9):0,6,dt);
   if(state.active&&(!tactics||state.mode==='investigate')&&player&&nav.clear(state.position,player)&&Math.hypot(player.x-state.position.x,player.z-state.position.z)<.82){state.caught=true;state.speed=0;state.mode='caught';break;}
  }return state;
 }
 return {state,tick,noise,clear:nav.clear};
}
