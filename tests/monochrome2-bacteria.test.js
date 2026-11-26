import test from 'node:test';
import assert from 'node:assert/strict';
import {createLevelZero} from '../src/backrooms-layout.js';
import {createMonochrome2Space} from '../src/monochrome2-space.js';
import {createBacteria,BACTERIA_MODES} from '../src/monochrome2-bacteria.js';
import {createMonochrome2Encounter} from '../src/monochrome2-encounter.js';
import {BACTERIA_SLOT,MONOCHROME_SLOT} from '../src/monochrome2-entities.js';
import {BACTERIA,MONOCHROME_VISITS,MONSTER} from '../src/monochrome2-tuning.js';
import {BACKROOMS_SPEED} from '../src/backrooms-round.js';
import {createBackroomsCoopState} from '../src/backrooms-coop-state.js';
import {downPlayer} from '../src/monochrome2-team.js';

const map=createLevelZero(),round={doorOpen:false,parts:[],installed:0};
const space=()=>createMonochrome2Space(map,()=>round);
const dt=1/60;
/** A standable stand-in for an open room: sight and paths are straight lines within a radius. */
const openSpace=({sight=40}={})=>({canStand:()=>true,nearestStandable:p=>({x:p.x,z:p.z}),lineClear:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<sight,wallsBetween:()=>0,onBeam:()=>false,
 navigator:()=>({findPath:(a,b)=>[{x:b.x,z:b.z}]})});
const LANDMARKS=[{x:0,z:0},{x:60,z:0},{x:-60,z:0},{x:0,z:60},{x:0,z:-60}];
const quiet=(b,p,seconds,{noises=[],time0=200,tier=0}={})=>{let r,t=time0;for(let i=0;i<seconds*60;i++){t+=dt;r=b.tick(dt,{players:[p],noises,tier,time:t,released:true});}return r;};

test('the Bacteria timings and speeds match what the game documents and leave room to outrun it',()=>{
 assert.equal(BACTERIA.spawnDelay,180,'it appears after about three minutes');
 assert.ok(BACTERIA.speed.chase.base>BACKROOMS_SPEED.walk,'faster than walking');
 assert.ok(BACTERIA.speed.chase.max<BACKROOMS_SPEED.sprint,'but a sprint always outpaces it, so stamina and corners decide a chase');
 assert.ok(BACTERIA.noticeSeconds>=1,'the screech gives a head start');
 assert.ok(BACTERIA.sight.range<MONSTER.sight.range&&BACTERIA.hearingScale>1,'keener ears, shorter sight');
 for(const m of ['absent','knock','roam','notice','chase','search','attack'])assert.ok(BACTERIA_MODES.includes(m));
});

test('it is absent for the first three minutes, then appears out of sight, near the players, knocking',()=>{
 const sp=space(),player={id:'a',x:sp.nearestStandable({x:-7,z:13}).x,z:13,crouch:true};
 const b=createBacteria(sp,{spawn:sp.nearestStandable(BACTERIA_SLOT.spawn),waypoints:BACTERIA_SLOT.patrol,seed:7});
 let t=0;for(;t<179;t+=1){b.tick(1,{players:[player],noises:[],time:t,released:t>=BACTERIA.spawnDelay});assert.equal(b.state.mode,'absent');}
 for(let i=0;i<60;i++){t+=1/60;b.tick(1/60,{players:[player],noises:[],time:t,released:t>=BACTERIA.spawnDelay});}
 assert.equal(b.state.mode,'knock');assert.equal(b.state.appearances,1);
 const away=Math.hypot(b.state.x-player.x,b.state.z-player.z);assert.ok(away>=BACTERIA.spawnMinDistance,'appears at a distance: '+away.toFixed(1));
 assert.equal(sp.lineClear(b.state,player)&&away<BACTERIA.sight.range*1.4,false,'never in the player\'s line of sight');
 for(let i=0;i<8*60;i++){t+=1/60;b.tick(1/60,{players:[player],noises:[],time:t,released:true});}
 assert.equal(b.state.knocks,BACTERIA.arrivalKnocks,'it mimics knocking to lure players off route');
 assert.notEqual(b.state.mode,'knock');
});

