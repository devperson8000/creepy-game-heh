import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOpeningSet} from '../src/opening-set.js';
const module=await import('../src/halloween-props.js').catch(()=>({}));
function factory(options){assert.equal(typeof module.createHalloweenProps,'function','the house and maze need the same prop factory');return module.createHalloweenProps(options);}

test('both Halloween styles provide finite detailed local models without allocating lights',()=>{
 for(const aged of [false,true]){
  const props=factory({aged});
  for(const method of ['pumpkin','web','bunting','stringLights','bats','candleCluster','lantern','wreath','skeleton']){
   const root=props[method]();assert.ok(root.isGroup);assert.equal(root.userData.halloweenStyle,aged?'weathered':'house');assert.ok(root.userData.halloweenProp);
   const bounds=new THREE.Box3().setFromObject(root);assert.ok(!bounds.isEmpty());assert.ok([...bounds.min,...bounds.max].every(Number.isFinite));assert.ok(bounds.max.y>bounds.min.y);
   let lights=0,meshes=0;root.traverse(o=>{lights+=Number(!!o.isLight);meshes+=Number(!!o.isMesh);});assert.equal(lights,0);assert.ok(meshes>0||method==='web');
  }
  props.dispose();
 }
});
test('pumpkin instances share geometry and an openable chest has a separate hinged lid',()=>{
 const props=factory(),a=props.pumpkin(),b=props.pumpkin({scale:2}),chest=props.pumpkin({openable:true,black:true});
 assert.equal(a.body.geometry,b.body.geometry);assert.equal(b.scale.x,2);assert.ok(chest.lid.isGroup);assert.notEqual(chest.lid,chest.body);
 const closed=chest.lid.quaternion.clone();chest.lid.rotation.x=-1;assert.ok(closed.angleTo(chest.lid.quaternion)>.9);props.dispose();
});
test('repeated pumpkin and candle decorations keep their draw-call budget small',()=>{
 const props=factory();for(const [root,budget]of [[props.pumpkin(),5],[props.candleCluster(),8]]){let meshes=0;root.traverse(o=>meshes+=Number(!!o.isMesh));assert.ok(meshes<=budget,`${root.name} needs ${meshes} mesh draws`);}props.dispose();
});
test('candle animation preserves model scale and reduced motion returns it to rest',()=>{
 const props=factory(),root=props.candleCluster({scale:.65}),flames=[];root.traverse(o=>{if(o.userData.flame)flames.push(o);});assert.ok(flames.length>=3);
 const rest=flames.map(o=>o.scale.y);props.update(5);flames.forEach((o,i)=>assert.ok(o.scale.y>=rest[i]*.85&&o.scale.y<=rest[i]*1.15));
 props.update(9,{reducedMotion:true});assert.deepEqual(flames.map(o=>o.scale.y),rest);assert.equal(root.scale.x,.65);props.dispose();
});
test('disposing one prop factory releases only its own shared resources once',()=>{
 const a=factory(),b=factory(),first=a.pumpkin(),second=b.pumpkin();let geometryDisposals=0,materialDisposals=0,otherDisposals=0;
 first.body.geometry.addEventListener('dispose',()=>geometryDisposals++);first.body.material.addEventListener('dispose',()=>materialDisposals++);second.body.geometry.addEventListener('dispose',()=>otherDisposals++);
 a.dispose();a.dispose();a.update(100);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);assert.equal(otherDisposals,0);b.dispose();assert.equal(otherDisposals,1);
});
test('the actual opening house uses the shared pumpkins and hanging party decorations',()=>{
 const previous=globalThis.document,context=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>context})};
 try{
  const scene=new THREE.Scene(),set=createOpeningSet(scene),models=[];scene.traverse(o=>{if(o.userData.halloweenProp)models.push(o);});
  assert.ok(models.filter(o=>o.userData.halloweenProp==='pumpkin').length>=6);for(const kind of ['web','bunting','string-lights','wreath','candles','lantern','bats'])assert.ok(models.some(o=>o.userData.halloweenProp===kind),kind);
  const props=factory({aged:true}),reference=props.pumpkin(),actual=models.find(o=>o.userData.halloweenProp==='pumpkin');assert.deepEqual(actual.body.geometry.attributes.position.array,reference.body.geometry.attributes.position.array);set.update(16);set.dispose();props.dispose();
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
