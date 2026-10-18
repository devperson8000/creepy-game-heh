import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';
import {createLayout,pathBetween,worldPoint} from '../src/level.js';

test('co-op layouts grow with the team while keeping stairs and world origin fixed',()=>{
 for(const [playerCount,size,rooms] of [[1,17,6],[2,17,6],[3,21,8],[4,25,10]])for(const seed of [1,42,83]){
  const layout=createLayout(seed,{playerCount}),run=createRun(seed,{playerCount});
  assert.equal(layout.size,size);assert.equal(layout.grid.length,size);assert.equal(layout.rooms.length,rooms);
  assert.deepEqual(layout.entrance,{x:7,z:1});assert.deepEqual(worldPoint(layout.entrance),{x:-2.6,z:-18.2});
  for(const room of layout.rooms)assert.ok(pathBetween(layout,layout.entrance,room).length);
  assert.equal(run.drawers.length,rooms*6);assert.equal(run.drawers.filter(d=>d.key).length,4);
  assert.deepEqual(createRun(seed,{playerCount}),run);
 }
});
