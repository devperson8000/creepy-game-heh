import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBriefingNarrator} from '../src/briefing-narrator.js';
import dialogue from '../public/audio/launch/dialogue.json' with {type:'json'};
const load=async()=>{const bytes=await readFile(new URL('../public/models/launch/hooded-stranger.glb',import.meta.url));return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');};
test('launch narrator uses the same stranger voice and measured dialogue fits every slot',()=>{
 assert.equal(dialogue.voice,'bm_george');assert.match(dialogue.character,/stranger/i);
 for(let i=0;i<dialogue.clips.length-1;i++){const line=dialogue.clips[i],next=dialogue.clips[i+1];assert.ok(line.duration>0&&line.start+line.duration<=next.start+.001,`${line.id} overlaps ${next.id}`);}
 assert.equal(dialogue.clips.at(-1).start,94);
});
test('source-backed stranger has a dark hood, gestures through the rig and restores after seeking',async()=>{
 const asset=await load(),host=createBriefingNarrator({asset});assert.equal(host.imported,true);
 host.root.position.set(-.4,0,-3);host.sample(4,{speaking:.7,gesture:.5});
 const head=host.head.quaternion.clone(),hand=host.fingerTip.getWorldPosition(new T.Vector3());
 host.sample(12,{speaking:.3,gesture:1,headYaw:.5});assert.ok(head.angleTo(host.head.quaternion)>.1);assert.ok(hand.distanceTo(host.fingerTip.getWorldPosition(new T.Vector3()))>.04);
 host.sample(4,{speaking:.7,gesture:.5});assert.deepEqual(host.head.quaternion.toArray(),head.toArray());assert.ok(hand.distanceTo(host.fingerTip.getWorldPosition(new T.Vector3()))<1e-7);
 const face=host.root.getObjectByName('hood-opening');assert.equal(face.material.color.getHex(),0);
 let sourceDisposed=0;asset.scene.traverse(o=>o.geometry?.addEventListener('dispose',()=>sourceDisposed++));host.dispose();host.dispose();assert.equal(sourceDisposed,0);
});
test('authored hooded fallback can gesture and dispose without the model',()=>{
 const host=createBriefingNarrator();host.sample(6,{speaking:.7,gesture:.6,headYaw:.2});assert.ok(host.head.rotation.y>.1);host.dispose();host.dispose();
});
