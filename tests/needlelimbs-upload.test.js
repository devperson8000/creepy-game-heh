import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNeedlelimbsActor} from '../src/needlelimbs-actor.js';
import {sampleNeedlelimbsTeaser} from '../src/needlelimbs-timeline.js';
import {NEEDLELIMBS_READY} from '../src/teaser-edition.js';
test('uploaded Needle rig walks, grounds, peeks independently and supports deterministic replay',async()=>{
 const bytes=readFileSync('public/models/teaser/needlelimbs.glb');
 const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.equal(NEEDLELIMBS_READY,true);assert.equal(asset.animations[0].name,'Needlelimbs_Walk');
 const a=createNeedlelimbsActor(asset),leg=a.model.getObjectByName('thighL');assert.ok(leg);
 a.sample(sampleNeedlelimbsTeaser(4.3).needle);const before=leg.quaternion.clone();
 a.sample(sampleNeedlelimbsTeaser(5.1).needle);assert.ok(before.angleTo(leg.quaternion)>.01,'source gait must articulate legs');
 const positions=[];
 for(const t of [4,4.5,5,5.5,6,6.5,7,7.5,8,12]){
  a.sample(sampleNeedlelimbsTeaser(t).needle);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(a.model).min.y)<1e-5,'animated sole stays on floor');
  positions.push(a.head.getWorldPosition(new THREE.Vector3()).toArray());
 }
 const s=sampleNeedlelimbsTeaser(8).needle;a.sample({...s,peek:0});const neutral=a.head.quaternion.clone();
 a.sample(s);assert.ok(neutral.angleTo(a.head.quaternion)>.2);
 const end=a.head.getWorldPosition(new THREE.Vector3());a.sample(sampleNeedlelimbsTeaser(4).needle);a.sample(s);
 assert.ok(end.distanceTo(a.head.getWorldPosition(new THREE.Vector3()))<1e-5,'seek restores same grounded pose');
 a.dispose();
});
