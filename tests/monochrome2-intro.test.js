import test from 'node:test';
import assert from 'node:assert/strict';
import {
 MONOCHROME2_DURATION,MONOCHROME2_DIALOGUE,sampleMonochrome2,sampleMonochrome2Actors,
 monochrome2RampY,monochrome2CrackVisibility,monochrome2FootPlantOffset
} from '../src/monochrome2-intro-timeline.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('the intro moves from the street to the two-line title in the intended order',()=>{
 const expected=[
  [2,'street'],[20,'storefront'],[26,'store'],[40,'rear-stairs'],
  [44.8,'ear-listen'],[45.6,'face-closeup'],[46.6,'hand-reach'],
  [48,'lean-wall'],[49.6,'fall-through'],[51,'floor-pan'],
  [56,'get-up'],[61,'cautious-scan'],[64,'monochrome-run'],
  [67,'fade-black'],[69,'title-main'],[71,'title-subtitle']
 ];
 for(const [time,shot] of expected)assert.equal(sampleMonochrome2(time).shot,shot);
 assert.equal(MONOCHROME2_DURATION,78);
});

test('all survivors move at a steady pace and both friends reach for store supplies',()=>{
 const phases=[[0,18],[18,22],[22,30],[34,43.4],[22,27],[22,31]];
 const actorsByPhase=[[0,1,2],[0],[0],[0],[1],[2]];
 phases.forEach(([start,end],phaseIndex)=>{
  const posesA=sampleMonochrome2Actors(start),posesB=sampleMonochrome2Actors(end);
  for(const index of actorsByPhase[phaseIndex]){
   const speed=distance(posesA[index],posesB[index])/(end-start);
   assert.ok(speed>.8&&speed<1.9,'actor '+index+' walking speed '+speed.toFixed(2)+' m/s');
  }
 });
 const friendsAtStop=sampleMonochrome2Actors(32);
 assert.equal(friendsAtStop[1].clip,'Idle');
 assert.equal(friendsAtStop[2].clip,'Idle');
 assert.ok(friendsAtStop[1].handTarget,'Riley reaches for supplies');
 assert.ok(friendsAtStop[2].handTarget,'Jamie reaches for supplies');
});

test('the stair path steps down and stays aligned with the visible treads',()=>{
 const start=sampleMonochrome2Actors(34)[0];
 const middle=sampleMonochrome2Actors(39)[0];
 const lower=sampleMonochrome2Actors(43)[0];
 const bottom=sampleMonochrome2Actors(43.4)[0];
 assert.ok(Math.abs(start.y)<.001);
 assert.ok(start.y>middle.y&&middle.y>lower.y&&lower.y>=bottom.y);
 assert.ok(distance(start,bottom)>10);
 for(let z=-29;z>=-39.92;z-=.11){
  const y=monochrome2RampY(z);
  assert.ok(y<=0&&y>=-2.62,'stair height '+y);
  assert.ok(Math.abs(y/2.62*12-Math.round(y/2.62*12))<.8,'height follows a stair level');
 }
});

test('stair placement corrects the lowest ankle to consistent clearance',()=>{
 const feet=[[0,.2,-29.2],[0,-.08,-30.2]];
 const offset=monochrome2FootPlantOffset(feet);
 const clearances=feet.map(([,y,z])=>y+offset-monochrome2RampY(z));
 assert.ok(Math.abs(Math.min(...clearances)-.105)<1e-9);
});

test('three separate dialogue beats run during the stair descent',()=>{
 const cues=MONOCHROME2_DIALOGUE.filter(cue=>cue.id.startsWith('descending'));
 assert.deepEqual(cues.map(cue=>cue.speaker),['LEAD','JAMIE','RILEY']);
 assert.ok(cues[0].at>=34&&cues[2].end<=43.4);
});

test('the hairline only appears close to the wall and disappears after contact',()=>{
 assert.ok(sampleMonochrome2(45).crack>0);
 assert.equal(monochrome2CrackVisibility(sampleMonochrome2(45).crack,6),0);
 assert.ok(monochrome2CrackVisibility(sampleMonochrome2(45).crack,.3)>.8);
 assert.ok(sampleMonochrome2(46.05).crack>0);
 assert.equal(sampleMonochrome2(46.5).crack,0);
});

test('listening, face, reach and lean are separate, ordered poses',()=>{
 const ear=sampleMonochrome2Actors(44.8)[0];
 const reach=sampleMonochrome2Actors(46.6)[0];
 const lean=sampleMonochrome2Actors(48.2)[0];
 assert.ok(ear.headTilt<-.3);
 assert.ok(reach.handTarget&&reach.handProgress>.3);
 assert.ok(lean.torsoLean>reach.torsoLean);
 assert.equal(sampleMonochrome2(45.6).shot,'face-closeup');
 assert.equal(sampleMonochrome2(47.8).shot,'lean-wall');
});

test('the character falls through immediately, lands on the real map floor and recovers slowly',()=>{
 const falling=sampleMonochrome2Actors(49.6)[0];
 const landed=sampleMonochrome2Actors(51)[0];
 const rising=sampleMonochrome2Actors(56)[0];
 const stood=sampleMonochrome2Actors(59.5)[0];
 assert.equal(falling.action,'dive');
 assert.ok(falling.z< -40.18);
 assert.equal(landed.action,'prone');
 assert.ok(rising.progress>0&&rising.progress<1);
 assert.equal(stood.clip,'Idle');
 assert.ok(Math.abs(stood.y+2.62)<.001);
 assert.ok(stood.crouch>.2);
 assert.notEqual(sampleMonochrome2Actors(60)[0].headTurn,sampleMonochrome2Actors(61)[0].headTurn);
 assert.equal(sampleMonochrome2(49.2).backrooms,0);
 assert.ok(sampleMonochrome2(49.8).backrooms>0);
});

test('Monochrome makes a brief silent-silhouette run before the fade and title',()=>{
 assert.equal(sampleMonochrome2(63).monochromeActive,false);
 assert.equal(sampleMonochrome2(64).monochromeActive,true);
 assert.ok(sampleMonochrome2(64).monochromeRun>.1);
 assert.equal(sampleMonochrome2(65.2).monochromeActive,false);
 assert.ok(sampleMonochrome2(67).fade>0);
 assert.equal(sampleMonochrome2(69).shot,'title-main');
 assert.equal(sampleMonochrome2(71).shot,'title-subtitle');
});

test('dialogue retains three character voice profiles and ordered caption cue windows',()=>{
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/monochrome/i.test(cue.text)));
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/door/i.test(cue.text)));
 assert.deepEqual(new Set(MONOCHROME2_DIALOGUE.map(cue=>cue.voice)),new Set(['lead','friend1','friend2']));
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
