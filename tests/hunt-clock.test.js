import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,retryRun} from '../src/game-state.js';
import {createCoopState,applyCoopSnapshot} from '../src/coop-state.js';
import {createCoopSimulation} from '../src/coop-simulation.js';
import {createEnemy} from '../src/enemy.js';
import {worldPoint,pathBetween,gridPoint} from '../src/level.js';

const world={canMove:()=>true,enemyNavigation:{canMove:()=>true,findPath:(_,to)=>[{...to}]},targets:new Map()};
test('a fresh run starts the hunt clock at 3 AM',()=>{
 assert.equal(createRun(42).huntElapsed,0);
});
test('opening the boards cannot release or reveal Monochrome before 6:00',()=>{
 const state=createCoopState(42,['host','guest']);state.run.boardsOpen=true;
 const simulation=createCoopSimulation(state,world),start={...simulation.enemy.position};
 const player=state.players.get('guest');Object.assign(player,{...start,height:0});
 simulation.advance(.2);
 assert.deepEqual(simulation.enemy.position,start);assert.equal(player.status,'alive');
 assert.equal(simulation.enemySnapshot().active,false);
 assert.ok(Math.abs(state.run.huntElapsed-.2)<1e-9);
});
test('the host releases the monster exactly at ninety seconds even with the boards closed',()=>{
 const state=createCoopState(42,['host','guest']),simulation=createCoopSimulation(state,world);
 state.run.huntElapsed=89.9;simulation.advance(.05);
 assert.equal(simulation.enemySnapshot().active,false);
 const start={...simulation.enemy.position};simulation.advance(.1);
 assert.equal(simulation.enemySnapshot().active,true);
 assert.ok(Math.hypot(start.x-simulation.enemy.position.x,start.z-simulation.enemy.position.z)>0);
 assert.equal(simulation.enemy.mode,'investigate');
 // Crossing six releases it once; later ticks must not teleport it back to its spawn.
 simulation.enemy.position={x:0,z:0};simulation.advance(.1);
 assert.ok(Math.hypot(simulation.enemy.position.x,simulation.enemy.position.z)<1);
});
test('co-op arrival can suspend the clock without suspending the network simulation',()=>{
 const state=createCoopState(42,['host','guest']),simulation=createCoopSimulation(state,world);
 simulation.advance(.2,{clockRunning:false});
 assert.equal(state.run.huntElapsed,0);assert.ok(state.run.elapsed>0);
 simulation.advance(.2);assert.ok(state.run.huntElapsed>0);
});
test('co-op snapshots replicate the authoritative hunt clock without a guest timer',()=>{
 const host=createCoopState(42,['host','guest']),guest=createCoopState(42,['host','guest']);
 const simulation=createCoopSimulation(host,world);host.run.huntElapsed=89.9;simulation.advance(.2);
 applyCoopSnapshot(guest,simulation.snapshot().state);
 assert.equal(guest.run.huntElapsed,host.run.huntElapsed);
 assert.ok(guest.run.huntElapsed>=90);
 const frozen=host.run.huntElapsed;host.run.phase='dead';simulation.advance(.2);
 assert.equal(host.run.huntElapsed,frozen);
});
test('retrying the same run keeps the elapsed clock alongside banked progress',()=>{
 const run=createRun(42);run.huntElapsed=190;run.phase='dead';retryRun(run);
 assert.equal(run.huntElapsed,190);
});
test('Monochrome starts in a reachable room on the opposite side for every basement size',()=>{
 for(const count of [1,2,3,4])for(const seed of [1,42,83]){
  const layout=createRun(seed,{playerCount:count}).layout,enemy=createEnemy(layout),cell=gridPoint(enemy.position);
  const farZ=Math.max(...layout.rooms.map(room=>room.z));
  assert.equal(cell.z,farZ);assert.ok(cell.z>layout.entrance.z);
  assert.ok(pathBetween(layout,layout.entrance,cell).length);
  assert.deepEqual(enemy.position,worldPoint(layout.rooms.find(room=>room.x===cell.x&&room.z===cell.z)));
 }
});

test('digital minutes advance every half second and the clock disappears at six',async()=>{
 const clock=await import('../src/hunt-clock.js');
 for(const [seconds,text] of [[0,'3:00'],[.49,'3:00'],[.5,'3:01'],[29.99,'3:59'],[30,'4:00'],[89.5,'5:59']]){
  assert.deepEqual(clock.huntClockView?.({phase:'playing',huntElapsed:seconds}),{text,visible:true,warning:false});
 }
 assert.deepEqual(clock.huntClockView?.({phase:'playing',huntElapsed:90}),{text:'6:00',visible:false,warning:true});
 assert.deepEqual(clock.huntClockView?.({phase:'playing',huntElapsed:93}),{text:'6:00',visible:false,warning:false});
 assert.equal(clock.huntClockView?.({phase:'finale',huntElapsed:91})?.warning,false);
});
test('only active playing time advances the clock',async()=>{
 const clock=await import('../src/hunt-clock.js'),run=createRun(42);
 for(const delta of [NaN,Infinity,-1,0])clock.advanceHuntClock(run,delta);
 assert.equal(run.huntElapsed,0);
 clock.advanceHuntClock(run,.5);assert.equal(run.huntElapsed,.5);
 for(const phase of ['dead','won','finale']){run.phase=phase;clock.advanceHuntClock(run,5);assert.equal(run.huntElapsed,.5);}
});

test('slow rendering cannot slow the clock even though physics steps stay bounded',()=>{
 const state=createCoopState(42,['host','guest']),simulation=createCoopSimulation(state,world);
 simulation.advance(.05,{clockDelta:30});
 assert.equal(state.run.huntElapsed,30);
 assert.ok(state.run.elapsed<.1,'physics did not jump thirty seconds');
});

test('a calibrated guest displays host time rather than a delayed snapshot time',async()=>{
 const clock=await import('../src/hunt-clock.js');
 assert.equal(clock.sampleHuntElapsed?.({phase:'playing',huntElapsed:89},{hostAt:100,hostNow:101,running:true}),90);
 assert.equal(clock.sampleHuntElapsed?.({phase:'playing',huntElapsed:0},{hostAt:100,hostNow:101,running:false}),0);
 assert.equal(clock.sampleHuntElapsed?.({phase:'finale',huntElapsed:89},{hostAt:100,hostNow:105,running:true}),89);
 assert.equal(clock.sampleHuntElapsed?.({phase:'playing',huntElapsed:89},{hostAt:100,hostNow:99,running:true}),89);
});

test('a slow render cannot move the snapshot clock anchor away from its simulation tick',()=>{
 let now=100;
 const state=createCoopState(42,['host','guest']),simulation=createCoopSimulation(state,world,{now:()=>now});
 simulation.advance(.1);now=102;
 const snapshot=simulation.snapshot();
 assert.equal(snapshot.huntClock?.hostAt,100);
 assert.equal(snapshot.huntClock?.running,true);
});
