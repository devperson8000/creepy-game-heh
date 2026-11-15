import test from 'node:test';
import assert from 'node:assert/strict';
import {MONOCHROME2_DURATION,MONOCHROME2_DIALOGUE,sampleMonochrome2} from '../src/monochrome2-intro-timeline.js';

test('the intro timeline follows the complete escape-to-Backrooms sequence',()=>{
 const expected=[[0,'elevator'],[8,'street'],[15,'storefront'],[20,'store'],[26,'ramp'],[29,'crack'],[33,'listen'],[37,'noclip'],[42,'backrooms'],[46,'title']];
 for(const [time,shot] of expected)assert.equal(sampleMonochrome2(time).shot,shot);
});
test('the tiny wall light disappears before the character reaches and touches the wall',()=>{
 assert.ok(sampleMonochrome2(28.2).crack>0);
 assert.equal(sampleMonochrome2(30).crack,0);
 assert.equal(sampleMonochrome2(33).crack,0);
});
test('no-clip, recovery, and title transitions advance smoothly and stay within bounds',()=>{
 assert.equal(sampleMonochrome2(-4).time,0);
 assert.equal(sampleMonochrome2(MONOCHROME2_DURATION+20).time,MONOCHROME2_DURATION);
 assert.ok(sampleMonochrome2(37).noclip>0&&sampleMonochrome2(37).noclip<1);
 assert.ok(sampleMonochrome2(42).stand>0&&sampleMonochrome2(42).stand<1);
 assert.ok(sampleMonochrome2(46).title>0&&sampleMonochrome2(46).title<1);
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
