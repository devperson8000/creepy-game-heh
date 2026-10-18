import * as THREE from 'three';
import {createPlayerAvatar} from './player-avatar.js';
import {createCreature,applyIdle,applyRunning} from './creature.js';
const pos=(value)=>new THREE.Vector3(value?.x??0,value?.y??0,value?.z??0);
const ease=t=>{const x=THREE.MathUtils.clamp(t,0,1);return x*x*(3-2*x);};
export function createFinaleSurvivor(asset,member){
 const avatar=createPlayerAvatar(asset,member);let disposed=false;
 return {root:avatar.root,sample(pose={}){
  if(disposed)return;
  avatar.sampleCinematic(pose);
 },dispose(){if(!disposed){disposed=true;avatar.dispose();}}};
}
/** Monochrome is a separate instance of the game's actual procedural creature. */
export function createFinaleCreature(){
 const creature=createCreature(),{root,head}=creature;
 const jaw=new THREE.Group();jaw.name='finale-jaw';head.add(jaw);
 const dark=new THREE.MeshBasicMaterial({color:0x09090a,side:THREE.DoubleSide});
 const interior=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),dark);interior.position.set(0,.2,.175);interior.scale.set(1,1.25,.18);jaw.add(interior);
 const teethMaterial=new THREE.MeshBasicMaterial({color:0xc8c8c3});
 for(const side of [-1,1]){
  const tooth=new THREE.Mesh(new THREE.ConeGeometry(.027,.085,8),teethMaterial);
  tooth.position.set(side*.065,.12,.211);tooth.rotation.z=Math.PI; jaw.add(tooth);
 }
 let disposed=false;
 return {root,head,jaw,sample({time=0,mode='chase',position={x:0,y:0,z:0},yaw=0}={}){
  if(disposed)return;
  const t=Math.max(0,time);applyIdle(creature,{sway:0,pitch:0,yaw:0,arm:0});
  if(mode==='chase')applyRunning(creature,t,1);
  root.position.copy(pos(position));root.rotation.y=yaw;
  if(mode==='trapped'){creature.torso.rotation.x=.3;creature.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(t*14+i)*.4);head.rotation.x=-.18;}
  if(mode==='defeated'||mode==='dead'){
   const progress=ease(mode==='dead'?1:(t%4)/4);
   creature.torso.rotation.x=progress*.75;head.rotation.x=progress*.38;
   root.scale.setScalar(1-.28*progress);
  }else root.scale.setScalar(1);
  jaw.rotation.x=mode==='dead'?0:mode==='trapped'?.3+.18*Math.sin(t*12):.12+.13*Math.sin(t*9);
  root.visible=mode!=='hidden';
 },dispose(){
  if(disposed)return;disposed=true;root.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material){for(const m of [].concat(object.material))m.dispose();}});root.removeFromParent();
 }};
}
