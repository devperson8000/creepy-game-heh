import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createPlayerAvatar,loadPlayerAvatarAsset} from '../src/player-avatar.js';

function fixture(){
 const scene=new THREE.Group(),spine=new THREE.Bone(),hand=new THREE.Bone();
 spine.name='spine003';spine.position.y=1;hand.name='handR';hand.position.set(-.25,.1,0);spine.add(hand);scene.add(spine);
 const geometry=new THREE.BoxGeometry(.3,1,.2),material=new THREE.MeshStandardMaterial();
 const mesh=new THREE.SkinnedMesh(geometry,material);
 const count=geometry.attributes.position.count;
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4));
 const weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));scene.add(mesh);mesh.bind(new THREE.Skeleton([spine,hand]));
 const clip=(name,y)=>new THREE.AnimationClip(name,1,[new THREE.NumberKeyframeTrack('spine003.position[y]',[0,1],[1,y])]);
 return {scene,animations:[clip('Idle',1),clip('Walk',1.2),clip('Run',1.4),clip('Death',.1)]};
}

test('avatar asset requests share a promise, use the curved model, and retry a failed load',async()=>{
 const original=GLTFLoader.prototype.loadAsync;
 let requests=0;
 GLTFLoader.prototype.loadAsync=function(url){
  requests++;assert.equal(url,'/models/hazmat-survivor.glb');
  return requests===1?Promise.reject(new Error('temporary load failure')):Promise.resolve(fixture());
 };
 try{
  const failed=loadPlayerAvatarAsset();assert.equal(loadPlayerAvatarAsset(),failed);
  await assert.rejects(failed,/temporary load failure/);
  const retry=loadPlayerAvatarAsset();assert.equal(loadPlayerAvatarAsset(),retry);
  assert.ok((await retry).scene.isGroup);assert.equal(requests,2);
 }finally{GLTFLoader.prototype.loadAsync=original;}
});

test('first pose places feet immediately and faces the camera forward convention',()=>{
 const avatar=createPlayerAvatar(fixture(),{id:'a',name:'Mira',slot:2});
 avatar.update({x:3,z:4,height:.2,yaw:0},1/60);
 assert.deepEqual(avatar.root.position.toArray(),[3,.2,4]);
 const forward=new THREE.Vector3(0,0,1).applyQuaternion(avatar.root.quaternion);
 assert.ok(forward.distanceTo(new THREE.Vector3(0,0,-1))<1e-6);
 assert.equal(avatar.root.userData.playerId,'a');
 assert.equal(avatar.root.getObjectByName('player-number').userData.number,3);
 avatar.dispose();
});

test('snapshot movement interpolates, takes shortest yaw path, and snaps teleports',()=>{
 const avatar=createPlayerAvatar(fixture(),{});
 avatar.update({x:0,z:0,yaw:Math.PI-.05},.016);
 avatar.update({x:1,z:0,yaw:-Math.PI+.05},.016);
 assert.ok(avatar.root.position.x>0&&avatar.root.position.x<1);
 assert.ok(Math.abs(Math.sin(avatar.root.rotation.y))<.06);
 avatar.update({x:20,z:2,height:1,yaw:1},.016);
 assert.deepEqual(avatar.root.position.toArray(),[20,1,2]);
 avatar.dispose();
});

test('cloned rigs animate independently, hold their fallen pose, and revive',()=>{
 const asset=fixture(),a=createPlayerAvatar(asset,{}),b=createPlayerAvatar(asset,{});
 const source=asset.scene.getObjectByName('spine003'),first=a.root.getObjectByName('spine003'),second=b.root.getObjectByName('spine003');
 for(let i=0;i<8;i++)a.update({forward:1},.05);
 assert.ok(first.position.y>1.02);assert.equal(second.position.y,1);assert.equal(source.position.y,1);
 a.update({status:'downed'},.05);
 for(let i=0;i<35;i++)a.update({status:'downed'},.05);
 assert.ok(Math.abs(first.position.y-.1)<.001);
 for(let i=0;i<18;i++)a.update({status:'alive'},.05);
 assert.ok(Math.abs(first.position.y-1)<.001);
 a.dispose();b.dispose();
});

test('right hand carries torch, pitch directs its beam, and hidden or fallen players emit no light',()=>{
 const avatar=createPlayerAvatar(fixture(),{}),torch=avatar.root.getObjectByName('player-torch');
 assert.equal(torch.parent.name,'handR');
 avatar.update({torch:true,pitch:.7,yaw:0},.05);avatar.root.updateMatrixWorld(true);
 const spot=avatar.root.getObjectByName('player-beam');
 const direction=spot.target.getWorldPosition(new THREE.Vector3()).sub(spot.getWorldPosition(new THREE.Vector3())).normalize();
 assert.ok(direction.y>.5);assert.ok(direction.z<-.5);assert.ok(spot.intensity>0);assert.equal(spot.castShadow,false);
 avatar.update({torch:false},.05);assert.equal(spot.intensity,0);
 avatar.update({torch:true,hidden:true},.05);assert.equal(spot.intensity,0);assert.equal(avatar.root.visible,false);
 avatar.update({torch:true,status:'downed'},.05);assert.equal(spot.intensity,0);
 avatar.update({status:'escaped'},.05);assert.equal(avatar.root.visible,false);
 avatar.dispose();
});

