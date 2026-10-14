import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTorch} from '../src/torch.js';

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
