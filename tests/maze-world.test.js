import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createRun} from '../src/game-state.js';import {createWorld} from '../src/world.js';import {worldPoint} from '../src/level.js';import {createEnemy,tickEnemy} from '../src/enemy.js';import {createCreature} from '../src/creature.js';
function worldFor(run){const previous=globalThis.document;const context={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};}};globalThis.document={createElement:()=>({getContext:()=>context})};try{return createWorld(run);}finally{globalThis.document=previous;}}
for(const seed of [42,137,2026])test(`maze ${seed}: drawers, recessed closet exits and deep stairs have standing clearance`,()=>{
 const run=createRun(seed,{halloween:true}),w=worldFor(run);run.boardsOpen=true;
 assert.equal(w.drawerViews.length,run.layout.rooms.length);
 for(const room of run.layout.rooms){const p=worldPoint(room);assert.ok(w.canMove(p.x,p.z),'room centre');assert.ok(w.enemyNavigation.canMove(p.x,p.z),'room is reachable by the scaled monster');}
 for(const c of w.closets){assert.equal(c.physicalGrille,true);assert.ok(w.canMove(c.exit.x,c.exit.z),'exit must not place player in a wall');assert.equal(c.hide.height,-7.2);assert.ok(c.mesh.children.some(m=>m.userData.interactionProxy));}
 for(let z=-29;z<=-2.6;z+=.1)assert.ok(w.canMove(-2.6,z),`blocked stairs at ${z}`);
 const enemy=createEnemy(run.layout);let idle=0,maxIdle=0;const areas=new Set();
 for(let i=0;i<1800;i++){const before={...enemy.position};tickEnemy(enemy,run.layout,{x:-2.6,z:-29,height:3.6,hidden:true},1/30,true,[],w.enemyNavigation);assert.ok(w.enemyNavigation.canMove(enemy.position.x,enemy.position.z));idle=Math.hypot(enemy.position.x-before.x,enemy.position.z-before.z)<.001?idle+1/30:0;maxIdle=Math.max(idle,maxIdle);areas.add(`${Math.floor(enemy.position.x/8)},${Math.floor(enemy.position.z/8)}`);}
 assert.ok(maxIdle<=2.1);assert.ok(areas.size>=5);
});
test('scaled Monochrome fits the low narrow passage at its tallest stance',()=>{const c=createCreature();c.root.scale.setScalar(.66);const size=new THREE.Box3().setFromObject(c.root).getSize(new THREE.Vector3());assert.ok(size.x<1.8);assert.ok(size.y<2.65);assert.ok(size.y>2.3);});
