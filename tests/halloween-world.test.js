import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';
import {createWorld} from '../src/world.js';
import {worldPoint} from '../src/level.js';
import {createEnemy} from '../src/enemy.js';
function headlessWorld(run){
 const previous=globalThis.document;
 const context={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};}};
 globalThis.document={createElement:()=>({getContext:()=>context})};
 try{return createWorld(run);}finally{
  if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
 }
}

for(const playerCount of [1,2,3,4])test(`${playerCount}-player Halloween furnished routes and quest targets remain reachable`,()=>{
 const run=createRun(42,{playerCount,halloween:true}),world=headlessWorld(run),start=createEnemy(run.layout).position;
 for(const room of run.layout.rooms)assert.ok(world.enemyNavigation.findPath(start,worldPoint(room)).length);
 for(const target of world.targets.values())if(target.type==='halloween'){
  assert.ok(Number.isFinite(target.position.x));assert.ok(Number.isFinite(target.position.z));
  const at=target.position;let accessible=false;
  for(let x=at.x-1.5;x<=at.x+1.5;x+=.25)for(let z=at.z-1.5;z<=at.z+1.5;z+=.25)if(world.canMove(x,z))accessible=true;
  assert.ok(accessible,`quest prop ${target.id} needs nearby standing space`);
 }
});
