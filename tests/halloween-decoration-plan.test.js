import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createRun} from '../src/game-state.js';import {createWorld} from '../src/world.js';
const module=await import('../src/halloween-decoration-plan.js').catch(()=>({}));
function plan(layout,seed){assert.equal(typeof module.createHalloweenDecorationPlan,'function','maze decorations need deliberate seeded placements');return module.createHalloweenDecorationPlan(layout,seed);}
function world(run){const previous=globalThis.document,context={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};}};globalThis.document={createElement:()=>({getContext:()=>context})};try{return createWorld(run);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}}

for(const playerCount of [1,4])test(`${playerCount}-player dressing is seeded, plentiful and avoids stairs and closets`,()=>{
 for(const seed of [42,137,2026]){
  const run=createRun(seed,{halloween:true,playerCount}),layout=run.layout,p=plan(layout,seed);assert.deepEqual(p,plan(layout,seed));assert.ok(p.rooms.length>=layout.rooms.length*4);assert.ok(p.walls.length>=18);
  for(const a of p.walls){assert.equal(layout.grid[a.cell.z][a.cell.x],0);assert.ok(layout.grid[a.cell.z+a.normal.z]?.[a.cell.x+a.normal.x]);assert.ok(layout.closets.every(c=>Math.hypot(c.x-a.cell.x,c.z-a.cell.z)>2));assert.ok(a.z>layout.stairs.bottomZ+2.6);assert.ok(Number.isFinite(a.yaw));}
 }
});
test('decorations keep drawer approaches clear, use three warm lights, and leave the code above the cabinet',()=>{
 for(const playerCount of [1,4]){
  const run=createRun(42,{halloween:true,playerCount}),w=world(run),d=w.halloween;assert.ok(Array.isArray(d.placements));assert.ok(d.placements.length>run.layout.rooms.length*4);
  assert.equal(d.root.children.filter(o=>o.isPointLight).length,3);
  for(const p of d.placements){
   if(p.surface==='room'){
    const room=run.layout.rooms[p.roomIndex],yaw=Math.atan2(room.normal.x,room.normal.z),inverse=new THREE.Matrix4().makeRotationY(-yaw).multiply(new THREE.Matrix4().makeTranslation(-(room.x-8)*2.6,-run.layout.floorHeight,-(room.z-8)*2.6));
    const bounds=new THREE.Box3().setFromObject(p.root).applyMatrix4(inverse),approach=new THREE.Box3(new THREE.Vector3(-.48,0,-.23),new THREE.Vector3(.48,1.9,1.1));assert.equal(bounds.intersectsBox(approach),false,`${p.kind} must stay clear of the cabinet approach`);
   }else if(p.surface==='wall'){
    const box=new THREE.Box3().setFromObject(p.root),points=[box.min,box.max];const protrusion=Math.max(...points.map(v=>(v.x-p.x)*p.normal.x+(v.z-p.z)*p.normal.z));assert.ok(protrusion<.15,`${p.kind} must stay against the wall`);
   }
  }
  const clueMesh=w.targets.get('clue').mesh,clue=clueMesh.getWorldPosition(new THREE.Vector3());assert.ok(clue.y>run.layout.floorHeight+1.7);assert.equal(clueMesh.material.map.colorSpace,THREE.SRGBColorSpace);w.update(.1,1,{x:-2.6,z:-29},0);assert.ok(d.root.children.filter(o=>o.isPointLight).every(o=>Number.isFinite(o.intensity)));d.dispose();d.dispose();
 }
});
test('the chest chain links sit in front of the pumpkin shell before it opens',()=>{
 const run=createRun(42,{halloween:true}),w=world(run),chest=w.halloween.root.getObjectByName('Halloween key').parent,chains=chest.children.filter(g=>g.isGroup&&g.children.length>=6&&g.children.every(m=>m.geometry?.type==='TorusGeometry'));assert.equal(chains.length,2);w.scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();for(const chain of chains)for(const link of chain.children){const at=link.getWorldPosition(new THREE.Vector3());ray.set(at.clone().add(new THREE.Vector3(0,0,2)),new THREE.Vector3(0,0,-1));const shell=ray.intersectObject(chest.body,false)[0];if(shell)assert.ok(at.z>=shell.point.z-.005,'a chain link is buried in the pumpkin');}w.halloween.dispose();
});
