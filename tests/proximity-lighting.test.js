import test from 'node:test';
import assert from 'node:assert/strict';
import {createProximityLighting,WARNING_DISTANCE,BLACKOUT_DISTANCE} from '../src/proximity-lighting.js';
import {randomSource} from '../src/level.js';
const player={x:0,z:0,height:0},lamp={...player};
const monster=x=>({x,z:0,height:0});

test('far or inactive monsters leave every fixture completely steady and bright',()=>{
 const lighting=createProximityLighting([lamp]);
 for(let i=0;i<1000;i++){
  const power=lighting.update(.1,{player,monster:monster(WARNING_DISTANCE+1)});
  assert.equal(power.fixtures[0].intensity,1);assert.equal(power.visibility,1);assert.equal(power.warning,0);
 }
 const inactive=lighting.update(.1,{player,monster:monster(1),hunting:true,active:false});
 assert.equal(inactive.blackout,false);assert.equal(inactive.fixtures[0].intensity,1);
});

test('approaching monsters dim lights and produce fresh independent random glitches',()=>{
 const trace=seed=>{
  const lighting=createProximityLighting([lamp,{x:0,z:1,height:0}],{random:randomSource(seed)}),result=[];
  for(let i=0;i<200;i++){
   const {fixtures}=lighting.update(.05,{player,monster:monster(8)});
   result.push(fixtures.map(f=>f.intensity));
  }
  return result;
 };
 const a=trace(10),b=trace(11);
 assert.ok(a.some(([value])=>value<.15));assert.ok(a.some(([value])=>value>.4));
 assert.ok(a.some(([left,right])=>Math.abs(left-right)>.2));
 assert.notDeepEqual(a,b);
 assert.ok(a.every(row=>row.every(value=>value>=0&&value<=1)));
});

test('immediate danger or a hunt extinguishes the local area but leaves distant rooms normal',()=>{
 const lighting=createProximityLighting([lamp,{x:-6,z:0,height:0},{x:40,z:0,height:0}]);
 let power=lighting.update(.05,{player,monster:monster(BLACKOUT_DISTANCE)});
 assert.equal(power.blackout,true);assert.equal(power.visibility,0);
 assert.equal(power.fixtures[0].intensity,0);assert.equal(power.fixtures[1].intensity,0);assert.equal(power.fixtures[2].intensity,1);
 power=lighting.update(.05,{player,monster:monster(13),hunting:true});
 assert.equal(power.blackout,true);assert.equal(power.fixtures[0].intensity,0);assert.equal(power.fixtures[2].intensity,1);
});

test('a hunt on a different floor does not cut the upstairs player area',()=>{
 const upstairs={x:0,z:0,height:3.6};
 const lighting=createProximityLighting([upstairs]);
 const power=lighting.update(.05,{player:upstairs,monster:monster(8),hunting:true});
 assert.equal(power.blackout,false);assert.equal(power.visibility,1);
 assert.notEqual(power.fixtures[0].mode,'blackout');
});

test('power recovers monotonically without glitches when the monster leaves and the hunt ends',()=>{
 const lighting=createProximityLighting([lamp],{random:randomSource(42)});
 lighting.update(.1,{player,monster:monster(2),hunting:true});
 let previous=0;
 for(let i=0;i<100;i++){
  const power=lighting.update(.1,{player,monster:monster(40),hunting:false});
  assert.ok(power.fixtures[0].intensity>=previous);previous=power.fixtures[0].intensity;
  assert.equal(power.fixtures[0].glitch,false);assert.equal(power.blackout,false);
  if(i===0)assert.ok(previous>0&&previous<.2);
 }
 assert.equal(previous,1);assert.equal(lighting.visibility,1);
 assert.equal(lighting.fixtures[0].mode,'steady');
});

test('pausing freezes the random warning and recovery timers; resetting restores full power',()=>{
 const lighting=createProximityLighting([lamp],{random:randomSource(15)});
 const signal={player,monster:monster(8)};
 lighting.update(.1,signal);
 const before=JSON.stringify(lighting.fixtures);
 for(let i=0;i<50;i++)lighting.update(0,signal);
 assert.equal(JSON.stringify(lighting.fixtures),before);
 lighting.update(.1,{player,monster:monster(1)});lighting.reset();
 assert.equal(lighting.visibility,1);assert.equal(lighting.blackout,false);
 assert.equal(lighting.fixtures[0].intensity,1);
});
