import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createNeedlelimbsActor} from '../src/needlelimbs-actor.js';
test('live gait keeps a support foot planted through a turn and fits the low ceiling',async()=>{
 const bytes=readFileSync('public/models/teaser/needlelimbs.glb'),loader=new GLTFLoader();loader.register(()=>({name:'NodeTextureFixture',loadTexture:()=>Promise.resolve(new T.DataTexture(new Uint8Array([128,128,255,255]),1,1))}));const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const a=createNeedlelimbsActor(asset,{height:2.62,realtime:true});a.sample({time:0,travel:0,walk:0,position:[0,0,0]});const foot=a.model.getObjectByName('footR'),before=foot.getWorldPosition(new T.Vector3());
 a.sample({time:.025,travel:.02,walk:.4,speed:.8,position:[0,0,.02],yaw:.04});assert.ok(before.distanceTo(foot.getWorldPosition(new T.Vector3()))<1e-4);
 for(let i=1;i<=200;i++){const t=i*.025;a.sample({time:t,travel:t,walk:1,speed:1,position:[Math.sin(t*.3)*2,0,t*.5],yaw:t*.3});for(const f of a.gait.feet)assert.ok(f.phase>=0&&f.phase<=1);}
 let min=Infinity,max=-Infinity;a.model.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){const p=m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld);min=Math.min(min,p.y);max=Math.max(max,p.y);}});assert.ok(max<2.8);assert.ok(min>-.01);a.dispose();
});
