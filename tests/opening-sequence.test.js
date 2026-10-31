import test from 'node:test';
import assert from 'node:assert/strict';
import {openingFrame,createOpeningClock,OPENING_DURATION,OPENING_TITLE_AT,OPENING_SKIP_HOLD} from '../src/opening-sequence.js';

test('opening contains the street, empty house, double wall touch, dark passage, fall and title in order',()=>{
 assert.equal(openingFrame(2).shot,'street');assert.equal(openingFrame(10).shot,'entry');
 assert.equal(openingFrame(16).shot,'empty-house');assert.equal(openingFrame(22).shot,'first-touch');
 assert.equal(openingFrame(24).shot,'recoil');assert.equal(openingFrame(27).shot,'second-touch');
 assert.equal(openingFrame(30).shot,'through-wall');assert.equal(openingFrame(35).shot,'alley');
 assert.equal(openingFrame(40).shot,'fall');assert.equal(openingFrame(45).shot,'title');
 assert.equal(openingFrame(0).title,0);assert.ok(openingFrame(45).title>.9);
 assert.equal(openingFrame(OPENING_DURATION).done,true);assert.equal(openingFrame(Infinity).time,0);
});
test('skip requires an uninterrupted two-second hold and seeks to the title without completing',()=>{
 let completions=0;const clock=createOpeningClock(()=>completions++);
 clock.update(1,{holding:true});assert.equal(clock.skipProgress,.5);
 clock.update(.01,{holding:false});assert.equal(clock.skipProgress,0);
 clock.update(OPENING_SKIP_HOLD-.01,{holding:true});assert.ok(clock.elapsed<OPENING_TITLE_AT);
 clock.update(.01,{holding:true});assert.equal(clock.elapsed,OPENING_TITLE_AT);assert.equal(completions,0);
 clock.skip();assert.equal(clock.elapsed,OPENING_TITLE_AT);
 clock.update(OPENING_DURATION);clock.update(20);clock.skip();assert.equal(completions,1);
});
test('hidden tabs pause time and clear a partial skip; loading can be skipped to the title',()=>{
 const clock=createOpeningClock(()=>{});clock.update(1,{holding:true});clock.update(10,{hidden:true,holding:true});
 assert.equal(clock.elapsed,1);assert.equal(clock.skipProgress,0);
 clock.update(1,{ready:false});assert.equal(clock.elapsed,1);
 clock.update(2,{ready:false,holding:true});assert.equal(clock.elapsed,OPENING_TITLE_AT);
 clock.update(1,{ready:false});assert.equal(clock.elapsed,OPENING_TITLE_AT+1);
});
test('reduced motion uses the quiet title and cancellation never opens the menu',()=>{
 let completions=0;const clock=createOpeningClock(()=>completions++,{reducedMotion:true});
 assert.equal(clock.frame.shot,'title');clock.update(1);assert.ok(clock.frame.title>.5);
 clock.cancel();clock.skip();clock.update(100);assert.equal(completions,0);
});
test('finite clamping keeps camera and fades valid at malformed or out-of-range times',()=>{
 for(const time of [-5,NaN,Infinity,0,22,30,40,49,100]){
  const frame=openingFrame(time);assert.ok(frame.fade>=0&&frame.fade<=1);assert.ok(frame.title>=0&&frame.title<=1);
  assert.ok(frame.camera.every(Number.isFinite));assert.ok(frame.look.every(Number.isFinite));
 }
 assert.ok(openingFrame(22.6).reach>0.9);assert.ok(openingFrame(24).reach<.1);
 assert.ok(openingFrame(27.6).reach>.9);assert.ok(openingFrame(42.8).light<.01);
});

test('a slow rendered frame never stretches the real two-second skip hold',()=>{
 const clock=createOpeningClock(()=>{});clock.update(.25,{holding:true,holdDelta:2});assert.equal(clock.elapsed,OPENING_TITLE_AT);
});
