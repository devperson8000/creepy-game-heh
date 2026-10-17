import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createJumpscare,JUMPSCARE_DURATION} from '../src/jumpscare.js';
import {createCreature} from '../src/creature.js';

test('a capture starts one scare and finishes before retry is shown',()=>{
 const scare=createJumpscare();assert.equal(scare.start(),true);assert.equal(scare.start(),false);
 for(let i=0;i<10;i++)scare.update(.1);
 assert.equal(scare.active,true);
 for(let i=0;i<20;i++)scare.update(.1);
 assert.equal(scare.active,false);assert.ok(scare.elapsed>=JUMPSCARE_DURATION);
 assert.equal(scare.start(),true);assert.equal(scare.elapsed,0);
});

test('blood fades and white eyes disappear into black at the end',()=>{
 const scare=createJumpscare();scare.start();scare.update(.1);
 const early=scare.borderOpacity;assert.ok(early>.8);
 for(let i=0;i<27;i++)scare.update(.1);
 assert.ok(scare.borderOpacity<early*.3);
 assert.ok(scare.eyes.every(eye=>eye.material.color.r<.5));
});

test('both eyes remain inside the view on desktop and portrait phones',()=>{
 for(const aspect of [640/480,390/844]){
  const scare=createJumpscare();scare.resize(aspect);scare.start();for(let i=0;i<4;i++)scare.update(.1);
  scare.scene.updateMatrixWorld(true);scare.camera.updateMatrixWorld(true);
  for(const eye of scare.eyes){const p=eye.getWorldPosition(new THREE.Vector3()).project(scare.camera);assert.ok(Math.abs(p.x)<.85&&Math.abs(p.y)<.85);}
 }
});

test('the complete head silhouette fits the camera, including chin and horn tips',()=>{
 for(const aspect of [640/480,390/844,1920/1080]){
  const scare=createJumpscare();scare.resize(aspect);scare.start();scare.update(.2);
  scare.scene.updateMatrixWorld(true);scare.camera.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(scare.face);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new THREE.Vector3(x,y,z).project(scare.camera);
   assert.ok(Math.abs(p.x)<.95&&Math.abs(p.y)<.95&&p.z<1,`Head cropped at ${aspect}: ${p.toArray()}`);
  }
 }
});

test('the attached mouth belongs to the jumpscare and never to the roaming creature',()=>{
 const texture=new THREE.DataTexture(new Uint8Array([255,0,0,255]),1,1),scare=createJumpscare({mouthTexture:texture});
 scare.start();scare.update(.1);
 assert.equal(scare.mouth?.visible,false,'mouth stays hidden for the eye reveal');
 for(let i=0;i<10;i++)scare.update(.1);
 assert.ok(scare.mouth?.visible);assert.equal(scare.mouth.parent,scare.face);assert.equal(scare.mouth.material.map,texture);
 const roaming=createCreature();let mouths=0;roaming.root.traverse(mesh=>{if(mesh.userData.jumpscareMouth)mouths++;});assert.equal(mouths,0);
});

test('an unloaded mouth image never produces a white rectangle',()=>{
 const scare=createJumpscare({mouthTexture:new THREE.Texture()});scare.start();scare.update(.1);
 assert.equal(scare.mouth.visible,false);
});

test('the black-eyed reveal precedes the close-range lunge and visible mouth',()=>{
 const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 const scare=createJumpscare({mouthTexture:texture});
 scare.resize(16/9);scare.start();scare.update(.2);
 const startingDistance=scare.camera.position.z;
 assert.equal(scare.mouth.visible,false);
 scare.update(.65);
 assert.ok(scare.camera.position.z<startingDistance,'creature moves toward the viewer');
 assert.ok(scare.eyes.some(eye=>eye.material.color.r>.9));
 assert.equal(scare.mouth.visible,true);
 scare.update(.13);
 assert.ok(scare.impactOpacity>.2,'a single soft red impact accompanies the lunge');
 assert.ok(scare.glitch>=0&&scare.glitch<=1);
});
