import test from 'node:test';import assert from 'node:assert/strict';
import {createUpdateSamples} from '../src/update-samples.js';
import {createHalloweenSoundscape,updateAmbienceCues} from '../src/halloween-soundscape.js';
function fixture(){
 const starts=[],stops=[],volumes=[];const parameter={setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime:v=>volumes.push(v)};
 const context={state:'running',currentTime:3,destination:{},decodeAudioData:async()=>({duration:20}),createGain:()=>({gain:{...parameter},connect(){},disconnect(){}}),createStereoPanner:()=>({pan:{value:0},connect(){},disconnect(){}}),createBiquadFilter:()=>({frequency:{value:0},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start:(...args)=>starts.push(args),stop:()=>stops.push(true)})};
 return {context,starts,stops,volumes};
}
test('sample bank waits for decode, starts only in running context, and stops all active scene sounds',async()=>{
 const f=fixture(),bank=createUpdateSamples(f.context,{files:{room:'room'},fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)})});
 assert.equal(bank.play('room'),false);await bank.ready;bank.volume(.5);assert.equal(bank.play('room',{offset:2,duration:5}),true);assert.deepEqual(f.starts,[[3,2]]);assert.equal(bank.activeCount,1);
 bank.stop();assert.equal(bank.activeCount,0);f.context.state='suspended';assert.equal(bank.play('room'),false);bank.dispose();assert.equal(bank.play('room'),false);
});
test('decode completion after disposal cannot start or retain a stale scene sound',async()=>{
 const f=fixture();let complete;const bank=createUpdateSamples(f.context,{files:{room:'room'},fetchAudio:()=>new Promise(r=>complete=r)});bank.dispose();complete({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await bank.ready;assert.equal(bank.play('room'),false);assert.equal(f.starts.length,0);
});
test('ambient passages have quiet gaps, soften under danger/hiding, and respect the pre-hunt hush',()=>{
 assert.equal(updateAmbienceCues(0).length,0);assert.equal(updateAmbienceCues(30).length,0);
 const normal=updateAmbienceCues(5)[0],danger=updateAmbienceCues(5,{threat:1,hidden:true})[0];assert.ok(danger.duck<normal.duck*.2);assert.equal(updateAmbienceCues(5,{hush:0}).length,0);assert.notEqual(updateAmbienceCues(20,{yaw:0})[0].pan,updateAmbienceCues(20,{yaw:2})[0].pan);
});
test('long-running ambience keeps a full phrase instead of clamping to the last fraction of a clip',async()=>{
 const f=fixture(),bank=createUpdateSamples(f.context,{files:{room:'room'},fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});await bank.ready;
 bank.play('room',{offset:102,duration:12,wrapOffset:true});
 assert.ok(f.starts[0][1]<=8,'the complete 12-second passage must fit inside the 20-second recording');bank.dispose();
});
test('turning mid-passage smoothly moves the active sound without restarting it',async()=>{
 const f=fixture(),pans=[];f.context.createStereoPanner=()=>({pan:{value:0,setTargetAtTime:(...args)=>pans.push(args)},connect(){},disconnect(){}});
 const bank=createUpdateSamples(f.context,{files:{room:'room'},fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});await bank.ready;bank.play('room',{pan:.4});bank.pan?.('room',-.6);
 assert.equal(pans.length,1);assert.equal(pans[0][0],-.6);assert.ok(pans[0][2]>=.1);assert.equal(f.starts.length,1);bank.dispose();
});
test('paused audio contexts freeze the ambience timeline instead of missing its first passage',async t=>{
 const f=fixture();f.context.state='suspended';t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));
 const room=createHalloweenSoundscape(f.context);await room.ready;for(let i=0;i<100;i++)room.update({delta:.2});f.context.state='running';
 for(let i=0;i<10;i++)room.update({delta:.2});assert.equal(f.starts.length,1);assert.ok(f.starts[0][1]<.3,'unlocking starts the first room passage');room.dispose();
});
test('ambience swells ease in slowly and leave headroom when passages overlap',()=>{
 const cues=updateAmbienceCues(131);assert.equal(cues.length,2);
 assert.ok(cues.every(c=>c.fade>=1&&c.wrapOffset));assert.ok(cues.reduce((sum,c)=>sum+c.gain*c.duck,0)<.24);
});
