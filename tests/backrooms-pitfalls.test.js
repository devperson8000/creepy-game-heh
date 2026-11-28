import test from 'node:test';import assert from 'node:assert/strict';
import {PITFALLS,gridX,gridZ,pitFloor,canWalkPit,pitMoveSpeed} from '../src/backrooms-pitfalls.js';
import {createBackroomsRound,advanceRoundPhysics,roundTarget,interactRound} from '../src/backrooms-round.js';
test('the pit has 56 deep square shafts and matching narrow grid walkways',()=>{
 const g=PITFALLS.grid;assert.equal(g.columns*g.rows,56);assert.equal(g.beam,.6);for(let i=0;i<g.columns;i++)for(let j=0;j<g.rows;j++){assert.equal(pitFloor(g.minX+(i+.5)*g.cell,g.minZ+(j+.5)*g.cell),PITFALLS.floorY);assert.equal(pitFloor(gridX()[i],gridZ()[j]+g.cell/2),0);}
});
test('a fall has real vertical travel, survives into the lower layer, and cannot walk through shaft lining',()=>{
 const r=createBackroomsRound();r.doorOpen=true;const p={x:47.6,z:-27.2,y:0};advanceRoundPhysics(r,p,.1);assert.ok(p.y<0&&p.y>PITFALLS.floorY);
 for(let i=0;i<150;i++)advanceRoundPhysics(r,p,.025);assert.equal(p.y,PITFALLS.floorY);assert.equal(r.phase,'playing');assert.equal(r.fell,true);
 assert.equal(canWalkPit(49.2,-27.2,-1),false);assert.equal(canWalkPit(49.2,-27.2,PITFALLS.floorY),true);
});
test('the lower route climbs a stairwell to the east landing; the old alternate vent is no longer an exit',()=>{
 const r=createBackroomsRound();r.doorOpen=true;assert.equal(canWalkPit(41,-25,PITFALLS.floorY),true);assert.equal(pitFloor(29,-30,-6.4),-4.65);
 assert.ok(pitMoveSpeed(47.6,-27.2,0,false)<pitMoveSpeed(40,-16,0,false));
 const target=roundTarget(r,{x:PITFALLS.altVent.x,z:PITFALLS.altVent.z,y:-4.4,crouch:true},0);assert.notEqual(target?.id,'alt-vent');assert.equal(interactRound(r,'alt-vent'),false);assert.equal(r.phase,'playing');
 assert.equal(pitFloor(70.2,-28,-6.4),-6.4);assert.ok(Math.abs(pitFloor(70.2,-16.8,-3)-0)<1e-9);assert.ok(pitFloor(70.2,-22,-6.4)>-6.4&&pitFloor(70.2,-22,-6.4)<0);
});
test('every shaft lands clear of lower walls and has a walkable route to the foot of the stairwell and to the flashlight',async()=>{
 const {fallSites,lowerRoute,flashlightDistance,STAIR_FOOT}=await import('../src/backrooms-lower-route.js');
 const sites=fallSites();assert.ok(sites.length>=50);
 for(const p of sites){assert.equal(canWalkPit(p.x,p.z,PITFALLS.floorY),true);const route=lowerRoute(p);assert.ok(route,'no route from '+JSON.stringify(p));assert.ok(route.distance<60,'route too long '+route.distance);assert.ok(flashlightDistance(p)<45);}
 assert.ok(lowerRoute(PITFALLS.flashlight));assert.equal(canWalkPit(STAIR_FOOT.x,STAIR_FOOT.z,PITFALLS.floorY),true);
});
test('the far door and white-lit passage remain interactable while facing them at the threshold',()=>{
 const r=createBackroomsRound();r.doorOpen=true;const p={x:73.65,z:-16,y:0};assert.equal(roundTarget(r,p,-Math.PI/2)?.id,'pit-exit-door');interactRound(r,'pit-exit-door');assert.notEqual(roundTarget(r,p,-Math.PI/2)?.id,'vent');Object.assign(p,{x:PITFALLS.ventButton.x,z:PITFALLS.ventButton.z+.7,crouch:false});assert.equal(roundTarget(r,p,0)?.id,'vent-button');interactRound(r,'vent-button');Object.assign(p,{x:PITFALLS.upperVent.x-.5,z:-16});assert.equal(roundTarget(r,p,-Math.PI/2)?.id,'vent');
});
