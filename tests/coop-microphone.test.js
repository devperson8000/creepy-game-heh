import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopState} from '../src/coop-state.js';
import {createCoopSimulation} from '../src/coop-simulation.js';
import {createMovementPrediction} from '../src/coop-motion.js';

const command={forward:0,right:0,yaw:Math.PI,pitch:0,sprint:false,torch:true,paused:false};
function fixture({distance=24,hunting=true}={}){
 const state=createCoopState(42,[{id:'host',name:'Host'},{id:'guest',name:'Guest'}],{mapUpdate:true});
 state.run.layout.grid=state.run.layout.grid.map(row=>row.map(()=>1));state.run.boardsOpen=true;state.run.huntElapsed=hunting?190:0;
 const canMove=()=>true;canMove.gameplay='maze';canMove.groundHeight=()=>-7.2;
 const world={canMove,groundHeight:()=>-7.2,targets:new Map(),enemyNavigation:{canSee:()=>false,canMove:()=>true,findPath:(_,to)=>[{...to}]}};
 const simulation=createCoopSimulation(state,world,{ambushChance:0}),guest=state.players.get('guest');
 Object.assign(guest,{x:0,z:distance,height:-7.2});Object.assign(state.players.get('host'),{height:3.6});
 Object.assign(simulation.enemy,{position:{x:0,z:0},yaw:Math.PI,released:hunting,roamRemaining:5});
 return {state,world,simulation,guest};
}
const report=(simulation,sequence,level,extra={})=>simulation.setInput('guest',{...command,...extra,voiceLevel:level,voiceSequence:sequence});

test('sustained scream interrupts roaming beyond sprint hearing and pursues only the heard point',()=>{
 const {simulation,guest}=fixture();report(simulation,1,4);simulation.advance(.05);
 assert.equal(simulation.enemy.mode,'chase');assert.equal(simulation.enemy.sensedBy,'sound');
 assert.deepEqual(simulation.enemy.lastSeen,{x:0,z:24});assert.ok(simulation.enemy.position.z>0);
 report(simulation,2,0);guest.x=12;
 for(let i=0;i<45;i++)simulation.advance(.2);
 assert.notDeepEqual(simulation.enemy.lastSeen,{x:12,z:24});assert.notEqual(simulation.enemy.mode,'chase','silence permits the normal search/roam escape');
});
test('screaming while actually sprinting is heard farther than a stationary scream',()=>{
 const still=fixture({distance:37});report(still.simulation,1,4);still.simulation.advance(.05);assert.notEqual(still.simulation.enemy.mode,'chase');
 const running=fixture({distance:37});report(running.simulation,1,4,{forward:1,sprint:true,x:999,z:999});running.simulation.advance(.05);
 assert.equal(running.simulation.enemy.mode,'chase');assert.ok(Math.abs(running.simulation.enemy.lastSeen.x)<1e-8,'client cannot choose sound coordinates');
 assert.ok(running.simulation.enemy.lastSeen.z>37&&running.simulation.enemy.lastSeen.z<38);
});
test('muted, reordered, duplicated and stale reports cannot produce ghost screams',()=>{
 const {simulation,guest}=fixture();report(simulation,2,4);report(simulation,3,0);report(simulation,2,4);simulation.advance(.05);
 assert.equal(guest.voiceLevel,0);assert.notEqual(simulation.enemy.mode,'chase');
 report(simulation,4,4);simulation.advance(.05);assert.equal(guest.voiceLevel,4);
 for(let i=0;i<5;i++)simulation.advance(.2);
 assert.equal(guest.voiceLevel,0);
 report(simulation,4,4);simulation.advance(.05);assert.equal(guest.voiceLevel,0,'duplicate does not refresh an expired report');
 for(const [level,sequence] of [[9,5],[2.5,5],[NaN,5],[4,Infinity],[4,-1],[4,5.2]])assert.equal(report(simulation,sequence,level),false);
});
test('pre-six, downed and escaped microphones cannot attract the monster',()=>{
 for(const status of ['alive','downed','escaped']){
  const {simulation,guest}=fixture({hunting:status!=='alive'});guest.status=status;
  report(simulation,1,4);simulation.advance(.05);
  assert.notEqual(simulation.enemy.mode,'chase');assert.equal(guest.voiceLevel,0);
 }
});
test('a heard closet scream reveals only its entrance; muted or distant closets stay concealed',()=>{
 for(const [distance,level,known] of [[5,4,true],[24,4,false],[5,0,false]]){
  const {simulation,guest}=fixture({distance});
  Object.assign(guest,{hidden:true,closetId:'closet',closetExit:{x:0,z:distance,height:-7.2},x:1,hideWitnessed:false});
  report(simulation,1,level);simulation.advance(.05);
  assert.equal(!!guest.hideWitnessed,known);assert.equal(guest.status,'alive');
  if(known)assert.deepEqual(simulation.enemy.lastHeard,{x:0,z:5});
 }
});
test('voice travels on the top packet, never repeats from buffered movement history',()=>{
 const {simulation,guest,world}=fixture();
 const prediction=createMovementPrediction({...guest},world.canMove);
 prediction.step(command,.05);const packet=prediction.packet(command);
 assert.equal(simulation.setInput('guest',{...packet,voiceLevel:4,voiceSequence:1}),true);simulation.advance(.05);
 assert.equal(guest.voiceLevel,4);
 assert.equal(simulation.setInput('guest',{...packet,voiceLevel:0,voiceSequence:2}),true);simulation.advance(.05);
 assert.equal(guest.voiceLevel,0);assert.ok(guest.inputSequence>0);
 assert.equal(simulation.setInput('guest',packet),true,'legacy movement packets remain valid');
});
