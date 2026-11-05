import test from 'node:test';import assert from 'node:assert/strict';
import {createBackroomsRound,interactRound,roundTarget} from '../src/backrooms-round.js';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
import {createNavigator} from '../src/navigation.js';
test('ladder sections are scattered in distinct, reachable areas away from the ladder',()=>{
 const r=createBackroomsRound(),m=createLevelZero(),nav=createNavigator((x,z)=>canWalkLevelZero(m,x,z,.25),{...m.bounds,spacing:.5});
 for(const p of r.parts){assert.ok(Math.hypot(p.x-r.ladder.x,p.z-r.ladder.z)>18);assert.ok(nav.findPath(m.spawn,p).length>0);}
 for(let i=0;i<r.parts.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(r.parts[i].x-r.parts[j].x,r.parts[i].z-r.parts[j].z)>18);
});
test('assembly consumes only recovered sections and the ladder grows through four distinct stages',()=>{
 const r=createBackroomsRound();assert.equal(r.installed,0);assert.equal(interactRound(r,'ladder'),false);
 for(let i=0;i<4;i++){assert.equal(interactRound(r,r.parts[i].id),true);assert.equal(interactRound(r,'ladder'),true);assert.equal(r.installed,i+1);assert.equal(r.repaired,i===3);assert.equal(r.climbing,false);if(i<3)assert.equal(interactRound(r,'ladder'),false);}
 assert.equal(interactRound(r,'ladder'),true);assert.equal(r.climbing,true);
});
test('ladder interaction explains missing sections without offering a working repair action',()=>{
 const r=createBackroomsRound(),t=roundTarget(r,{...r.ladder,y:0},0);assert.equal(t.id,'ladder');assert.equal(t.disabled,true);
 interactRound(r,'part-1');assert.equal(roundTarget(r,r.ladder,0).disabled,false);
});
test('the Bacteria slot is empty and no old creature is simulated or added to the map',async()=>{
 const {createBackroomsEncounter}=await import('../src/backrooms-encounter.js');let additions=0;const e=createBackroomsEncounter({map:createLevelZero(),scene:{add(){additions++;}}});await e.ready;
 assert.equal(e.slot.modelUrl,null);assert.equal(e.actor,null);for(let i=0;i<200;i++)assert.equal(e.update(100,i,{x:25,z:-37},0).caught,false);assert.equal(e.simulation.state.active,false);assert.equal(additions,0);assert.equal(e.distract(),false);e.dispose();
});
test('pit columns block the lower player body while overhead beams remain traversable above',async()=>{
 const {canMoveRound}=await import('../src/backrooms-round.js'),r=createBackroomsRound();r.doorOpen=true;
 assert.equal(canMoveRound(r,52.4,-16,()=>true,{y:-6.4}),false);assert.equal(canMoveRound(r,52.4,-16,()=>true,{y:0}),true);assert.equal(canMoveRound(r,52,-18,()=>true,{y:-6.4}),true);
});
