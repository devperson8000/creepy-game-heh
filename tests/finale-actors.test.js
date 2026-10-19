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
test('trapped creature opens its mouth; severed head falls independently and stops twitching',()=>{
 const a=createFinaleCreature({mouthTexture:new T.DataTexture(new Uint8Array([255,0,0,255]),1,1)});a.sample({time:26,mode:'trapped',position:[0,0,0],yaw:0,neckPosition:[0,2,0]});assert.ok(a.mouth.scale.y>1);assert.equal(a.mouth.visible,true);
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

test('finale uses the exact jumpscare mouth texture and keeps borrowed texture ownership',async()=>{
 const {createJumpscare}=await import('../src/jumpscare.js');
 const texture=new T.DataTexture(new Uint8Array([255,0,0,255]),1,1),scare=createJumpscare({mouthTexture:texture}),a=createFinaleCreature({mouthTexture:texture});
 a.sample({mode:'trapped',time:26});
 assert.equal(a.mouth?.material.map,scare.mouth.material.map);
 assert.equal(a.mouth?.geometry.parameters.width,scare.mouth.geometry.parameters.width);
 assert.equal(a.mouth?.material.transparent,true);assert.equal(a.mouth?.visible,true);
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,0);texture.dispose();
});
test('an undecoded finale mouth cannot show a white rectangle',()=>{
 const a=createFinaleCreature({mouthTexture:new T.Texture()});a.sample({mode:'trapped',time:26});assert.equal(a.mouth?.visible,false);a.dispose();
});

test('the diver lies face-down throughout the cab sequence and stands for walkout',async()=>{
 const {createFinaleScene}=await import('../src/finale-scene.js'),{finalePlaybackTime:at}=await import('../src/finale-state.js');
 const source=await asset();
 for(const count of [1,2,4]){
  const cast=Array.from({length:count},(_,slot)=>({id:String(slot),slot}));
  const a=createFinaleScene({asset:source,cast,runnerId:'0',buttonId:count>1?'1':'0',reducedMotion:true}),runner=a.actors.get('0');
  for(const time of [21.3,22.2,27,34,40,43,44.5]){
   a.sample(at(time));const floor=a.set.cab.position.y,head=runner.root.getObjectByName('spine006').getWorldPosition(new T.Vector3()),hip=runner.root.getObjectByName('spine').getWorldPosition(new T.Vector3());
   assert.ok(head.y<floor+.4&&hip.y<floor+.4,`${count} cast: survivor stood up at ${time}`);
   assert.ok(head.y>=floor&&hip.y>=floor,'body stays above the cab floor');
  }
  a.sample(at(46));assert.ok(runner.root.getObjectByName('spine006').getWorldPosition(new T.Vector3()).y>1.4,'stand-up joins the walk without dropping back into the fall clip');
  a.sample(at(47));assert.ok(runner.root.getObjectByName('spine006').getWorldPosition(new T.Vector3()).y>1.4);
  a.sample(at(27));const first=runner.root.getObjectByName('spine006').getWorldPosition(new T.Vector3());a.sample(at(48));a.sample(at(27));assert.ok(runner.root.getObjectByName('spine006').getWorldPosition(new T.Vector3()).distanceTo(first)<1e-8);
  a.dispose();
 }
});

test('the survivor is visibly stretched forward in midair before the belly landing',async()=>{
 const {createFinaleScene}=await import('../src/finale-scene.js'),{finalePlaybackTime:at}=await import('../src/finale-state.js');
 const a=createFinaleScene({asset:await asset(),cast:[{id:'a'},{id:'b'}],runnerId:'a',buttonId:'b'});
 a.sample(at(20.1));const runner=a.actors.get('a').root,head=runner.getObjectByName('spine006').getWorldPosition(new T.Vector3()),hip=runner.getObjectByName('spine').getWorldPosition(new T.Vector3());
 assert.ok(head.y-hip.y<.3,'torso extends forward rather than staying upright');
 assert.ok(head.z<hip.z-.35,'head leads the dive into the cab');
 assert.ok(hip.y>a.set.cab.position.y+.5,'the dive is airborne');a.dispose();
});
