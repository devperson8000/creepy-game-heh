import test from 'node:test';import assert from 'node:assert/strict';
import {sampleMonochromeBeat,MONOCHROME_HINTS,WARNING_START,QUESTION_START,SPRINT_START,STATIC_START,BRIEFING_DIALOGUE} from '../src/briefing-schedule.js';
test('distant crossings and faint warning signals precede the final reveal',()=>{
 assert.ok(MONOCHROME_HINTS.filter(c=>c.kind==='crossing').length>=2);
 for(const c of MONOCHROME_HINTS){assert.ok(c.at<WARNING_START);if(c.kind==='crossing'){const a=sampleMonochromeBeat(c.at+.2),b=sampleMonochromeBeat(c.at+.4);assert.equal(a.kind,'crossing');assert.notEqual(a.x,b.x);assert.equal(a.running,true);}}
});
test('Monochrome stands completely still until the stranger finishes his question, then charges',()=>{
 const a=sampleMonochromeBeat(WARNING_START+.5),b=sampleMonochromeBeat(QUESTION_START+.2);assert.equal(a.kind,'stationary');assert.equal(a.running,false);assert.equal(a.x,b.x);assert.equal(a.z,b.z);
 const question=BRIEFING_DIALOGUE.find(c=>c.id==='whats-that');assert.ok(SPRINT_START>=question.start+question.duration+.15);
 const sprint=sampleMonochromeBeat(SPRINT_START+.2),close=sampleMonochromeBeat(STATIC_START-.01);assert.equal(sprint.kind,'sprint');assert.equal(sprint.running,true);assert.ok(close.z>sprint.z+10);
 assert.equal(sampleMonochromeBeat(STATIC_START).kind,'hidden');
});
