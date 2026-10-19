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

test('breaking sight for just over six and a half seconds ends pursuit',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),p={x:enemy.position.x,z:enemy.position.z+2.6,height:0,hidden:false};enemy.yaw=0;
 tickEnemy(enemy,layout,p,.025);
 const origin={...enemy.position};enemy.lastSeen={x:origin.x+100,z:origin.z};
 for(let i=0;i<66;i++)tickEnemy(enemy,layout,{...p,hidden:true},.1,true,[],{findPath:()=>[{...enemy.lastSeen}]});
 assert.equal(enemy.mode,'search');
});

test('sounds just at the old hearing limit no longer reveal the player',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),origin={...enemy.position},noise={x:origin.x,z:origin.z+2.6,height:0,radius:2.7};
 tickEnemy(enemy,layout,{...origin,height:0,hidden:true},.025,true,[noise]);
 assert.equal(enemy.mode,'patrol');
});

test('chase is slightly gentler while still faster than a player sprint',async()=>{
 const {MONSTER_SPEED}=await import('../src/enemy.js');assert.equal(MONSTER_SPEED.chase,3.95);assert.ok(MONSTER_SPEED.chase>3.7);
});
test('pursuit memory expires after six and a half seconds',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout);enemy.mode='chase';enemy.lastSeen={x:enemy.position.x+10,z:enemy.position.z};enemy.lostFor=6.4;
 tickEnemy(enemy,layout,{x:0,z:0,height:0,hidden:true},.2,true,[],{findPath:()=>[]});assert.equal(enemy.mode,'search');
});

test('search pauses last at most two seconds before a new patrol begins',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 enemy.mode='search';enemy.searchRemaining=2;
 for(let i=0;i<22;i++)tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1);
 assert.equal(enemy.mode,'patrol');
 assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>.1);
});

test('an unreachable investigation abandons repeated noise and takes a reachable patrol route',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 const noise={...start,x:start.x+.5,height:0,radius:100};
 const navigation={findPath:(from,to)=>Math.hypot(to.x-noise.x,to.z-noise.z)<.1?[]:[{...to}]};
 for(let i=0;i<50;i++)tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1,true,[noise],navigation);
 assert.equal(enemy.mode,'patrol');
 assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>3);
});

test('repeated noise at its feet cannot keep Monochrome camping in place',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position},noise={...start,height:0,radius:100};
 for(let i=0;i<70;i++)tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1,true,[noise]);
 assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>4);
});

test('arriving at an investigation takes no more than a two-second break',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 enemy.mode='investigate';enemy.lastHeard={...start};
 tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1);
 assert.equal(enemy.mode,'search');assert.ok(enemy.searchRemaining<=2);
 for(let i=0;i<21;i++)tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1);
 assert.equal(enemy.mode,'patrol');assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>.1);
});

test('nearby moving noise cannot make it pace in the same area indefinitely',()=>{
 const layout=createLayout(42),enemy=createEnemy(layout),start={...enemy.position};
 for(let i=0;i<180;i++){
  const noise={x:start.x+Math.cos(i*.1),z:start.z+Math.sin(i*.1),height:0,radius:100};
  tickEnemy(enemy,layout,{...start,height:0,hidden:true},.1,true,[noise]);
 }
 assert.ok(Math.hypot(enemy.position.x-start.x,enemy.position.z-start.z)>4);
});
