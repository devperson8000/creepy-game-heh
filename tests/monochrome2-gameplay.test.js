import test from 'node:test';
import assert from 'node:assert/strict';
import {isMonochrome2PlayPath,isMonochrome2TestPath,isMonochrome2IntroPath} from '../src/monochrome2-route.js';
import {monochrome2ReleaseStatus,parseReleaseAt,MONOCHROME2_RELEASE_VERSION} from '../src/monochrome2-release-time.js';
import {createMonochrome2Release,countdownParts} from '../src/monochrome2-release.js';
import {gateLabel} from '../src/monochrome2-gate.js';
import {MONSTER,NOISE,TELEGRAPH,TEAM,HOLD,tierSpeed,tierFromRound,holdSeconds} from '../src/monochrome2-tuning.js';
import {BACKROOMS_SPEED,createBackroomsRound} from '../src/backrooms-round.js';
import {createLevelZero} from '../src/backrooms-layout.js';
import {createMonochrome2Space} from '../src/monochrome2-space.js';
import {createMonochromeMonster} from '../src/monochrome2-monster.js';
import {footstepEmitter,interactionNoise,balanceNoise,strongestHeard} from '../src/monochrome2-senses.js';
import {telegraphMix} from '../src/monochrome2-telegraph.js';
import {MONOCHROME2_ENTITIES,activeEntities,reservedEntities,MONOCHROME_SLOT} from '../src/monochrome2-entities.js';
import {createBackroomsCoopState,stepBackroomsPlayer,interactBackroomsCoop,backroomsCoopTarget,resetBackroomsCoop} from '../src/backrooms-coop-state.js';
import {downPlayer,revivePlayer,tickTeam,teamFailed,teamWon,MONOCHROME2_VARIANT} from '../src/monochrome2-team.js';
import {createMonochrome2Encounter} from '../src/monochrome2-encounter.js';
import {encodeBackroomsRoom,parseBackroomsRoom} from '../src/backrooms-room.js';

const map=createLevelZero();
const setup=(round={},spawn=MONOCHROME_SLOT.spawn)=>{const r={doorOpen:false,...round},space=createMonochrome2Space(map,()=>r);return {r,space,m:createMonochromeMonster(space,{spawn,waypoints:MONOCHROME_SLOT.patrol,seed:7})};};
const run=(m,seconds,ctx,dt=1/30)=>{let t=ctx.time??0,out=[];for(let i=0;i<seconds/dt;i++){t+=dt;const r=m.tick(dt,{...ctx,time:t});out.push(r);}return out;};

