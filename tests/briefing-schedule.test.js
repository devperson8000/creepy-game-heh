import test from 'node:test';import assert from 'node:assert/strict';
import {BRIEFING_DIALOGUE,STATIC_START,MUSIC_START,WARNING_START,WARNING_DURATION,sceneTimeAt,filmTimeAt,SCORE_OFFSET} from '../src/briefing-schedule.js';
test('compact narration keeps brief pauses, one deliberate clue breath and a bounded danger beat',()=>{
 assert.ok(STATIC_START<50);assert.equal(BRIEFING_DIALOGUE[0].start,.65);
 for(let i=0;i<9;i++){const a=BRIEFING_DIALOGUE[i],b=BRIEFING_DIALOGUE[i+1],gap=b.start-a.start-a.duration;assert.ok(gap>=.4&&gap<=1.21,`${a.id}: ${gap}`);}
 const management=BRIEFING_DIALOGUE.find(c=>c.id==='management'),panic=BRIEFING_DIALOGUE.find(c=>c.id==='panic');
 assert.ok(WARNING_START>=management.start+management.duration);assert.ok(panic.start-WARNING_START-WARNING_DURATION<=.5);
 assert.equal(BRIEFING_DIALOGUE.at(-1).start,STATIC_START);assert.ok(Math.abs(panic.start+panic.duration-STATIC_START)<1e-8);
 assert.equal(SCORE_OFFSET,8.75);assert.ok(MUSIC_START-STATIC_START<2.5);
});
test('authored scene mapping is continuous, monotonic and seekable',()=>{
 let previous=-1;for(let t=0;t<=STATIC_START;t+=.025){const authored=sceneTimeAt(t);assert.ok(authored>=previous);assert.ok(Math.abs(filmTimeAt(authored)-t)<1e-6);previous=authored;}
 assert.equal(sceneTimeAt(0),0);assert.equal(sceneTimeAt(STATIC_START),94);
});
