import test from 'node:test';
import assert from 'node:assert/strict';
const load=()=>import('../src/halloween-countdown.js');
test('Halloween deadline is October 31 at 4 PM Sydney daylight time',async()=>{
 const {HALLOWEEN_DEADLINE}=await load();
 assert.equal(new Date(HALLOWEEN_DEADLINE).toISOString(),'2026-10-31T05:00:00.000Z');
 const local=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',hourCycle:'h23'}).format(new Date(HALLOWEEN_DEADLINE));
 assert.match(local,/31\/10\/2026/);assert.match(local,/16/);
});
test('countdown rolls units correctly and includes the final second',async()=>{
 const {HALLOWEEN_DEADLINE,countdownParts}=await load();
 assert.deepEqual(countdownParts(HALLOWEEN_DEADLINE-((2*86400+3*3600+4*60+5)*1000)),{days:2,hours:3,minutes:4,seconds:5,complete:false});
 assert.deepEqual(countdownParts(HALLOWEEN_DEADLINE-1),{days:0,hours:0,minutes:0,seconds:1,complete:false});
 assert.deepEqual(countdownParts(HALLOWEEN_DEADLINE-3600000),{days:0,hours:1,minutes:0,seconds:0,complete:false});
});
test('deadline ends at zero and never restarts next Halloween',async()=>{
 const {HALLOWEEN_DEADLINE,countdownParts}=await load();
 for(const now of [HALLOWEEN_DEADLINE,HALLOWEEN_DEADLINE+1000,HALLOWEEN_DEADLINE+400*86400000])assert.deepEqual(countdownParts(now),{days:0,hours:0,minutes:0,seconds:0,complete:true});
});
