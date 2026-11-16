import test from 'node:test';
import assert from 'node:assert/strict';
import { createTvSetupGame, TV_SETUP_STAGE_COUNT } from '../src/secretroom-tv.js';
test('TV setup combinations get progressively longer',()=>{const g=createTvSetupGame(),lengths=[];for(let i=0;i<TV_SETUP_STAGE_COUNT;i++){lengths.push(g.pattern.length);for(const k of g.pattern)g.input(k);}assert.deepEqual(lengths,[3,4,6,8,10]);assert.equal(g.complete,true);});
test('a mistake restarts only the current combination',()=>{const g=createTvSetupGame();for(const k of g.pattern)g.input(k);assert.equal(g.stage,1);g.input('ArrowDown');assert.equal(g.inputIndex,0);assert.equal(g.stage,1);assert.equal(g.input('ArrowRight').type,'correct');});
test('the last correct sequence completes setup',()=>{const g=createTvSetupGame();while(!g.complete)for(const k of g.pattern)g.input(k);assert.equal(g.input('ArrowUp').type,'ignored');});
