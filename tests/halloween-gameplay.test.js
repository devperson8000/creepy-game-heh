import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,catchPlayer,retryRun} from '../src/game-state.js';
import {pathBetween} from '../src/level.js';
const load=()=>import('../src/halloween-state.js');
test('Halloween layouts are deterministic, remixed and connected at every team size',()=>{
 for(const playerCount of [1,2,3,4])for(const seed of [42,137,2026]){
  const r=createRun(seed,{playerCount,halloween:true}),normal=createRun(seed,{playerCount});
  assert.equal(r.halloween?.stage,0);assert.notDeepEqual(r.layout.grid,normal.layout.grid);
  assert.deepEqual(r.layout,createRun(seed,{playerCount,halloween:true}).layout);
  for(const room of r.layout.rooms)assert.ok(pathBetween(r.layout,r.layout.entrance,room).length);
  assert.equal(r.drawers.filter(d=>d.key).length,4);
 }
});
test('the key requires the invitation and all three sequential seals; repeats never skip a step',async()=>{
 const {interactHalloween}=await load(),r=createRun(42,{halloween:true});
 assert.equal(interactHalloween(r,'halloween:chest').ok,false);
 assert.equal(interactHalloween(r,'halloween:seal-1').ok,false);
 for(const id of ['invitation','seal-0','seal-1','seal-2','chest']){
  assert.equal(interactHalloween(r,'halloween:'+id,{now:10}).ok,true);
  const stage=r.halloween.stage;interactHalloween(r,'halloween:'+id,{now:10});assert.equal(r.halloween.stage,stage);
 }
 assert.equal(r.halloween.key,true);assert.equal(r.banked.size,0);assert.equal(r.codeAccepted,false);
 catchPlayer(r);retryRun(r);assert.equal(r.halloween.key,true);assert.equal(r.halloween.stage,5);
});
test('B2 requires its key, everyone upstairs and no downed teammates, then restores B1 poses',async()=>{
 const {interactHalloween,advanceHalloween,B2_DURATION}=await load(),r=createRun(42,{halloween:true});
 const players=[{id:'a',slot:0,status:'alive',x:-2.6,z:-31,height:3.6,yaw:0,pitch:0},{id:'b',slot:1,status:'alive',x:10,z:10,height:0,yaw:1,pitch:0}];
 assert.equal(interactHalloween(r,'halloween:b2-panel',{players,now:10}).ok,false);
 r.halloween.key=true;r.halloween.stage=5;
 assert.equal(interactHalloween(r,'halloween:b2-panel',{players,now:10}).ok,false);
 Object.assign(players[1],{x:-2,z:-30,height:3.6,status:'downed'});
 assert.equal(interactHalloween(r,'halloween:b2-panel',{players,now:10}).ok,false);
 players[1].status='alive';const poses=players.map(p=>({...p}));
 assert.equal(interactHalloween(r,'halloween:b2-panel',{players,now:10}).ok,true);assert.equal(r.phase,'halloween');
 advanceHalloween(r,players,13);assert.equal(r.halloween.visit.stage,'descent');advanceHalloween(r,players,19);assert.equal(r.halloween.visit.stage,'archive');
 assert.ok(players.every(p=>p.z<4&&p.height===0));
 Object.assign(players[0],{x:0,z:-1.2});advanceHalloween(r,players,20);
 assert.equal(r.halloween.visit.stage,'conversation');
 advanceHalloween(r,players,20+B2_DURATION.conversation);assert.equal(r.halloween.seen,true);assert.equal(r.halloween.visit.stage,'archive');
 assert.equal(interactHalloween(r,'halloween:return',{players,now:21+B2_DURATION.conversation}).ok,true);advanceHalloween(r,players,26+B2_DURATION.conversation);
 assert.equal(r.phase,'playing');assert.equal(r.halloween.visit,null);
 for(let i=0;i<players.length;i++)for(const key of ['x','z','height','yaw','pitch'])assert.equal(players[i][key],poses[i][key]);
});

test('shared B2 freezes the hunt, accepts archive movement and rejects remote quest interactions',async()=>{
 const {createCoopState}=await import('../src/coop-state.js'),{createCoopSimulation}=await import('../src/coop-simulation.js');
 const {canMoveB2}=await load();const s=createCoopState(42,['a','b'],{halloween:true});let now=100;
 const targets=new Map([['halloween:b2-panel',{id:'halloween:b2-panel',type:'halloween',position:{x:-4.95,z:-31.65,height:3.6}}],['halloween:invitation',{id:'halloween:invitation',type:'halloween',position:{x:10,z:10,height:0}}]]);
 const move=(x,z)=>s.run.phase==='halloween'?canMoveB2(x,z):true;move.groundHeight=()=>s.run.phase==='halloween'?0:3.6;
 const sim=createCoopSimulation(s,{targets,canMove:move},{now:()=>now});
 assert.equal(sim.interact('a',{targetId:'halloween:invitation'}).ok,false);
 s.run.halloween.key=true;s.run.halloween.stage=5;
 for(const p of s.players.values())Object.assign(p,{x:-3.5,z:-31,height:3.6});
 assert.equal(sim.interact('a',{targetId:'halloween:b2-panel'}).ok,true);const hunt=s.run.huntElapsed;
 now+=3;sim.advance(.1);assert.equal(s.run.halloween.visit.stage,'descent');now+=6;sim.advance(.1);assert.equal(s.run.halloween.visit.stage,'archive');assert.equal(s.run.huntElapsed,hunt);
 const p=s.players.get('a'),z=p.z;sim.setInput('a',{forward:1,right:0,yaw:0,pitch:0,paused:false});sim.advance(.1);assert.ok(p.z<z);assert.equal(p.height,0);
 assert.equal(sim.interact('a',{targetId:'halloween:return'}).ok,true);now+=5;sim.advance(.1);assert.equal(s.run.phase,'playing');assert.equal(p.height,3.6);assert.equal(s.run.huntElapsed,hunt);
});
