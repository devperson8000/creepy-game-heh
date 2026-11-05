import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBackroomsStalkerActor} from './backrooms-stalker-actor.js';
import {loadNeedlelimbsAsset,createNeedlelimbsActor} from './needlelimbs-actor.js';
import {createNeedleSimulation} from './backrooms-needle-state.js';
import {createNeedleAudio} from './backrooms-needle-audio.js';

export function createBackroomsNeedle(world,{onError=()=>{},classic=true}={}){
 const spawns=world.map.areas.filter(a=>Math.hypot(a.x-world.map.spawn.x,a.z-world.map.spawn.z)>26).sort(()=>Math.random()-.5);
 const needleOptions={tactics:!classic,sight:classic,grace:classic?180:32,spawn:spawns[0],patrolSpeed:4.6,huntSpeed:11.2},hunterOptions={tactics:true,grace:48,spawn:spawns.find(p=>Math.hypot(p.x-spawns[0].x,p.z-spawns[0].z)>25)??spawns[1],sight:true,patrolSpeed:5.2,huntSpeed:12,bodyRadius:.6};let simulation=createNeedleSimulation(world.map,needleOptions),hunterSimulation=createNeedleSimulation(world.map,hunterOptions);let actor=null,hunter=null,audio=null,hunterAudio=null,disposed=false,error=null,stepDistance=0,throwAt=-Infinity,lastCaught=false,listenBlend=0,scares=0;
 const pebble=new T.Mesh(new T.IcosahedronGeometry(.035,0),new T.MeshStandardMaterial({color:0x73684d,roughness:1}));pebble.visible=false;world.scene.add(pebble);let projectile=null;
 const hunterReady=classic?Promise.resolve():new GLTFLoader().loadAsync('/models/teaser/sonask.glb').then(asset=>{if(disposed)return;hunter=createBackroomsStalkerActor(asset);world.scene.add(hunter.root);hunter.sample(hunterSimulation.state,0);}).catch(e=>{error=e;if(!disposed)onError();});
 const needleReady=loadNeedlelimbsAsset().then(asset=>{if(disposed)return;actor=createNeedlelimbsActor(asset,{height:2.62,realtime:true});actor.root.name='level-zero-needlelimbs';world.scene.add(actor.root);actor.root.visible=!classic;const s=simulation.state;actor.sample({position:[s.position.x,0,s.position.z],walk:0});}).catch(e=>{error=e;if(!disposed)onError();});
 const ready=Promise.all([needleReady,hunterReady]);
 function unlock(context,output){if(!disposed&&context&&output){audio??=createNeedleAudio(context,output);if(!classic)hunterAudio??=createNeedleAudio(context,output,{stalker:true});}}
 function movement(distance,sprinting,player){
  if((!actor&&!hunter)||simulation.state.caught||hunterSimulation.state.caught||!Number.isFinite(distance))return;stepDistance+=distance;
  if(stepDistance>=(sprinting?.95:.8)){stepDistance%=sprinting?.95:.8;const event={x:player.x,z:player.z,radius:sprinting?28:10};simulation.noise(event);hunterSimulation.noise(event);}
 }
 function distract(player,yaw,time){
  if((!actor&&!hunter)||simulation.state.caught||hunterSimulation.state.caught||time-throwAt<6)return false;
  const target={x:player.x,z:player.z};for(let d=.4;d<=7;d+=.2){const next={x:player.x-Math.sin(yaw)*d,z:player.z-Math.cos(yaw)*d};if(!world.canMove(next.x,next.z)||!simulation.clear(target,next))break;Object.assign(target,next);}
  projectile={from:{x:player.x,z:player.z},target,start:time,landed:false};throwAt=time;pebble.visible=true;return true;
 }
 function update(delta,time,player,yaw,{paused=false,targets=null}={}){
  if(disposed||(!actor&&!hunter))return {caught:false,ready:false};
  const prey=sim=>targets?.filter(p=>!p.exitReady).sort((a,b)=>{const score=p=>Math.hypot(p.x-sim.state.position.x,p.z-sim.state.position.z)+(sim.clear(sim.state.position,p)?0:30);return score(a)-score(b);})[0]??player;
  const state=actor?simulation.tick(paused?0:delta,prey(simulation),hunter?[hunterSimulation.state]:[]):simulation.state;
  if(projectile){const u=T.MathUtils.clamp((time-projectile.start)/.65,0,1);pebble.position.set(T.MathUtils.lerp(projectile.from.x,projectile.target.x,u),1.2*(1-u)+Math.sin(u*Math.PI)*.7+.04,T.MathUtils.lerp(projectile.from.z,projectile.target.z,u));
   if(u===1&&!projectile.landed&&!paused){projectile.landed=true;audio?.impact(projectile.target);simulation.noise({...projectile.target,radius:35,distraction:true});hunterSimulation.noise({...projectile.target,radius:35,distraction:true});}
   if(u===1&&time-projectile.start>3){pebble.visible=false;projectile=null;}}
  if(actor){
  actor.root.visible=!classic||state.active;
  listenBlend+=((state.mode==='listen'?.22:0)-listenBlend)*(1-Math.exp(-Math.max(0,paused?0:delta)*3));
  actor.sample({time,travel:state.travel,walk:state.walk,speed:state.speed,position:[state.position.x,0,state.position.z],yaw:state.yaw,peek:listenBlend});
  if(!paused)audio?.update(state,player,yaw,time,{occluded:!simulation.clear(state.position,player),footContacts:actor.gait.contacts});
  }
  if(hunter){const h=hunterSimulation.tick(paused?0:delta,prey(hunterSimulation),actor?[simulation.state]:[]);hunter.sample(h,time);if(!paused)hunterAudio?.update(h,player,yaw,time,{occluded:!hunterSimulation.clear(h.position,player),footContacts:hunter.gait.contacts});}
  const anyCaught=state.caught||hunterSimulation.state.caught,caught=anyCaught&&!lastCaught;lastCaught=anyCaught;const count=state.scareCount+hunterSimulation.state.scareCount,scare=!paused&&count>scares;scares=count;return {caught,scare,ready:true,caughtBy:state.caught?(classic?'Howler':'Needlelimbs'):'Stalker'};
 }
 function replicate(packet,time,player,yaw,paused=false){if(packet?.needle)Object.assign(simulation.state,packet.needle);if(packet?.hunter)Object.assign(hunterSimulation.state,packet.hunter);return update(0,time,player,yaw,{paused});}
 function reset(){simulation=createNeedleSimulation(world.map,needleOptions);hunterSimulation=createNeedleSimulation(world.map,hunterOptions);lastCaught=false;scares=0;stepDistance=0;throwAt=-Infinity;projectile=null;pebble.visible=false;for(const a of [actor,hunter])if(a?.gait?.feet)for(const f of a.gait.feet){f.anchor=null;f.phase=1;}}
 function dispose(){if(disposed)return;disposed=true;audio?.dispose();hunterAudio?.dispose();actor?.dispose();hunter?.dispose();pebble.removeFromParent();pebble.geometry.dispose();pebble.material.dispose();}
 return {ready,unlock,movement,distract,update,dispose,replicate,reset,get simulation(){return simulation;},get hunterSimulation(){return hunterSimulation;},get hunter(){return hunter;},get actor(){return actor;},get error(){return error;}};
}
