import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createHalloweenEndingScene} from '../src/halloween-ending-scene.js';
function make(count=2){const old=globalThis.document,context=new Proxy({measureText:s=>({width:s.length*10}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});globalThis.document={createElement:()=>({getContext:()=>context})};try{return createHalloweenEndingScene({asset:{scene:new THREE.Group(),animations:[]},cast:Array.from({length:count},(_,slot)=>({id:`p${slot}`,slot})),runnerId:'p0',reducedMotion:true});}finally{globalThis.document=old;}}
test('ending reuses the exact house wall, has a genuine uphill route, and samples every beat without drift',()=>{
 const a=make();assert.equal(a.set.wall.position.z,-9);assert.equal(a.set.wall.name,'the-wall');assert.ok(a.route.getObjectByName('house-service-pipe'));
 for(const t of [0,4,10,12,14,17,20,26,28,32,36,40,44,48,53,56]){const f=a.sample(t);assert.ok(a.camera.position.toArray().every(Number.isFinite));assert.ok(f.shot);}
 a.sample(14);const p=a.camera.position.clone();a.sample(50);a.sample(14);assert.ok(p.distanceTo(a.camera.position)<1e-8);
 a.sample(32);assert.ok(a.floorHinge.rotation.x>.7);assert.equal(a.actors.size,2);a.resize(390/844);assert.ok(a.camera.fov>=75);a.sample(48);assert.ok(a.pumpkinLight.intensity>0);a.dispose();a.dispose();
});
