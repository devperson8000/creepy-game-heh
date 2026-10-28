import test from 'node:test';
import assert from 'node:assert/strict';
import {createBriefingTimeline,MUSIC_START,STATIC_START} from '../src/launch-briefing-timeline.js';
const config={accents:[10.68,12.01,13.35],musicDuration:58.06,dialogue:[{id:'welcome',start:2,duration:3,text:'Welcome back.'}]};

test('the camera cut, static fade, silence and music happen in the approved order',()=>{
 const timeline=createBriefingTimeline(config);
 assert.equal(timeline.sample(93.999).phase,'briefing');assert.equal(timeline.sample(STATIC_START).phase,'static');
 assert.equal(timeline.sample(94).staticOpacity,1);assert.equal(timeline.sample(95.2).staticOpacity,1);
 const fade=timeline.sample(95.65);assert.ok(Math.abs(fade.staticOpacity-.5)<1e-8);assert.equal(fade.musicGain,0);
 for(const time of [96.1,96.2]){const s=timeline.sample(time);assert.equal(s.phase,'black');assert.equal(s.staticOpacity,0);assert.equal(s.musicGain,0);}
 assert.equal(timeline.sample(MUSIC_START).phase,'outro');assert.equal(timeline.sample(MUSIC_START).musicGain,0);
 assert.ok(Math.abs(timeline.sample(MUSIC_START+.75).musicGain-.5)<1e-8);assert.equal(timeline.sample(MUSIC_START+1.5).musicGain,1);
});
test('the three title words appear on exact musical accents and retain prior words',()=>{
 const timeline=createBriefingTimeline(config);
 for(const [offset,before,after] of [[10.68,0,1],[12.01,1,2],[13.35,2,3]]){
  assert.equal(timeline.sample(MUSIC_START+offset-.001).wordCount,before);
  assert.equal(timeline.sample(MUSIC_START+offset).wordCount,after);
 }
 assert.equal(timeline.sample(MUSIC_START+15.349).canProceed,false);assert.equal(timeline.sample(MUSIC_START+15.35).canProceed,true);
});
test('score ending fades cleanly and leaves an available update action',()=>{
 const timeline=createBriefingTimeline(config);assert.equal(timeline.sample(MUSIC_START+56.06).musicGain,1);
 assert.ok(Math.abs(timeline.sample(MUSIC_START+57.06).musicGain-.5)<1e-8);
 const end=timeline.sample(MUSIC_START+58.06);assert.equal(end.phase,'complete');assert.equal(end.musicGain,0);assert.equal(end.wordCount,3);assert.equal(end.canProceed,true);
});
test('subtitles follow measured clip windows and disappear at the static cut',()=>{
 const timeline=createBriefingTimeline(config);assert.equal(timeline.sample(2.5).subtitle,'Welcome back.');assert.equal(timeline.sample(5.1).subtitle,'');assert.equal(timeline.sample(STATIC_START).subtitle,'');
});
test('sampling is deterministic, handles invalid time, and cannot be configured with fake unordered accents',()=>{
 const timeline=createBriefingTimeline(config),at=timeline.sample(MUSIC_START+12.1);timeline.sample(10);assert.deepEqual(timeline.sample(MUSIC_START+12.1),at);assert.equal(timeline.sample(NaN).time,0);
 for(const accents of [[10,9,15],[1,2,3],[10,10,20],[10,20,99]])assert.throws(()=>createBriefingTimeline({...config,accents}),/accent/i);
});

test('the stressed NOW remains subtitled over the initial static cut',()=>{
 const timeline=createBriefingTimeline({...config,dialogue:[{start:94,duration:.3,text:'NOW!'}]});
 assert.equal(timeline.sample(94).subtitle,'NOW!');assert.equal(timeline.sample(94.299).subtitle,'NOW!');assert.equal(timeline.sample(94.301).subtitle,'');
});
