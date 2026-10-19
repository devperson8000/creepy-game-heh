import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFinaleSurvivor,createFinaleCreature} from '../src/finale-actors.js';
async function asset(){const b=await readFile('public/models/hazmat-survivor.glb'),l=new GLTFLoader();l.register(()=>({name:'CPU',loadTexture:async()=>new T.Texture()}));return l.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('real survivor cinematic sampling is absolute, independent and hides gameplay labels',async()=>{
 const source=await asset(),a=createFinaleSurvivor(source,{id:'a',name:'A',slot:0}),b=createFinaleSurvivor(source,{id:'b',slot:1});
 const pose={clip:'Run',time:.2,position:[1,0,3],yaw:0};a.sample(pose);a.root.updateMatrixWorld(true);const bone=a.root.getObjectByName('handR'),position=bone.getWorldPosition(new T.Vector3());
 a.sample({...pose,time:.5});a.sample(pose);assert.ok(bone.getWorldPosition(new T.Vector3()).distanceTo(position)<1e-6);assert.equal(b.root.position.x,0);assert.equal(source.scene.position.x,0);
 assert.equal(a.root.getObjectByName('player-speaking').visible,false);assert.equal(a.root.getObjectByName('player-torch').visible,false);
 a.sample({...pose,action:'dive',progress:.5});assert.ok(Math.abs(a.root.rotation.x)>1);
 a.dispose();a.dispose();b.dispose();
});
test('button press places the real glove on the requested contact point',async()=>{
 const a=createFinaleSurvivor(await asset(),{id:'a'}),target=new T.Vector3(-.5,1.35,.25);
 a.sample({clip:'Idle',time:0,position:[0,0,0],yaw:Math.PI,action:'press',progress:1,handTarget:target.toArray()});a.root.updateMatrixWorld(true);
 assert.ok(a.root.getObjectByName('handR').getWorldPosition(new T.Vector3()).distanceTo(target)<.025);a.dispose();
});
test('trapped creature opens its jaw; severed head falls independently and stops twitching',()=>{
 const a=createFinaleCreature();a.sample({time:26,mode:'trapped',position:[0,0,0],yaw:0,neckPosition:[0,2,0]});assert.ok(a.jaw.rotation.x>.2);
 a.sample({time:36,mode:'severed',position:[0,0,0],yaw:0,neckPosition:[0,2,0],deathTime:1});const before=a.head.position.clone();assert.notEqual(a.head.parent,a.body.torso);
 a.sample({time:40,mode:'dead',position:[0,0,0],yaw:0,neckPosition:[0,2,0],deathTime:5});const settled=a.head.position.clone(),rotation=a.head.quaternion.clone();assert.ok(settled.y<before.y);
 a.sample({time:43,mode:'dead',position:[0,0,0],yaw:0,neckPosition:[0,2,0],deathTime:8});assert.ok(a.head.position.distanceTo(settled)<1e-8);assert.ok(a.head.quaternion.angleTo(rotation)<1e-6);a.dispose();a.dispose();
});
test('chase creature returns to the same absolute position after a seek',()=>{
 const a=createFinaleCreature(),pose={time:6,mode:'chase',position:[0,0,30],yaw:Math.PI};a.sample(pose);const first=a.body.root.position.clone();a.sample({...pose,time:8,position:[0,0,20]});a.sample(pose);assert.ok(a.body.root.position.distanceTo(first)<1e-8);a.dispose();
});
test('severed head falls inward onto the elevator floor',()=>{const a=createFinaleCreature();a.sample({time:38,mode:'severed',neckPosition:[0,2,-.08],deathTime:2.7});assert.ok(a.head.position.z<-.7);a.dispose();});

test('dive rotates around the body rather than tipping at the feet',async()=>{
 const a=createFinaleSurvivor(await asset(),{id:'a'});
 a.sample({clip:'Jump',time:.4,position:[0,3.6,-.7],yaw:0,action:'dive',progress:.5});
 assert.ok(a.root.position.y>4.1,'pelvis pivot lifts the root during the horizontal dive');
 const before=a.root.position.clone();a.sample({clip:'Idle',time:1,position:[0,3.6,-2.25],yaw:0});
 assert.equal(a.root.rotation.x,0);assert.equal(a.root.position.y,3.6);assert.ok(before.distanceTo(a.root.position)>0);a.dispose();
});

test('the airborne survivor stays in frame throughout the dive on desktop and portrait',async()=>{
 const {createFinaleScene}=await import('../src/finale-scene.js'),{finalePlaybackTime}=await import('../src/finale-state.js');
 const a=createFinaleScene({asset:await asset(),cast:[{id:'a',slot:0},{id:'b',slot:1}],runnerId:'a',buttonId:'b',reducedMotion:true});
 for(const aspect of [1.5,390/844]){
  a.resize(aspect);
  for(const progress of [.2,.5,.8]){
   a.sample(finalePlaybackTime(19+2.2*progress));
   for(const name of ['spine','spine006','footL','footR','handL','handR']){
    const point=a.actors.get('a').root.getObjectByName(name).getWorldPosition(new T.Vector3()).project(a.camera);
    assert.ok(Math.abs(point.x)<.9&&Math.abs(point.y)<.9&&Math.abs(point.z)<1,`${aspect}, ${progress}: ${name} outside frame ${point.toArray()}`);
   }
  }
 }
 a.dispose();
});
