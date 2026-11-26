import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
// One decoded copy of the suit is shared by every player on screen (you plus up to three teammates).
// Each player gets a cloned skeleton; geometry, materials and textures are shared and freed with the last user.
const shared=new Map();
function acquire(url){
 let entry=shared.get(url);
 if(!entry){entry={count:0,promise:null};entry.promise=new GLTFLoader().loadAsync(url);entry.promise.catch(()=>{if(shared.get(url)===entry)shared.delete(url);});shared.set(url,entry);}
 entry.count++;return entry.promise;
}
function release(url){
 const entry=shared.get(url);if(!entry||--entry.count>0)return;shared.delete(url);
 entry.promise.then(asset=>{const geometries=new Set(),materials=new Set(),textures=new Set();asset.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [].concat(o.material)){materials.add(m);for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key])textures.add(m[key]);}}});for(const item of [...geometries,...materials,...textures])item.dispose();}).catch(()=>{});
}
/** Adapter for the user's replacement GLB. The source suit stays intact; only the local head is hidden in first person. */
export function createBackroomsPlayer(scene,{url=null,onError=()=>{}}={}){
 const root=new T.Group();root.name='backrooms-player';scene.add(root);let model=null,mixer=null,head=null,headScale=null,active=null,bodyYaw=0,disposed=false,error=null;const actions=new Map();
 let held=false;
 const CLIP_SPEED={walk:5.4,run:9.2,crouchwalk:1.6},lastPos={x:0,z:0};let placed=false;
 const ready=url?acquire(url).then(asset=>{held=true;if(disposed){held=false;release(url);return;}model=clone(asset.scene);root.add(model);model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;}if(o.isBone&&/head(?:\d+)?$/i.test(o.name.replace(/[^a-z0-9]/gi,'')))head=o;});model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),scale=1.8/(box.max.y-box.min.y);model.scale.multiplyScalar(scale);model.position.set(-(box.max.x+box.min.x)*scale/2,-box.min.y*scale,-(box.max.z+box.min.z)*scale/2);if(head)headScale=head.scale.clone();mixer=new T.AnimationMixer(model);for(const clip of asset.animations){const name=/crouch.?walk|sneak.?walk/i.test(clip.name)?'crouchwalk':/crouch|sneak/i.test(clip.name)?'crouch':/run|sprint/i.test(clip.name)?'run':/walk/i.test(clip.name)?'walk':/idle|standing/i.test(clip.name)?'idle':null;if(name&&!actions.has(name))actions.set(name,mixer.clipAction(clip));}}).catch(e=>{error=e;onError();}):Promise.resolve();
 function update(player,delta,{yaw,pitch=0,thirdPerson=false}={}){if(!model||disposed)return;const moving=player.speed>.05,crouching=!!player.crouch,kind=crouching?(moving?'crouchwalk':'crouch'):moving?(player.sprint?'run':'walk'):'idle',key=actions.has(kind)?kind:crouching&&moving&&actions.has('walk')?'walk':'idle',next=actions.get(key);
  if(next&&next!==active&&(delta>0||!active)){next.reset().play();active?.crossFadeTo(next,.2,false);active=next;}
  // Each clip is authored at the speed it is named for (jog 5.4, sprint 9.2, crouch-walk 1.6 m/s), so feet stay planted;
  // beam crossings and pit slopes slow the player and the stride slows with them.
  if(active)active.setEffectiveTimeScale(moving&&CLIP_SPEED[key]?T.MathUtils.clamp(player.speed/CLIP_SPEED[key],.45,1.5):1);
  // Third person: the body faces the way it is travelling (so strafing and backing up look right) and eases back
  // toward the view direction when standing; first person always follows the view.
  if(!placed){placed=true;lastPos.x=player.x??0;lastPos.z=player.z??0;bodyYaw=yaw;}
  const dx=(player.x??0)-lastPos.x,dz=(player.z??0)-lastPos.z,travel=delta>0?Math.hypot(dx,dz)/delta:0;lastPos.x=player.x??0;lastPos.z=player.z??0;
  const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
  if(!thirdPerson)bodyYaw=yaw;else if(delta>0){if(moving&&travel>.35)bodyYaw+=turn(Math.atan2(dx,dz)-Math.PI-bodyYaw)*(1-Math.exp(-14*delta));else if(!moving)bodyYaw+=turn(yaw-bodyYaw)*(1-Math.exp(-3.5*delta));}
  root.rotation.y=bodyYaw+Math.PI;
  mixer?.update(delta);root.position.set(player.x,player.y??0,player.z);root.rotation.y=bodyYaw+Math.PI;if(head){head.scale.copy(headScale);if(!thirdPerson)head.scale.setScalar(.001);}
 // First person never draws your own body: looking down must not show the suit or the inside of it.
 root.visible=thirdPerson;}
 function dispose(){if(disposed)return;disposed=true;mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}if(held){held=false;release(url);}root.removeFromParent();}
 return {root,ready,update,dispose,get model(){return model;},get error(){return error;},get pending(){return !url;}};
}
