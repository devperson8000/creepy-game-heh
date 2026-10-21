import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleNeedlelimbsTeaser,NEEDLELIMBS_VOICES} from '../src/needlelimbs-timeline.js';
import {createMechanicalHead,createRebuiltMonochrome} from '../src/mechanical-head.js';
import {createNeedlelimbsActor} from '../src/needlelimbs-actor.js';

test('the survivor reply overlaps the approach and peek of the single selected creature',()=>{
 assert.equal(NEEDLELIMBS_VOICES[0].subtitle,'RADIO: “You made it out?”');
 assert.equal(NEEDLELIMBS_VOICES[1].subtitle,'SURVIVOR: “Yes, but I don’t think it was just Monochrome…”');
 const reply=NEEDLELIMBS_VOICES[1];
 assert.ok(sampleNeedlelimbsTeaser(reply.at+.5).needle.visible);
 assert.ok(sampleNeedlelimbsTeaser(reply.end-.5).needle.peek>.5);
 assert.equal(sampleNeedlelimbsTeaser(reply.end-.5).shot,'corner');
});
test('the approach travels toward a fixed corner then settles into the peek without teleporting',()=>{
 let last=null;const phases=new Set();
 for(let f=0;f<=1500;f++){
  const s=sampleNeedlelimbsTeaser(f/60);phases.add(s.shot);
  for(const n of [...s.needle.position,s.needle.peek,s.needle.walk,s.monochrome.walk,...s.monochrome.position])assert.ok(Number.isFinite(n));
  if(last&&s.needle.visible&&last.needle.visible)assert.ok(Math.hypot(...s.needle.position.map((x,i)=>x-last.needle.position[i]))<.08);
  if(s.needle.visible&&s.needle.peek>.9)assert.ok(s.needle.walk<.1,'peek settles into a planted stance');
  last=s;
 }
 assert.deepEqual([...phases],['arrival','corner','rebuilt','title']);
 assert.deepEqual(sampleNeedlelimbsTeaser(7),sampleNeedlelimbsTeaser(7));
 assert.equal(sampleNeedlelimbsTeaser(100).time,25);
});
test('Monochrome approaches behind Needlelimbs before a sustained mechanical head reveal',()=>{
 const a=sampleNeedlelimbsTeaser(12.5),b=sampleNeedlelimbsTeaser(15.5),c=sampleNeedlelimbsTeaser(18);
 assert.equal(a.shot,'rebuilt');assert.ok(a.needle.visible&&a.monochrome.visible);
 const gap=s=>Math.hypot(...s.monochrome.position.map((x,i)=>x-s.needle.position[i]));
 assert.ok(gap(a)>gap(b));assert.ok(c.monochrome.closeup>.9);
 assert.equal(sampleNeedlelimbsTeaser(20.9).blackout,true);assert.equal(sampleNeedlelimbsTeaser(22).shot,'title');
});
test('the replacement head has solid metal plates, articulated jaw, neck damage and no original head meshes',()=>{
 const actor=createRebuiltMonochrome();
 const machine=actor.mechanical;
 for(const name of ['mechanical-faceplate','mechanical-jaw','severed-neck-collar','neck-cables','mechanical-horn-left','mechanical-horn-right'])assert.ok(machine.root.getObjectByName(name),name);
 assert.ok(actor.body.head.children.filter(o=>o!==machine.root).every(o=>!o.visible));
 const plate=machine.root.getObjectByName('mechanical-faceplate');assert.ok(plate.material.metalness>.6);
 machine.sample(0,{jaw:0});const shut=machine.jaw.rotation.x;machine.sample(1,{jaw:1});assert.ok(Math.abs(machine.jaw.rotation.x-shut)>.2);
 actor.sample({time:2,travel:1,walk:1,position:[0,0,-4]});const hip=actor.body.legs[0].rotation.x;
 actor.sample({time:2.2,travel:1.2,walk:1,position:[0,0,-3.8]});assert.notEqual(actor.body.legs[0].rotation.x,hip);
 actor.dispose();actor.dispose();
});
function rig(){
 const scene=new THREE.Group(),hip=new THREE.Bone(),neck=new THREE.Bone(),head=new THREE.Bone(),leg=new THREE.Bone();hip.name='Hips';neck.name='Neck';head.name='Head';leg.name='Leg';neck.position.y=1;head.position.y=.4;hip.add(neck,leg);neck.add(head);scene.add(hip);
 scene.add(new THREE.Mesh(new THREE.CapsuleGeometry(.1,2),new THREE.MeshStandardMaterial()));
 const walk=new THREE.AnimationClip('Walk',1,[new THREE.NumberKeyframeTrack('Leg.rotation[x]',[0,.25,.5,.75,1],[0,.7,0,-.7,0]),new THREE.VectorKeyframeTrack('Hips.position',[0,.5,1],[0,0,0,0,.04,.5,0,0,1])]);
 return {scene,animations:[walk]};
}
test('the exact-asset adapter plays skeletal movement, removes root drift and adds a reversible head peek',()=>{
 const asset=rig(),a=createNeedlelimbsActor(asset);
 a.sample({travel:.25,walk:1,peek:0,position:[2,0,-5]});const leg=a.model.getObjectByName('Leg').rotation.x,neck=a.model.getObjectByName('Neck'),head=a.model.getObjectByName('Head');const neutral=head.quaternion.clone();
 a.sample({travel:.75,walk:1,peek:1,position:[2,0,-5]});assert.notEqual(a.model.getObjectByName('Leg').rotation.x,leg);assert.ok(head.quaternion.angleTo(neutral)>.1);assert.ok(Math.abs(a.model.getObjectByName('Hips').position.z)<.0001,'clip cannot slide the actor away from the authored path');
 assert.equal(asset.scene.getObjectByName('Head').rotation.y,0,'shared source is untouched');
 const pose=head.quaternion.clone();a.sample({travel:.75,walk:1,peek:1,position:[2,0,-5]});assert.ok(head.quaternion.angleTo(pose)<1e-6,'seeking does not accumulate offsets');
 a.sample({travel:.25,walk:1,peek:0,position:[2,0,-5]});assert.ok(head.quaternion.angleTo(neutral)<1e-6);assert.ok(Math.abs(neck.rotation.z)<1e-6);
 a.dispose();a.dispose();
});
test('an unanimated source is rejected rather than silently displayed as a static floating creature',()=>{
 assert.throws(()=>createNeedlelimbsActor({...rig(),animations:[]}),/walk|animation/i);
});
test('unidentified animations need an explicit reviewed clip selection',()=>{
 const asset=rig();asset.animations[0].name='Take 001';
 assert.throws(()=>createNeedlelimbsActor(asset),/walk|animation/i);
 const actor=createNeedlelimbsActor(asset,{walkClipName:'Take 001'});actor.sample({travel:.3});actor.dispose();
});
