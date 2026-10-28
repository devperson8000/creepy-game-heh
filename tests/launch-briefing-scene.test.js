import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createLaunchBriefingStage} from '../src/launch-briefing-scene.js';
const asset={scene:new THREE.Group(),animations:[]};
const snapshot=stage=>JSON.stringify({camera:stage.camera.position.toArray(),rotation:stage.camera.quaternion.toArray(),actors:stage.actors.map(a=>a.root.position.toArray()),lights:stage.lights.map(l=>l.intensity),creature:[stage.creature.root.visible,...stage.creature.root.position.toArray()]});
// A seek must re-establish transforms and lighting without accumulating state.
test('absolute sampling restores every shot after seeking through the finale',()=>{
 const stage=createLaunchBriefingStage({asset});
 for(const time of [0,9,16,28,34,43,50,61,70,72.9,73,81,86,93]){
  const frame=stage.sample(time),before=snapshot(stage);stage.sample(93.7);stage.sample(time);
  assert.equal(snapshot(stage),before,`seek at ${time}`);assert.ok(frame.shot);
  assert.ok(stage.camera.position.toArray().every(Number.isFinite));
 }
 assert.equal(stage.sample(72.99).shot,'sealed-door');assert.equal(stage.sample(73).shot,'cutaway');
 assert.equal(stage.sample(94).complete,true);assert.equal(stage.sample(NaN).elapsed,0);stage.dispose();
});
// Moving suits must actually separate, and Monochrome must wait until the closing beat.
test('friends walk apart while the familiar presence appears only in the finale',()=>{
 const stage=createLaunchBriefingStage({asset});stage.sample(35);const near=stage.actors[0].root.position.distanceTo(stage.actors[1].root.position);
 stage.sample(45);assert.ok(stage.actors[0].root.position.distanceTo(stage.actors[1].root.position)>near+4);
 for(const t of [0,16,34,50,70,80]){stage.sample(t);assert.equal(stage.creature.root.visible,false);}
 stage.sample(90);assert.equal(stage.creature.root.visible,true);stage.dispose();
});
// A reduced-motion shot must remain still even when sampled late in the same shot.
test('reduced motion holds camera and cast poses and keeps portrait subjects above subtitles',()=>{
 const stage=createLaunchBriefingStage({asset,reducedMotion:true});stage.resize(390/844);
 stage.sample(35);const first=snapshot(stage);stage.sample(40);assert.equal(snapshot(stage),first);
 for(const t of [5,37,54,71,90]){
  stage.sample(t);const point=stage.focalPoint.clone().project(stage.camera);
  assert.ok(Math.abs(point.x)<.9,`subject fits portrait at ${t}`);assert.ok(point.y>-.5&&point.y<.65,`subject clear of captions at ${t}`);
 }
 stage.dispose();
});
// Disposing clones must not dispose the shared asset, and repeated cleanup is safe.
test('stage disposal releases owned resources and preserves the shared avatar asset',()=>{
 const sharedMaterial=new THREE.MeshStandardMaterial(),sharedGeometry=new THREE.BoxGeometry();let sharedDisposed=0;
 sharedMaterial.addEventListener('dispose',()=>sharedDisposed++);sharedGeometry.addEventListener('dispose',()=>sharedDisposed++);
 asset.scene.add(new THREE.Mesh(sharedGeometry,sharedMaterial));const stage=createLaunchBriefingStage({asset});
 let ownDisposed=0;stage.scene.traverse(o=>o.geometry?.addEventListener('dispose',()=>ownDisposed++));
 stage.dispose();stage.dispose();assert.ok(ownDisposed>20);assert.equal(sharedDisposed,0);assert.equal(stage.scene.children.length,0);assert.equal(stage.sample(10),null);
 asset.scene.clear();sharedMaterial.dispose();sharedGeometry.dispose();
});

// Replacing the walk clip with an idle pose must fail: moving a static suit is not a gait.
test('the shipped hazmat rig walks and restores the same skeletal pose after a seek',async()=>{
 const bytes=await readFile(new URL('../public/models/hazmat-survivor.glb',import.meta.url));
 const loader=new GLTFLoader();loader.register(()=>({name:'CPUTextureDecoder',loadTexture:async()=>new THREE.Texture()}));
 const realAsset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const stage=createLaunchBriefingStage({asset:realAsset});const leg=stage.actors[0].root.getObjectByName('thighL')??stage.actors[0].root.getObjectByName('thigh.L');
 stage.sample(38);const pose=leg.quaternion.clone();const angles=[38.1,38.2,38.3,38.4,38.5,38.6,38.7].map(t=>{stage.sample(t);return pose.angleTo(leg.quaternion);});assert.ok(Math.max(...angles)>.15,'leg articulates during travel across the gait cycle');
 stage.sample(91);stage.sample(38);assert.deepEqual(leg.quaternion.toArray(),pose.toArray(),'skeletal seek is repeatable');stage.dispose();
});
