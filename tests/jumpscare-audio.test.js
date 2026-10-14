import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonsterAudio,JUMPSCARE_SOUND_URL} from '../src/monster-audio.js';

// Native Web Audio requires a browser. These controllable boundaries reproduce
// network timing/failure; browser checks also decode and play the actual MP3.
function audioHarness(t,{loopFails=false}={}){
 const oldFetch=globalThis.fetch,oldContext=globalThis.AudioContext,starts=[];
 let releaseScare,context;
 const response=tag=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(tag).buffer});
 globalThis.fetch=url=>url===JUMPSCARE_SOUND_URL?new Promise(resolve=>{releaseScare=()=>resolve(response('scream'));}):Promise.resolve(loopFails?{ok:false,status:503}:response('monster'));
 class Context{
  constructor(){context=this;}
  state='suspended';currentTime=0;
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},setTargetAtTime(){}},connect(){}};}
  decodeAudioData(bytes){return Promise.resolve({tag:new TextDecoder().decode(bytes),duration:2.25});}
  createBufferSource(){return {connect(){},disconnect(){},stop(){},start(){starts.push(this.buffer.tag);}};}
 }
 globalThis.AudioContext=Context;
 t.after(()=>{globalThis.fetch=oldFetch;globalThis.AudioContext=oldContext;});
 return {starts,advance:seconds=>{context.currentTime+=seconds;},release:async()=>{releaseScare();await new Promise(resolve=>setImmediate(resolve));}};
}

test('a scream that finishes loading during a capture plays exactly once',async t=>{
 const h=audioHarness(t),audio=createMonsterAudio('/loop.mp3');await audio.resume();
 assert.equal(audio.playJumpscare(),true);await h.release();
 assert.deepEqual(h.starts,['monster','scream']);audio.dispose();
});

for(const cancel of ['pause','mute'])test(`a pending scream cannot start after ${cancel} cancels it`,async t=>{
 const h=audioHarness(t),audio=createMonsterAudio('/loop.mp3');await audio.resume();audio.playJumpscare();
 if(cancel==='pause')audio.pause();else audio.setMuted(true);await h.release();assert.deepEqual(h.starts,['monster']);audio.dispose();
});

test('an expired scream cannot play after a slow load',async t=>{
 const h=audioHarness(t),audio=createMonsterAudio('/loop.mp3');await audio.resume();audio.playJumpscare();h.advance(3);await h.release();
 assert.deepEqual(h.starts,['monster']);audio.dispose();
});

test('failure loading the roaming loop does not disable the jumpscare channel',async t=>{
 const h=audioHarness(t,{loopFails:true}),errors=[],audio=createMonsterAudio('/loop.mp3',{onError:e=>errors.push(e)});
 await audio.resume();await h.release();assert.equal(errors.length,1);
 assert.equal(audio.playJumpscare(),true);assert.deepEqual(h.starts,['scream']);audio.dispose();
});