test('it roams aimlessly, and pauses now and then to knock again',()=>{
 const b=createBacteria(openSpace(),{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:3}),far={id:'a',x:500,z:500,crouch:true};
 const modes=new Set(),positions=[];let t=200;
 for(let i=0;i<150*60;i++){t+=dt;b.tick(dt,{players:[far],noises:[],time:t,released:true});modes.add(b.state.mode);if(i%600===0)positions.push({x:b.state.x,z:b.state.z});}
 assert.ok(modes.has('roam'));assert.ok(b.state.knocks>BACTERIA.arrivalKnocks,'roaming knocks repeat: '+b.state.knocks);
 assert.ok(new Set(positions.map(p=>Math.round(p.x/5)+','+Math.round(p.z/5))).size>2,'it wanders between landmarks');
});

test('it screeches when it notices you, stands still for the screech, then chases below sprint speed',()=>{
 const b=createBacteria(openSpace({sight:60}),{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:5}),p={id:'a',x:10,z:0,crouch:false};
 b.state.mode='roam';b.state.appeared=true;b.state.yaw=Math.PI/2;b.state.nextRoamKnock=1e9;
 let r=b.tick(dt,{players:[p],noises:[],time:200,released:true});
 assert.equal(r.spotted,true);assert.equal(b.state.mode,'notice');assert.equal(b.state.notices,1);
 const at={x:b.state.x,z:b.state.z};let t=200,screech=0;
 while(b.state.mode==='notice'){t+=dt;b.tick(dt,{players:[p],noises:[],time:t,released:true});screech+=dt;assert.equal(b.state.speed,0,'it does not move while screeching');}
 assert.ok(Math.abs(screech-BACTERIA.noticeSeconds)<.1);assert.deepEqual([b.state.x,b.state.z],[at.x,at.z]);
 assert.equal(b.state.mode,'chase');p.x=40;t+=dt;b.tick(dt,{players:[p],noises:[],time:t,released:true});
 assert.ok(b.state.speed>=BACTERIA.speed.chase.base&&b.state.speed<BACKROOMS_SPEED.sprint);
});

test('crouching in the dark keeps you hidden; sprinting does not',()=>{
 const make=()=>createBacteria(openSpace({sight:60}),{spawn:{x:0,z:0},waypoints:[{x:0,z:0}],seed:2});
 const crouched=make(),sprinting=make();for(const b of [crouched,sprinting]){b.state.mode='roam';b.state.appeared=true;b.state.yaw=Math.PI/2;b.state.nextRoamKnock=1e9;}
 const ghost={id:'a',x:12,z:0,crouch:true};
 quiet(crouched,ghost,4,{noises:[{x:12,z:0,radius:2.5,type:'crouch',playerId:'a',at:0}]});
 assert.ok(['roam','knock'].includes(crouched.state.mode),'a crouched player 12 m away is not noticed, was '+crouched.state.mode);
 const runner={id:'a',x:12,z:0,crouch:false};
 quiet(sprinting,runner,.5,{noises:[{x:12,z:0,radius:30,type:'sprint',playerId:'a',at:0}]});
 assert.ok(['notice','chase','investigate'].includes(sprinting.state.mode),'a sprinting player is heard, was '+sprinting.state.mode);
});

