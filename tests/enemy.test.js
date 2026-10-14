import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,worldPoint,gridPoint,walkable} from '../src/level.js';
import {createEnemy,tickEnemy} from '../src/enemy.js';
test('patrol moves through the maze without crossing solid cells',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 for(let i=0;i<3600;i++){
  tickEnemy(enemy,layout,{x:-2.6,z:-29,height:3.6,hidden:false},1/30);
  assert.ok(walkable(layout,gridPoint(enemy.position)));
 }
 assert.ok(Math.hypot(start.x-enemy.position.x,start.z-enemy.position.z)>2);
});
test('hidden players are not detected; exposed nearby players can be caught',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),p={...enemy.position,height:0,hidden:true};
 assert.equal(tickEnemy(enemy,layout,p,.016).caught,false);assert.equal(enemy.mode,'patrol');
 assert.equal(tickEnemy(enemy,layout,{...p,hidden:false},.016).caught,true);assert.equal(enemy.mode,'chase');
});
test('the closed basement route does not activate the monster',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 tickEnemy(enemy,layout,{...enemy.position,height:0,hidden:false},1,false);
 assert.deepEqual(enemy.position,start);
});
