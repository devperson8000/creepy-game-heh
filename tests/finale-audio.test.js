import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinaleAudio} from '../src/finale-audio.js';
test('finale audio can be sampled and disposed repeatedly without browser globals',()=>{
 const a=createFinaleAudio({volume:.8});assert.equal(a.volume,.8);
 a.setVolume(2);assert.equal(a.volume,1);a.setMuted(true);assert.equal(a.muted,true);
 a.sample(6);a.sample(52);a.reset();a.dispose();a.dispose();a.sample(9);
});
