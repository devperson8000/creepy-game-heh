import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackroomsRound,roundTarget,canMoveRound,backroomsMoveSpeed} from '../src/backrooms-round.js';
import {createBackroomsCoopState,backroomsCoopTarget,interactBackroomsCoop,stepBackroomsPlayer} from '../src/backrooms-coop-state.js';

test('a standing player sees crouch instruction at a vent and cannot exit through host interaction',()=>{
 const s=createBackroomsCoopState([{id:'a'}]);Object.assign(s.round,{doorOpen:true,upperExitOpen:true});
 const p=s.players.a;Object.assign(p,{x:s.round.vent.x-.7,z:s.round.vent.z,y:0,yaw:-Math.PI/2,crouch:false});
 assert.equal(backroomsCoopTarget(s,'a').disabled,true);
 assert.equal(interactBackroomsCoop(s,'a','vent').ok,false);
 assert.equal(s.round.phase,'playing');p.crouch=true;
 assert.equal(backroomsCoopTarget(s,'a').disabled,false);
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
