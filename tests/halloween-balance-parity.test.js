import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRun} from '../src/game-state.js';
import {createCoopState} from '../src/coop-state.js';
import {createEnemy,tickEnemy,SIGHT_RANGE,MAX_IDLE_SECONDS} from '../src/enemy.js';
import {MAZE_MOVEMENT,MAZE_MONSTER_SPEED} from '../src/player-movement.js';
import {HUNT_START_SECONDS} from '../src/hunt-clock.js';
const normal=JSON.parse(readFileSync(new URL('./fixtures/normal-game-balance.json',import.meta.url)));

for(const playerCount of [1,2,3,4])test(`Halloween ${playerCount}-player basement matches the public game's maps and objectives`,()=>{
 for(const expected of normal.cases.filter(c=>c.playerCount===playerCount)){
  const solo=createRun(expected.seed,{halloween:true,playerCount});
  const members=Array.from({length:playerCount},(_,slot)=>({id:'player-'+slot,slot}));
  const coop=createCoopState(expected.seed,members,{halloween:true});
  for(const r of [solo,coop.run]){
   const l=r.layout;assert.equal(l.size,expected.size);assert.equal(l.rooms.length,expected.rooms);assert.equal(r.drawers.length,l.rooms.length*3);
   const topology={grid:l.grid,rooms:l.rooms,entrance:l.entrance,closets:l.closets,stairs:l.stairs};
   assert.equal(createHash('sha256').update(JSON.stringify(topology)).digest('hex'),expected.topologyHash);
   assert.deepEqual(r.drawers.filter(d=>d.key).map(d=>d.id),expected.keys);assert.equal(r.code,expected.code);assert.equal(r.clueRoom,expected.clueRoom);
   assert.deepEqual(createEnemy(l).position,expected.spawn);assert.equal(l.halloweenMaze,true);assert.ok(r.halloween);assert.ok(r.halloween.rooms.every(index=>l.rooms[index]));
  }
 }
});
test('Halloween movement, stamina, patrol speeds and hunt timer match public balance',()=>{
 assert.deepEqual(MAZE_MOVEMENT,normal.movement);assert.deepEqual(MAZE_MONSTER_SPEED,normal.monsterSpeed);assert.equal(HUNT_START_SECONDS,normal.huntStartSeconds);assert.equal(SIGHT_RANGE,normal.sightRange);assert.equal(MAX_IDLE_SECONDS,normal.maxIdleSeconds);
});
test('Halloween detection, muffled hearing, pursuit movement and catches match the public AI',()=>{
 for(const expected of normal.enemyCases){
  const {spec}=expected,layout={halloweenMaze:true,grid:Array.from({length:25},()=>Array(25).fill(1)),rooms:[{x:8,z:8}],entrance:{x:8,z:8}};if(spec.wall)layout.grid[9][8]=0;
  const enemy=createEnemy(layout);enemy.yaw=0;const p={x:0,z:spec.distance,height:-7.2,hidden:!!spec.hidden};
  const {heardPlayerId,heardType,...result}=tickEnemy(enemy,layout,p,.05,true,spec.radius?[{...p,radius:spec.radius}]:[]);
  assert.equal(heardPlayerId??null,null);assert.equal(heardType??null,null);
  assert.deepEqual({result,mode:enemy.mode,position:enemy.position},{result:expected.result,mode:expected.mode,position:expected.position},spec.name);
 }
});
test('a straight Halloween chase holds a sprinting gap and closes on walking survivors',()=>{
 for(const speed of [MAZE_MOVEMENT.sprint,MAZE_MOVEMENT.walk]){
  const layout={halloweenMaze:true,grid:Array.from({length:25},()=>Array(25).fill(1)),rooms:[{x:8,z:8}],entrance:{x:8,z:8}};
  const enemy=createEnemy(layout);enemy.yaw=0;const p={x:0,z:5,height:-7.2,hidden:false};
  for(let i=0;i<60;i++){p.z+=speed/60;tickEnemy(enemy,layout,p,1/60);}
  const gap=p.z-enemy.position.z;
  if(speed===MAZE_MOVEMENT.sprint)assert.ok(Math.abs(gap-5)<.001);else assert.ok(gap<3.5&&gap>3.3);
 }
});
