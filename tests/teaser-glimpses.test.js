import test from 'node:test';import assert from 'node:assert/strict';
import {sampleTeaser,TEASER_VOICES,TEASER_DURATION} from '../src/teaser-timeline.js';
test('the enabled edit uses only the supplied Needlelimbs approach and peek without retired creatures or voice imitation',()=>{
 let walking=false,peeking=false;
 for(let frame=0;frame<=TEASER_DURATION*60;frame++){
  const s=sampleTeaser(frame/60);assert.doesNotMatch(s.subtitle,/Help me|MONOCHROME:/);
  assert.equal(s.glimpse,undefined,'retired three-creature edit cannot reappear');
  if(s.needle.visible&&s.needle.walk>.5)walking=true;
  if(s.needle.visible&&s.needle.peek>.9&&s.needle.walk<.1)peeking=true;
 }
 assert.ok(walking&&peeking);assert.equal(TEASER_VOICES.some(v=>v.file==='help'),false);
 assert.equal(TEASER_VOICES.length,2);
});
