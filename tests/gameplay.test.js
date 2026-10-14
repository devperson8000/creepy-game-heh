import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,searchDrawer,takeKey,bankKeys,enterCode,readClue,catchPlayer,retryRun,openExit} from '../src/game-state.js';
import {pathBetween,worldPoint,lineOfSight} from '../src/level.js';
test('every generated search room is reachable from the return stairs',()=>{
 for(let seed=1;seed<=12;seed++){
  const run=createRun(seed);
  for(const room of run.layout.rooms) assert.ok(pathBetween(run.layout,run.layout.entrance,room).length>0);
  assert.equal(run.drawers.filter(d=>d.key).length,4);
  assert.equal(new Set(run.drawers.filter(d=>d.key).map(d=>d.id)).size,4);
 }
});
test('drawer must be opened to retrieve a key; banking and code are separate locks',()=>{
 const r=createRun(42),drawer=r.drawers.find(d=>d.key);
 assert.equal(takeKey(r,drawer.id),false);
 searchDrawer(r,drawer.id);assert.equal(takeKey(r,drawer.id),true);assert.equal(takeKey(r,drawer.id),false);
 assert.equal(openExit(r),false);
 enterCode(r,r.code);assert.equal(r.codeAccepted,true);assert.equal(openExit(r),false);
 bankKeys(r);assert.equal(r.banked.size,1);assert.equal(r.carried.size,0);
 for(const d of r.drawers.filter(d=>d.key&&!d.taken)){searchDrawer(r,d.id);takeKey(r,d.id);}bankKeys(r);
 assert.equal(openExit(r),true);
});
test('death preserves banked progress and returns unbanked keys to their drawers',()=>{
 const r=createRun(10),keys=r.drawers.filter(d=>d.key);
 searchDrawer(r,keys[0].id);takeKey(r,keys[0].id);bankKeys(r);
 searchDrawer(r,keys[1].id);takeKey(r,keys[1].id);catchPlayer(r);retryRun(r);
 assert.equal(r.banked.size,1);assert.equal(r.carried.size,0);assert.equal(keys[0].taken,true);assert.equal(keys[1].taken,false);assert.equal(r.phase,'playing');
});
test('run-specific code preserves four digits and rejects wrong or malformed input',()=>{
 const codes=new Set();
 for(let seed=0;seed<30;seed++){
  const r=createRun(seed);codes.add(r.code);assert.match(r.code,/^\d{4}$/);
  assert.equal(enterCode(r,'123'),false);assert.equal(enterCode(r,r.code==='0000'?'0001':'0000'),false);
  assert.equal(r.clueRead,false);readClue(r);assert.equal(r.clueRead,true);assert.equal(enterCode(r,r.code),true);
 }
 assert.ok(codes.size>20);
});
test('maze walls block vision and routes never cross solid cells',()=>{
 const r=createRun(42),route=pathBetween(r.layout,r.layout.entrance,r.layout.rooms.at(-1));
 for(const cell of route)assert.equal(r.layout.grid[cell.z][cell.x],1);
 const wall={x:0,z:0},point=worldPoint(wall);assert.equal(lineOfSight(r.layout,point,worldPoint(r.layout.entrance)),false);
});
