import test from 'node:test';import assert from 'node:assert/strict';
import {RECAP_DURATION,recapFrame} from '../src/teaser-recap.js';
import {finaleChoreographyTime,finaleShot} from '../src/finale-state.js';
test('historical recap has a title, shows the severed head and never includes the walkout',()=>{
 assert.equal(recapFrame(0).phase,'previously');assert.equal(recapFrame(0).subtitle,'PREVIOUSLY…');
 const shots=new Set();for(let t=1.6;t<RECAP_DURATION-.6;t+=.025){const f=recapFrame(t);shots.add(finaleShot(f.finaleTime).name);assert.ok(finaleChoreographyTime(f.finaleTime)<44);}
 for(const shot of ['chase','stairs','dive','trapped','ascent','sever','death'])assert.ok(shots.has(shot),shot);
 assert.equal(recapFrame(RECAP_DURATION).phase,'teaser');assert.equal(recapFrame(RECAP_DURATION+5).teaserTime,5);
 assert.deepEqual(recapFrame(10),recapFrame(10));assert.ok(recapFrame(RECAP_DURATION-.01).fade>.9);
});