test('it gives up after losing you, searches, vanishes, and reappears somewhere else',()=>{
 const sp=openSpace({sight:30}),b=createBacteria(sp,{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:11}),p={id:'a',x:10,z:0,crouch:false};
 b.state.mode='chase';b.state.appeared=true;b.state.lastSeen={x:10,z:0};b.state.nextRoamKnock=1e9;
 p.x=400;p.z=400;let t=200,sawSearch=false,sawAbsent=false,reappeared=null;const before={x:b.state.x,z:b.state.z};
 for(let i=0;i<90*60&&!reappeared;i++){t+=dt;b.tick(dt,{players:[p],noises:[],time:t,released:true});
  if(b.state.mode==='search')sawSearch=true;if(b.state.mode==='absent')sawAbsent=true;
  if(sawAbsent&&b.state.mode!=='absent')reappeared={x:b.state.x,z:b.state.z};}
 assert.ok(sawSearch&&sawAbsent&&reappeared,'chase -> search -> vanish -> reappear');
 assert.equal(b.state.appearances,1,'it came back once');assert.ok(Math.hypot(reappeared.x-before.x,reappeared.z-before.z)>1,'a different place');
});

test('reaching your last known spot with nobody there makes it give up faster (a dead end)',()=>{
 const run=(onSpot)=>{const b=createBacteria(openSpace({sight:5}),{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:4}),far={id:'a',x:300,z:300,crouch:true};
  Object.assign(b.state,{mode:'chase',appeared:true,nextRoamKnock:1e9,lastSeen:onSpot?{x:0,z:0}:{x:60,z:0}});
  let t=200;for(let i=0;i<20*60;i++){t+=dt;b.tick(dt,{players:[far],noises:[],time:t,released:true});if(b.state.mode==='search')return t-200;}return Infinity;};
 assert.ok(run(true)<run(false),'giving up is quicker at a dead end');
});

test('it downs a player it reaches, and a freshly revived player is protected',()=>{
 const b=createBacteria(openSpace({sight:60}),{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:6}),p={id:'a',x:.8,z:0,crouch:false};
 b.state.mode='chase';b.state.appeared=true;b.state.yaw=Math.PI/2;b.state.lastSeen={x:.8,z:0};
 let r=b.tick(dt,{players:[p],noises:[],time:200,released:true});assert.deepEqual(r.caught,['a']);assert.equal(b.state.mode,'attack');
 const c=createBacteria(openSpace({sight:60}),{spawn:{x:0,z:0},waypoints:LANDMARKS,seed:6});Object.assign(c.state,{mode:'chase',appeared:true,yaw:Math.PI/2,lastSeen:{x:.8,z:0}});
 c.protect('a',210);r=c.tick(dt,{players:[p],noises:[],time:200,released:true});assert.deepEqual(r.caught,[]);
});

// ---------------- integration: the encounter with a stand-in actor ----------------
const fakeActor=()=>{const log=[];return {log,update:(f,d)=>log.push(f),dispose(){log.disposed=true;}};};
const encounter=(opts={})=>{const actor=fakeActor();const e=createMonochrome2Encounter({map,scene:{}},{round:()=>round,bacteriaActorFactory:opts.offline?()=>Promise.reject(new Error('404')):()=>actor,onNotice:()=>{},...opts.extra});return {e,actor};};
const standing=e=>({id:'solo',x:e.space.nearestStandable({x:-7,z:13}).x,z:13,y:0,crouch:true,speed:0});

test('encounter: with the Bacteria online it is the main monster and Monochrome stays away early',async()=>{
 const {e,actor}=encounter();await e.ready;assert.equal(e.bacteriaOnline,true);
 const player=standing(e);let t=0;
 for(let i=0;i<30*120;i++){t+=1/30;e.update(1/30,t,player,0,{});}
 assert.equal(e.entityState.mode,'dormant','no Monochrome for the first two minutes');assert.equal(e.bacteriaMode,'absent');
 assert.equal(e.snapshot().bacteria.mode,'absent');
 for(let i=0;i<30*80;i++){t+=1/30;e.update(1/30,t,player,0,{});}
 assert.notEqual(e.bacteriaMode,'absent','three minutes in, the Bacteria is out');assert.ok(e.snapshot().bacteria.knocks>=0);
 assert.equal(e.entityState.mode,'dormant','Monochrome still has not appeared');
 assert.ok(actor.log.length>0,'the actor is driven every frame');e.dispose();assert.ok(actor.log.disposed);
});

