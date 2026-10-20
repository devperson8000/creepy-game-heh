import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game-state.js';
import {advanceHalloween} from '../src/halloween-state.js';

test('B2 cannot finish the encounter before the full 25 second film and stranger outro',()=>{
 const run=createRun(42,{halloween:true});run.phase='halloween';
 run.halloween.visit={id:'test',stage:'conversation',elapsed:0,startedAt:100};
 advanceHalloween(run,[],135);assert.equal(run.halloween.seen,false);assert.equal(run.halloween.visit.stage,'conversation');
 advanceHalloween(run,[],142.9);assert.equal(run.halloween.seen,false);
 advanceHalloween(run,[],143);assert.equal(run.halloween.seen,true);assert.equal(run.halloween.visit.stage,'archive');
});
test('the teaser repeats the same voice, reveals its source, then holds its title',async()=>{
 const {sampleTeaser,TEASER_DURATION}=await import('../src/teaser-timeline.js');
 assert.equal(TEASER_DURATION,25);
 assert.equal(sampleTeaser(3).shot,'arrival');
 assert.equal(sampleTeaser(8).shot,'door');assert.match(sampleTeaser(8).subtitle,/Help me/);
 assert.equal(sampleTeaser(13).shot,'mimic');assert.match(sampleTeaser(13).subtitle,/Help me/);
 assert.ok(sampleTeaser(13).mouth>0);assert.equal(sampleTeaser(8).mouth,0);
 assert.equal(sampleTeaser(18).shot,'chase');
 assert.equal(sampleTeaser(22).shot,'title');assert.equal(sampleTeaser(99).time,25);
 assert.deepEqual(sampleTeaser(13),sampleTeaser(13),'seeking/replaying must not accumulate animation');
});
