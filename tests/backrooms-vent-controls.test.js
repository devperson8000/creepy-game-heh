import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackroomsRound,roundTarget,canMoveRound,backroomsMoveSpeed} from '../src/backrooms-round.js';
import {createBackroomsCoopState,backroomsCoopTarget,interactBackroomsCoop,stepBackroomsPlayer} from '../src/backrooms-coop-state.js';

test('the vent is opened by its release button first; only then can anyone crawl in, standing or not',()=>{
 const s=createBackroomsCoopState([{id:'a'}]);Object.assign(s.round,{doorOpen:true,upperExitOpen:true});
 const p=s.players.a;Object.assign(p,{x:s.round.ventButton.x,z:s.round.ventButton.z+.7,y:0,yaw:0,crouch:false});
 assert.equal(backroomsCoopTarget(s,'a').id,'vent-button');assert.equal(interactBackroomsCoop(s,'a','vent').ok,false,'the vent cannot be entered while shut');
 assert.equal(interactBackroomsCoop(s,'a','vent-button').ok,true);assert.equal(s.round.ventOpen,true);assert.equal(s.round.phase,'playing');
 Object.assign(p,{x:s.round.vent.x-.7,z:s.round.vent.z,yaw:-Math.PI/2,crouch:false});
 assert.equal(backroomsCoopTarget(s,'a').id,'vent');assert.equal(backroomsCoopTarget(s,'a').disabled,false);
 assert.equal(interactBackroomsCoop(s,'a','vent').ok,true);
});
test('the white-lit exit passage is traversable only after its door opens',()=>{
 const r=createBackroomsRound();r.doorOpen=true;
 assert.equal(canMoveRound(r,75,-16,()=>false,{y:0}),false);
 r.upperExitOpen=true;assert.equal(canMoveRound(r,75,-16,()=>false,{y:0}),true);
 assert.equal(canMoveRound(r,78.5,-16,()=>false,{y:0}),true);
 assert.equal(canMoveRound(r,75,-18,()=>false,{y:0}),false);
});
test('crouching is authoritative and moves slower than standing',()=>{
 const s=createBackroomsCoopState([{id:'a'}]);const p=s.players.a;
 stepBackroomsPlayer(s,p,{forward:0,right:0,yaw:0,crouch:true},.02);
 assert.equal(p.crouch,true);
 assert.ok(backroomsMoveSpeed(s.round,p,true)<backroomsMoveSpeed(s.round,{...p,crouch:false},false));
});
