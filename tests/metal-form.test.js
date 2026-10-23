import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from '../src/creature.js';
import {attachMechanicalHead} from '../src/mechanical-head.js';
import {createJumpscare} from '../src/jumpscare.js';
test('metal form owns its replacement and restores the original head when disposed',()=>{
 const body=createCreature(),original=[...body.head.children],machine=attachMechanicalHead(body);
 assert.equal(attachMechanicalHead(body),machine);assert.ok(original.every(o=>!o.visible));assert.equal(machine.root.parent,body.head);
 machine.sample(0,{jaw:0});const a=machine.root.getObjectByName('jaw-actuator-left').quaternion.clone();machine.sample(1,{jaw:1});assert.ok(a.angleTo(machine.root.getObjectByName('jaw-actuator-left').quaternion)>.04);
 const bounds=new THREE.Box3().setFromObject(machine.root);assert.ok(bounds.max.x-bounds.min.x>2);assert.ok(bounds.max.y-bounds.min.y<1.5);
 machine.dispose();machine.dispose();assert.ok(original.every(o=>o.visible));assert.equal(body.head.children.length,original.length);
});
test('Halloween jumpscare preserves lit steel, moving jaw and the original portrait framing',()=>{
 const scare=createJumpscare({metallic:true});assert.ok(scare.face.getObjectByName('monochrome-mechanical-head'));
 const plate=scare.face.getObjectByName('mechanical-faceplate');assert.ok(plate.material.isMeshStandardMaterial);assert.ok(plate.material.metalness>.6);
 scare.resize(390/844);scare.start();scare.update(.15);assert.ok(Number.isFinite(scare.camera.position.z));assert.ok(scare.face.getObjectByName('mechanical-jaw').rotation.x>.1);
});
