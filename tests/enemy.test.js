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

test('a loud sound through a wall triggers investigation of its origin, not the hidden player',()=>{
 const layout=createLayout(42);let a,b;
 for(let z=1;z<16&&!a;z++)for(let x=1;x<14;x++)if(layout.grid[z][x]&& !layout.grid[z][x+1]&&layout.grid[z][x+2]){a=worldPoint({x,z});b=worldPoint({x:x+2,z});break;}
 assert.ok(a&&b);
 const enemy=createEnemy(layout);enemy.position={...a};
 tickEnemy(enemy,layout,{x:0,z:0,height:0,hidden:true},.025,true,[{...b,height:0,radius:14}]);
 assert.equal(enemy.mode,'investigate');assert.deepEqual(enemy.lastHeard,{x:b.x,z:b.z});
 assert.notDeepEqual(enemy.lastHeard,{x:0,z:0});
});
test('quiet or out-of-range sounds do not reveal a hidden player',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout);
 tickEnemy(enemy,layout,{x:0,z:0,height:0,hidden:true},.025,true,[{x:-20,z:-20,height:0,radius:2}]);
 assert.equal(enemy.mode,'patrol');
});
test('the monster closes the gap to a visible player instead of stopping at a grid center',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),p={x:enemy.position.x,z:enemy.position.z+1.1,height:0,hidden:false};enemy.yaw=0;
 let caught=false;for(let i=0;i<30;i++)caught ||=tickEnemy(enemy,layout,p,.025).caught;
 assert.equal(caught,true);
});
test('chasing is faster than the player sprint',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};enemy.yaw=0;
 tickEnemy(enemy,layout,{x:start.x,z:start.z+2.6,height:0,hidden:false},.1);
 assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>.37);
});
