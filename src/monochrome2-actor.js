import * as THREE from 'three';
import {createCreatureMotion} from './creature.js';

/**
 * Visual for the `monochrome` slot. Loads `slot.modelUrl` when one is set; otherwise (or if it
 * fails) wears the rebuilt metal-head body. Heavy modules load lazily so a pure simulation or a
 * server-side test never pulls in canvas-backed textures.
 */
export async function createMonochrome2Actor(scene,slot,{onError=()=>{}}={}){
 const root=new THREE.Group();root.name='monochrome2-monochrome';root.visible=false;scene.add(root);
 const motion=createCreatureMotion();let rig=null,imported=null,disposed=false,jawPulse=0;
 async function procedural(){
  const {createRebuiltMonochrome}=await import('./mechanical-head.js');
  if(disposed)return;
  rig=createRebuiltMonochrome();const s=slot.height/slot.nativeHeight;rig.root.scale.setScalar(s);root.add(rig.root);
 }
 if(slot.modelUrl){
  try{
   const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),asset=await new GLTFLoader().loadAsync(slot.modelUrl);
   if(!disposed){
    imported=asset.scene;imported.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;}});
    const box=new THREE.Box3().setFromObject(imported),scale=slot.height/Math.max(.01,box.max.y-box.min.y);imported.scale.multiplyScalar(scale);
    const b2=new THREE.Box3().setFromObject(imported);imported.position.set(-(b2.min.x+b2.max.x)/2,-b2.min.y,-(b2.min.z+b2.max.z)/2);root.add(imported);
   }
  }catch(error){onError(error);imported=null;await procedural();}
 }else await procedural();
 let time=0;
 return {
  root,get imported(){return !!imported;},
  /** A click from the telegraph snaps the jaw. */
  clack(){jawPulse=1;},
  update({x,z,y=0,yaw,mode,visible=true},delta){
   if(disposed)return;
   root.visible=visible&&mode!=='dormant';root.position.set(x,y,z);root.rotation.y=yaw;
   const dt=Math.max(0,Math.min(.2,delta||0)),gait=motion.update({x,z},mode,dt,mode!=='dormant'&&mode!=='attack');
   time+=dt;jawPulse=Math.max(0,jawPulse-dt*7);
   const jaw=mode==='attack'?1:Math.max(jawPulse*.7,mode==='chase'?.12:0);
   rig?.sample({time,travel:gait.time,walk:gait.weight,position:[0,0,0],yaw:0,jaw});
  },
  dispose(){if(disposed)return;disposed=true;rig?.dispose();if(imported){imported.traverse(o=>{o.geometry?.dispose();const m=o.material;for(const x of Array.isArray(m)?m:m?[m]:[])x.dispose();});}root.removeFromParent();}
 };
}
