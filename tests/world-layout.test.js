import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';
import {CELL,worldPoint} from '../src/level.js';
import {createEnemy} from '../src/enemy.js';
import {createWorld} from '../src/world.js';

// Rendering is not needed to inspect real scene geometry and navigation. Only
// the decorative canvas drawing methods require a browser substitute.
function headlessWorld(run){
 const previous=globalThis.document;
 const context={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};}};
 globalThis.document={createElement:()=>({getContext:()=>context})};
 try{return createWorld(run);}finally{
  if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
 }
}

for(const playerCount of [1,3,4])test(`${playerCount}-player basement geometry covers every cell and enemy navigation reaches every storage room`,()=>{
 const run=createRun(42,{playerCount}),world=headlessWorld(run),size=run.layout.size??17;
 const floor=world.scene.children.find(mesh=>mesh.isMesh&&mesh.scale.y===.12&&mesh.position.y===-.06);
 const roof=world.scene.children.find(mesh=>mesh.isMesh&&mesh.scale.y===.1&&mesh.position.y===4.45);
 assert.ok(floor&&roof);
 const first=worldPoint({x:0,z:0}),last=worldPoint({x:size-1,z:size-1});
 for(const surface of [floor,roof]){
  assert.ok(Math.abs(surface.position.x-surface.scale.x/2-(first.x-CELL/2))<1e-8);
  assert.ok(Math.abs(surface.position.z-surface.scale.z/2-(first.z-CELL/2))<1e-8);
  assert.ok(Math.abs(surface.position.x+surface.scale.x/2-(last.x+CELL/2))<1e-8);
  assert.ok(Math.abs(surface.position.z+surface.scale.z/2-(last.z+CELL/2))<1e-8);
 }
 const wallMesh=world.scene.children.find(mesh=>mesh.isInstancedMesh);
 assert.equal(wallMesh.count,run.layout.grid.flat().filter(cell=>!cell).length);
 const start=createEnemy(run.layout).position;
 for(const room of run.layout.rooms){
  const goal=worldPoint(room),route=world.enemyNavigation.findPath(start,goal);
  assert.ok(route.length,`no enemy route to room ${room.x},${room.z}`);
  assert.ok(Math.hypot(route.at(-1).x-goal.x,route.at(-1).z-goal.z)<.1);
  assert.ok(world.targets.has(`closet-${run.layout.rooms.indexOf(room)}`));
 }
 // The lobby entrance remains fixed even as the basement grows southeast.
 assert.ok(world.canMove(-2.6,-29));
});

test('larger basements retain all physical fixtures with a fixed number of rendered lights',()=>{
 const small=headlessWorld(createRun(42)),large=headlessWorld(createRun(42,{playerCount:4}));
 const tubes=world=>world.scene.children.filter(mesh=>mesh.userData.ceilingLight);
 const lights=world=>world.scene.children.filter(mesh=>mesh.isPointLight);
 assert.ok(tubes(large).length>tubes(small).length);
 assert.equal(large.lighting.fixtures.length,tubes(large).length);
 assert.equal(small.lighting.fixtures.length,tubes(small).length);
 assert.equal(lights(small).length,9); // Eight ceiling lights plus player fill.
 assert.equal(lights(large).length,9);
});

test('the ceiling light pool follows nearest fixtures and preserves their individual blackout state',()=>{
 const run=createRun(42,{playerCount:4}),world=headlessWorld(run);
 const tubes=world.scene.children.filter(mesh=>mesh.userData.ceilingLight);
 const pool=world.scene.children.filter(mesh=>mesh.isPointLight&&mesh.color.getHex()===0xdddcd4);
 assert.equal(pool.length,8);
 for(const player of [{x:-2.6,z:-29},worldPoint(run.layout.rooms.at(-1))]){
  const eyeHeight=player.z<=-25?5.25:1.65;
  const nearest=[...tubes].sort((a,b)=>{
   const distance=tube=>(tube.position.x-player.x)**2+(tube.position.z-player.z)**2+(tube.position.y-.12-eyeHeight)**2;
   return distance(a)-distance(b);
  }).slice(0,8);
  world.update(.1,0,player,0);
  for(let i=0;i<8;i++){
   assert.ok(pool[i].position.distanceTo(nearest[i].position.clone().add({x:0,y:-.12,z:0}))<1e-8);
   assert.ok(pool[i].intensity>0);
  }
  world.update(.1,0,player,1,0,{position:{...player,height:player.z<=-25?3.6:0},hunting:true,active:true});
  let off=0,on=0;
  for(let i=0;i<8;i++){
   const source=world.lighting.fixtures[tubes.indexOf(nearest[i])];
   assert.equal(pool[i].intensity===0,source.intensity===0);
   if(source.intensity===0)off++;else on++;
  }
  assert.ok(off>0,'nearby fixture light must shut off during the hunt');
  assert.ok(on>0,'distant pooled fixture retains its independent lighting state');
  world.lighting.reset();
 }
});

test('drawer and elevator easing remain consistent at different render rates',()=>{
 const sample=hz=>{const run=createRun(42),world=headlessWorld(run);run.drawers[0].opened=true;run.exitOpen=true;for(let i=0;i<hz/2;i++)world.update(1/hz,i/hz,{x:-2.6,z:-29},0);return {drawer:world.drawerViews[0].drawer.position.z,door:world.doorProgress};};
 const low=sample(20),high=sample(100);assert.ok(Math.abs(low.drawer-high.drawer)<1e-8);assert.ok(Math.abs(low.door-high.door)<1e-8);
 assert.ok(low.drawer>0&&low.drawer<.47);assert.ok(low.door>0&&low.door<1);
});
