import test from 'node:test';import assert from 'node:assert/strict';
import {createUpdateSamples} from '../src/update-samples.js';
import {updateAmbienceCues} from '../src/halloween-soundscape.js';
import {NEEDLELIMBS_RECORDED_CUES,NEEDLELIMBS_VOICES} from '../src/needlelimbs-timeline.js';
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
test('the stronger Needlelimbs breath follows dialogue and finishes before it leaves cover',()=>{
 const breath=NEEDLELIMBS_RECORDED_CUES.find(c=>c.file==='sfx/needle-breath'),reply=NEEDLELIMBS_VOICES[1];assert.ok(breath.at>=reply.at+3.128);assert.ok(breath.end<8.65);assert.ok(breath.gain<.3&&breath.pan>0);assert.equal(NEEDLELIMBS_RECORDED_CUES.length,2);
});
