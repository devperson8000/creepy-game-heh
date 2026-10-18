import test from 'node:test';
import assert from 'node:assert/strict';
import * as ambush from '../src/enemy.js';
import {createEnemy,tickEnemy,MONSTER_SPEED} from '../src/enemy.js';
import {worldPoint,walkable,gridPoint,lineOfSight} from '../src/level.js';

function corner(){
 const grid=Array.from({length:17},()=>Array(17).fill(0));
 for(const [x,z] of [[7,7],[8,7],[9,7],[9,8],[9,9]])grid[z][x]=1;
 const layout={grid,rooms:Array(4).fill({x:7,z:7})};
 const enemy=createEnemy(layout),player={...worldPoint({x:9,z:9}),height:0,hidden:false,id:'guest'};
 return {layout,enemy,player,delta:.1,active:true};
}
const create=(options={})=>ambush.createAmbush(42,{chance:1,...options});
function ready(state,scene){
 ambush.tickAmbush(state,{...scene,delta:89.9});
 return ambush.tickAmbush(state,scene);
}

test('rare ambush helpers are exported by the enemy module',()=>{
 assert.equal(typeof ambush.createAmbush,'function');
 assert.equal(typeof ambush.tickAmbush,'function');
});

test('selection is deterministic and limited to a small minority of rounds',()=>{
 let selected=0;
 for(let seed=0;seed<1000;seed++){
  const a=ambush.createAmbush(seed),b=ambush.createAmbush(seed);
  assert.deepEqual(a,b);selected+=Number(a.eligible);
 }
 assert.ok(selected>=80&&selected<=160,`selected ${selected}/1000 rounds`);
 assert.equal(ambush.createAmbush(42,{chance:0}).eligible,false);
 assert.equal(ambush.createAmbush(42,{chance:1}).eligible,true);
});

test('a wall-hidden nearby monster may stalk after ninety active basement seconds without displacement',()=>{
 const scene=corner(),state=create(),origin={...scene.enemy.position};
 assert.equal(lineOfSight(scene.layout,scene.enemy.position,scene.player),false);
 assert.equal(ambush.tickAmbush(state,{...scene,delta:89.9}).silent,false);
 const result=ambush.tickAmbush(state,scene);
 assert.equal(result.silent,true);assert.equal(result.targetId,'guest');
 assert.equal(result.triggered,false);assert.equal(scene.enemy.mode,'investigate');
 assert.deepEqual(scene.enemy.position,origin);
 assert.deepEqual(scene.enemy.lastHeard,{x:scene.player.x,z:scene.player.z});
});

test('safe upstairs, hidden, dead, and paused play cannot prime an ambush',()=>{
 for(const overrides of [{active:false},{player:{height:3.6}},{player:{hidden:true}},{player:{dead:true}}]){
  const scene=corner(),state=create();
  const blocked={...scene,...overrides,player:{...scene.player,...overrides.player},delta:200};
  assert.equal(ambush.tickAmbush(state,blocked).silent,false);
  assert.equal(ambush.tickAmbush(state,scene).silent,false);
 }
});

test('visible monsters, existing chases, disconnected and distant routes cannot start a stalk',()=>{
 for(const kind of ['visible','chase','disconnected','distant']){
  const scene=corner(),state=create();
  if(kind==='visible')scene.player={...scene.player,...worldPoint({x:9,z:7})};
  if(kind==='chase')scene.enemy.mode='chase';
  if(kind==='disconnected')scene.layout.grid[7][8]=0;
  if(kind==='distant')scene.player={...scene.player,...worldPoint({x:15,z:15})};
  assert.equal(ready(state,scene).silent,false,kind);
 }
});

test('looking away from a monster in an open corridor does not count as corner cover',()=>{
 const scene=corner(),state=create();scene.player={...scene.player,...worldPoint({x:9,z:7}),yaw:Math.PI/2};
 assert.equal(ready(state,scene).silent,false);
});

test('the stalk follows ordinary navigation at unchanged speed and reveals as chase at the corner',()=>{
 const scene=corner(),state=create();assert.equal(ready(state,scene).silent,true);
 let revealed=false;
 for(let i=0;i<70;i++){
  const before={...scene.enemy.position};
  const result=ambush.tickAmbush(state,scene);
  tickEnemy(scene.enemy,scene.layout,scene.player,scene.delta);
  assert.ok(walkable(scene.layout,gridPoint(scene.enemy.position)));
  assert.ok(Math.hypot(scene.enemy.position.x-before.x,scene.enemy.position.z-before.z)<=MONSTER_SPEED.chase*scene.delta+1e-8);
  if(result.triggered){assert.equal(result.silent,false);assert.equal(scene.enemy.mode,'chase');revealed=true;break;}
 }
 assert.equal(revealed,true);
 assert.equal(ambush.tickAmbush(state,scene).triggered,false);
});

test('silence expires within six seconds and never starts twice per run',()=>{
 const scene=corner(),state=create();assert.equal(ready(state,scene).silent,true);
 assert.equal(ambush.tickAmbush(state,{...scene,delta:6}).silent,false);
 for(let i=0;i<10;i++)assert.equal(ambush.tickAmbush(state,{...scene,delta:20}).silent,false);
});

test('pause, safety, hiding, death, and a different co-op target restore sound immediately',()=>{
 for(const overrides of [{active:false},{player:{height:3.6}},{player:{hidden:true}},{player:{dead:true}},{player:{id:'host'}}]){
  const scene=corner(),state=create();assert.equal(ready(state,scene).silent,true);
  const result=ambush.tickAmbush(state,{...scene,...overrides,player:{...scene.player,...overrides.player}});
  assert.equal(result.silent,false);assert.equal(result.triggered,false);
  assert.equal(ambush.tickAmbush(state,scene).silent,false);
 }
});

test('a navigation route blocked by furnishings does not start an ambush',()=>{
 const scene=corner(),state=create();scene.navigation={findPath:()=>[]};
 assert.equal(ready(state,scene).silent,false);
});
