import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createJumpscare,JUMPSCARE_DURATION} from '../src/jumpscare.js';

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
 for(let i=0;i<20;i++)scare.update(.1);
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
