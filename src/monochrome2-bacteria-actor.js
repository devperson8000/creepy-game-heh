import * as THREE from 'three';

/**
 * Visual for the `bacteria` slot: the rigged bacteria.glb (skeleton and clips baked by the rig tool:
 * idle, walk, run, search, notice, knock). Throws if the model cannot load, so the encounter keeps the
 * Bacteria offline instead of running an invisible killer.
 */
const NOMINAL={walk:2.0,run:7.6};
export async function createBacteriaActor(scene,slot){
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const asset=await new GLTFLoader().loadAsync(slot.modelUrl);
 const root=new THREE.Group();root.name='monochrome2-bacteria';root.visible=false;scene.add(root);
 const model=asset.scene;model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=false;}});
 model.scale.setScalar(slot.height/(slot.nativeHeight||slot.height));root.add(model);
 const mixer=new THREE.AnimationMixer(model),actions=new Map();
 for(const clip of asset.animations){const a=mixer.clipAction(clip);if(clip.name==='notice'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}actions.set(clip.name,a);}
 let active=null,disposed=false;
 /** Which clip a behaviour plays. Moving uses the gaits; standing still uses the matching pose. */
 const clipFor=(mode,speed)=>{
  const moving=speed>.05;
  if(mode==='knock')return 'knock';
  if(mode==='notice'||mode==='attack')return 'notice';
  if(mode==='chase')return moving?'run':'idle';
  if(mode==='search')return moving?'walk':'search';
  return moving?'walk':'idle';
 };
 return {
  root,get model(){return model;},actions,clipFor,
  get clip(){return active?.getClip().name??null;},
  update({x,z,yaw,mode,speed=0,visible=true},delta){
   if(disposed)return;
   root.visible=visible&&mode!=='absent';root.position.set(x,0,z);root.rotation.y=yaw;
   const name=clipFor(mode,speed),next=actions.get(name)??actions.get('idle'),dt=Math.max(0,Math.min(.2,delta||0));
   if(next&&next!==active){next.reset().play();if(active)active.crossFadeTo(next,name==='notice'?.12:.22,false);active=next;}
   if(active){const nominal=NOMINAL[name];active.setEffectiveTimeScale(nominal?THREE.MathUtils.clamp(speed/nominal,name==='run'?.7:.6,name==='run'?1.3:1.8):1);}
   mixer.update(dt);
  },
  dispose(){
   if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);
   model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton?.dispose();o.geometry?.dispose?.();const m=o.material;for(const x of Array.isArray(m)?m:m?[m]:[])x.dispose?.();});
   root.removeFromParent();
  }
 };
}
