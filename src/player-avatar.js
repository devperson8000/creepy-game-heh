import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

let assetPromise;

/** The curved survivor is shared; each actor receives its own rig and materials. */
export function loadPlayerAvatarAsset(){
 if(!assetPromise){
  assetPromise=new GLTFLoader().loadAsync('/models/hazmat-survivor.glb').catch(error=>{assetPromise=undefined;throw error;});
 }
 return assetPromise;
}

const COLORS=[0xc3a16b,0x7895a0,0x9d8daa,0x829573];
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

function canvasTexture(width,height,draw){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)return null;
 draw(context);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

export function createPlayerAvatar(asset,{id,name='Survivor',slot=0}={}){
 const root=new THREE.Group();root.name='player-avatar';
 const playerSlot=((Math.trunc(finite(slot))%4)+4)%4,number=playerSlot+1,color=COLORS[playerSlot];
 root.userData={playerId:id,playerName:name,slot:playerSlot};
 const model=cloneSkeleton(asset.scene);model.name='player-model';root.add(model);
 const ownedMaterials=new Set(),ownedGeometry=new Set(),ownedTextures=new Set(),skeletons=new Set(),materialClones=new Map();
 model.traverse(object=>{
  if(!object.isMesh)return;
  object.castShadow=true;object.receiveShadow=true;
  const cloneMaterial=material=>{
   if(!materialClones.has(material)){
    const copy=material.clone();materialClones.set(material,copy);ownedMaterials.add(copy);
   }
   return materialClones.get(material);
  };
  object.material=Array.isArray(object.material)?object.material.map(cloneMaterial):cloneMaterial(object.material);
  if(object.isSkinnedMesh){skeletons.add(object.skeleton);object.frustumCulled=false;}
 });
 const material=options=>{const result=new THREE.MeshStandardMaterial(options);ownedMaterials.add(result);return result;};
 const mesh=(geometry,surface,parent)=>{
  ownedGeometry.add(geometry);const result=new THREE.Mesh(geometry,surface);parent.add(result);return result;
 };
 const findBone=key=>{
  let found;model.traverse(object=>{if(object.isBone&&object.name.replace(/[._-]/g,'').toLowerCase()===key)found=object;});return found;
 };
 const chest=findBone('spine003'),hand=findBone('handr');
 root.updateMatrixWorld(true);

 // Calculate a rest-pose attachment once, then let the real skeleton animate it.
 function attachAtModelPoint(object,bone,position){
  if(!bone){model.add(object);object.position.copy(position);return;}
  bone.add(object);object.position.copy(bone.worldToLocal(model.localToWorld(position.clone())));
  object.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(model.getWorldQuaternion(new THREE.Quaternion()));
 }

 const patchSurface=material({color:0xd6d0bb,roughness:1});
 const ink=material({color:0x252821,roughness:1});
 const tapeSurface=material({color,roughness:1});
 const patchTexture=canvasTexture(128,128,context=>{
  context.fillStyle='#d6d0bb';context.fillRect(0,0,128,128);
  context.strokeStyle='#777968';context.lineWidth=3;context.strokeRect(7,7,114,114);
  context.fillStyle='#252821';context.font='bold 96px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(String(number),64,68);
 });
 if(patchTexture){ownedTextures.add(patchTexture);patchSurface.map=patchTexture;patchSurface.color.setHex(0xffffff);}
 for(const back of [false,true]){
  const attachment=new THREE.Group();attachAtModelPoint(attachment,chest,new THREE.Vector3(0,1.31,back?-.25:.18));
  if(back)attachment.rotateY(Math.PI);
  const patch=mesh(new THREE.PlaneGeometry(.16,.19),patchSurface,attachment);
  patch.name=back?'player-number-back':'player-number';patch.userData.number=number;
  if(!patchTexture){
   const segments={1:[1,2],2:[0,1,6,4,3],3:[0,1,6,2,3],4:[5,6,1,2]}[number];
   const positions=[[0,.065], [.04,.034], [.04,-.034], [0,-.065],[-.04,-.034],[-.04,.034],[0,0]];
   for(const segment of segments){const horizontal=[0,3,6].includes(segment),digit=mesh(new THREE.BoxGeometry(horizontal?.07:.013,horizontal?.013:.055,.002),ink,patch);digit.position.set(...positions[segment],.003);}
  }
  const tape=mesh(new THREE.PlaneGeometry(.23,.032),tapeSurface,attachment);tape.position.y=.135;
 }

 const labelTexture=canvasTexture(512,96,context=>{
  context.fillStyle='rgba(12,16,14,.76)';context.fillRect(0,8,512,80);
  context.fillStyle='#e2e6d9';context.font='bold 38px sans-serif';context.textAlign='center';context.textBaseline='middle';
  context.fillText(`${number} · ${String(name).slice(0,24)}`,256,49,490);
 });
 if(labelTexture){
  ownedTextures.add(labelTexture);
  const labelMaterial=new THREE.SpriteMaterial({map:labelTexture,depthTest:true,depthWrite:false,transparent:true});ownedMaterials.add(labelMaterial);
  const label=new THREE.Sprite(labelMaterial);label.name='player-name';label.position.y=2.02;label.scale.set(.82,.154,1);root.add(label);
 }

 const torch=new THREE.Group();torch.name='player-torch';
 (hand??model).add(torch);torch.position.set(hand?0:-.3,hand ? .045 : 1.1,.03);
 const grip=material({color:0x25292a,roughness:.85}),metal=material({color:0x5b625e,metalness:.65,roughness:.4});
 function cylinder(radiusTop,radiusBottom,length,z,surface){const part=mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,length,16),surface,torch);part.rotation.x=Math.PI/2;part.position.z=z;}
 cylinder(.032,.032,.19,0,grip);cylinder(.055,.034,.08,.12,metal);cylinder(.058,.058,.014,.165,metal);
 const lensMaterial=new THREE.MeshBasicMaterial({color:0xcbd5c7});ownedMaterials.add(lensMaterial);
 const lens=mesh(new THREE.CircleGeometry(.048,16),lensMaterial,torch);lens.position.z=.174;
 const beam=new THREE.SpotLight(0xe4e9dc,0,12,.48,.8,1.5);beam.name='player-beam';beam.position.z=.18;beam.castShadow=false;
 const target=new THREE.Object3D();target.position.z=12;torch.add(beam,target);beam.target=target;
 const glow=new THREE.PointLight(0xe4e9dc,0,2.5,2);glow.position.z=.2;torch.add(glow);

 const mixer=new THREE.AnimationMixer(model),actions=new Map();
 for(const clip of asset.animations??[]){const action=mixer.clipAction(clip);actions.set(clip.name.toLowerCase(),action);}
 let activeAction,spawned=false,disposed=false,lastFallen=false;
 const goal=new THREE.Vector3(),orientation=new THREE.Quaternion(),handRotation=new THREE.Quaternion(),pitchRotation=new THREE.Quaternion(),pitchAxis=new THREE.Vector3(1,0,0);
 function animate(name,fallen){
  const next=actions.get(name)??actions.get('idle');if(!next)return;
  if(next===activeAction&&fallen===lastFallen)return;
  const previous=activeAction;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  next.setLoop(fallen?THREE.LoopOnce:THREE.LoopRepeat,fallen?1:Infinity);next.clampWhenFinished=fallen;next.play();
  if(previous&&previous!==next)previous.crossFadeTo(next,.18,false);
  activeAction=next;lastFallen=fallen;
 }
 animate('idle',false);

 function update(pose={},delta=1/60){
  if(disposed)return;
  const dt=THREE.MathUtils.clamp(finite(delta),0,.1),status=pose.status??'alive',fallen=status==='downed'||status==='dead';
  goal.set(finite(pose.x,root.position.x),finite(pose.height,root.position.y),finite(pose.z,root.position.z));
  const yaw=finite(pose.yaw,root.rotation.y-Math.PI)+Math.PI;
  if(!spawned||root.position.distanceToSquared(goal)>36){root.position.copy(goal);root.rotation.y=yaw;spawned=true;}
  else{
   const blend=1-Math.exp(-14*dt);root.position.lerp(goal,blend);
   root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*blend;
  }
  root.visible=!pose.hidden&&status!=='escaped';
  const moving=pose.moving??(Math.hypot(finite(pose.forward),finite(pose.right))>.05||finite(pose.speed)>.1);
  animate(fallen?'death':moving?(pose.sprint?'run':'walk'):'idle',fallen);
  mixer.update(dt);
  root.updateMatrixWorld(true);
  root.getWorldQuaternion(orientation);pitchRotation.setFromAxisAngle(pitchAxis,-THREE.MathUtils.clamp(finite(pose.pitch),-1.4,1.4));orientation.multiply(pitchRotation);
  torch.parent.getWorldQuaternion(handRotation).invert();torch.quaternion.copy(handRotation).multiply(orientation);
  const lit=Boolean(pose.torch)&&root.visible&&!fallen;
  beam.intensity=lit?72:0;glow.intensity=lit?.65:0;lensMaterial.color.setHex(lit?0xdfe8d6:0x313832);
 }

 function dispose(){
  if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);root.removeFromParent();
  for(const skeleton of skeletons)skeleton.dispose();
  for(const geometry of ownedGeometry)geometry.dispose();
  for(const surface of ownedMaterials)surface.dispose();
  for(const texture of ownedTextures)texture.dispose();
 }
 return {root,update,dispose};
}
