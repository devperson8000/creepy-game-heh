import test from 'node:test';
import assert from 'node:assert/strict';
import {
 MONOCHROME2_DURATION,MONOCHROME2_DIALOGUE,sampleMonochrome2,sampleMonochrome2Actors
} from '../src/monochrome2-intro-timeline.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('the extended intro follows the complete escape-to-Backrooms sequence',()=>{
 const expected=[[2,'elevator'],[12,'street'],[26,'storefront'],[33,'store'],[42,'ramp'],[49,'crack'],[51,'listen'],[54,'noclip'],[59,'backrooms'],[65,'title']];
 for(const [time,shot] of expected)assert.equal(sampleMonochrome2(time).shot,shot);
 assert.equal(MONOCHROME2_DURATION,66);
});

test('all three survivors use deliberate, grounded slow walking speeds',()=>{
 const phases=[[7,24],[24,29],[29,37.5],[29,35.3],[29,36]];
 const actorsByPhase=[[0,1,2],[0,1,2],[0],[1],[2]];
 phases.forEach(([start,end],phaseIndex)=>{
  const posesA=sampleMonochrome2Actors(start),posesB=sampleMonochrome2Actors(end);
  for(const index of actorsByPhase[phaseIndex]){
   const speed=distance(posesA[index],posesB[index])/(end-start);
   assert.ok(speed>0.8&&speed<1.5, 'actor '+index+' walking speed '+speed.toFixed(2)+' m/s');
  }
 });
 const friendsAtStop=sampleMonochrome2Actors(38);
 assert.equal(friendsAtStop[1].clip,'Idle');
 assert.equal(friendsAtStop[2].clip,'Idle');
});

test('the lead stays on the descending ramp and walks right up to the seam',()=>{
 const rampStart=sampleMonochrome2Actors(37.5)[0];
 const rampMiddle=sampleMonochrome2Actors(43)[0];
 const rampEnd=sampleMonochrome2Actors(48.5)[0];
 assert.ok(rampStart.y>rampMiddle.y&&rampMiddle.y>rampEnd.y);
 assert.ok(Math.abs(rampMiddle.y-Math.max(-2.62,Math.min(0,(rampMiddle.z+29)*.238)))<.001);
 assert.ok(Math.hypot(rampEnd.x-2.39,rampEnd.z+39.99)>.3);
 const atSeam=sampleMonochrome2Actors(49.2)[0];
 assert.ok(Math.hypot(atSeam.x-2.39,atSeam.z+39.99)<.1);
 assert.ok(sampleMonochrome2(48.5).crack>0);
 assert.equal(sampleMonochrome2(50).crack,0);
});

test('the portal passage, landing, recovery, and title transitions stay in bounds',()=>{
 assert.equal(sampleMonochrome2(-4).time,0);
 assert.equal(sampleMonochrome2(MONOCHROME2_DURATION+20).time,MONOCHROME2_DURATION);
 assert.ok(sampleMonochrome2(53).noclip>0&&sampleMonochrome2(53).noclip<1);
 assert.ok(sampleMonochrome2(62).stand>0&&sampleMonochrome2(62).stand<1);
 assert.ok(sampleMonochrome2(65).title>0&&sampleMonochrome2(65).title<1);
 const onCarpet=sampleMonochrome2Actors(59)[0];
 assert.equal(onCarpet.clip,'Death');
 assert.ok(onCarpet.y<0);
});

test('every natural dialogue cue is ordered and has a visible caption window',()=>{
 assert.ok(MONOCHROME2_DIALOGUE.length>=9);
 for(let i=0;i<MONOCHROME2_DIALOGUE.length;i++){
  const cue=MONOCHROME2_DIALOGUE[i];
  assert.ok(cue.end>cue.at);
  assert.ok(cue.text.length>5);
  if(i)assert.ok(cue.at>=MONOCHROME2_DIALOGUE[i-1].at);
 }
});
