import * as THREE from 'three';
import {createPlayerAvatar} from './player-avatar.js';
import {createCreature,applyIdle,applyRunning} from './creature.js';
export function createFinaleSurvivor(asset,member){
 const avatar=createPlayerAvatar(asset,member);
 return {root:avatar.root,sample:pose=>avatar.sampleCinematic(pose),dispose:()=>avatar.dispose()};
}
export function createFinaleCreature(){
 const body=createCreature(),root=new THREE.Group(),head=body.head,jaw=new THREE.Group();root.add(body.root);root.add(head);
 const surface=new THREE.MeshStandardMaterial({color:0x030507,roughness:.77,metalness:.15});
 const original=new Set();body.root.traverse(o=>{if(o.isMesh&&o.material.userData.creatureBody){original.add(o.material);o.material=surface;}});
 head.traverse(o=>{if(o.isMesh&&o.material.userData.creatureBody){original.add(o.material);o.material=surface;}});for(const m of original)m.dispose();
 const inner=new THREE.MeshStandardMaterial({color:0x160c12,roughness:.85}),teeth=new THREE.MeshStandardMaterial({color:0x827d71,roughness:.9});
 const maw=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),inner);maw.position.set(0,.24,.162);maw.scale.set(.137,.14,.055);head.add(maw);
 jaw.position.set(0,.27,.13);head.add(jaw);
 const chin=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),surface);chin.scale.set(.15,.065,.09);chin.position.set(0,-.105,.025);jaw.add(chin);
 for(let i=0;i<7;i++){
  const tooth=new THREE.Mesh(new THREE.ConeGeometry(.014,.055,6),teeth);tooth.position.set((i-3)*.034,.315,.205);tooth.rotation.z=Math.PI;head.add(tooth);
  const lower=tooth.clone();lower.position.set((i-3)*.033,-.055,.075);lower.rotation.z=0;jaw.add(lower);
 }
 const neck=new THREE.Mesh(new THREE.CircleGeometry(.115,24),inner);neck.rotation.x=Math.PI/2;neck.position.y=.005;head.add(neck);
 const anchor=new THREE.Vector3(),orientation=new THREE.Quaternion();let disposed=false;
 function sample({time=0,mode='chase',position=[0,0,0],yaw=0,neckPosition=[0,2,0],deathTime=0}={}){
  applyIdle(body,{sway:0,pitch:0,yaw:0,arm:0});body.torso.rotation.set(0,0,0);body.root.rotation.set(0,yaw,0);
  if(mode==='chase')applyRunning(body,time,1);
  body.root.position.add(new THREE.Vector3().fromArray(position));body.root.visible=mode==='chase'||mode==='trapped';
  if(mode==='chase'){
   body.root.updateMatrixWorld(true);anchor.set(0,1.39,0);body.torso.localToWorld(anchor);root.worldToLocal(anchor);head.position.copy(anchor);
   body.torso.getWorldQuaternion(orientation);head.quaternion.copy(orientation);jaw.rotation.x=.12;
  }else if(mode==='trapped'){
   body.torso.rotation.x=-.48;head.position.fromArray(neckPosition);head.rotation.set(-.16+Math.sin(time*19)*.035,yaw,Math.sin(time*13)*.04);jaw.rotation.x=.52+Math.sin(time*23)*.15;
   body.arms.forEach((arm,i)=>{arm.rotation.x=-1.2;arm.rotation.z=(i?1:-1)*.24;body.elbows[i].rotation.x=-.4;});
  }else{
   const d=Math.max(0,deathTime),floor=neckPosition[1]-1.72;
   const falling=Math.min(d,1.2),drop=Math.max(.13,1.72-4.5*falling*falling);
   const bounce=d>.6&&d<1.5?Math.abs(Math.sin((d-.6)*10))*.13*Math.exp(-(d-.6)*3):0;
   head.position.set(neckPosition[0]+Math.min(d,1.8)*.22,floor+drop+bounce,neckPosition[2]+Math.min(d,1.8)*.5);
   const twitch=d<4?Math.sin(d*36)*.1*Math.exp(-d*.9):0;
   head.rotation.set(Math.min(d/1.1,1)*1.47,yaw+Math.min(d,1.8)*.45,Math.min(d,1)*.24+twitch);jaw.rotation.x=.48+(d<4?Math.sin(d*26)*.13*Math.exp(-d*.8):0);
  }
  root.updateMatrixWorld(true);
 }
 function dispose(){if(disposed)return;disposed=true;const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}
 return {root,body,head,jaw,sample,dispose};
}
