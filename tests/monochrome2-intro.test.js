import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 MONOCHROME2_DURATION,MONOCHROME2_DIALOGUE,sampleMonochrome2,sampleMonochrome2Actors,
 monochrome2RampY,monochrome2CrackVisibility,monochrome2FootPlantOffset,monochrome2NoclipCueGain,monochrome2ShopDoorOpen,monochrome2BackroomsBackgroundFlash,MONOCHROME2_STAIR_OPENING
} from '../src/monochrome2-intro-timeline.js';
import {MONOCHROME2_SHELVES,monochrome2CollisionViolations} from '../src/monochrome2-collision.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('all three cinematic survivors use the relaxed source glove',()=>{
 const source=readFileSync(new URL('../src/monochrome2-intro.js',import.meta.url),'utf8');
 assert.equal((source.match(/handPose:'relaxed'/g)??[]).length,3);
});

test('the intro moves from the street to the two-line title in the intended order',()=>{
 const expected=[
  [2,'street'],[20,'storefront'],[26,'store'],[40,'rear-stairs'],
  [44.8,'ear-listen'],[45.6,'face-closeup'],[46.6,'hand-reach'],
  [48,'lean-wall'],[49.6,'fall-through'],[51,'floor-pan'],
  [56,'get-up'],[61,'cautious-scan'],[64,'monochrome-run'],
  [67,'fade-black'],[69,'title-main'],[71,'title-subtitle']
 ];
 for(const [time,shot] of expected)assert.equal(sampleMonochrome2(time).shot,shot);
 assert.equal(MONOCHROME2_DURATION,78);
});

test('the real Backrooms map flashes as a 0.15-second opening background cut, then only occasionally',()=>{
 assert.equal(monochrome2BackroomsBackgroundFlash(0),true,'the map flash starts on the first playback frame');
 assert.equal(monochrome2BackroomsBackgroundFlash(.079),true);
 assert.equal(monochrome2BackroomsBackgroundFlash(.149),true,'the opening flash remains visible for about 0.15 seconds');
 assert.equal(monochrome2BackroomsBackgroundFlash(.151),false,'the original Monochrome background returns');
 assert.equal(monochrome2BackroomsBackgroundFlash(2),false,'there is a clear gap after the opening flash');
 for(const time of [4.8,13.6,26.2,43.4]){
  assert.equal(monochrome2BackroomsBackgroundFlash(time),true,'a later sparse map flash is scheduled');
  assert.equal(monochrome2BackroomsBackgroundFlash(time+.16),false,'each later flash also returns to Monochrome');
 }
 assert.equal(monochrome2BackroomsBackgroundFlash(50),false,'the sparse map flashes stop before the full Backrooms reveal');
});

test('all survivors move at a steady pace and both friends reach for store supplies',()=>{
 const phases=[[0,18],[18,22],[22,30],[34,43.4],[22,27],[22,31]];
 const actorsByPhase=[[0,1,2],[0],[0],[0],[1],[2]];
 phases.forEach(([start,end],phaseIndex)=>{
  const posesA=sampleMonochrome2Actors(start),posesB=sampleMonochrome2Actors(end);
  for(const index of actorsByPhase[phaseIndex]){
   const speed=distance(posesA[index],posesB[index])/(end-start);
   assert.ok(speed>.8&&speed<1.9,'actor '+index+' walking speed '+speed.toFixed(2)+' m/s');
  }
 });
 const friendsAtStop=sampleMonochrome2Actors(30.5);
 assert.equal(friendsAtStop[1].clip,'Idle');
 assert.equal(friendsAtStop[2].clip,'Idle');
 assert.ok(friendsAtStop[1].handTarget,'Riley reaches from the aisle toward the left shelf');
 assert.ok(friendsAtStop[2].handTarget,'Jamie reaches from the aisle toward the right shelf');
 assert.ok(friendsAtStop[1].x>MONOCHROME2_SHELVES[0].x+.83,'Riley stays on the open side of the left rack');
 assert.ok(friendsAtStop[2].x<MONOCHROME2_SHELVES[3].x-.83,'Jamie stays on the open side of the right rack');
 assert.ok(sampleMonochrome2Actors(33.5)[2].z> -27,'Jamie clears the stair aisle after collecting supplies');
});

test('both shelf pickups reach, hold and release without snapping before the stair approach',()=>{
 const rileyReach=sampleMonochrome2Actors(30.0)[1];
 const rileyRelease=sampleMonochrome2Actors(32.85)[1];
 const rileyRest=sampleMonochrome2Actors(33.2)[1];
 const jamieReach=sampleMonochrome2Actors(30.0)[2];
 const jamieRelease=sampleMonochrome2Actors(31.1)[2];
 const jamieLeave=sampleMonochrome2Actors(31.6)[2];
 assert.ok(rileyReach.handProgress>.5);
 assert.ok(rileyRelease.handProgress>0&&rileyRelease.handProgress<1);
 assert.equal(rileyRest.handTarget,undefined);
 assert.ok(jamieReach.handProgress>.5);
 assert.ok(jamieRelease.handProgress>0&&jamieRelease.handProgress<1);
 assert.equal(jamieLeave.handTarget,undefined);
 assert.equal(jamieLeave.clip,'Walk');
});

