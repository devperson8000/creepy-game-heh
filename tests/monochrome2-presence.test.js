import test from 'node:test';
import assert from 'node:assert/strict';
import {createLevelZero} from '../src/backrooms-layout.js';
import {createMonochrome2Space,LOWER_REGION} from '../src/monochrome2-space.js';
import {createMonochrome2Encounter,mazeHuntable,lowerHuntable} from '../src/monochrome2-encounter.js';
import {LOWER_PROFILE} from '../src/monochrome2-entities.js';
import {tierSpeed,tierCount,MONOCHROME_VISITS} from '../src/monochrome2-tuning.js';
import {BACKROOMS_SPEED} from '../src/backrooms-round.js';
import {PITFALLS,inStairwell} from '../src/backrooms-pitfalls.js';

const map=createLevelZero();
const fakeActor=()=>({update(){},clack(){},dispose(){}});
const make=(round)=>createMonochrome2Encounter({map,scene:{}},{round:()=>round,actorFactory:async()=>fakeActor(),bacteriaActorFactory:async()=>fakeActor(),onNotice:()=>{}});
const run=(e,seconds,player,{t0=0,step=1/20,dt=step}={})=>{let t=t0,last;for(let i=0;i<seconds/step;i++){t+=step;last=e.update(dt,t,player,0,{});}return {t,last};};

test('spaces: the maze world has no pit room even once the door is open; the lower world has no stairwell',()=>{
 const maze=createMonochrome2Space(map,()=>({doorOpen:true}),{region:'maze'});
 assert.equal(maze.canStand(50,-16),false);assert.equal(maze.canStand(41.9,-16),false);assert.equal(maze.canStand(30,-16),true);
 const all=createMonochrome2Space(map,()=>({doorOpen:true}));assert.equal(all.canStand(50,-16),true,'the legacy world still includes the pit room');
 const lower=createMonochrome2Space(map,()=>({}),{region:'lower'});
 assert.equal(lower.canStand(60,-6),true);assert.equal(lower.canStand(70.2,-22),false,'the stairwell is closed to him');assert.equal(lower.canStand(30,-16),false,'and so is the west of the level');
 assert.ok(lower.canStand(PITFALLS.flashlight.x,PITFALLS.flashlight.z),'the supply room is walkable for him');
 assert.equal(lower.lineClear({x:60,z:-6},{x:70.2,z:-22}),false,'sight does not enter the stairwell');
});

test('huntable: maze monsters hunt only the normal rooms, the lower Monochrome only the dark layer, and the stairwell is safe',()=>{
 const upper={x:10,z:5,y:0},pit={x:50,z:-16,y:0},dark={x:60,z:-6,y:-6.4},stairs={x:70.2,z:-24,y:-3},west={x:30,z:-24,y:-6.4};
 assert.equal(mazeHuntable(upper),true);assert.equal(mazeHuntable(pit),false,'nothing hunts the beams');assert.equal(mazeHuntable(dark),false);
 assert.equal(lowerHuntable(dark),true);assert.equal(lowerHuntable(pit),false);assert.equal(lowerHuntable(upper),false);
 assert.equal(lowerHuntable(stairs),false,'on the stairs you are safe');assert.equal(lowerHuntable(west),false,'the west house is not his');
 assert.equal(lowerHuntable({...dark,downed:true}),false);
});

test('presence: the Bacteria and the rare Monochrome never leave the normal Level 0, even with the pit door open',async()=>{
 const round={doorOpen:true,parts:[],installed:4,hasKey:true};const e=make(round);await e.ready;
 // The player stands in the pit room making noise; the maze monsters must not be drawn into it.
 const player={id:'solo',x:50.2,z:-16,y:0,crouch:false,speed:5,sprint:true};
 let t=0;for(let i=0;i<60*20;i++){t+=1;e.movement(6,true,player);e.interaction(player,'pit-exit-door');e.update(1,t,player,0,{});
  assert.ok(e.entityState.x<41.6,'upper Monochrome x '+e.entityState.x);assert.ok(e.bacteriaState.x<41.6,'Bacteria x '+e.bacteriaState.x);}
 e.dispose();
});

