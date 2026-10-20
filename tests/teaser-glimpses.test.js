import test from 'node:test';import assert from 'node:assert/strict';
import {sampleTeaser,TEASER_VOICES,TEASER_DURATION} from '../src/teaser-timeline.js';
test('three new creatures receive short, separate glimpses without voice imitation',()=>{
 const seen=new Map();
 for(let frame=0;frame<=TEASER_DURATION*60;frame++){
  const s=sampleTeaser(frame/60);assert.equal(s.mouth??0,0);assert.doesNotMatch(s.subtitle,/Help me|MONOCHROME:/);
  if(s.glimpse){const list=seen.get(s.glimpse.id)??[];list.push(s.time);seen.set(s.glimpse.id,list);assert.ok(s.glimpse.amount>0&&s.glimpse.amount<=1);}
 }
 assert.deepEqual([...seen.keys()],['sonask','crawler','maw']);
 for(const [id,frames] of seen)assert.ok(frames.at(-1)-frames[0]<2.1,`${id} should be a glimpse, not a creature showcase`);
 assert.equal(TEASER_VOICES.some(v=>v.file==='help'),false);
});
