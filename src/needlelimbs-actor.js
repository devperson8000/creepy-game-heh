import * as THREE from 'three';
import {createNeedleGait} from './needlelimbs-gait.js';
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
  const copy=m=>{if(!surfaces.has(m)){const c=m.clone();if(c.color)c.color.multiplyScalar(c.map?.9:.65);c.roughness=Math.max(.58,c.roughness??.8);surfaces.set(m,c);}return surfaces.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
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
  const binding=THREE.PropertyBinding.parseTrackName(track.name),name=String(binding.objectIndex??binding.nodeName??'').toLowerCase().replace(/[^a-z0-9]/g,''),bone=bones.get(name)??model.getObjectByName(binding.nodeName);
  if(binding.propertyName!=='position'||!bone||bone.parent?.isBone&&!/(hips|root|pelvis)/.test(name))continue;
  const base=bind.get(bone)?.position??bone.position;
  for(let i=0;i<track.values.length;i+=3){track.values[i]=base.x;track.values[i+2]=base.z;}
 }
 const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.play();mixer.setTime(0);
 root.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 model.position.y-=new THREE.Box3().setFromObject(model).min.y;root.updateMatrixWorld(true);
 const gait=createNeedleGait(model),basePosition=model.position.clone();
 function sample({travel=0,walk=1,peek=0,time=0,position=[0,0,0],yaw=0}={}){
  if(disposed)return;
  action.stop();model.position.copy(basePosition);
  for(const [bone,saved] of bind){bone.position.copy(saved.position);bone.quaternion.copy(saved.quaternion);bone.scale.copy(saved.scale);}
  // Continuous distance-based sampling makes seeking and co-op clocks deterministic.
  action.reset().play();action.enabled=true;action.setEffectiveWeight(1);mixer.setTime(Math.max(0,travel)*.9);
  // Settle the source legs toward their planted imported stance as travel eases out.
  const moving=THREE.MathUtils.clamp(walk,0,1);
  for(const [name,bone] of bones)if(/^(thigh|shin|foot|leg)/.test(name))bone.quaternion.slerp(bind.get(bone).quaternion,1-moving);
  const p=THREE.MathUtils.clamp(peek,0,1);
  // Lean from the upper spine, then turn the neck/head; the planted root stays behind cover.
  const chest=find(/^(spine002|chest)$/),shoulders=find(/^spine003$/);
  if(chest){chest.rotation.x+=p*.07+Math.sin(time*1.8)*.006;chest.rotation.z+=Math.sin(travel/.95*Math.PI*2)*.012*moving;}
  if(shoulders)shoulders.rotation.x+=p*.04;
  if(neck){neck.rotation.x+=p*.06;neck.rotation.y+=p*.15;neck.rotation.z-=p*.1;}
  head.rotation.y+=p*.5;head.rotation.z-=p*.16;
  root.position.fromArray(position);root.rotation.set(0,yaw,0);
  // Preserve the imported bent stance and source skeletal gait.
  root.updateMatrixWorld(true);
  // Refresh skinned bounds: cached rest-pose bounds cannot ground an animated rig.
  model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});

  gait.sample({travel,walk:moving,position,yaw});
  root.updateMatrixWorld(true);
  model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
  root.updateMatrixWorld(true);
 }
 function dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);skeletons.forEach(s=>s.dispose());surfaces.forEach(m=>m.dispose());root.removeFromParent();}
 return {root,model,head,neck,gait,sample,dispose};
}
