import test from 'node:test';
import assert from 'node:assert/strict';
import {HALLOWEEN_DEADLINE,releaseStatus} from '../src/halloween-release-time.js';
import {createHalloweenRelease} from '../src/halloween-release.js';
import handler from '../api/halloween-release.js';
test('release uses the Sydney deadline and the server clock, independent of a visitor clock',async()=>{
 assert.equal(releaseStatus(HALLOWEEN_DEADLINE-1).released,false);assert.equal(releaseStatus(HALLOWEEN_DEADLINE).released,true);
 let elapsed=0;const r=createHalloweenRelease({now:()=>elapsed,fetchStatus:async()=>releaseStatus(HALLOWEEN_DEADLINE-1000)});
 await r.refresh();assert.equal(r.released,false);elapsed=1000;assert.equal(r.released,true);r.dispose();
});
test('failed or malformed release responses never unlock the update',async()=>{
 for(const fetchStatus of [async()=>{throw Error('offline');},async()=>({serverNow:HALLOWEEN_DEADLINE+1,released:true})]){
  const r=createHalloweenRelease({fetchStatus});await r.refresh();assert.equal(r.released,false);r.dispose();
 }
});
test('release API is not cached and rejects writes',()=>{
 const headers={};let code,payload;const res={setHeader:(k,v)=>headers[k]=v,status:n=>(code=n,res),json:v=>(payload=v,res),end:()=>res};
 handler({method:'GET'},res);assert.equal(code,200);assert.ok(headers['Cache-Control'].includes('no-store'));assert.equal(payload.releaseAt,HALLOWEEN_DEADLINE);
 handler({method:'POST'},res);assert.equal(code,405);
});
test('a guest pins its seasonal layout only from the matching authenticated session snapshot',async()=>{
 const {waitForHalloweenSession}=await import('../src/halloween-session.js');const listeners=new Set(),client={subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
 const pending=waitForHalloweenSession(client,{seed:42,ownerId:'a'},{timeout:500});
 for(const fn of listeners)fn({type:'snapshot',snapshot:{state:{seed:99,run:{halloween:{stage:0}}}}});assert.equal(listeners.size,1);
 for(const fn of listeners)fn({type:'snapshot',snapshot:{state:{seed:42,run:{halloween:{stage:0}}}}});assert.equal((await pending).halloween,true);assert.equal(listeners.size,0);
 const normal=waitForHalloweenSession(client,{seed:42},{timeout:500});for(const fn of listeners)fn({type:'snapshot',snapshot:{state:{seed:42,run:{}}}});assert.equal((await normal).halloween,false);
});
test('the host snapshot pins both the seasonal flag and maze edition for late-joining guests',async()=>{
 const {waitForHalloweenSession}=await import('../src/halloween-session.js');for(const maze of [false,true]){let receive;const pending=waitForHalloweenSession({subscribe(fn){receive=fn;return()=>{};}},{seed:42},{timeout:500});receive({type:'snapshot',snapshot:{state:{seed:42,run:{halloween:maze?{maze:true}:{stage:0}}}}});assert.equal((await pending).maze,maze);}
});
