import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopState,serializeCoopState} from '../src/coop-state.js';
import {createCoopSimulation} from '../src/coop-simulation.js';
import {beginFinale} from '../src/finale-state.js';
test('a finale blocks incoming movement and ordinary simulation progress',()=>{
 let clock=100;
 const state=createCoopState(74,['host','guest']),world={canMove:()=>true,enemyNavigation:{},targets:new Map()};
 const sim=createCoopSimulation(state,world,{ambushChance:0,now:()=>clock});
 state.run.banked=new Set([1,2,3,4]);state.run.codeAccepted=true;assert.equal(beginFinale(state,clock),true);
 const before=state.run.elapsed,old={...state.players.get('host')};
 assert.equal(sim.setInput('host',{forward:1,right:1,yaw:0,pitch:0}),false);
 assert.equal(sim.interact('host',{targetId:'none'}).ok,false);
 clock+=10;sim.advance(.2);assert.equal(state.run.elapsed,before);assert.equal(state.players.get('host').x,old.x);
 assert.equal(state.run.finale.elapsed,10);assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));
 clock+=42;sim.advance(.2);assert.equal(state.run.phase,'won');
 assert.equal(state.players.get('guest').status,'escaped');
});
test('co-op snapshots contain a stable, host-created finale record',()=>{
 const state=createCoopState(55,['host','guest']);state.run.banked=new Set([1,2,3,4]);state.run.codeAccepted=true;beginFinale(state,50);
 const copy=JSON.parse(JSON.stringify(serializeCoopState(state)));
 assert.equal(copy.run.finale.duration,52);assert.equal(copy.run.originalTeamSize,2);
});