test('all three survivor routes stay outside shelves, walls, doors and each other at 60 fps',()=>{
 let frames=0,first=null;
 for(let time=0;time<=MONOCHROME2_DURATION;time+=1/60){
  const poses=sampleMonochrome2Actors(time),violations=monochrome2CollisionViolations(poses,time);
  frames++;
  if(violations.length&&!first)first={time,violations};
 }
 assert.ok(frames>4600,'the complete 78-second film is sampled');
 assert.equal(first,null,JSON.stringify(first));
});

test('only the lead may cross the marked noclip wall, and only after the lean finishes',()=>{
 const before=sampleMonochrome2Actors(49.04),through=sampleMonochrome2Actors(49.5);
 assert.ok(before[0].z> -40.18);
 assert.ok(through[0].z< -40.18);
 assert.ok(through[1].z> -40.18&&through[2].z> -40.18);
 assert.deepEqual(monochrome2CollisionViolations(through,49.5),[]);
});

test('the stairwell opening exposes the full tread run through the rear wall',()=>{
 assert.ok(MONOCHROME2_STAIR_OPENING.left<1.15);
 assert.ok(MONOCHROME2_STAIR_OPENING.right>3.69);
 assert.ok(MONOCHROME2_STAIR_OPENING.front<=-29);
 assert.ok(MONOCHROME2_STAIR_OPENING.back<=-36);
});

test('shop doors open before all three survivors cross and close after they enter',()=>{
 assert.equal(monochrome2ShopDoorOpen(18),0);
 assert.ok(monochrome2ShopDoorOpen(19.2)>.99);
 assert.ok(monochrome2ShopDoorOpen(22)>.99);
 assert.ok(monochrome2ShopDoorOpen(23.5)>.99);
 assert.equal(monochrome2ShopDoorOpen(25.1),0);
 const friends=sampleMonochrome2Actors(22).slice(1);
 assert.ok(friends.every(friend=>Math.abs(friend.x)+.68<1.7),'both friends fit through the double-door opening');
});

test('dialogue stops before the stair descent begins',()=>{
 assert.ok(MONOCHROME2_DIALOGUE.length>0);
 assert.ok(MONOCHROME2_DIALOGUE.every(cue=>cue.end<=32.8),'no dialogue or subtitles continue into the stair sequence');
});

test('the stair path descends continuously without a vertical snap at each riser',()=>{
 const start=sampleMonochrome2Actors(34)[0];
 const middle=sampleMonochrome2Actors(39)[0];
 const lower=sampleMonochrome2Actors(43)[0];
 const bottom=sampleMonochrome2Actors(43.4)[0];
 assert.ok(Math.abs(start.y)<.001);
 assert.ok(start.y>middle.y&&middle.y>lower.y&&lower.y>=bottom.y);
 assert.ok(distance(start,bottom)>10);
 let previous=monochrome2RampY(-29),largestFrameStep=0;
 for(let z=-29.001;z>=-39.92;z-=.005){
  const y=monochrome2RampY(z);
  assert.ok(y<=0&&y>=-2.62,'stair height '+y);
  largestFrameStep=Math.max(largestFrameStep,Math.abs(y-previous));
  previous=y;
 }
 assert.ok(largestFrameStep<.004,'per-frame stair height change remains smooth');
 for(let step=1;step<12;step++){
  const edge=-29-step*((-29-(-39.92))/12);
  const before=monochrome2RampY(edge+.001),at=monochrome2RampY(edge),after=monochrome2RampY(edge-.001);
  assert.ok(Math.abs(before-at)<.002,'height is continuous before tread '+step);
  assert.ok(Math.abs(after-at)<.002,'height is continuous after tread '+step);
 }
});

test('stair placement corrects the lowest ankle to consistent clearance',()=>{
 const airborneFeet=[[0,.2,-29.2],[0,-.08,-30.2]];
 assert.equal(monochrome2FootPlantOffset(airborneFeet),0,'a raised foot must not pull the character down');
 const lowFeet=[[0,-.2,-29.2],[0,-.08,-30.2]];
 const offset=monochrome2FootPlantOffset(lowFeet);
 const clearances=lowFeet.map(([,y,z])=>y+offset-monochrome2RampY(z));
 assert.ok(Math.abs(Math.min(...clearances)-.105)<1e-9);
});

test('the soft opening cue carries through the full black-screen fade',()=>{
 assert.ok(monochrome2NoclipCueGain(58.7)>.7,'the cue remains live beyond its first 12 seconds');
 assert.ok(monochrome2NoclipCueGain(67)>0,'the cue continues during the fade to black');
 assert.equal(monochrome2NoclipCueGain(68.5),0,'the cue fades out at full black');
});

