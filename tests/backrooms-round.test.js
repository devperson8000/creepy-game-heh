import {PITFALLS} from '../src/backrooms-pitfalls.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {BACKROOMS_SPEED,createBackroomsRound,roundTarget,interactRound,roundFloor,advanceRoundPhysics,canMoveRound} from '../src/backrooms-round.js';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
test('ladder fragments, repair, climb, key, door and vent must happen in order',()=>{
 const m=createLevelZero(),r=createBackroomsRound();assert.equal(r.parts.length,4);
 assert.equal(interactRound(r,'vent'),false);assert.equal(interactRound(r,'door'),false);assert.equal(interactRound(r,'key'),false);assert.equal(interactRound(r,'ladder'),false);
 for(const p of r.parts){assert.ok(canWalkLevelZero(m,p.x,p.z));assert.equal(roundTarget(r,p,0).id,p.id);assert.equal(interactRound(r,p.id),true);assert.equal(interactRound(r,p.id),false);}
 for(let i=0;i<4;i++)assert.equal(interactRound(r,'ladder'),true);assert.equal(r.repaired,true);assert.equal(interactRound(r,'ladder'),true);assert.equal(r.climbing,true);
 assert.equal(interactRound(r,'key'),false);const player={...r.ladder,y:0};for(let i=0;i<100;i++)advanceRoundPhysics(r,player,.025);assert.ok(player.y>.75);
 assert.equal(interactRound(r,'key'),true);assert.equal(interactRound(r,'vent'),false);assert.equal(interactRound(r,'door'),true);assert.equal(interactRound(r,'vent'),false);assert.equal(interactRound(r,'pit-exit-door'),true);assert.equal(interactRound(r,'vent'),true);assert.equal(r.phase,'won');
});
test('a missed beam falls into a recoverable lower route, while the beam supports walking',()=>{
 const r=createBackroomsRound();r.doorOpen=true;assert.equal(roundFloor(r,52,-16),0);assert.equal(roundFloor(r,52,-18),PITFALLS.floorY);
 const p={x:52,z:-18,y:0};for(let i=0;i<100;i++)advanceRoundPhysics(r,p,.025);assert.equal(p.y,PITFALLS.floorY);assert.equal(r.fell,true);assert.equal(r.phase,'playing');
 assert.equal(roundFloor(r,34,-28.5,PITFALLS.floorY),PITFALLS.floorY);assert.equal(roundFloor(r,29,-30,PITFALLS.floorY),-4.65);
 const m=createLevelZero();assert.equal(canMoveRound(r,43,-16,(x,z)=>canWalkLevelZero(m,x,z)),true);r.doorOpen=false;assert.equal(canMoveRound(r,43,-16,()=>true),false);
});
test('movement retains the requested faster player speeds',()=>{assert.ok(BACKROOMS_SPEED.walk>=5);assert.ok(BACKROOMS_SPEED.sprint>=9);});
test('a fallen player passes underneath transverse beams and cannot climb the staircase from its high side',()=>{
 const r=createBackroomsRound();r.doorOpen=true;const p={x:47,z:-18,y:PITFALLS.floorY};
 for(let x=47;x<=55;x+=.1){assert.equal(canMoveRound(r,x,p.z,()=>false,p),true);p.x=x;advanceRoundPhysics(r,p,.02);assert.equal(p.y,PITFALLS.floorY);}
 assert.equal(canMoveRound(r,29,-30,()=>false,p),false);
});
test('flashlight near the exit is a one-time pickup after unlocking the route',()=>{
 const r=createBackroomsRound();assert.equal(r.hasTorch,false);assert.equal(interactRound(r,'flashlight'),false);r.doorOpen=true;assert.equal(interactRound(r,'flashlight'),true);assert.equal(r.hasTorch,true);assert.equal(interactRound(r,'flashlight'),false);
});