test('encounter: Monochrome visits at most twice, briefly, with a long gap, then withdraws',async()=>{
 const {e}=encounter({extra:{seed:99}});await e.ready;
 const far={id:'solo',x:e.space.nearestStandable({x:25,z:-37}).x+0,z:-37,y:0,crouch:true,speed:0,downed:true};// never huntable: we only watch the schedule
 let t=0;const windows=[];let open=null;
 for(let i=0;i<60*1500;i++){t+=1;e.update(1,t,far,0,{});const on=e.entityState.mode!=='dormant';if(on&&!open){open={start:t};}if(!on&&open){open.end=t;windows.push(open);open=null;}}
 if(open){open.end=t;windows.push(open);}
 assert.ok(windows.length>=1&&windows.length<=MONOCHROME_VISITS.max,'visits: '+windows.length);
 assert.ok(windows[0].start>=MONOCHROME_VISITS.first[0]-2,'first visit not before '+MONOCHROME_VISITS.first[0]+'s, was '+windows[0].start);
 for(const w of windows)assert.ok(w.end-w.start<=MONOCHROME_VISITS.length[1]+2,'visit length '+(w.end-w.start));
 if(windows[1])assert.ok(windows[1].start-windows[0].end>=MONOCHROME_VISITS.gap[0]-2,'a long quiet gap between visits');
 e.dispose();
});

test('encounter: if the Bacteria model fails to load, Monochrome patrols as before and nothing invisible hunts',async()=>{
 const notes=[];const {e}=encounter({offline:true,extra:{onNotice:t=>notes.push(t)}});await e.ready;
 assert.equal(e.bacteriaOnline,false);assert.ok(notes.some(t=>/Bacteria could not load/.test(t)));
 const player=standing(e);let t=0;for(let i=0;i<30*30;i++){t+=1/30;e.update(1/30,Math.max(t,MONSTER.grace+1),player,0,{});}
 assert.notEqual(e.entityState.mode,'dormant','Monochrome is released after his grace period instead');assert.equal(e.snapshot().bacteria,null);
 const quietRound=standing(e);for(let i=0;i<30*200;i++){t+=1/30;const r=e.update(1/30,300+t,quietRound,0,{});assert.ok(!r.downs?.some(d=>d.by==='Bacteria'));}
 e.dispose();
});

test('encounter: a catch reports who made it, and only Monochrome plays the metal jumpscare',async()=>{
 const jumped=[];const {e}=encounter({extra:{audioFactory:()=>({update(){},jumpscare:()=>jumped.push(1),dispose(){}})}});await e.ready;
 const player={...standing(e),crouch:false};
 // The Bacteria is beside the player, mid-chase, long after it first appears.
 Object.assign(e.bacteriaSimulation.state,{mode:'chase',appeared:true,x:player.x-.8,z:player.z,yaw:Math.PI/2,lastSeen:{x:player.x,z:player.z}});
 const res=e.update(1/30,200,player,0,{});
 assert.deepEqual(res.downedIds,['solo']);assert.equal(res.downs[0].by,'Bacteria');assert.equal(res.caughtBy,'Bacteria');assert.equal(res.caught,true,'a lone player down fails the round');
 assert.equal(jumped.length,0,'no Monochrome jumpscare for a Bacteria hit');
 assert.equal(e.snapshot().bacteria.mode,'attack');
});

test('co-op: a hit remembers whether the Bacteria or Monochrome made it',()=>{
 const s=createBackroomsCoopState([{id:'a',name:'A'},{id:'b',name:'B'}],{classic:true,variant:'monochrome2'});
 downPlayer(s,s.players.a,0,'Bacteria');downPlayer(s,s.players.b,0,'Monochrome');
 assert.equal(s.players.a.downedBy,'Bacteria');assert.equal(s.players.b.downedBy,'Monochrome');
});
