import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopState} from '../src/coop-state.js';
import {createCoopSimulation,chooseMonsterTarget} from '../src/coop-simulation.js';
import {gridPoint} from '../src/level.js';
const members=[{id:'host',name:'Host'},{id:'guest',name:'Guest'}];
function fixture(){
 const state=createCoopState(42,members);
 state.run.layout.grid=state.run.layout.grid.map(row=>row.map(()=>1));
 const world={canMove:(x,z)=>x>=-5&&x<=5&&z>=-35&&z<=15,enemyNavigation:{canMove:()=>true,canSee:()=>true,findPath:(_,to)=>[{...to}]},targets:new Map()};
 const simulation=createCoopSimulation(state,world,{ambushChance:0});return{state,world,simulation};
}
test('authority simulates each player against collisions and expires stale input',()=>{
 const {state,simulation}=fixture(),p=state.players.get('guest');p.x=4.9;p.z=0;p.height=0;
 simulation.setInput('guest',{forward:0,right:1,yaw:0,pitch:0,sprint:true,torch:true,paused:false});
 for(let i=0;i<20;i++)simulation.advance(.05);
 assert.ok(p.x<=5);const stopped=p.x;simulation.advance(.2);assert.equal(p.x,stopped);
});
test('monster chooses actual visible players without tracking unseen positions',()=>{
 const {state,world,simulation}=fixture();const a=state.players.get('host'),b=state.players.get('guest');
 Object.assign(a,{x:0,z:4,height:0});Object.assign(b,{x:0,z:6,height:0});
 Object.assign(simulation.enemy,{position:{x:0,z:0},yaw:0,targetId:'guest'});
 assert.equal(chooseMonsterTarget(simulation.enemy,state,world.enemyNavigation).id,'guest');
 b.hidden=true;assert.equal(chooseMonsterTarget(simulation.enemy,state,world.enemyNavigation).id,'host');
});
test('one shared monster can catch a non-target player but never someone through a wall',()=>{
 const {state,world,simulation}=fixture();state.run.boardsOpen=true;state.run.huntElapsed=190;simulation.enemy.released=true;
 const host=state.players.get('host'),guest=state.players.get('guest');
 Object.assign(host,{x:0,z:.7,height:0});Object.assign(guest,{x:0,z:.8,height:0});
 Object.assign(simulation.enemy,{position:{x:0,z:0},yaw:0,targetId:'host'});
 world.enemyNavigation.canSee=(_,p)=>p.id==='guest';simulation.advance(.025);
 assert.equal(host.status,'alive');assert.equal(guest.status,'downed');
});
test('shared snapshots are ordered and preserve per-player ownership',()=>{
 const {state,simulation}=fixture();state.players.get('guest').carried.add(3);
 const one=simulation.snapshot(),two=simulation.snapshot();
 assert.ok(two.sequence>one.sequence);assert.deepEqual(two.state.players.find(p=>p.id==='guest').carried,[3]);assert.deepEqual(two.state.players.find(p=>p.id==='host').carried,[]);
 assert.equal(two.enemy.position.x,simulation.enemy.position.x);assert.doesNotThrow(()=>JSON.stringify(two));
});
test('interaction uses trusted world target and validates proximity',()=>{
 const {state,world,simulation}=fixture();const p=state.players.get('host');
 world.targets.set('boards',{id:'boards',type:'boards',position:{x:-2.6,z:-25,height:3.6}});
 assert.equal(simulation.interact('host',{targetId:'boards',code:'interact'}).ok,false);
 p.z=-26;assert.equal(simulation.interact('host',{targetId:'boards',code:'interact'}).ok,true);assert.equal(state.run.boardsOpen,true);
});

function closetFixture(){
 const result=fixture(),{state,world,simulation}=result;
 state.run.boardsOpen=true;state.run.huntElapsed=190;simulation.enemy.released=true;
 Object.assign(state.players.get('guest'),{x:0,z:5,height:0});
 Object.assign(simulation.enemy,{position:{x:0,z:0},yaw:0,targetId:'guest'});
 world.targets.set('closet',{id:'closet',type:'closet',position:{x:0,z:4,height:0},hide:{x:0,z:4.1,height:0},exit:{x:0,z:4.8,height:0}});
 // Cabinet walls hide its interior while its entrance remains visible.
 world.enemyNavigation.canSee=(_,point)=>point.z>=4.5;
 return result;
}

