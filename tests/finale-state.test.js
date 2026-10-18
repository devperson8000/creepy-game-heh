import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopState,serializeCoopState,applyCoopSnapshot} from '../src/coop-state.js';
import {createCoopSimulation} from '../src/coop-simulation.js';
import {beginFinale,advanceFinale,finaleShot,createFinaleClock,FINALE_DURATION} from '../src/finale-state.js';
const team=[{id:'a',name:'Ada',slot:0},{id:'b',name:'Ben',slot:1},{id:'c',name:'Cam',slot:2}];
function ready(members=team){const state=createCoopState(42,members);state.run.banked=new Set([1,2,3,4]);state.run.codeAccepted=true;return state;}
test('both objective orders trigger exactly one multiplayer finale',()=>{
 for(const last of ['keys','code']){
  const s=ready();if(last==='keys')s.run.banked.clear();else s.run.codeAccepted=false;
  assert.equal(beginFinale(s,100),false);
  if(last==='keys')s.run.banked=new Set([1,2,3,4]);else s.run.codeAccepted=true;
  assert.equal(beginFinale(s,101),true);const id=s.run.finale.id;
  assert.equal(beginFinale(s,102),false);assert.equal(s.run.finale.id,id);assert.equal(s.run.phase,'finale');
 }
 assert.equal(beginFinale(ready(team.slice(0,1)),100),false);
});
test('fixed cast excludes missing/dead teammates and rescues downed teammates',()=>{
 const s=ready();Object.assign(s.players.get('a'),{x:0,z:0,height:0});s.players.get('b').status='downed';s.players.get('c').status='dead';
 assert.ok(beginFinale(s,100));assert.deepEqual(s.run.finale.cast.map(p=>p.id),['a','b']);assert.equal(s.run.finale.runnerId,'a');assert.equal(s.run.finale.buttonId,'b');
 s.players.get('b').name='Changed';assert.equal(s.run.finale.cast[1].name,'Ben');
 assert.equal(advanceFinale(s,151.9),false);assert.equal(s.run.phase,'finale');assert.equal(advanceFinale(s,152),true);assert.equal(s.run.phase,'won');assert.equal(s.players.get('b').status,'escaped');assert.equal(s.players.get('c').status,'dead');assert.equal(advanceFinale(s,200),false);
});
test('runner is farthest living survivor with deterministic ties; single survivor presses button',()=>{
 const s=ready();Object.assign(s.players.get('a'),{x:0,z:0,height:0});Object.assign(s.players.get('c'),{x:0,z:0,height:0});
 assert.ok(beginFinale(s,100));assert.equal(s.run.finale.runnerId,'a');assert.equal(s.run.finale.buttonId,'b');
 const one=ready(team.slice(0,2));one.players.delete('b');assert.ok(beginFinale(one,100));assert.equal(one.run.finale.buttonId,'a');
 const dead=ready();for(const p of dead.players.values())p.status='dead';assert.equal(beginFinale(dead,100),false);
});
test('cinematic metadata roundtrips without leaking layout or replacing fallen results',()=>{
 const s=ready();beginFinale(s,100);advanceFinale(s,115);const copy=createCoopState(42,team);
 applyCoopSnapshot(copy,JSON.parse(JSON.stringify(serializeCoopState(s))));assert.deepEqual(copy.run.finale,s.run.finale);assert.equal(copy.run.finale.elapsed,15);assert.equal(serializeCoopState(s).run.layout,undefined);
});
test('shots follow the approved 52 second sequence',()=>{
 assert.equal(FINALE_DURATION,52);
 assert.deepEqual([0,2,12,19,23,30,35,39,44,52].map(t=>finaleShot(t).name),['black','chase','stairs','dive','trapped','ascent','sever','death','escape','escape']);
 assert.equal(finaleShot(NaN).name,'black');
});
test('viewer clock catches up after hidden tab, ignores stale updates and resets for replay',()=>{
 let now=0;const clock=createFinaleClock({now:()=>now});clock.sync({id:'one',elapsed:5});assert.equal(clock.sample(),5);now=10;assert.equal(clock.sample(),15);
 clock.sync({id:'one',elapsed:6});assert.ok(clock.sample()>=15);
 clock.sync({id:'one',elapsed:30});assert.equal(clock.sample(),30);now=40;assert.equal(clock.sample(),52);clock.sync({id:'one',elapsed:2});assert.equal(clock.sample(),52);
 clock.sync({id:'two',elapsed:0});assert.equal(clock.sample(),0);clock.reset();assert.equal(clock.sample(),0);
});
test('authority freezes movement, enemy and downed timers while wall clock advances finale',()=>{
 let now=100;const s=ready(),world={canMove:()=>true,targets:new Map()};s.players.get('b').status='downed';s.players.get('b').downedUntil=1;
 const sim=createCoopSimulation(s,world,{ambushChance:0,now:()=>now});sim.advance(.1);assert.equal(s.run.phase,'finale');
 const before=JSON.stringify([...s.players.values()]),enemy=JSON.stringify(sim.enemy),elapsed=s.run.elapsed;
 sim.setInput('a',{forward:1,right:0,yaw:0,pitch:0});now=140;sim.advance(.1);
 assert.equal(s.run.finale.elapsed,40);assert.equal(s.run.elapsed,elapsed);assert.equal(JSON.stringify([...s.players.values()]),before);assert.equal(JSON.stringify(sim.enemy),enemy);assert.equal(sim.interact('a',{targetId:'keypad',code:s.run.code}).ok,false);
 now=152;sim.advance(.1);assert.equal(s.run.phase,'won');
});
