import test from 'node:test';
import assert from 'node:assert/strict';
import {
 MONOCHROME2_DURATION,MONOCHROME2_DIALOGUE,sampleMonochrome2,sampleMonochrome2Actors,
 monochrome2RampY
} from '../src/monochrome2-intro-timeline.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('the intro opens on the survivors walking outside and finishes with the staggered title',()=>{
 const expected=[
  [2,'street'],[20,'storefront'],[26,'store'],[40,'rear-ramp'],
  [44.7,'ear-listen'],[45.6,'face-closeup'],[46.5,'hand-reach'],
  [47.8,'lean-wall'],[50,'fall-through'],[52,'floor'],
  [55,'get-up'],[60,'backrooms-reveal'],[63,'fade-black'],
  [65,'title-main'],[67,'title-subtitle']
 ];
 for(const [time,shot] of expected)assert.equal(sampleMonochrome2(time).shot,shot);
 assert.equal(MONOCHROME2_DURATION,80);
});

test('all three survivors walk at a slightly quicker, grounded pace and stop at the shop',()=>{
 const phases=[[0,18],[18,22],[22,30],[34,43.4]];
 const actorsByPhase=[[0,1,2],[0],[0],[0]];
 phases.forEach(([start,end],phaseIndex)=>{
  const posesA=sampleMonochrome2Actors(start),posesB=sampleMonochrome2Actors(end);
  for(const index of actorsByPhase[phaseIndex]){
   const speed=distance(posesA[index],posesB[index])/(end-start);
   assert.ok(speed>.9&&speed<1.9,'actor '+index+' walking speed '+speed.toFixed(2)+' m/s');
  }
 });
 const friendsAtStop=sampleMonochrome2Actors(32);
 assert.equal(friendsAtStop[1].clip,'Idle');
 assert.equal(friendsAtStop[2].clip,'Idle');
 assert.ok(friendsAtStop[1].handTarget,'Riley reaches for supplies');
 assert.ok(friendsAtStop[2].handTarget,'Jamie reaches for supplies');
 const rileyWalk=distance(sampleMonochrome2Actors(22)[1],sampleMonochrome2Actors(27)[1])/5;
 assert.ok(rileyWalk>.9&&rileyWalk<1.5,'Riley store walk speed '+rileyWalk.toFixed(2)+' m/s');
});

test('the rear ramp walk follows the sloped floor and reaches the wall before stopping',()=>{
 const rampStart=sampleMonochrome2Actors(34)[0];
 const rampMiddle=sampleMonochrome2Actors(39)[0];
 const rampEnd=sampleMonochrome2Actors(43.4)[0];
 assert.ok(rampStart.y>rampMiddle.y&&rampMiddle.y>rampEnd.y);
 assert.ok(Math.abs(rampMiddle.y-monochrome2RampY(rampMiddle.z))<.001);
 assert.ok(distance(rampStart,rampEnd)>10);
 const atWall=sampleMonochrome2Actors(44.2)[0];
 assert.ok(Math.hypot(atWall.x-2.39,atWall.z+39.99)<.1);
 assert.ok(sampleMonochrome2(43.8).crack>0);
 assert.ok(sampleMonochrome2(45).crack>0);
 assert.ok(sampleMonochrome2(46.6).crack>0);
 assert.equal(sampleMonochrome2(47.6).crack,0);
});

test('the listening, face close-up, hand reach and lean are distinct ordered poses',()=>{
 const ear=sampleMonochrome2Actors(44.8)[0];
 const reach=sampleMonochrome2Actors(46.6)[0];
 const lean=sampleMonochrome2Actors(48)[0];
 assert.equal(ear.clip,'Idle');
 assert.ok(ear.headTilt<-.3);
 assert.ok(reach.handTarget&&reach.handProgress>.3);
 assert.ok(lean.torsoLean>reach.torsoLean);
 assert.equal(sampleMonochrome2(45.6).shot,'face-closeup');
 assert.equal(sampleMonochrome2(47.8).shot,'lean-wall');
});

test('the fall passes through the wall, lands on Level Zero, and gets back up',()=>{
 const falling=sampleMonochrome2Actors(50)[0];
 const prone=sampleMonochrome2Actors(52)[0];
 const rising=sampleMonochrome2Actors(56)[0];
 const stood=sampleMonochrome2Actors(59)[0];
 assert.equal(falling.action,'dive');
 assert.ok(falling.z< -40.18);
 assert.equal(prone.action,'prone');
 assert.ok(rising.progress>0&&rising.progress<1);
 assert.equal(stood.clip,'Idle');
 assert.ok(Math.abs(stood.y+2.62)<.001);
 assert.ok(sampleMonochrome2(50).backrooms>0);
 assert.ok(sampleMonochrome2(61).reveal>.9);
});

test('the dialogue explains the escape and gives each survivor a distinct voice profile',()=>{
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/monochrome/i.test(cue.text)));
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/door/i.test(cue.text)));
 assert.deepEqual(new Set(MONOCHROME2_DIALOGUE.filter(cue=>['lead','friend1','friend2'].includes(cue.voice)).map(cue=>cue.voice)),new Set(['lead','friend1','friend2']));
 for(let i=0;i<MONOCHROME2_DIALOGUE.length;i++){
  const cue=MONOCHROME2_DIALOGUE[i];
  assert.ok(cue.end>cue.at);
  if(i)assert.ok(cue.at>=MONOCHROME2_DIALOGUE[i-1].at);
 }
});

test('all timeline values are clamped to the complete cinematic duration',()=>{
 assert.equal(sampleMonochrome2(-4).time,0);
 assert.equal(sampleMonochrome2(MONOCHROME2_DURATION+20).time,MONOCHROME2_DURATION);
});