test('closet entry records sight before hiding and pursuit remembers the visible entrance',()=>{
 const {state,simulation}=closetFixture(),player=state.players.get('guest');
 assert.equal(simulation.interact('guest',{targetId:'closet'}).ok,true);
 assert.equal(player.hidden,true);assert.equal(player.hideWitnessed,true);
 simulation.advance(.025);
 assert.equal(simulation.enemy.mode,'chase');
 assert.deepEqual(simulation.enemy.lastSeen,{x:0,z:4.8});
 assert.equal(player.status,'alive');
});

test('a witnessed closet can be opened from its visible entrance without seeing through the cabinet',()=>{
 const {state,simulation}=closetFixture(),player=state.players.get('guest');
 simulation.interact('guest',{targetId:'closet'});player.hideWitnessed=true;
 simulation.enemy.position={x:0,z:3.2};
 simulation.advance(.025);
 assert.equal(player.status,'downed');assert.equal(player.hidden,false);
 assert.equal(state.closets.has('closet'),false);
 assert.equal(player.z,4.8);
});

test('unwitnessed closets remain safe when the monster later walks past',()=>{
 const {state,world,simulation}=closetFixture(),player=state.players.get('guest');
 world.enemyNavigation.canSee=()=>false;
 simulation.interact('guest',{targetId:'closet'});assert.equal(player.hideWitnessed,false);
 world.enemyNavigation.canSee=()=>true;simulation.enemy.position={x:0,z:4.7};
 simulation.advance(.025);assert.equal(player.status,'alive');assert.equal(player.hidden,true);
});

test('known closet entrances cannot be captured across furniture or maze walls',()=>{
 for(const obstruction of ['furniture','wall']){
  const {state,world,simulation}=closetFixture(),player=state.players.get('guest');
  simulation.interact('guest',{targetId:'closet'});player.hideWitnessed=true;
  simulation.enemy.position={x:0,z:3.2};
  if(obstruction==='furniture')world.enemyNavigation.canSee=()=>false;
  else{const cell=gridPoint({x:0,z:4});state.run.layout.grid[cell.z][cell.x]=0;}
  simulation.advance(.025);assert.equal(player.status,'alive',obstruction);assert.equal(player.hidden,true,obstruction);
 }
});

test('proximity to a concealed body cannot replace proximity to the known entrance',()=>{
 const {state,world,simulation}=closetFixture(),player=state.players.get('guest');
 simulation.interact('guest',{targetId:'closet'});player.hideWitnessed=true;
 world.enemyNavigation.canSee=()=>true;simulation.enemy.position={x:0,z:2.5};
 simulation.advance(.025);
 assert.ok(Math.hypot(player.x-simulation.enemy.position.x,player.z-simulation.enemy.position.z)<1.8);
 assert.ok(Math.hypot(player.closetExit.x-simulation.enemy.position.x,player.closetExit.z-simulation.enemy.position.z)>1.8);
 assert.equal(player.status,'alive');
});

test('a moving unseen target cannot update the monster last-seen destination',()=>{
 const {state,world,simulation}=fixture(),player=state.players.get('host');state.run.boardsOpen=true;state.run.huntElapsed=190;simulation.enemy.released=true;
 Object.assign(player,{x:0,z:5,height:0});Object.assign(simulation.enemy,{position:{x:0,z:0},yaw:0,targetId:'host'});
 simulation.advance(.025);assert.deepEqual(simulation.enemy.lastSeen,{x:0,z:5});
 world.enemyNavigation.canSee=()=>false;player.x=4;player.z=8;
 simulation.advance(.025);
 assert.deepEqual(simulation.enemy.lastSeen,{x:0,z:5});assert.deepEqual(simulation.enemy.path.at(-1),{x:0,z:5});
});

