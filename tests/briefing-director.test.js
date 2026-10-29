import test from 'node:test';import assert from 'node:assert/strict';
import {sampleBriefingDirection as sample} from '../src/briefing-director.js';
import {filmTimeAt} from '../src/briefing-schedule.js';
const sampleBriefingDirection=(t,options)=>sample(filmTimeAt(t),options);
test('stranger hosts the welcome, dry asides and closing panic around the gameplay glimpses',()=>{
 for(const t of [3,11,29,44,75,83,93])assert.equal(sampleBriefingDirection(t).hostVisible,true,`host at ${t}`);
 for(const t of [20,37,55,64,71])assert.equal(sampleBriefingDirection(t).hostVisible,false,`cutaway at ${t}`);
 assert.ok(sampleBriefingDirection(90).headYaw>.4);assert.ok(sampleBriefingDirection(93).startle>.5);
 assert.equal(sampleBriefingDirection(94).transition,0,'no shot fade may dilute the static cut');
});
test('gestures and transitions ease deterministically, with completely still reduced-motion shots',()=>{
 const first=sampleBriefingDirection(4);assert.deepEqual(sampleBriefingDirection(4),first);assert.ok(first.speaking>0);
 assert.equal(sampleBriefingDirection(20).transition,0);assert.ok(sampleBriefingDirection(16).transition>.9);
 const a=sampleBriefingDirection(29,{reducedMotion:true}),b=sampleBriefingDirection(32,{reducedMotion:true});
 for(const k of ['poseTime','gesture','headYaw','headPitch','speaking','startle'])assert.equal(a[k],b[k],k);
 assert.equal(a.transition,0);
});
