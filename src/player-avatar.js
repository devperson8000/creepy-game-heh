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
 const speakingTexture=canvasTexture(128,128,c=>{
  c.fillStyle='#102015';c.beginPath();c.arc(64,64,59,0,Math.PI*2);c.fill();
  c.strokeStyle='#d6ffc3';c.lineWidth=7;c.lineCap='round';
  c.beginPath();c.roundRect(52,25,24,47,12);c.stroke();
  c.beginPath();c.moveTo(42,57);c.lineTo(42,65);c.arc(64,65,22,Math.PI,0,true);c.lineTo(86,57);c.stroke();
  c.beginPath();c.moveTo(64,88);c.lineTo(64,103);c.moveTo(51,103);c.lineTo(77,103);c.stroke();
 });
 if(speakingTexture)ownedTextures.add(speakingTexture);
 const speakingMaterial=new THREE.SpriteMaterial({map:speakingTexture,color:speakingTexture?0xffffff:0xc8ffb4,transparent:true,depthTest:true,depthWrite:false});ownedMaterials.add(speakingMaterial);
 const speakingIcon=new THREE.Sprite(speakingMaterial);speakingIcon.name='player-speaking';speakingIcon.position.set(0,2.24,0);speakingIcon.scale.set(.32,.32,1);speakingIcon.visible=false;root.add(speakingIcon);
 const findBone=key=>{
  let found;model.traverse(object=>{if(object.isBone&&object.name.replace(/[._-]/g,'').toLowerCase()===key)found=object;});return found;
 };
 const chest=findBone('spine003'),hand=findBone('handr'),forearm=findBone('forearmr'),upperArm=findBone('upperarmr');
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
 (hand??model).add(torch);
 // The source glove has a single hand bone. Curl its distal mitten in bind space
 // once per actor; keep the shared cached geometry and all skin weights intact.
 const gripRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);
 const gripPoint=new THREE.Vector3(-.043,.095,.038);
 if(hand&&forearm&&upperArm){
  model.traverse(object=>{
   if(!object.isSkinnedMesh)return;
   const handIndex=object.skeleton.bones.indexOf(hand);if(handIndex<0)return;
   const geometry=object.geometry.clone();ownedGeometry.add(geometry);object.geometry=geometry;
   const positions=geometry.attributes.position,indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
   const toHand=new THREE.Matrix4().multiplyMatrices(hand.matrixWorld.clone().invert(),object.matrixWorld),fromHand=toHand.clone().invert();
   const point=new THREE.Vector3(),curled=new THREE.Vector3();
   for(let i=0;i<positions.count;i++){
    let weight=0;for(let j=0;j<4;j++)if(indices.getComponent(i,j)===handIndex)weight+=weights.getComponent(i,j);
    if(weight<.01)continue;
    point.fromBufferAttribute(positions,i).applyMatrix4(toHand);curled.copy(point);
    if(point.y>.08){
     const bend=THREE.MathUtils.clamp((point.y-.08)/.14,0,1)*Math.PI*1.15;
     curled.y=.08+.047*Math.sin(bend);curled.z=.043*(1-Math.cos(bend))+point.z*(1-.45*Math.min(bend,1));
    }
    point.lerp(curled,weight).applyMatrix4(fromHand);positions.setXYZ(i,point.x,point.y,point.z);
   }
   positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  });
 }
 torch.position.copy(hand?gripPoint:new THREE.Vector3(-.3,1.1,.03));
 torch.quaternion.copy(gripRotation);
 const grip=material({color:0x25292a,roughness:.85}),metal=material({color:0x5b625e,metalness:.65,roughness:.4});
 function cylinder(radiusTop,radiusBottom,length,z,surface){const part=mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,length,16),surface,torch);part.rotation.x=Math.PI/2;part.position.z=z;}
 cylinder(.032,.032,.19,0,grip);cylinder(.055,.034,.08,.12,metal);cylinder(.058,.058,.014,.165,metal);
 if(hand&&forearm&&upperArm){
  const glove=material({color:0x171c1c,roughness:.96});
  const fingers=new THREE.Group();fingers.name='player-torch-grasp';torch.add(fingers);
  for(let i=0;i<4;i++){
   const finger=mesh(new THREE.TorusGeometry(.038,.009,8,16,Math.PI*1.6),glove,fingers);
   finger.position.z=-.033+i*.022;finger.rotation.z=.25;
  }
 }
 const lensMaterial=new THREE.MeshBasicMaterial({color:0xcbd5c7});ownedMaterials.add(lensMaterial);
 const lens=mesh(new THREE.CircleGeometry(.048,16),lensMaterial,torch);lens.position.z=.174;
 const beam=new THREE.SpotLight(0xe4e9dc,0,12,.48,.8,1.5);beam.name='player-beam';beam.position.set(0,0,.18);beam.castShadow=false;
 const target=new THREE.Object3D();target.position.z=12;torch.add(beam,target);beam.target=target;
 const glow=new THREE.PointLight(0xe4e9dc,0,2.5,2);glow.position.z=.2;torch.add(glow);

 const mixer=new THREE.AnimationMixer(model),actions=new Map();
 for(const clip of asset.animations??[]){const action=mixer.clipAction(clip);actions.set(clip.name.toLowerCase(),action);}
 let activeAction,spawned=false,disposed=false,lastFallen=false,recovering=0;
 const goal=new THREE.Vector3(),orientation=new THREE.Quaternion(),pitchRotation=new THREE.Quaternion(),pitchAxis=new THREE.Vector3(1,0,0);
 const inverseGrip=gripRotation.clone().invert(),roll=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
 const parentRotation=new THREE.Quaternion(),rotation=new THREE.Quaternion(),from=new THREE.Vector3(),to=new THREE.Vector3();
 const shoulderPosition=new THREE.Vector3(),wristGoal=new THREE.Vector3(),elbowGoal=new THREE.Vector3(),direction=new THREE.Vector3(),pole=new THREE.Vector3();
 const animatedArm=[upperArm,forearm,hand].filter(Boolean).map(bone=>({bone,quaternion:bone.quaternion.clone()}));
 const upperLength=upperArm&&forearm?upperArm.getWorldPosition(new THREE.Vector3()).distanceTo(forearm.getWorldPosition(new THREE.Vector3())):0;
 const lowerLength=forearm&&hand?forearm.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3())):0;
 const chestRest=chest?root.worldToLocal(chest.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(0,1.35,0);
 function orientBone(bone,child,point){
  bone.getWorldPosition(from);child.getWorldPosition(to);to.sub(from).normalize();from.subVectors(point,from).normalize();
  rotation.setFromUnitVectors(to,from).multiply(bone.getWorldQuaternion(parentRotation));
  bone.parent.getWorldQuaternion(parentRotation).invert();bone.quaternion.copy(parentRotation).multiply(rotation);bone.updateWorldMatrix(false,true);
 }
 function holdTorch(pitch){
  root.getWorldQuaternion(orientation);pitchRotation.setFromAxisAngle(pitchAxis,-pitch);orientation.multiply(pitchRotation).multiply(roll);
  if(hand&&forearm&&upperArm){
   // Keep chest breathing, but reduce locomotion sway before solving the real
   // shoulder/elbow chain. Both arm segment lengths remain unchanged.
   if(chest)chest.getWorldPosition(wristGoal);else root.localToWorld(wristGoal.copy(chestRest));root.worldToLocal(wristGoal);wristGoal.sub(chestRest).multiplyScalar(.22).add(new THREE.Vector3(-.255,1.19,.225));root.localToWorld(wristGoal);
   upperArm.getWorldPosition(shoulderPosition);direction.subVectors(wristGoal,shoulderPosition);
   const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upperLength-lowerLength)+.001,upperLength+lowerLength-.001);direction.normalize();
   wristGoal.copy(shoulderPosition).addScaledVector(direction,distance);
   pole.set(-.35,-.3,-1).transformDirection(root.matrixWorld);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
   const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance);
   elbowGoal.copy(shoulderPosition).addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
   orientBone(upperArm,forearm,elbowGoal);orientBone(forearm,hand,wristGoal);
  }
  if(hand){
   hand.parent.getWorldQuaternion(parentRotation).invert();hand.quaternion.copy(parentRotation).multiply(orientation).multiply(inverseGrip);hand.updateWorldMatrix(false,true);
  }else{torch.parent.getWorldQuaternion(parentRotation).invert();torch.quaternion.copy(parentRotation).multiply(orientation);}
 }
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
  if(pose.resetPose||!spawned||root.position.distanceToSquared(goal)>36){root.position.copy(goal);root.rotation.y=yaw;spawned=true;}
  else{
   const blend=1-Math.exp(-(pose.interpolated?24:14)*dt);
   const distance=root.position.distanceTo(goal);
   // Timestamp interpolation handles regular updates; this catches a late
   // correction without turning a network gap into a one-frame body jump.
   const catchupSpeed=Math.max(pose.sprint?5.2:3.8,finite(pose.speed)*1.2);
   const follow=pose.interpolated&&distance>0?Math.min(blend,catchupSpeed*dt/distance):blend;
   root.position.lerp(goal,follow);
   root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*blend;
  }
  root.visible=!pose.hidden&&status!=='escaped';
  speakingIcon.visible=!!pose.speaking&&root.visible;
  const moving=pose.moving??(Math.hypot(finite(pose.forward),finite(pose.right))>.05||finite(pose.speed)>.1);
  if(!fallen&&lastFallen&&actions.has('death')){
   const rise=actions.get('death'),duration=rise.getClip().duration;
   recovering=.65;rise.reset().setEffectiveWeight(1).setEffectiveTimeScale(-duration/recovering).setLoop(THREE.LoopOnce,1);rise.time=Math.max(0,duration-.001);rise.clampWhenFinished=true;rise.play();activeAction=rise;lastFallen=false;
  }
  if(fallen)recovering=0;
  if(recovering<=0)animate(fallen?'death':moving?(pose.sprint?'run':'walk'):'idle',fallen);
  else recovering=Math.max(0,recovering-dt);
  if(!fallen&&activeAction&&activeAction!==actions.get('death')&&moving){const rate=Number.isFinite(pose.speed)&&pose.speed>.1?THREE.MathUtils.clamp(pose.speed/(pose.sprint?3.7:2.5),.65,pose.speed>4?1.85:1.35):1;activeAction.setEffectiveTimeScale(rate);}
  // Restore the mixer pose before each evaluation so an additive holding pose
  // never accumulates on bones omitted by a clip (or during a crossfade).
  for(const saved of animatedArm)saved.bone.quaternion.copy(saved.quaternion);
  mixer.update(dt);
  for(const saved of animatedArm)saved.quaternion.copy(saved.bone.quaternion);
  root.updateMatrixWorld(true);
  if(!fallen&&!recovering)holdTorch(THREE.MathUtils.clamp(finite(pose.pitch),-1.4,1.4));
  const lit=Boolean(pose.torch)&&root.visible&&!fallen&&!recovering;
  beam.intensity=lit?72:0;glow.intensity=lit?.65:0;lensMaterial.color.setHex(lit?0xdfe8d6:0x313832);
 }

 function sampleCinematic({clip='Idle',time=0,position=[0,0,0],yaw=0,action='none',progress=0,handTarget=null}={}){
  if(disposed)return;
  const p=THREE.MathUtils.clamp(progress,0,1);
  mixer.stopAllAction();
  const animation=actions.get(clip.toLowerCase())??actions.get('idle');
  if(animation){
   animation.reset().setEffectiveWeight(1).play();const duration=animation.getClip().duration;
   // Death ends face-down. Hold that final pose, then sample it backwards for
   // getting up, without looping through its upright first frame.
   const end=Math.max(0,duration-.001);
   // Bring the forward extension early enough to read as a dive in midair.
   const sampleTime=action==='prone'?end:action==='get-up'?(1-p)*end:action==='dive'&&clip.toLowerCase()==='death'?Math.pow(p,.4)*end:Math.max(0,finite(time))%duration;
   mixer.setTime(sampleTime);
  }
  root.visible=true;root.position.fromArray(position);root.rotation.set(0,yaw+Math.PI,0);model.rotation.set(0,0,0);
  speakingIcon.visible=false;torch.visible=false;beam.intensity=0;glow.intensity=0;
  const label=root.getObjectByName('player-name');if(label)label.visible=false;
  if(action==='dive'&&clip.toLowerCase()!=='death'){
   root.rotation.x=-Math.sin(p*Math.PI)*1.35;
   // Turn around the pelvis, keeping the airborne body centred on its flight
   // path instead of tipping its head below the frame around planted feet.
   const pivot=new THREE.Vector3(0,.95,0),turned=pivot.clone().applyQuaternion(root.quaternion);
   root.position.add(pivot.sub(turned));
  }
  if(action==='brace'&&chest)chest.rotation.x+=.14;
  root.updateMatrixWorld(true);
  if(handTarget&&hand&&forearm&&upperArm){
   upperArm.getWorldPosition(shoulderPosition);hand.getWorldPosition(wristGoal);wristGoal.lerp(new THREE.Vector3().fromArray(handTarget),p);
   direction.subVectors(wristGoal,shoulderPosition);
   const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upperLength-lowerLength)+.001,upperLength+lowerLength-.001);direction.normalize();
   wristGoal.copy(shoulderPosition).addScaledVector(direction,distance);
   pole.set(-.4,-.8,-.2).transformDirection(root.matrixWorld);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
   const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance);
   elbowGoal.copy(shoulderPosition).addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
   orientBone(upperArm,forearm,elbowGoal);orientBone(forearm,hand,wristGoal);
  }
  root.updateMatrixWorld(true);
 }

 function dispose(){
  if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);root.removeFromParent();
  for(const skeleton of skeletons)skeleton.dispose();
  for(const geometry of ownedGeometry)geometry.dispose();
  for(const surface of ownedMaterials)surface.dispose();
  for(const texture of ownedTextures)texture.dispose();
 }
 return {root,update,sampleCinematic,dispose};
}