test('routes: play is separate from the cinematic',()=>{
 assert.ok(isMonochrome2PlayPath('/monochrome2/play')&&isMonochrome2PlayPath('/monochrome2/play/'));
 assert.ok(isMonochrome2TestPath('/testmonochrome2')&&isMonochrome2TestPath('/testmonochrome2/'));
 assert.ok(!isMonochrome2TestPath('/monochrome2/play')&&!isMonochrome2PlayPath('/testmonochrome2'));
 assert.ok(!isMonochrome2PlayPath('/monochrome2')&&!isMonochrome2PlayPath('/backrooms'));
 assert.ok(isMonochrome2IntroPath('/monochrome2')&&!isMonochrome2IntroPath('/monochrome2/play'));
});
test('release timer: sealed until scheduled, opens by server clock, fails closed',async()=>{
 assert.equal(monochrome2ReleaseStatus(1e12,null).released,false);
 assert.equal(monochrome2ReleaseStatus(1e12,'junk').scheduled,false);
 assert.equal(parseReleaseAt('2026-12-05T20:00:00+11:00'),Date.parse('2026-12-05T20:00:00+11:00'));
 let clock=0;const at=5000;
 const rel=createMonochrome2Release({now:()=>clock,fetchStatus:async()=>({version:MONOCHROME2_RELEASE_VERSION,releaseAt:at,serverNow:1000})});
 assert.equal(rel.sample().released,false);assert.equal(rel.sample().confirmed,false);
 await rel.refresh();assert.equal(rel.sample().scheduled,true);assert.equal(rel.sample().released,false);
 clock=3999;assert.equal(rel.sample().released,false);clock=4000;assert.equal(rel.sample().released,true);
 const bad=createMonochrome2Release({fetchStatus:async()=>({version:'wrong',releaseAt:0,serverNow:9e12})});await bad.refresh();assert.equal(bad.sample().released,false);
 assert.match(gateLabel({confirmed:true,scheduled:false,released:false}),/TO BE ANNOUNCED/);
 assert.match(gateLabel({confirmed:true,scheduled:true,released:false,remainingMs:3661000}),/01:01:01/);
 assert.deepEqual(countdownParts(90061000),{days:1,hours:1,minutes:1,seconds:1});
});
test('chase speed is retuned for Level 0: faster than Level 0 sprint, far above Monochrome 1',()=>{
 assert.ok(MONSTER.speed.chase.base>BACKROOMS_SPEED.sprint);
 assert.ok(MONSTER.speed.chase.base>3.95*2);
 assert.ok(MONSTER.speed.investigate.base>BACKROOMS_SPEED.walk);
 assert.ok(MONSTER.speed.patrol.base<BACKROOMS_SPEED.walk);
 assert.ok(tierSpeed('chase',7)>tierSpeed('chase',0));
});
test('he is audible before he is visible',()=>{
 assert.ok(TELEGRAPH.range>MONSTER.sight.range*1.25);
 let last=null;for(const d of [33,25,18,10,4]){const m=telegraphMix({distance:d,mode:'patrol'});assert.ok(m.audible);if(last){assert.ok(m.whineGain>last.whineGain&&m.clickGain>last.clickGain&&m.clickPeriod<last.clickPeriod&&m.whineHz>last.whineHz);}last=m;}
 assert.equal(telegraphMix({distance:TELEGRAPH.range+1}).audible,false);
 assert.ok(telegraphMix({distance:10,occluded:true}).whineGain<telegraphMix({distance:10}).whineGain);
 assert.ok(telegraphMix({distance:10,mode:'chase'}).whineHz>telegraphMix({distance:10,mode:'patrol'}).whineHz);
});
test('slots: Monochrome fills the live slot, bacteria stays reserved without a stand-in',()=>{
 assert.deepEqual(activeEntities().map(e=>e.id),['monochrome']);
 assert.deepEqual(reservedEntities().map(e=>e.id),['bacteria']);
 assert.equal(MONOCHROME2_ENTITIES.bacteria.modelUrl,null);assert.equal(MONOCHROME_SLOT.modelUrl,null);
 assert.ok(MONOCHROME_SLOT.height<map.height);
});
test('patrol: he leaves a far spawn and walks every Level 0 area',()=>{
 const {m}=setup(),seen=new Set();let t=0;
 for(let i=0;i<30*900;i++){t+=1/30;m.tick(1/30,{players:[],noises:[],time:t});for(const a of map.areas)if(Math.hypot(a.x-m.state.x,a.z-m.state.z)<3)seen.add(a.name);}
 assert.equal(seen.size,map.areas.length);assert.equal(m.state.mode,'patrol');
});
test('he stays dormant until the grace period ends',()=>{
 const {m}=setup();run(m,5,{players:[],noises:[],released:false});assert.equal(m.state.mode,'dormant');assert.equal(m.state.travel,0);
});
test('footsteps: crouching is near silent, sprinting carries furthest',()=>{
 const e=footstepEmitter(),get=o=>{let n=null;for(let i=0;i<40&&!n;i++)n=e.step('a',.3,{x:0,z:0,...o});return n;};
 const walk=get({}),sprint=get({sprint:true}),crouch=get({crouch:true});
 assert.ok(sprint.radius>walk.radius&&walk.radius>crouch.radius);assert.ok(crouch.radius<=3);
});
test('hearing: a wall between source and monster shortens reach; urgent noise outranks',()=>{
 const {space}=setup();
 // The wall at z=8 spans x -18..-6. Same 7 m distance: one source in the open, one through the wall.
 const mon={x:-12,z:10.5};
 const through={x:-12,z:3.5,radius:NOISE.walk,type:'walk'},clearSide={x:-12,z:17.5,radius:NOISE.walk,type:'walk'};
 assert.equal(space.wallsBetween(mon,through),1);assert.equal(space.wallsBetween(mon,clearSide),0);
 assert.equal(strongestHeard(mon,[clearSide],space),clearSide);
 assert.equal(strongestHeard(mon,[through],space),null);
 const urgent={...through,urgent:true,radius:30};
 assert.equal(strongestHeard(mon,[clearSide,urgent],space),urgent);
});
test('investigate: a heard footstep sends him to the sound, then he searches and resumes patrol',()=>{
 const {m}=setup({},{x:-7,z:13});
 run(m,.1,{players:[],noises:[],released:true,time:20});
 const n={x:-7,z:2.5,radius:30,type:'sprint',at:20,playerId:'a'};
 const out=run(m,.4,{players:[],noises:[n],released:true,time:20});
 assert.equal(m.state.mode,'investigate');
 run(m,25,{players:[],noises:[],released:true,time:21});
 assert.ok(['search','patrol'].includes(m.state.mode));
 run(m,20,{players:[],noises:[],released:true,time:60});assert.equal(m.state.mode,'patrol');
});
// Open east-west line through the arrival rooms: spawn (-7,13) looking east (+x) along z=13.
const EAST=Math.PI/2,eyeSpawn={x:-7,z:13};
test('sight: direct line only; walls and crouching defeat it',()=>{
 const look=(player,yaw=EAST)=>{const {m}=setup({},eyeSpawn);m.state.yaw=yaw;run(m,.3,{players:[player],noises:[],released:true,time:30});return m.state.mode;};
 const d=MONSTER.sight.range*.7;
 assert.equal(look({id:'p',x:-7+d,z:13,crouch:false}),'chase','standing at 70% of range is seen');
 assert.notEqual(look({id:'p',x:-7+d,z:13,crouch:true}),'chase','crouching at 70% of range is not');
 assert.notEqual(look({id:'p',x:-12,z:5,crouch:false},0),'chase','a wall between them blocks sight at 8 m');
 assert.notEqual(look({id:'p',x:-7-d,z:13,crouch:false}),'chase','behind him and beyond arm\'s reach is not seen');
});
test('chase: a stationary player in line of sight is caught',()=>{
 const {m}=setup({},eyeSpawn);m.state.yaw=EAST;
 const p={id:'p',x:-7+8,z:13,crouch:false};let caught=false,t=30;
 for(let i=0;i<30*10&&!caught;i++){t+=1/30;if(m.tick(1/30,{players:[p],noises:[],released:true,time:t}).caught.length)caught=true;}
 assert.ok(caught);assert.equal(m.state.mode,'attack');
});
test('chase: he outruns a walking player and holds pace with a sprinter',()=>{
 const gap=(speed)=>{const {m}=setup({},eyeSpawn);m.state.yaw=EAST;const p={id:'p',x:-7+10,z:13,crouch:false};let t=30;
  for(let i=0;i<30*3;i++){t+=1/30;p.x+=speed/30;m.tick(1/30,{players:[p],noises:[],released:true,time:t});}return p.x-m.state.x;};
 assert.ok(gap(BACKROOMS_SPEED.walk)<10,'walking: he closes the gap');
 assert.ok(gap(BACKROOMS_SPEED.sprint)>=gap(BACKROOMS_SPEED.walk));
 assert.ok(gap(BACKROOMS_SPEED.sprint)>5,'sprinting buys little but real distance in a short run');
});
test('chase: after losing the player he follows the last seen point, then searches, then patrols',()=>{
 const {m}=setup({},eyeSpawn);m.state.yaw=EAST;
 run(m,.2,{players:[{id:'p',x:-7+8,z:13,crouch:false}],noises:[],released:true,time:30});assert.equal(m.state.mode,'chase');
 run(m,3,{players:[],noises:[],released:true,time:31});assert.equal(m.state.mode,'search');
 run(m,MONSTER.search.seconds+12,{players:[],noises:[],released:true,time:60});assert.equal(m.state.mode,'patrol');
});
test('catch: downs the player, staggers, then searches the spot; revive grace stops an instant re-catch',()=>{
 const {m}=setup({},eyeSpawn);m.state.yaw=EAST;
 const p={id:'p',x:-7+1.2,z:13,crouch:false};
 const first=m.tick(.1,{players:[p],noises:[],released:true,time:40});assert.deepEqual(first.caught,['p']);
 const during=run(m,MONSTER.catchStagger-.3,{players:[p],noises:[],released:true,time:40.1});assert.ok(during.every(r=>!r.caught.length));
 run(m,1,{players:[],noises:[],released:true,time:43});assert.equal(m.state.mode,'search');
 m.protect('p',100);const again=run(m,1,{players:[p],noises:[],released:true,time:50});assert.ok(again.every(r=>!r.caught.length));
});
test('beams: he is slower on the pitfall beams than on solid floor',()=>{
 const {r,space}=setup({doorOpen:true});
 assert.ok(space.canStand(60,-16)&&!space.canStand(60,-14),'beam yes, shaft no');
 assert.ok(space.onBeam(60,-16)&&!space.onBeam(30,-16));
 const closed=createMonochrome2Space(map,()=>({doorOpen:false}));assert.equal(closed.canStand(50,-16),false,'closed door keeps him out');
 assert.ok(MONSTER.beamSpeedFactor<1);
});
test('a wobble or a scream on a beam carries; a closed door softens sound',()=>{
 const st={},p={id:'a',x:55,z:-16,balance:{active:true,angle:.7,falling:false}};
 assert.equal(balanceNoise(p,st,10).type,'wobble');assert.equal(balanceNoise(p,st,10.2),null);
 assert.equal(balanceNoise({...p,balance:{active:true,angle:.9,falling:true}},st,12).urgent,true);
 const open=createMonochrome2Space(map,()=>({doorOpen:true})),shut=createMonochrome2Space(map,()=>({doorOpen:false}));
 const a={x:30,z:-16},b={x:52,z:-16};
 assert.ok(shut.wallsBetween(a,b)>open.wallsBetween(a,b));
});
test('objective noise: exit door is an alarm, pickups are quiet, holds are longer',()=>{
 const door=interactionNoise('pit-exit-door',{x:0,z:0});assert.equal(door.urgent,true);
 assert.ok(interactionNoise('part-2',{x:0,z:0}).radius<interactionNoise('ladder',{x:0,z:0}).radius);
 assert.equal(interactionNoise('nonsense',{x:0,z:0}),null);
 assert.ok(HOLD.ladder>.8&&HOLD['pit-exit-door']>HOLD.door);assert.equal(holdSeconds('part-3',1),HOLD.part);
});
test('he gets harder as the team progresses',()=>{
 const r=createBackroomsRound();assert.equal(tierFromRound(r),0);
 r.installed=4;r.hasKey=true;r.doorOpen=true;r.upperExitOpen=true;assert.equal(tierFromRound(r),7);
 assert.ok(tierSpeed('chase',7)>BACKROOMS_SPEED.sprint+1);
});

