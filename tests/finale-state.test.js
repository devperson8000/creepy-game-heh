import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopState,serializeCoopState,applyCoopSnapshot} from '../src/coop-state.js';
import {FINALE_DURATION,finaleShot,beginFinale,advanceFinale,createFinaleClock} from '../src/finale-state.js';
const make=()=>createCoopState(99,[{id:'a',slot:0},{id:'b',slot:1},{id:'c',slot:2}]);
const complete=state=>{state.run.banked=new Set([1,2,3,4]);state.run.codeAccepted=true;};
test('the nine cinematic shots cover 52 seconds including exact boundaries',()=>{
 assert.equal(FINALE_DURATION,52);
 for(const [t,name] of [[0,'fade'],[2,'chase'],[12,'stairs'],[19,'dive'],[23,'doors'],[30,'ascent'],[35,'defeat'],[39,'silence'],[44,'daylight'],[52,'daylight']])assert.equal(finaleShot(t).name,name);
});
test('host triggers once with complete objectives regardless of when they were completed',()=>{
 const state=make();state.run.banked=new Set([1,2,3,4]);
 assert.equal(beginFinale(state,12),false);
 state.run.codeAccepted=true;assert.equal(beginFinale(state,13),true);assert.equal(beginFinale(state,14),false);
 assert.equal(state.run.phase,'finale');assert.equal(state.run.elapsed,0);assert.equal(state.run.exitOpen,true);
});
test('original multiplayer team size survives departures and a solo round is excluded',()=>{
 const state=make();state.players.delete('b');state.players.delete('c');complete(state);
 assert.equal(beginFinale(state,10),true);assert.equal(state.run.finale.runnerId,state.run.finale.buttonId);
 const solo=createCoopState(3,['only']);complete(solo);assert.equal(beginFinale(solo,10),false);
});
test('only present, rescued survivors appear and role selection is stable',()=>{
 const state=make();state.players.get('a').z=-33;state.players.get('b').z=10;state.players.get('c').status='downed';complete(state);
 assert.equal(beginFinale(state,2,{elevator:{x:-2.6,z:-31,height:3.6}}),true);
 assert.deepEqual(state.run.finale.cast.map(p=>p.id),['a','b','c']);assert.equal(state.run.finale.runnerId,'b');assert.equal(state.run.finale.buttonId,'a');
 assert.equal(advanceFinale(state,54),true);assert.equal(advanceFinale(state,55),false);
 assert.equal(state.players.get('c').status,'escaped');assert.equal(state.run.phase,'won');
});
test('fallen and disconnected teammates never reappear',()=>{
 const state=make();state.players.get('a').status='dead';state.players.delete('b');complete(state);
 beginFinale(state,5);assert.deepEqual(state.run.finale.cast.map(p=>p.id),['c']);
 advanceFinale(state,57);assert.equal(state.players.get('a').status,'dead');
});
test('serialized finale state roundtrips without a schema change',()=>{
 const state=make(),copy=make();complete(state);beginFinale(state,100);
 applyCoopSnapshot(copy,JSON.parse(JSON.stringify(serializeCoopState(state))));
 assert.deepEqual(copy.run.finale,state.run.finale);assert.equal(copy.run.originalTeamSize,3);
});
test('clock ignores old snapshots and catches up after long hidden intervals',()=>{
 let t=0;const clock=createFinaleClock({now:()=>t});
 clock.sync({id:'one',elapsed:1});t=4;assert.equal(clock.sample(),5);
 clock.sync({id:'one',elapsed:2});assert.equal(clock.sample(),5);
 clock.sync({id:'one',elapsed:13});assert.equal(clock.sample(),13);
 clock.sync({id:'two',elapsed:3});assert.equal(clock.sample(),3);
 clock.reset();assert.equal(clock.sample(),0);
});
