import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';
import {pathBetween} from '../src/level.js';
import {createEnemy,tickEnemy} from '../src/enemy.js';
import {MAZE_MOVEMENT} from '../src/player-movement.js';

test('shorter solo and co-op rounds retain reachable spread-out keys and a nearer code across seeds',()=>{
 for(const playerCount of [1,2,3,4])for(let seed=1;seed<=50;seed++){
  const run=createRun(seed,{playerCount,mapUpdate:true}),{layout,drawers}=run;
  assert.equal(layout.rooms.length,playerCount>=4?23:playerCount>=3?20:17);
  const keys=drawers.filter(d=>d.key);
  assert.equal(keys.length,4);
  assert.equal(new Set(keys.map(d=>Math.floor(d.id/3))).size,4);
  assert.ok(run.clueRoom<Math.ceil(layout.rooms.length*.55));
  for(const room of layout.rooms)assert.ok(pathBetween(layout,layout.entrance,room).length>0);
 }
});
test('a straight chase holds a sprinting survivor gap but closes on a walking survivor',()=>{
 const layout={narrowMaze:true,grid:Array.from({length:25},()=>Array(25).fill(1)),rooms:[{x:8,z:8}],entrance:{x:8,z:8}};
 for(const speed of [MAZE_MOVEMENT.sprint,MAZE_MOVEMENT.walk]){
  const enemy=createEnemy(layout);enemy.yaw=0;
  const player={x:0,z:5,height:-7.2,hidden:false};
  for(let i=0;i<60;i++){player.z+=speed/60;tickEnemy(enemy,layout,player,1/60);}
  const gap=player.z-enemy.position.z;
  if(speed===MAZE_MOVEMENT.sprint)assert.ok(Math.abs(gap-5)<.001);
  else assert.ok(gap<3.5&&gap>3.3);
 }
});