test('the hairline only appears close to the wall and disappears after contact',()=>{
 assert.ok(sampleMonochrome2(45).crack>0);
 assert.equal(monochrome2CrackVisibility(sampleMonochrome2(45).crack,6),0);
 assert.ok(monochrome2CrackVisibility(sampleMonochrome2(45).crack,.3)>.4);
 assert.ok(sampleMonochrome2(46.05).crack>0);
 assert.equal(sampleMonochrome2(46.5).crack,0);
});

test('listening, face, reach and lean are separate, ordered poses',()=>{
 const ear=sampleMonochrome2Actors(44.8)[0];
 const reach=sampleMonochrome2Actors(46.6)[0];
 const lean=sampleMonochrome2Actors(48.2)[0];
 assert.ok(ear.headTilt<-.3);
 assert.ok(reach.handTarget&&reach.handProgress>.3);
 assert.ok(lean.torsoLean>reach.torsoLean);
 assert.equal(sampleMonochrome2(45.6).shot,'face-closeup');
 assert.equal(sampleMonochrome2(47.8).shot,'lean-wall');
});

test('the character falls through immediately, lands on the real map floor and recovers slowly',()=>{
 const falling=sampleMonochrome2Actors(49.6)[0];
 const landed=sampleMonochrome2Actors(51)[0];
 const rising=sampleMonochrome2Actors(56)[0];
 const stood=sampleMonochrome2Actors(59.5)[0];
 assert.equal(falling.action,'dive');
 assert.ok(falling.z< -40.18);
 assert.equal(landed.action,'prone');
 assert.ok(rising.progress>0&&rising.progress<1);
 assert.equal(stood.clip,'Idle');
 assert.ok(Math.abs(stood.y+2.62)<.001);
 assert.ok(stood.crouch>.2);
 assert.notEqual(sampleMonochrome2Actors(60)[0].headTurn,sampleMonochrome2Actors(61)[0].headTurn);
 assert.equal(sampleMonochrome2(49.2).backrooms,0);
 assert.ok(sampleMonochrome2(49.8).backrooms>0);
});

test('Monochrome makes a brief silent-silhouette run before the fade and title',()=>{
 assert.equal(sampleMonochrome2(63).monochromeActive,false);
 assert.equal(sampleMonochrome2(64).monochromeActive,true);
 assert.ok(sampleMonochrome2(64).monochromeRun>.1);
 assert.equal(sampleMonochrome2(65.2).monochromeActive,false);
 assert.ok(sampleMonochrome2(67).fade>0);
 assert.equal(sampleMonochrome2(69).shot,'title-main');
 assert.equal(sampleMonochrome2(71).shot,'title-subtitle');
});

test('dialogue retains three character voice profiles and ordered caption cue windows',()=>{
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/nightmare/i.test(cue.text)));
 assert.ok(MONOCHROME2_DIALOGUE.some(cue=>/door/i.test(cue.text)));
 assert.deepEqual(new Set(MONOCHROME2_DIALOGUE.map(cue=>cue.voice)),new Set(['lead','friend1','friend2']));
 for(let i=0;i<MONOCHROME2_DIALOGUE.length;i++){
  const cue=MONOCHROME2_DIALOGUE[i];
  assert.ok(cue.end>cue.at);
  if(i)assert.ok(cue.at>=MONOCHROME2_DIALOGUE[i-1].at);
 }
});

test('all timeline values are clamped to the complete cinematic duration',()=>{
 assert.equal(sampleMonochrome2(-4).time,0);
 assert.equal(sampleMonochrome2(MONOCHROME2_DURATION+20).time,MONOCHROME2_DURATION);
});


test('dialogue playback queues every line and lets each utterance finish naturally',()=>{
 const source=readFileSync(new URL('../src/monochrome2-intro.js',import.meta.url),'utf8');
 const sayStart=source.indexOf('function say(cue,windowState){');
 const updateStart=source.indexOf('function updateNarration(time){',sayStart);
 const titleStart=source.indexOf('function showTitle()',updateStart);
 assert.ok(sayStart>=0&&updateStart>sayStart&&titleStart>updateStart,'dialogue functions are present');
 const saySource=source.slice(sayStart,updateStart);
 const updateSource=source.slice(updateStart,titleStart);
 assert.ok(saySource.includes('synth.speak(utterance)'),'each line is sent to SpeechSynthesis');
 assert.ok(saySource.includes('utterance.onend'),'the spoken line clears its caption on natural end');
 assert.equal(saySource.includes('synth.cancel()'),false,'queueing a later line must not cancel current speech');
 assert.equal(updateSource.includes('speechSynthesis?.cancel()'),false,'cue end must not cancel an in-progress sentence');
 assert.equal(updateSource.includes('narrationEpoch++'),false,'a later cue must not invalidate earlier speech events');
 assert.equal(source.includes('subtitleTimers'),false,'the fixed early caption timer has been removed');
});
