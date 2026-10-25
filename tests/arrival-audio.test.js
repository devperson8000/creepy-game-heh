import test from 'node:test';import assert from 'node:assert/strict';
import {createArrivalAudio,impactOffset} from '../src/arrival-audio.js';
function fixture({muted=false,delayed=false}={}){
 const starts=[],stops=[];let complete;
 const context={state:'running',currentTime:8,destination:{},resume:async()=>{},close:async()=>{},decodeAudioData:async()=>({duration:4.14}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start:t=>starts.push(t),stop:()=>stops.push(true)})};
 const audio=createArrivalAudio({createContext:()=>context,isMuted:()=>muted,fetchAudio:()=>delayed?new Promise(r=>complete=r):Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
 return {audio,starts,stops,context,complete:()=>complete({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})};
}
test('decoded hit starts once at the current audio time and disposal stops the tail',async()=>{
 const f=fixture();await f.audio.ready;assert.equal(f.starts.length,0);f.audio.trigger();f.audio.trigger();assert.deepEqual(f.starts,[8]);f.audio.dispose();assert.equal(f.stops.length,1);
});
test('mute and dispose before cue never emit the hit',async()=>{
 const a=fixture({muted:true});await a.audio.ready;a.audio.trigger();assert.equal(a.starts.length,0);a.audio.dispose();
 const b=fixture();await b.audio.ready;b.audio.dispose();b.audio.trigger();assert.equal(b.starts.length,0);
});
test('decoding after skip cannot start a delayed hit',async()=>{
 const f=fixture({delayed:true});assert.equal(f.audio.settled,false);f.audio.dispose();f.complete();await f.audio.ready;f.audio.trigger();assert.equal(f.starts.length,0);
});

test('the uploaded hit leading silence is skipped instead of delaying its attack after the title',()=>{
 const samples=new Float32Array(1000);samples[52]=.02;
 assert.equal(impactOffset({length:1000,sampleRate:1000,numberOfChannels:1,getChannelData:()=>samples}),.052);
});
