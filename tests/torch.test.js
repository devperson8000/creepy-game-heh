import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTorch,sampleTorchSurface} from '../src/torch.js';
import {createHalloweenProps} from '../src/halloween-props.js';

test('the torch beam follows camera position and aim',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(66,1,.06,85),torch=createTorch(scene,camera);
 camera.position.set(5,1.65,-4);camera.rotation.set(.3,1.2,0,'YXZ');scene.updateMatrixWorld(true);
 const origin=torch.beam.getWorldPosition(new THREE.Vector3()),target=torch.beam.target.getWorldPosition(new THREE.Vector3());
 assert.ok(origin.distanceTo(camera.position)<.1);
 assert.ok(target.sub(origin).normalize().dot(camera.getWorldDirection(new THREE.Vector3()))>.999);
 assert.ok(torch.beam.castShadow);
});

test('switching the torch off removes its beam while ceiling power stays independent',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),torch=createTorch(scene,camera);
 torch.update({ceilingPower:0});
 assert.equal(torch.on,true);assert.ok(torch.beam.intensity>0);assert.equal(torch.exposure,.95);
 torch.toggle();torch.update({ceilingPower:0});
 assert.equal(torch.on,false);assert.equal(torch.beam.intensity,0);assert.equal(torch.exposure,0);
 torch.update({ceilingPower:.5});assert.equal(torch.exposure,.475);assert.equal(torch.on,false);
});

test('physical signs respond to torch lighting without glowing during a blackout',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({color:0xffffff}));scene.add(sign);
 const torch=createTorch(scene,camera);torch.update({ceilingPower:0});
 assert.ok(sign.material.isMeshStandardMaterial);assert.equal(sign.material.emissiveIntensity,0);
 torch.update({ceilingPower:1});assert.ok(sign.material.emissiveIntensity>0);
});

test('the held torch remains in view on portrait phones',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(66,390/844,.06,85),torch=createTorch(scene,camera);
 torch.update();torch.model.updateWorldMatrix(true,true);
 const head=torch.model.children[1].getWorldPosition(new THREE.Vector3()).project(camera);
 assert.ok(head.x>0&&head.x<.85,`Torch head is outside portrait view: ${head.x}`);
});

test('starting and stopping movement settles the held torch instead of snapping its bob',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),torch=createTorch(scene,camera);
 torch.update({time:.1,moving:false,delta:1/60});const resting=torch.model.position.y;
 torch.update({time:.1,moving:true,delta:1/60});assert.ok(Math.abs(torch.model.position.y-resting)<.004);
 for(let i=0;i<30;i++)torch.update({time:.1,moving:true,delta:1/60});const moving=torch.model.position.y;
 torch.update({time:.1,moving:false,delta:1/60});assert.ok(Math.abs(torch.model.position.y-moving)<.004);
});
test('Halloween torch softens at close surfaces and restores reach smoothly; legacy brightness stays unchanged',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),torch=createTorch(scene,camera,{halloween:true});
 for(let i=0;i<60;i++)torch.update({surfaceDistance:.8,delta:1/60});const close=torch.beam.intensity;assert.ok(close>8&&close<30);
 torch.update({surfaceDistance:8,delta:1/60});assert.ok(torch.beam.intensity>close&&torch.beam.intensity<close+20);
 for(let i=0;i<60;i++)torch.update({surfaceDistance:8,delta:1/60});assert.ok(torch.beam.intensity>65);torch.toggle();torch.update({surfaceDistance:.8});assert.equal(torch.beam.intensity,0);
 const legacy=createTorch(new THREE.Scene(),new THREE.PerspectiveCamera());legacy.update({surfaceDistance:.8});assert.equal(legacy.beam.intensity,140);
});
test('decorative flames keep their self-lit material and small props avoid blanket shadow casting',()=>{
 const scene=new THREE.Scene(),props=createHalloweenProps(),candles=props.candleCluster(),pumpkin=props.pumpkin();scene.add(candles,pumpkin);let flame,body;candles.traverse(m=>{if(m.userData.flame&&!m.material.transparent)flame=m;else if(m.isMesh&&!m.userData.flame)body=m;});const original=flame.material;
 createTorch(scene,new THREE.PerspectiveCamera(),{halloween:true});assert.equal(flame.material.uuid,original.uuid);assert.equal(body.castShadow,false);assert.equal(pumpkin.body.castShadow,true);props.dispose();
});

test('surface sampling follows the current view independently of interaction eligibility',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),raycaster=new THREE.Raycaster();
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial());wall.position.z=-.55;scene.add(wall);scene.updateMatrixWorld(true);
 const sample=hidden=>sampleTorchSurface({camera,raycaster,meshes:[wall],hidden});
 assert.ok(Math.abs(sample(false).distance-.55)<.001);
 // A spectator or a survivor targeting a revive still samples the camera's new pose.
 camera.position.x=20;assert.equal(sample(false).distance,Infinity);
 assert.equal(sample(true).distance,.55);
 camera.position.x=0;assert.ok(sample(false).hit);
 wall.visible=false;assert.equal(sample(false).distance,Infinity);
 wall.visible=true;wall.userData.actor=true;assert.equal(sample(false).distance,Infinity);
});