// ---- team rules on the real co-op state
const team=(n=2)=>createBackroomsCoopState(Array.from({length:n},(_,i)=>({id:'p'+i,slot:i,name:'P'+i})),{variant:MONOCHROME2_VARIANT});
const face=(a,b)=>{a.x=b.x-.8;a.z=b.z;a.yaw=-Math.PI/2;};
test('1–4 players are supported and Level 0 co-op state is unchanged without the variant',()=>{
 for(const n of [1,2,3,4])assert.equal(Object.keys(team(n).players).length,n);
 assert.throws(()=>team(5));
 const plain=createBackroomsCoopState([{id:'a'}]);assert.equal(plain.variant,undefined);assert.equal(plain.players.a.downed,undefined);
});
test('a hit downs a player who cannot move or act; a teammate revives them',()=>{
 const s=team(2),[a,b]=[s.players.p0,s.players.p1];
 assert.ok(downPlayer(s,a));assert.equal(downPlayer(s,a),false);
 a.x=-7;a.z=13;const before={x:a.x,z:a.z};stepBackroomsPlayer(s,a,{forward:1,right:0,yaw:0,pitch:0,sprint:true},.05,map);assert.deepEqual({x:a.x,z:a.z},before);
 assert.equal(backroomsCoopTarget(s,'p0',()=>true),null);
 face(b,a);const t=backroomsCoopTarget(s,'p1',()=>true);assert.equal(t.id,'revive:p0');assert.equal(t.duration,TEAM.reviveSeconds);
 assert.equal(interactBackroomsCoop(s,'p1','revive:p0',()=>true).ok,true);assert.equal(a.downed,false);assert.equal(a.revives,1);
 assert.equal(interactBackroomsCoop(s,'p0','revive:p1',()=>true).ok,false);
});
test('cannot revive from across the map or revive someone who is not down',()=>{
 const s=team(2),[a,b]=[s.players.p0,s.players.p1];downPlayer(s,a);a.x=-7;a.z=13;b.x=10;b.z=13;b.yaw=0;
 assert.equal(revivePlayer(s,'p1','p0'),false);face(b,a);assert.equal(revivePlayer(s,'p1','p0'),true);assert.equal(revivePlayer(s,'p1','p0'),false);
});
test('the whole team down fails the round; one standing player keeps it alive',()=>{
 const s=team(3);downPlayer(s,s.players.p0);downPlayer(s,s.players.p1);assert.equal(teamFailed(s),false);downPlayer(s,s.players.p2);assert.equal(teamFailed(s),true);
 const solo=team(1);assert.equal(teamFailed(solo),false);downPlayer(solo,solo.players.p0);assert.equal(teamFailed(solo),true);
});
test('revives are limited and bleed-out is final',()=>{
 const s=team(2),[a,b]=[s.players.p0,s.players.p1];a.x=-7;a.z=13;face(b,a);
 for(let i=0;i<TEAM.maxRevives;i++){downPlayer(s,a);assert.equal(a.lost,false);assert.ok(revivePlayer(s,'p1','p0'));}
 downPlayer(s,a);assert.equal(a.lost,true);assert.equal(revivePlayer(s,'p1','p0'),false);
 const s2=team(2);downPlayer(s2,s2.players.p0);assert.deepEqual(tickTeam(s2,TEAM.bleedOutSeconds-1),[]);assert.deepEqual(tickTeam(s2,2),['p0']);assert.equal(s2.players.p0.lost,true);
});
test('ending is harder: everyone left must exit, a recoverable teammate blocks it, a lost one does not',()=>{
 const s=team(3),[a,b,c]=Object.values(s.players);
 s.round.doorOpen=true;s.round.upperExitOpen=true;
 const exit=p=>{p.x=s.round.vent.x-.5;p.z=-15.8;p.y=0;p.yaw=-Math.PI/2;p.crouch=true;return interactBackroomsCoop(s,p.id,'vent',()=>true);};
 downPlayer(s,c);assert.ok(exit(a).ok);assert.ok(exit(b).ok);assert.equal(s.round.phase,'playing','downed-but-recoverable teammate blocks the exit');
 c.lost=true;assert.equal(teamWon(s),true);
 const s2=team(2);downPlayer(s2,s2.players.p0);s2.players.p0.lost=true;downPlayer(s2,s2.players.p1);assert.equal(teamWon(s2),false);
 const fresh=team(2);fresh.players.p0.downed=true;resetBackroomsCoop(fresh);assert.equal(fresh.variant,MONOCHROME2_VARIANT);assert.equal(fresh.players.p0.downed,false);
});
test('Monochrome room tags keep lobbies separate from Level 0',()=>{
 const name=encodeBackroomsRoom('Hunt',{classic:true,friendsOnly:false,variant:'monochrome2'});
 assert.deepEqual(parseBackroomsRoom(name),{name:'Hunt',classic:true,friendsOnly:false,variant:'monochrome2'});
 assert.equal(parseBackroomsRoom(encodeBackroomsRoom('x')).variant,undefined);
});