test('actor cleanup releases its materials once without disposing cached model resources',()=>{
 const asset=fixture(),source=asset.scene.children.find(node=>node.isMesh),a=createPlayerAvatar(asset,{}),b=createPlayerAvatar(asset,{});
 let geometryDisposals=0,sourceDisposals=0,actorDisposals=0;
 source.geometry.addEventListener('dispose',()=>geometryDisposals++);source.material.addEventListener('dispose',()=>sourceDisposals++);
 const first=a.root.getObjectByProperty('isSkinnedMesh',true),second=b.root.getObjectByProperty('isSkinnedMesh',true);
 assert.notEqual(first.skeleton,second.skeleton);assert.notEqual(first.material,second.material);assert.equal(first.geometry,source.geometry);
 first.material.addEventListener('dispose',()=>actorDisposals++);
 const parent=new THREE.Group();parent.add(a.root);a.dispose();a.dispose();
 assert.equal(actorDisposals,1);assert.equal(sourceDisposals,0);assert.equal(geometryDisposals,0);assert.equal(a.root.parent,null);
 b.update({forward:1},.1);b.dispose();
});

test('the selected curved GLB loads with its real 29-bone skin, embedded textures, and five clips',async()=>{
 const bytes=await readFile(new URL('../public/models/hazmat-survivor.glb',import.meta.url));
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(json.skins[0].joints.length,29);assert.ok(json.images.every(image=>Number.isInteger(image.bufferView)));
 assert.equal(json.nodes.find(node=>node.name==='Hazmat_Survivor_1_8m')?.scale[0],.9491574168205261);
 const loader=new GLTFLoader();
 // Node has no image decoder. Keep all real mesh/skin/animation bytes and replace only texture decoding.
 loader.register(()=>({name:'CPUTextureDecoder',loadTexture:async()=>new THREE.Texture()}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.deepEqual(asset.animations.map(clip=>clip.name).sort(),['Death','Idle','Jump','Run','Walk']);
 const avatar=createPlayerAvatar(asset,{slot:3});
 assert.equal(avatar.root.getObjectByProperty('isSkinnedMesh',true).skeleton.bones.length,29);
 avatar.update({x:2,z:3,forward:1,sprint:true,torch:true},.05);
 assert.equal(avatar.root.getObjectByName('player-torch').parent.name,'handR');
 assert.ok(Number.isFinite(new THREE.Box3().setFromObject(avatar.root).max.y));
 avatar.dispose();
});


test('real hazmat grasp stays closed, anchored and aimed through locomotion and look pitch',async()=>{
 const bytes=await readFile(new URL('../public/models/hazmat-survivor.glb',import.meta.url));
 const loader=new GLTFLoader();loader.register(()=>({name:'CPUTextureDecoder',loadTexture:async()=>new THREE.Texture()}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const source=asset.scene.getObjectByProperty('isSkinnedMesh',true),originalPositions=source.geometry.attributes.position.array.slice();
 const avatar=createPlayerAvatar(asset,{}),other=createPlayerAvatar(asset,{});
 const torch=avatar.root.getObjectByName('player-torch'),hand=torch.parent,forearm=hand.parent,upperArm=forearm.parent;
 const spot=avatar.root.getObjectByName('player-beam'),localGrip=torch.position.clone(),localRotation=torch.quaternion.clone();
 const position=object=>object.getWorldPosition(new THREE.Vector3());
 avatar.root.updateMatrixWorld(true);
 const upperLength=position(upperArm).distanceTo(position(forearm)),lowerLength=position(forearm).distanceTo(position(hand));
 let minHeight=Infinity,maxHeight=-Infinity;
 for(const movement of [{},{moving:true},{moving:true,sprint:true}]){
  for(const pitch of [-1.1,0,1.1]){
   for(let frame=0;frame<45;frame++){
    avatar.update({...movement,pitch,yaw:.6,torch:true,x:2,z:3},1/60);avatar.root.updateMatrixWorld(true);
    const wrist=position(hand),grip=position(torch),expectedGrip=hand.localToWorld(localGrip.clone());
    assert.ok(grip.distanceTo(expectedGrip)<1e-6,'torch must remain physically attached to the palm');
    assert.ok(torch.quaternion.angleTo(localRotation)<1e-6,'torch must not pivot independently inside the glove');
    assert.ok(wrist.distanceTo(grip)>.08&&wrist.distanceTo(grip)<.13,'grip must lie inside the glove rather than at the wrist');
    assert.ok(Math.abs(position(upperArm).distanceTo(position(forearm))-upperLength)<1e-5);
    assert.ok(Math.abs(position(forearm).distanceTo(wrist)-lowerLength)<1e-5);
    const localWrist=avatar.root.worldToLocal(wrist.clone());minHeight=Math.min(minHeight,localWrist.y);maxHeight=Math.max(maxHeight,localWrist.y);
    assert.ok(localWrist.z>.18&&localWrist.z<.3,'wrist stays in front of the torso');
    assert.ok(localWrist.x<-.2&&localWrist.x>-.3,'right hand stays beside the center of the chest');
    const expectedAim=new THREE.Vector3(0,Math.sin(pitch),Math.cos(pitch)).applyQuaternion(avatar.root.quaternion);
    const actualAim=position(spot.target).sub(position(spot)).normalize();assert.ok(actualAim.distanceTo(expectedAim)<1e-5,`aim error ${actualAim.distanceTo(expectedAim)} pitch ${pitch} frame ${frame} movement ${JSON.stringify(movement)}`);
   }
  }
 }
 assert.ok(maxHeight-minHeight<.05,'running keeps a small chest-driven arm bounce');
 assert.equal(avatar.root.getObjectByName('player-torch-grasp').children.length,4);
 const actorMesh=avatar.root.getObjectByProperty('isSkinnedMesh',true),otherMesh=other.root.getObjectByProperty('isSkinnedMesh',true);
 assert.notEqual(actorMesh.geometry,source.geometry);assert.notEqual(actorMesh.geometry,otherMesh.geometry);
 assert.deepEqual(source.geometry.attributes.position.array,originalPositions,'closing the glove must never deform the cached asset');
 let disposals=0;actorMesh.geometry.addEventListener('dispose',()=>disposals++);avatar.dispose();avatar.dispose();assert.equal(disposals,1);
 other.update({moving:true,torch:true},.05);other.dispose();
});

test('microphone icon floats above head only while speaking and disappears for hidden players',()=>{
 const avatar=createPlayerAvatar(fixture(),{id:'speaker'});
 const icon=avatar.root.getObjectByName('player-speaking');assert.ok(icon);assert.ok(icon.position.y>2);
 avatar.update({speaking:false});assert.equal(icon.visible,false);
 avatar.update({speaking:true});assert.equal(icon.visible,true);
 avatar.update({speaking:true,hidden:true});assert.equal(icon.visible,false);
 avatar.update({speaking:true,status:'escaped'});assert.equal(icon.visible,false);avatar.dispose();
});

test('late buffered poses cannot make a walking avatar jump across a frame',()=>{
 const avatar=createPlayerAvatar(fixture(),{});
 avatar.update({x:0,z:0,interpolated:true,moving:true},1/60);
 avatar.update({x:1,z:0,interpolated:true,moving:true},1/60);
 assert.ok(avatar.root.position.x>0&&avatar.root.position.x<=.07);
 avatar.update({x:3,z:1,interpolated:true,resetPose:true},1/60);
 assert.deepEqual(avatar.root.position.toArray(),[3,0,1]);avatar.dispose();
});

test('a revived survivor rises from the fallen clip before returning to locomotion',()=>{
 const avatar=createPlayerAvatar(fixture(),{}),spine=avatar.root.getObjectByName('spine003');
 for(let i=0;i<30;i++)avatar.update({status:'downed'},.05);
 avatar.update({status:'alive'},.05);const first=spine.position.y;
 for(let i=0;i<3;i++)avatar.update({status:'alive'},.05);
 assert.ok(spine.position.y>first);assert.ok(spine.position.y<.8,'the rise has a visible intermediate pose');
 for(let i=0;i<18;i++)avatar.update({status:'alive',forward:1},.05);
 assert.ok(spine.position.y>=1);avatar.dispose();
});

test('the real survivor get-up remains above the floor and completes with the torch reattached',async()=>{
 const bytes=await readFile(new URL('../public/models/hazmat-survivor.glb',import.meta.url)),loader=new GLTFLoader();loader.register(()=>({name:'CPUTextureDecoder',loadTexture:async()=>new THREE.Texture()}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),avatar=createPlayerAvatar(asset,{}),head=avatar.root.getObjectByName('spine006'),beam=avatar.root.getObjectByName('player-beam');
 for(let i=0;i<50;i++)avatar.update({status:'downed'},.05);
 const heights=[];for(let i=0;i<25;i++){avatar.update({status:'alive',torch:true},.04);heights.push(head.getWorldPosition(new THREE.Vector3()).y);}
 assert.ok(heights[0]<.4);assert.ok(heights.some(y=>y>.6&&y<1.3));assert.ok(heights.every(y=>Number.isFinite(y)&&y>0));assert.ok(heights.at(-1)>1.5);assert.ok(beam.intensity>0);avatar.dispose();
});
