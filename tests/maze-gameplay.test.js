import test from 'node:test';import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';import {worldPoint,pathBetween,groundHeight} from '../src/level.js';
for(const count of [1,2,3,4])test(`Halloween maze ${count} players: balanced connected narrow routes and three drawers per room cabinet`,()=>{
 for(const seed of [42,137,2026,8000]){
  const run=createRun(seed,{halloween:true,playerCount:count}),l=run.layout;
  assert.equal(l.size,count>=4?53:count>=3?49:45);assert.equal(l.halloweenMaze,true);assert.equal(l.corridorWidth,1.8);assert.equal(l.ceilingHeight,2.65);
  assert.equal(l.rooms.length,count>=4?23:count>=3?20:17);assert.equal(run.drawers.length,l.rooms.length*3);assert.equal(run.drawers.filter(d=>d.key).length,4);
  const lengths=l.rooms.map(room=>pathBetween(l,l.entrance,room).length);assert.ok(Math.max(...lengths)>75);assert.ok(lengths.every(n=>n>0));
  assert.equal(groundHeight(worldPoint(l.entrance),l),-7.2);assert.equal(groundHeight({x:-2.6,z:-29},l),3.6);
  assert.ok(l.closets.length>=12);for(const closet of l.closets)assert.equal(l.grid[closet.z][closet.x],0);
 }
});
test('legacy layout and drawer count remain unchanged before Halloween',()=>{const r=createRun(42);assert.equal(r.layout.size,17);assert.equal(r.drawers.length,36);assert.equal(groundHeight({x:-2.6,z:-29}),3.6);});
test('a guest can retain the previous Halloween map when joining an already running older host',()=>{const old=createRun(42,{halloween:true,maze:false});assert.equal(old.layout.size,17);assert.equal(old.drawers.length,36);assert.equal(old.halloween.maze,false);});
test('joining an existing single-drawer maze preserves that host’s drawer IDs',()=>{const old=createRun(42,{halloween:true,drawerRows:1});assert.equal(old.drawers.length,old.layout.rooms.length);assert.equal(old.halloween.drawerRows,1);});
