import test from 'node:test';import assert from 'node:assert/strict';import {finalePlaybackTime as at} from '../src/finale-state.js';
import {finaleAudioEvents,finaleMonsterGain,createFinaleAudio} from '../src/finale-audio.js';
test('one-shot events cross once and late seeks skip old impacts',()=>{assert.deepEqual(finaleAudioEvents(at(22.8),at(23.05)).map(e=>e.type),['doors']);assert.deepEqual(finaleAudioEvents(at(23.05),at(23.1)),[]);assert.deepEqual(finaleAudioEvents(at(2),at(38)),[]);assert.deepEqual(finaleAudioEvents(at(36),at(35)),[]);assert.ok(finaleAudioEvents(at(35.25),at(35.4)).some(e=>e.type==='cut'));});
test('monster dominates chase and trapped struggle then dies into silence',()=>{assert.ok(finaleMonsterGain(at(27))>finaleMonsterGain(at(5)));assert.equal(finaleMonsterGain(at(40)),0);assert.equal(finaleMonsterGain(at(50)),0);});
test('unsupported audio and repeated cleanup remain safe; volume remains bounded',async()=>{const a=createFinaleAudio({volume:.8});assert.equal(await a.resume(),false);assert.equal(a.unlocked,false);a.sample(27);a.setVolume(2);assert.equal(a.volume,1);a.setMuted(true);assert.equal(a.muted,true);a.dispose();a.dispose();assert.equal(await a.resume(),false);});

test('airborne dive has no running footsteps before its landing impact',()=>{
 const start=at(19),end=at(21.2);let previous=start;
 for(let time=start+.1;time<=end;time+=.1){assert.equal(finaleAudioEvents(previous,time).some(event=>event.type==='step'),false);previous=time;}
 assert.ok(finaleAudioEvents(at(21.25),at(21.4)).some(event=>event.type==='dive'));
});
