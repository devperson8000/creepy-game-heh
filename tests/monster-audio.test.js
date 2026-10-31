import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterGain,createMonsterAudio,AUDIBLE_DISTANCE} from '../src/monster-audio.js';
test('monster is completely silent beyond its audible range and outside gameplay',()=>{
 for(const distance of [AUDIBLE_DISTANCE,AUDIBLE_DISTANCE+1,100,Infinity,NaN])assert.equal(monsterGain(distance),0);
 assert.equal(monsterGain(1,false),0);
});
test('volume rises continuously as the monster approaches without exceeding its cap',()=>{
 let previous=0;
 for(let distance=AUDIBLE_DISTANCE;distance>=0;distance-=.1){
  const gain=monsterGain(distance);assert.ok(gain>=previous-1e-10);assert.ok(gain>=0&&gain<=.85);previous=gain;
 }
 assert.ok(monsterGain(3)>monsterGain(9));assert.ok(monsterGain(9)>monsterGain(15));
 assert.ok(Math.abs(monsterGain(AUDIBLE_DISTANCE-.01))<.001);
});
test('missing sound asset remains silent without fetching or creating an audio context',async()=>{
 const audio=createMonsterAudio(null);
 assert.equal(await audio.resume(),false);audio.update(1,true);audio.pause();assert.equal(audio.volume,0);audio.dispose();
});
test('Halloween calls warn across several corridors and retain quiet gaps',()=>{
 assert.ok(monsterGain(20,true,{maze:true,elapsed:2})>.06);assert.ok(monsterGain(14,true,{maze:true,elapsed:2})>.18);assert.equal(monsterGain(28,true,{maze:true,elapsed:1}),0);
 assert.ok(monsterGain(8,true,{maze:true,elapsed:2})>0);assert.equal(monsterGain(8,true,{maze:true,elapsed:12}),0);
 assert.ok(monsterGain(2,true,{maze:true,elapsed:12})>0,'immediate danger stays audible');
});
