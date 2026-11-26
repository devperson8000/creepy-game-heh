import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createJumpscare} from '../src/jumpscare.js';
import {createMetalMaw} from '../src/metal-maw.js';

test('the metal jumpscare splits the faceplate into a saw-maw and never shows the fleshy mouth',()=>{
 const texture=new THREE.DataTexture(new Uint8Array([255,0,0,255]),1,1);texture.needsUpdate=true;
 const scare=createJumpscare({mouthTexture:texture,metallic:true});
 const maw=scare.face.getObjectByName('metal-maw');assert.ok(maw,'the maw is built into the metal head');assert.equal(maw.visible,false,'hidden until the face starts to split');
 scare.start();scare.update(.6);
 assert.equal(maw.visible,true);assert.equal(scare.mouth.visible,false,'no fleshy mouth on the metal head');
 const names=new Map();maw.traverse(o=>names.set(o.name,(names.get(o.name)??0)+1));
 assert.equal(names.get('lance-shaft'),4);assert.equal(names.get('maw-iris-plate'),8);assert.ok(names.get('maw-saw-tooth')>=12);
 scare.dispose();
});

test('the original creature jumpscare keeps its mouth and gains no machinery',()=>{
 const texture=new THREE.DataTexture(new Uint8Array([255,0,0,255]),1,1);texture.needsUpdate=true;
 const scare=createJumpscare({mouthTexture:texture});assert.equal(scare.face.getObjectByName('metal-maw'),undefined);
 scare.start();scare.update(.5);assert.equal(scare.mouth.visible,true);scare.dispose();
});

test('the maw stays hidden when closed, grows its lances as it lunges, and keeps every spark finite',()=>{
 const maw=createMetalMaw();assert.equal(maw.root.visible,false);
 let length=0;for(let t=0;t<=1.85;t+=1/60){maw.sample(t,{open:Math.min(1,t*4),lunge:Math.min(1,Math.max(0,(t-.12)*2.3)),darkness:1});}
 maw.root.traverse(o=>{if(o.name==='lance-shaft')length=Math.max(length,o.scale.y);if(o.isPoints)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});
 assert.ok(length>.4,'lances extend a long way: '+length.toFixed(2));maw.dispose();
});