test('presence: nothing hunts a player crossing the beams above',async()=>{
 const round={doorOpen:true,parts:[],installed:4,hasKey:true};const e=make(round);await e.ready;
 const player={id:'solo',x:50.2,z:-16,y:0,crouch:false,speed:0};let t=0,downs=0;
 for(let i=0;i<30*600;i++){t+=1/30;const r=e.update(1/30,t,player,0,{});downs+=r.downedIds.length;}
 assert.equal(downs,0);e.dispose();
});

test('presence: the lower Monochrome sleeps until the pit door opens, then patrols only the dark layer',async()=>{
 const round={doorOpen:false,parts:[],installed:0};const e=make(round);await e.ready;
 const safe={id:'solo',x:-7,z:13,y:0,crouch:true,speed:0};let t=0;
 for(let i=0;i<20*30;i++){t+=1/20;e.update(1/20,t,safe,0,{});}
 assert.equal(e.lowerMode,'dormant','no one is below before the door opens');
 round.doorOpen=true;const seen=new Set();let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<20*600;i++){t+=1/20;e.update(1/20,t,safe,0,{});const s=e.lowerEntityState;
  assert.notEqual(s.mode,'dormant');assert.equal(inStairwell(s.x,s.z,.0),false,'never in the stairwell');
  minX=Math.min(minX,s.x);maxX=Math.max(maxX,s.x);minZ=Math.min(minZ,s.z);maxZ=Math.max(maxZ,s.z);seen.add(Math.round(s.x/6)+':'+Math.round(s.z/6));}
 assert.ok(minX>=LOWER_REGION.minX-.01&&maxX<=LOWER_REGION.maxX+.01&&minZ>=LOWER_REGION.minZ-.01&&maxZ<=LOWER_REGION.maxZ+.01,'stays inside the lower region');
 assert.ok(seen.size>=8,'patrols a good share of the dark layer: '+seen.size);e.dispose();
});

test('presence: the lower Monochrome hunts a player in the dark, not one beside him on the stairs',async()=>{
 const round={doorOpen:true,parts:[],installed:4,hasKey:true};const e=make(round);await e.ready;
 const s=e.lowerSimulation.state;Object.assign(s,{x:60,z:-6,yaw:Math.PI,mode:'patrol'});
 const dark={id:'solo',x:60,z:-8.5,y:-6.4,crouch:false,speed:0};let t=100,downed=[];
 for(let i=0;i<20*8&&!downed.length;i++){t+=1/20;const r=e.update(1/20,t,dark,0,{});downed=r.downedIds;}
 assert.deepEqual(downed,['solo']);e.dispose();
 const e2=make(round);await e2.ready;Object.assign(e2.lowerSimulation.state,{x:70.2,z:-29,yaw:0,mode:'patrol'});
 const onStairs={id:'solo',x:70.2,z:-26,y:-5.3,crouch:false,speed:0};t=100;let hits=0;
 for(let i=0;i<20*20;i++){t+=1/20;hits+=e2.update(1/20,t,onStairs,0,{}).downedIds.length;}
 assert.equal(hits,0);e2.dispose();
});

test('balance: the lower Monochrome is slower than a sprint at full progress, the maze one is not',()=>{
 const lower=tierSpeed('chase',tierCount)*LOWER_PROFILE.speedScale;
 assert.ok(lower<BACKROOMS_SPEED.sprint&&lower>BACKROOMS_SPEED.walk,'lower chase '+lower.toFixed(2));
 assert.ok(tierSpeed('chase',tierCount)>BACKROOMS_SPEED.sprint);
 assert.ok(MONOCHROME_VISITS.max<=2);
});
