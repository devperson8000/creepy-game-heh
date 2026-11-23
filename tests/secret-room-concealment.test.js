import test from 'node:test';
import assert from 'node:assert/strict';
import {createMazeLayout} from '../src/maze-layout.js';
import {CELL,worldPoint} from '../src/level.js';
import {SECRET_ENTRY,SECRET_ENTRY_SEAL,SECRET_ROOM_BOUNDS,SECRET_ROOM_LAYOUT,secretRoomProtectedCells} from '../src/secret-entry.js';

const seeds=Array.from({length:400},(_,i)=>i*7919+1);

test('the hidden Backrooms room is walled in on every side for any maze seed',()=>{
  for(const playerCount of [1,3,4])for(const seed of seeds){
    const layout=createMazeLayout(seed,{playerCount});
    for(const cell of secretRoomProtectedCells()){
      assert.equal(layout.grid[cell.z][cell.x],0,`seed ${seed}/${playerCount}: cell ${cell.x},${cell.z} next to the room is open`);
      assert.ok(!layout.closets.some(c=>c.x===cell.x&&c.z===cell.z),`seed ${seed}/${playerCount}: closet against the room at ${cell.x},${cell.z}`);
      assert.ok(!layout.rooms.some(c=>c.x===cell.x&&c.z===cell.z),`seed ${seed}/${playerCount}: cabinet niche against the room at ${cell.x},${cell.z}`);
    }
  }
});

test('keeping the room sealed never strands part of the maze',()=>{
  const inside=(c,l)=>c.x>=SECRET_ROOM_LAYOUT.interiorMinCellX&&c.x<=SECRET_ROOM_LAYOUT.interiorMaxCellX&&c.z>=SECRET_ROOM_LAYOUT.minCellZ&&c.z<=SECRET_ROOM_LAYOUT.maxCellZ;
  for(const playerCount of [1,4])for(const seed of seeds.slice(0,120)){
    const layout=createMazeLayout(seed,{playerCount}),seen=new Set(),queue=[layout.entrance];seen.add('7,7');
    while(queue.length){const p=queue.pop();for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const q={x:p.x+dx,z:p.z+dz};if(layout.grid[q.z]?.[q.x]!==1||inside(q)||seen.has(`${q.x},${q.z}`))continue;seen.add(`${q.x},${q.z}`);queue.push(q);}}
    for(let z=0;z<layout.size;z++)for(let x=0;x<layout.size;x++)if(layout.grid[z][x]===1&&!inside({x,z}))assert.ok(seen.has(`${x},${z}`),`seed ${seed}/${playerCount}: open cell ${x},${z} unreachable`);
  }
});

test('the concealing seal closes the whole opening, with no slit at either end',()=>{
  const layout=createMazeLayout(42),southBlockFace=worldPoint({x:6,z:SECRET_ROOM_LAYOUT.maxCellZ+1}).z-(CELL/2+.4);
  assert.ok(SECRET_ENTRY_SEAL.maxZ>=southBlockFace+.05,'seal must bury itself in the south wall block');
  assert.ok(SECRET_ENTRY_SEAL.minZ<=SECRET_ROOM_BOUNDS.minZ-.2,'seal must run past the room into the stair wall');
  assert.ok(SECRET_ENTRY_SEAL.thickness>=.1,'the seal is a solid block, not a plane');
  assert.ok(SECRET_ENTRY_SEAL.faceX>SECRET_ENTRY.wallX,'seal faces the stair corridor');
  assert.ok(SECRET_ENTRY_SEAL.maxY>=layout.floorHeight+layout.ceilingHeight,'seal reaches the maze ceiling');
  assert.ok(SECRET_ENTRY_SEAL.minY<=layout.floorHeight);
});
