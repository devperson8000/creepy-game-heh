import test from 'node:test';import assert from 'node:assert/strict';
import {createBackroomsRound,canMoveRound,advanceRoundPhysics} from '../src/backrooms-round.js';
import {PITFALLS,inPitGrid,onPitBeam} from '../src/backrooms-pitfalls.js';
import {stepPitBalance} from '../src/backrooms-balance.js';
test('neither solid outer rim permits a balance-free route across the room',()=>{
 const r=createBackroomsRound();r.doorOpen=true;
 for(const z of [-29.1,-2.9])assert.equal(canMoveRound(r,57.2,z,()=>false,{y:0}),false);
});
test('the remaining boundary walkway requires balance and slips into a real opening',()=>{
 const r=createBackroomsRound();r.doorOpen=true;
 for(const z of [-28.85,-3.15]){
  const p={x:57.2,z,y:0,yaw:0};assert.equal(canMoveRound(r,p.x,p.z,()=>false,p),true);assert.equal(inPitGrid(p.x,p.z),true);
  for(let i=0;i<600&&p.y>-.3;i++){stepPitBalance(p,{},.025,{canMove:(x,z)=>canMoveRound(r,x,z,()=>false,p)});advanceRoundPhysics(r,p,.025);}
  assert.ok(p.y<-.25);assert.equal(onPitBeam(p.x,p.z),false);
 }
});
