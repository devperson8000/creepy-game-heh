import * as T from 'three';
import {loadNeedlelimbsAsset,createNeedlelimbsActor} from './needlelimbs-actor.js';
import {createNeedleSimulation} from './backrooms-needle-state.js';
import {createNeedleAudio} from './backrooms-needle-audio.js';

export function createBackroomsNeedle(world,{onError=()=>{}}={}){
 const simulation=createNeedleSimulation(world.map);let actor=null,audio=null,disposed=false,error=null,stepDistance=0,throwAt=-Infinity,lastCaught=false,listenBlend=0;
 const pebble=new T.Mesh(new T.IcosahedronGeometry(.035,0),new T.MeshStandardMaterial({color:0x73684d,roughness:1}));pebble.visible=false;world.scene.add(pebble);let projectile=null;
 const ready=loadNeedlelimbsAsset().then(asset=>{if(disposed)return;actor=createNeedlelimbsActor(asset,{height:2.62,realtime:true});actor.root.name='level-zero-needlelimbs';world.scene.add(actor.root);const s=simulation.state;actor.sample({position:[s.position.x,0,s.position.z],walk:0});}).catch(e=>{error=e;if(!disposed)onError();});
 function unlock(context,output){if(!disposed&&!audio&&context&&output)audio=createNeedleAudio(context,output);}
 function movement(distance,sprinting,player){
  if(!actor||simulation.state.caught||!Number.isFinite(distance))return;stepDistance+=distance;
  if(stepDistance>=(sprinting?.95:.8)){stepDistance%=sprinting?.95:.8;simulation.noise({x:player.x,z:player.z,radius:sprinting?21:8});}
 }
 function distract(player,yaw,time){
  if(!actor||simulation.state.caught||time-throwAt<6)return false;
  const target={x:player.x,z:player.z};for(let d=.4;d<=7;d+=.2){const next={x:player.x-Math.sin(yaw)*d,z:player.z-Math.cos(yaw)*d};if(!world.canMove(next.x,next.z)||!simulation.clear(target,next))break;Object.assign(target,next);}
  projectile={from:{x:player.x,z:player.z},target,start:time,landed:false};throwAt=time;pebble.visible=true;return true;
 }
 function update(delta,time,player,yaw,{paused=false}={}){
  if(disposed||!actor)return {caught:false,ready:!!actor};
  const state=simulation.tick(paused?0:delta,player);
  if(projectile){const u=T.MathUtils.clamp((time-projectile.start)/.65,0,1);pebble.position.set(T.MathUtils.lerp(projectile.from.x,projectile.target.x,u),1.2*(1-u)+Math.sin(u*Math.PI)*.7+.04,T.MathUtils.lerp(projectile.from.z,projectile.target.z,u));
   if(u===1&&!projectile.landed&&!paused){projectile.landed=true;audio?.impact(projectile.target);simulation.noise({...projectile.target,radius:26,distraction:true});}
   if(u===1&&time-projectile.start>3){pebble.visible=false;projectile=null;}}
  listenBlend+=((state.mode==='listen'?.22:0)-listenBlend)*(1-Math.exp(-Math.max(0,paused?0:delta)*3));
  actor.sample({time,travel:state.travel,walk:state.walk,speed:state.speed,position:[state.position.x,0,state.position.z],yaw:state.yaw,peek:listenBlend});
  if(!paused)audio?.update(state,player,yaw,time,{occluded:!simulation.clear(state.position,player),footContacts:actor.gait.contacts});
  const caught=state.caught&&!lastCaught;lastCaught=state.caught;return {caught,ready:true};
 }
 function dispose(){if(disposed)return;disposed=true;audio?.dispose();actor?.dispose();pebble.removeFromParent();pebble.geometry.dispose();pebble.material.dispose();}
 return {ready,unlock,movement,distract,update,dispose,simulation,get actor(){return actor;},get error(){return error;}};
}
