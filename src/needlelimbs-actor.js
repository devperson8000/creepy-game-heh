import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const NEEDLELIMBS_MODEL_URL='/models/teaser/needlelimbs.glb';
let cached;
export function loadNeedlelimbsAsset(){
 cached??=new GLTFLoader().loadAsync(NEEDLELIMBS_MODEL_URL).catch(error=>{cached=undefined;throw error;});return cached;
}
/** Uses the source skeleton and animation. Never substitutes another creature or a static mesh. */
export function createNeedlelimbsActor(asset,{walkClipName}={}){
 const walkClip=asset.animations?.find(c=>walkClipName?c.name===walkClipName:/walk|stalk|crawl|locomot/i.test(c.name));
 if(!walkClip)throw new Error('Needlelimbs needs its original skeletal walking animation.');
 const root=new THREE.Group(),model=clone(asset.scene);root.name='teaser-needlelimbs';root.add(model);
 const bones=new Map(),surfaces=new Map(),skeletons=new Set();let disposed=false;
 model.traverse(o=>{if(o.isBone)bones.set(o.name.toLowerCase().replace(/[^a-z0-9]/g,''),o);if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;if(o.isSkinnedMesh)skeletons.add(o.skeleton);
  const copy=m=>{if(!surfaces.has(m)){const c=m.clone();if(c.color)c.color.multiplyScalar(.65);c.roughness=Math.max(.58,c.roughness??.8);surfaces.set(m,c);}return surfaces.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
 });
 model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<.001)throw new Error('Needlelimbs source has no usable bounds.');
 const scale=3.25/height;model.scale.multiplyScalar(scale);model.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);
 const find=pattern=>[...bones].find(([name])=>pattern.test(name))?.[1];
 const head=find(/head(\d+)?$/),neck=find(/neck(\d+)?$/);
 if(!head){surfaces.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());throw new Error('Needlelimbs source needs a head bone for the corner peek.');}
 const bind=new Map([...bones.values()].map(b=>[b,{position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}]));
 // The director owns horizontal travel. Keep vertical weight shifts from the actual clip.
 const clip=walkClip.clone();
 for(const track of clip.tracks){
  const binding=THREE.PropertyBinding.parseTrackName(track.name),name=String(binding.objectIndex??binding.nodeName??'').toLowerCase().replace(/[^a-z0-9]/g,''),bone=bones.get(name);
  if(binding.propertyName!=='position'||!bone||bone.parent?.isBone&&!/(hips|root|pelvis)/.test(name))continue;
  const base=bind.get(bone).position;
  for(let i=0;i<track.values.length;i+=3){track.values[i]=base.x;track.values[i+2]=base.z;}
 }
 const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.play();
 function sample({travel=0,peek=0,position=[0,0,0],yaw=0}={}){
  if(disposed)return;
  for(const [bone,saved] of bind){bone.position.copy(saved.position);bone.quaternion.copy(saved.quaternion);bone.scale.copy(saved.scale);}
  // Continuous distance-based sampling makes seeking and co-op clocks deterministic.
  action.enabled=true;action.setEffectiveWeight(1);mixer.setTime(Math.max(0,travel)*.9);
  const p=THREE.MathUtils.clamp(peek,0,1);
  if(neck){neck.rotation.y+=p*.15;neck.rotation.z-=p*.1;}
  head.rotation.y+=p*.5;head.rotation.z-=p*.16;
  root.position.fromArray(position);root.rotation.set(0,yaw,0);
  // A low stance keeps the real rig's silhouette; motion comes from its clip, not root bobbing.
  root.updateMatrixWorld(true);
 }
 function dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);skeletons.forEach(s=>s.dispose());surfaces.forEach(m=>m.dispose());root.removeFromParent();}
 return {root,model,head,neck,sample,dispose};
}