// ---- encounter seam, with injected (headless) actor/audio
test('encounter: noise from a player draws him; a catch downs the player and a lone player fails the round',async()=>{
 const round={doorOpen:false,parts:[],installed:0},world={map,scene:{}};
 const jumped=[];const enc=createMonochrome2Encounter(world,{round:()=>round,audioFactory:()=>({update(){},jumpscare:()=>jumped.push(1),dispose(){}})});
 const player={id:'solo',x:enc.space.nearestStandable({x:-7,z:13}).x,z:13,y:0,crouch:false};
 enc.simulation.state.x=player.x-10;enc.simulation.state.z=13;enc.simulation.state.yaw=EAST;
 let t=0,res;for(let i=0;i<30*40;i++){t+=1/30;enc.movement(.3,true,player);res=enc.update(1/30,Math.max(t,20),player,0,{});if(res.attacked)break;}
 assert.ok(res.attacked&&res.caught&&res.caughtBy==='Monochrome');assert.deepEqual(res.downedIds,['solo']);assert.equal(jumped.length,1);
 assert.equal(enc.snapshot().bacteria,null);assert.equal(enc.snapshot().monochrome.mode,'attack');
});
test('encounter: a downed player is invisible to him, and co-op reports every downed id for the host',()=>{
 const round={doorOpen:false,parts:[],installed:0},enc=createMonochrome2Encounter({map,scene:{}},{round:()=>round});
 const a={id:'a',x:-7,z:13,y:0,downed:true},b={id:'b',x:-7,z:60,y:0};
 enc.simulation.state.x=-9;enc.simulation.state.z=13;
 let hit=false;for(let i=0;i<30*10;i++){const r=enc.update(1/30,20+i/30,a,0,{targets:[a,b]});if(r.downedIds.length)hit=true;}
 assert.equal(hit,false);
});
test('crouching in cover is quiet: a crouch-walker is not heard from a spot where a sprinter is',()=>{
 const {space}=setup(),mon={x:-7,z:13},e=footstepEmitter();
 let sprint=null,crouch=null;for(let i=0;i<40;i++){sprint??=e.step('s',.3,{sprint:true,x:-7,z:-0});crouch??=e.step('c',.3,{crouch:true,x:-7,z:-0});}
 assert.ok(strongestHeard(mon,[sprint],space)!==undefined);
 assert.equal(strongestHeard(mon,[{...crouch,z:13+MONSTER.hearing.base*NOISE.crouch+3}],space),null);
});
test('patrol never stalls across many seeds, and crosses the pitfall beams once the door is open',()=>{
 for(const seed of [1,2,3,4,5,6,7,8,9,10,11,12]){
  const r={doorOpen:seed%2===0},space=createMonochrome2Space(map,()=>r),m=createMonochromeMonster(space,{spawn:MONOCHROME_SLOT.spawn,waypoints:[...MONOCHROME_SLOT.patrol,{x:60,z:-16}],seed});
  let still=0,worst=0,prev=null,t=0,onBeam=false;
  for(let i=0;i<30*400;i++){t+=1/30;m.tick(1/30,{players:[],noises:[],time:t,focus:[]});const s=m.state;
   still=prev&&Math.hypot(s.x-prev.x,s.z-prev.z)<1e-4?still+1/30:0;worst=Math.max(worst,still);prev={x:s.x,z:s.z};
   assert.ok(space.canStand(s.x,s.z),'always on standable floor (seed '+seed+')');if(space.onBeam(s.x,s.z))onBeam=true;}
  assert.ok(worst<3,'seed '+seed+' stalled '+worst.toFixed(1)+'s');
  if(!r.doorOpen)assert.ok(m.state.x<41.5,'closed door keeps him out');
 }
});
test('model import spaces exist for the hazmat and the bacteria and request nothing until ready',async()=>{
 const {BACKROOMS_MODEL_SPACES,backroomsModelUrl,BACKROOMS_MODEL_DIR}=await import('../src/backrooms-models.js');
 const {BACKROOMS_PLAYER_MODEL}=await import('../src/backrooms-player-config.js');
 const {readFileSync,existsSync}=await import('node:fs');
 for(const id of ['hazmat','bacteria']){assert.ok(BACKROOMS_MODEL_SPACES[id]);assert.equal(backroomsModelUrl(id),BACKROOMS_MODEL_SPACES[id].ready?BACKROOMS_MODEL_DIR+BACKROOMS_MODEL_SPACES[id].file:null);}
 assert.ok(existsSync(new URL('../public/models/backrooms/README.md',import.meta.url)));
 assert.equal(BACKROOMS_PLAYER_MODEL,backroomsModelUrl('hazmat'));
 assert.equal(MONOCHROME2_ENTITIES.bacteria.modelUrl,backroomsModelUrl('bacteria'));
 for(const id of ['hazmat','bacteria'])if(BACKROOMS_MODEL_SPACES[id].ready)assert.ok(existsSync(new URL('../public'+BACKROOMS_MODEL_DIR+BACKROOMS_MODEL_SPACES[id].file,import.meta.url)),id+' is marked ready but its file is missing');
});
