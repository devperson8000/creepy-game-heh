import test from 'node:test';import assert from 'node:assert/strict';
import {HALLOWEEN_ENDING_DURATION,halloweenEndingFrame} from '../src/halloween-ending-timeline.js';
import {createCoopState} from '../src/coop-state.js';import {beginFinale,advanceFinale,createFinaleClock} from '../src/finale-state.js';
const team=n=>Array.from({length:n},(_,slot)=>({id:`p${slot}`,name:`Player ${slot+1}`,slot}));
test('Halloween escape starts only at the service exit, works solo and keeps a host-authored duration',()=>{
 for(const count of [1,2,3,4]){
  const state=createCoopState(42,team(count),{halloween:true});state.run.banked=new Set([1,2,3,4]);state.run.codeAccepted=true;
  assert.equal(beginFinale(state,100),false,'objectives alone leave the optional B2 quest accessible');
  assert.ok(beginFinale(state,100,{requested:true}));assert.equal(state.run.finale.variant,'house');assert.equal(state.run.finale.duration,HALLOWEEN_ENDING_DURATION);
  assert.equal(advanceFinale(state,100+HALLOWEEN_ENDING_DURATION-.1),false);assert.equal(advanceFinale(state,100+HALLOWEEN_ENDING_DURATION),true);assert.equal(state.run.phase,'won');
 }
});
test('viewer clock does not clamp the house escape to the old thirty-second ending',()=>{
 let now=0;const clock=createFinaleClock({now:()=>now});clock.sync({id:'house',variant:'house',duration:HALLOWEEN_ENDING_DURATION,elapsed:28});now=9;assert.equal(clock.sample(),37);now=100;assert.equal(clock.sample(),HALLOWEEN_ENDING_DURATION);
});
test('house escape is deterministic, continuously crosses the original wall and gives solo a self-rescue',()=>{
 const seen=new Set();let previous=null;
 for(let t=0;t<=HALLOWEEN_ENDING_DURATION;t+=1/60){const f=halloweenEndingFrame(t,{count:2});seen.add(f.shot);assert.ok([...f.runner,...f.camera,...f.look,f.reach,f.fade].every(Number.isFinite));
  if(previous&&f.shot==='wall-crossing'&&previous.shot===f.shot)assert.ok(Math.hypot(...f.camera.map((v,i)=>v-previous.camera[i]))<.08);previous=f;
 }
 assert.ok(halloweenEndingFrame(13).runner[2]<-9);assert.ok(halloweenEndingFrame(17.5).runner[2]>-9);
 assert.equal(halloweenEndingFrame(32,{count:1}).rescue,'self');assert.equal(halloweenEndingFrame(32,{count:2}).rescue,'team');
 for(const beat of ['service-door','passage','wall-touch','wall-crossing','house','flight','fall','rescue','escape','lawn','abandoned','pumpkin','title'])assert.ok(seen.has(beat),beat);
 assert.equal(halloweenEndingFrame(HALLOWEEN_ENDING_DURATION).complete,true);assert.equal(halloweenEndingFrame(53).title,'YOU ESCAPED THE HOUSE.');
});
