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
test('lower route has a separate exit, requires navigation, and includes a stair ascent',()=>{
 const r=createBackroomsRound();r.doorOpen=true;assert.equal(r.altVent.id,'alt-vent');assert.equal(canWalkPit(41,-25,PITFALLS.floorY),true);assert.equal(pitFloor(29,-30,-6.4),-4.65);
 assert.ok(pitMoveSpeed(47.6,-27.2,0,false)<pitMoveSpeed(40,-16,0,false));
 assert.equal(roundTarget(r,{x:29,z:-30,y:0},0)?.id==='alt-vent',false);
 const target=roundTarget(r,{x:PITFALLS.altVent.x,z:PITFALLS.altVent.z,y:-4.4,crouch:true},0);assert.equal(target?.id,'alt-vent');assert.equal(interactRound(r,'alt-vent'),true);assert.equal(r.phase,'won');
});
test('every shaft lands clear of lower walls and has a route to the lower exit door',async()=>{
 const {createNavigator}=await import('../src/navigation.js');const nav=createNavigator((x,z)=>canWalkPit(x,z,PITFALLS.floorY),{minX:27.2,maxX:73.8,minZ:-31.8,maxZ:-2.6,spacing:.4}),g=PITFALLS.grid;
 for(let i=0;i<g.columns;i++)for(let j=0;j<g.rows;j++){const p={x:g.minX+(i+.5)*g.cell,z:g.minZ+(j+.5)*g.cell};assert.equal(canWalkPit(p.x,p.z,PITFALLS.floorY),true);assert.ok(nav.findPath(p,{x:43,z:-25}).length>0);}
});
test('the alternate vent cannot be used from the bottom floor beside the staircase',()=>{
 const r=createBackroomsRound();r.doorOpen=true;assert.notEqual(roundTarget(r,{x:29,z:-28.5,y:PITFALLS.floorY},0)?.id,'alt-vent');
});
test('the far door and white-lit passage remain interactable while facing them at the threshold',()=>{
 const r=createBackroomsRound();r.doorOpen=true;const p={x:73.65,z:-16,y:0};assert.equal(roundTarget(r,p,-Math.PI/2)?.id,'pit-exit-door');interactRound(r,'pit-exit-door');assert.notEqual(roundTarget(r,p,-Math.PI/2)?.id,'vent');p.x=PITFALLS.upperVent.x-.5;p.crouch=true;assert.equal(roundTarget(r,p,-Math.PI/2)?.id,'vent');
});