test('stale commands expire after .65 seconds in free space and fresh input resumes immediately',()=>{
 const {state,simulation}=fixture(),player=state.players.get('guest');Object.assign(player,{x:0,z:0,height:0});
 const command={forward:0,right:1,yaw:0,pitch:0,sprint:false,torch:true};
 simulation.setInput('guest',command);
 for(let i=0;i<12;i++)simulation.advance(.05);
 assert.ok(player.x>1.45&&player.x<1.55);
 simulation.advance(.1);const stopped=player.x;assert.ok(stopped<1.7);
 simulation.advance(.2);assert.equal(player.x,stopped);assert.equal(player.moving,false);assert.equal(player.speed,0);assert.equal(player.sprint,false);
 simulation.setInput('guest',{...command,right:-1});simulation.advance(.025);assert.ok(player.x<stopped);
});

test('actions apply before the next simulation tick and reject absent players or malformed targets safely',()=>{
 const {state,world,simulation}=fixture(),player=state.players.get('host');Object.assign(player,{x:0,z:0,height:0});
 world.targets.set('clue',{id:'clue',type:'clue',position:{x:0,z:0,height:0}});
 assert.equal(simulation.interact('host',{targetId:'clue'}).ok,true);
 assert.equal(state.run.elapsed,0);assert.equal(simulation.snapshot().state.run.clueRead,true);
 assert.equal(simulation.interact('missing',{targetId:'clue'}).ok,false);
 for(const action of [null,{}, {targetId:42},{targetId:{}}])assert.equal(simulation.interact('host',action).ok,false);
});

test('snapshot metadata remains bounded and excludes private commands and navigation state',()=>{
 const {state,simulation}=fixture();
 simulation.setInput('guest',{forward:1,right:0,yaw:0,pitch:0,torch:true,clientPosition:{x:999,z:999}});
 for(let i=0;i<100;i++)simulation.interact('guest',{targetId:'missing'});
 const snapshot=simulation.snapshot(),serialized=JSON.stringify(snapshot);
 assert.equal(snapshot.notices.length,24);assert.equal(snapshot.notices.at(-1).id,100);
 assert.ok(!serialized.includes('clientPosition'));assert.equal(snapshot.state.run.layout,undefined);assert.equal(snapshot.enemy.path,undefined);
 assert.equal(snapshot.state.players.length,state.players.size);assert.ok(serialized.length<18000);
});
test('actual co-op movement replicates fresh footstep events and blocked movement stays quiet',()=>{
 const {state,world,simulation}=fixture(),player=state.players.get('guest');Object.assign(player,{x:0,z:0,height:0});
 simulation.setInput('guest',{forward:1,right:0,yaw:0,pitch:0,sprint:false,torch:true,paused:false});
 simulation.advance(.2);simulation.advance(.2);simulation.advance(.1);
 assert.ok(player.noiseSequence>0);assert.equal(player.noiseType,'walk');assert.ok(state.run.elapsed-player.noiseAt<.2);
 const sequence=player.noiseSequence;world.canMove=()=>false;
 simulation.setInput('guest',{forward:1,right:0,yaw:0,pitch:0,sprint:false,torch:true,paused:false});simulation.advance(.2);
 assert.equal(player.noiseSequence,sequence);
 assert.equal(simulation.snapshot().state.players.find(p=>p.id==='guest').noiseSequence,sequence);
});

test('blocked drawers stay closed without an obstruction toast; visible drawers still open',()=>{
 const {state,world,simulation}=fixture(),player=state.players.get('host');
 const id='drawer-0';world.targets.set(id,{id,type:'drawer',drawerId:0,position:{x:player.x,z:player.z,height:player.height}});
 world.canSeeInteraction=()=>false;
 assert.deepEqual(simulation.interact('host',{targetId:id}),{ok:false,reason:'blocked'});
 assert.equal(state.run.drawers[0].opened,false);
 assert.deepEqual(simulation.snapshot().notices,[]);
 world.canSeeInteraction=()=>true;
 assert.equal(simulation.interact('host',{targetId:id}).ok,true);
 assert.equal(state.run.drawers[0].opened,true);
 assert.equal(simulation.snapshot().notices.at(-1).message,'Drawer searched.');
});
