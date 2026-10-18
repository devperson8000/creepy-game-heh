import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createFinaleScene} from '../src/finale-scene.js';
const cast=[{id:'a',slot:0},{id:'b',slot:1},{id:'c',slot:2}];
const asset={scene:new T.Group(),animations:[]};
function make(reducedMotion=false){return createFinaleScene({asset,cast,runnerId:'a',buttonId:'b',reducedMotion});}
test('every shot samples directly with finite camera and actor transforms',()=>{
 const a=make();for(const t of [0,2,6,12,16,19,21.8,23,27,30,33,35,37,39,42,44,48,52]){
  const f=a.sample(t);assert.ok(f.shot);assert.ok(a.camera.position.toArray().every(Number.isFinite));a.scene.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));
 }assert.equal(a.sample(52).complete,true);assert.deepEqual(a.sample(52).title,['YOU ESCAPED.','TOGETHER.']);a.dispose();a.dispose();
});
test('doors clamp before ascent; moving cab passes fixed shaft frame',()=>{
 const a=make();a.sample(29);const low=a.set.cab.position.y,door=a.set.doors[0].position.x;a.sample(34);assert.ok(a.set.cab.position.y>low);assert.equal(a.set.doors[0].position.x,door);assert.notEqual(a.set.shaftFrame.parent,a.set.cab);assert.equal(a.set.shaftFrame.position.y,12.2);a.dispose();
});
test('severed head and blood are in the cab, death is still, seeking is deterministic',()=>{
 const a=make();a.sample(38);assert.ok(a.set.blood.visible);a.sample(43);const head=a.creature.head.position.clone();a.sample(40);a.sample(43);assert.ok(a.creature.head.position.distanceTo(head)<1e-8);
 a.sample(6);const start=a.camera.position.clone();a.sample(48);a.sample(6);assert.ok(start.distanceTo(a.camera.position)<1e-8);a.dispose();
});
test('reduced motion preserves story and framing at mobile aspect',()=>{
 const a=make(true);a.resize(.46);const f=a.sample(33);assert.equal(f.shot,'ascent');assert.ok(a.camera.fov>=60);assert.equal(a.sample(46).shot,'escape');a.dispose();
});
test('transition fades smoothly around the surface cut and floor readout changes during ascent',()=>{
 const a=make();assert.ok(a.sample(43).fade>0&&a.sample(43).fade<1);assert.equal(a.sample(44).fade,1);assert.ok(a.sample(44.7).fade>0&&a.sample(44.7).fade<1);a.dispose();
});
test('stair chase has clear headroom above the rising flight',()=>{const a=make();a.scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,3.5,5),new T.Vector3(0,1,0),0,.7);assert.equal(ray.intersectObject(a.set.basement,true).length,0);a.dispose();});
test('portrait framing keeps camera inside the corridor and fits the trapped horns',()=>{const a=make(true);a.resize(390/844);a.sample(6);assert.ok(Math.abs(a.camera.position.x)<3.4);a.sample(27);for(const x of [-1.2,1.2]){const p=a.creature.head.localToWorld(new T.Vector3(x,.83,0)).project(a.camera);assert.ok(Math.abs(p.x)<1);}a.dispose();});
