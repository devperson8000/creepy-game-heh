import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonsterAudio,JUMPSCARE_SOUND_URL} from '../src/monster-audio.js';

// Native Web Audio requires a browser. These controllable boundaries reproduce
// network timing/failure; browser checks also decode and play the actual MP3.
function audioHarness(t,{loopFails=false}={}){
 const oldFetch=globalThis.fetch,oldContext=globalThis.AudioContext,starts=[],links=[],sources=[];
 let releaseScare,context;
 const response=tag=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(tag).buffer});
 globalThis.fetch=url=>url===JUMPSCARE_SOUND_URL?new Promise(resolve=>{releaseScare=()=>resolve(response('scream'));}):Promise.resolve(loopFails?{ok:false,status:503}:response('monster'));
 class Context{
  constructor(){context=this;}
  state='suspended';currentTime=0;destination={kind:'destination'};
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  createGain(){const node={gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},setTargetAtTime(){}},connect(to){links.push([node,to]);},disconnect(){}};return node;}
  createBiquadFilter(){const node={frequency:{value:0,setTargetAtTime(){}},Q:{value:0},connect(to){links.push([node,to]);},disconnect(){}};return node;}
  createPanner(){const node={kind:'panner',positionX:{value:0},connect(to){links.push([node,to]);},disconnect(){}};return node;}
  decodeAudioData(bytes){return Promise.resolve({tag:new TextDecoder().decode(bytes),duration:2.25});}
  createBufferSource(){const node={connect(to){links.push([node,to]);},disconnect(){},stop(){},start(){starts.push(this.buffer.tag);}};sources.push(node);return node;}
 }
 globalThis.AudioContext=Context;
 t.after(()=>{globalThis.fetch=oldFetch;globalThis.AudioContext=oldContext;});
 return {starts,spatialPath(tag){let current=sources.find(s=>s.buffer?.tag===tag);for(let i=0;current&&i<10;i++){if(current.kind==='panner')return true;current=links.find(([from])=>from===current)?.[1];}return false;},advance:seconds=>{context.currentTime+=seconds;},release:async()=>{releaseScare();await new Promise(resolve=>setImmediate(resolve));}};
}

test('a scream that finishes loading during a capture plays exactly once',async t=>{
 const h=audioHarness(t),audio=createMonsterAudio('/loop.mp3',{maze:true,metallic:false});await audio.resume();
 assert.equal(audio.playJumpscare(),true);await h.release();
 assert.deepEqual(h.starts,['monster','scream']);assert.equal(h.spatialPath('monster'),true);assert.equal(h.spatialPath('scream'),false,'jumpscare remains centred');audio.dispose();
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
test('legacy roaming sound keeps its original centred routing before the Halloween release',async t=>{
 const h=audioHarness(t),audio=createMonsterAudio('/loop.mp3');await audio.resume();await h.release();assert.equal(h.spatialPath('monster'),false);audio.dispose();
});
test('Halloween maze routing preserves the original voice and centred scream without enabling sequel processing',async t=>{
 const h=audioHarness(t),errors=[],audio=createMonsterAudio('/loop.mp3',{maze:true,onError:error=>errors.push(error)});
 assert.equal(await audio.resume(),true);await h.release();assert.deepEqual(errors,[]);
 assert.equal(h.spatialPath('monster'),true);assert.equal(audio.playJumpscare(),true);assert.equal(h.spatialPath('scream'),false);audio.dispose();
});
