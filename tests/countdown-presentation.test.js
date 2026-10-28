import test from 'node:test';
import assert from 'node:assert/strict';
import {HALLOWEEN_DEADLINE} from '../src/halloween-release-time.js';
import {sampleCountdownPresentation,countdownReadout,createCountdownFocus} from '../src/halloween-countdown-state.js';
const at=seconds=>sampleCountdownPresentation({confirmed:true,serverNow:HALLOWEEN_DEADLINE-seconds*1000,released:seconds<=0});

test('countdown intensity follows the fixed server deadline at each approved threshold',()=>{
 for(const [seconds,phase] of [[301,'idle'],[300,'approaching'],[61,'approaching'],[60,'urgent'],[31,'urgent'],[30,'final'],[1,'final'],[0,'complete'],[-400,'complete']]){
  const sample=at(seconds);assert.equal(sample.phase,phase);assert.equal(sample.remaining,Math.max(0,seconds));
 }
 assert.ok(at(300).intensity>0);assert.ok(at(60).intensity>at(300).intensity);assert.ok(at(1).intensity>at(30).intensity);
});
test('unknown, invalid or unconfirmed clocks never start the event or declare completion',()=>{
 for(const clock of [{},{confirmed:false,serverNow:HALLOWEEN_DEADLINE+1000,released:true},{confirmed:true,serverNow:NaN},{confirmed:true,serverNow:Infinity}]){
  const p=sampleCountdownPresentation(clock);assert.equal(p.phase,'idle');assert.equal(p.intensity,0);assert.equal(p.confirmed,false);assert.equal(p.remaining,null);
 }
});
test('readouts retain days/hours and the final second without negative or missing digits',()=>{
 for(const [seconds,text] of [[2*86400+3*3600+4*60+5,'2d 03:04:05'],[3661,'01:01:01'],[60,'01:00'],[.1,'00:01'],[0,'00:00'],[-5,'00:00'],[null,'Syncing…']])assert.equal(countdownReadout(seconds),text);
});
test('automatic timer opens at thirty seconds, holds zero and cannot reopen after dismissal',()=>{
 let saves=0;const gate=createCountdownFocus({onSeen:()=>saves++});
 assert.equal(gate.update(at(300)).open,false);assert.equal(gate.update(at(30)).open,true);assert.equal(gate.update(at(0)).open,true);
 assert.equal(saves,1);gate.close();assert.equal(gate.update(at(-1)).open,false);
 assert.equal(gate.update(at(20)).open,false,'a backward resync must not reopen a completed event');assert.equal(saves,1);
});
test('manual fullscreen works before and after release; closing early does not suppress the later event',()=>{
 const gate=createCountdownFocus();gate.update(at(1000));gate.open();assert.equal(gate.update(at(1000)).open,true);
 gate.close();assert.equal(gate.update(at(30)).open,true);gate.close();assert.equal(gate.update(at(29)).open,false);
 gate.open();assert.equal(gate.update(at(-10)).open,true);
});
test('late arrivals and remembered dismissals stay on the menu unless they choose fullscreen',()=>{
 const late=createCountdownFocus();assert.equal(late.update(at(-1)).open,false);
 const remembered=createCountdownFocus({seen:true});assert.equal(remembered.update(at(20)).open,false);
 remembered.open();assert.equal(remembered.update(at(20)).open,true);
});
test('reloading during the automatic view cannot trigger another automatic takeover',()=>{
 let seen=false;const first=createCountdownFocus({onSeen:()=>seen=true});
 assert.equal(first.update(at(25)).open,true);
 const reloaded=createCountdownFocus({seen});assert.equal(reloaded.update(at(24)).open,false);
 seen=false;const manual=createCountdownFocus({onSeen:()=>seen=true});manual.update(at(120));manual.open();manual.update(at(25));
 assert.equal(createCountdownFocus({seen}).update(at(24)).open,false);
});
test('closing an explicit view during the buildup prevents an unwanted automatic interruption later',()=>{
 let saves=0;const gate=createCountdownFocus({onSeen:()=>saves++});gate.update(at(200));gate.open();gate.close();
 assert.equal(gate.update(at(30)).open,false);assert.equal(saves,1);
});
