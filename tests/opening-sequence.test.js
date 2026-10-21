import test from 'node:test';
import assert from 'node:assert/strict';
import {openingFrame,createOpeningClock,OPENING_DURATION} from '../src/opening-sequence.js';

test('the Monochrome I opening has a short title beat and finishes at the menu handoff',()=>{
 assert.equal(openingFrame(0).title,0);assert.ok(openingFrame(5).title>.9);
 assert.equal(openingFrame(OPENING_DURATION).done,true);
 assert.equal(openingFrame(Infinity).time,0);
});
test('the opening pauses while hidden and skip completes the handoff exactly once',()=>{
 let completions=0;const clock=createOpeningClock(()=>completions++);
 clock.update(2);assert.equal(clock.elapsed,2);clock.update(3,{hidden:true});assert.equal(clock.elapsed,2);
 clock.skip();clock.skip();clock.update(20);assert.equal(completions,1);
});
test('reduced motion goes straight to the quiet title and cancellation does not open a second menu',()=>{
 let completions=0;const clock=createOpeningClock(()=>completions++,{reducedMotion:true});
 assert.ok(clock.frame.title>.9);clock.cancel();clock.skip();clock.update(20);assert.equal(completions,0);
});
