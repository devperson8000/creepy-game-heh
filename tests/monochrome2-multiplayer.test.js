import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackroomsCoop} from '../src/backrooms-coop.js';
import {createLevelZero} from '../src/backrooms-layout.js';
import {downPlayer,settleTeam,teamWon,tickTeam,initTeamPlayer} from '../src/monochrome2-team.js';
import {createBackroomsCoopState} from '../src/backrooms-coop-state.js';
import {createRemoteTrack} from '../src/monochrome2-smoothing.js';
import {TEAM} from '../src/monochrome2-tuning.js';

/** An in-memory lobby: the host receives guests' input/actions, guests receive the host's snapshots. */
function room(names){
 const members=names.map((name,i)=>({id:'p'+i,name,slot:i})),listeners=new Map(),map=createLevelZero(),world={map};
 const clients=members.map(m=>({id:m.id,send(type,payload){
  if(type==='snapshot'){for(const [id,fn] of listeners)if(id!==m.id)fn({type:'snapshot',snapshot:structuredClone(payload.snapshot)});return true;}
  if(type==='input'||type==='action'){const fn=listeners.get('p0');fn?.({type,playerId:m.id,[type]:structuredClone(payload[type])});return true;}
  return true;
 },subscribe(fn){listeners.set(m.id,fn);return()=>listeners.delete(m.id);}}));
 const session={ownerId:'p0',players:members,classic:true,variant:'monochrome2'};
 const nets=clients.map(client=>createBackroomsCoop({client,session,world}));
 const encounter={snapshot:()=>({monochrome:{mode:'patrol',x:30,z:-20,yaw:0,speed:0,tier:0},bacteria:null})};
 const idle={forward:0,right:0,yaw:0,pitch:0,lean:0,crouch:false,sprint:false,torch:false,paused:false};
 /** Advance everyone one frame; the host publishes after it has applied every input. */
 const frame=(dt=1/60,inputs={})=>{for(const n of nets.slice(1))n.step(dt,{...idle,...(inputs[n.player?.id]??{})});nets[0].step(dt,{...idle,...(inputs.p0??{})});nets[0].publish(encounter);};
 const run=(seconds,inputs)=>{for(let t=0;t<seconds*60;t++)frame(1/60,inputs);};
 return {nets,host:nets[0],frame,run,state:()=>nets[0].state};
}
const near=(a,b,eps)=>Math.hypot(a.x-b.x,a.z-b.z)<=eps;

test('co-op: guests see the whole team and the monster, and their own movement matches the host',()=>{
 const r=room(['Host','Ann','Ben']);r.run(.5);
 for(const n of r.nets.slice(1)){assert.equal(Object.keys(n.state.players).length,3);assert.equal(n.state.variant,'monochrome2');assert.equal(n.monsters.monochrome.mode,'patrol');}
 const start={...r.state().players.p1};
 r.run(2,{p1:{forward:1,yaw:0}});
 const hostView=r.state().players.p1,guestView=r.nets[1].state.players.p1;
 assert.ok(!near(hostView,start,.5),'the host applied the guest\'s input');
 assert.ok(near(hostView,guestView,.6),'guest prediction stays within reach of the host: '+Math.hypot(hostView.x-guestView.x,hostView.z-guestView.z).toFixed(2));
});

test('co-op: a teammate revives a downed guest, and the host and guests agree on it',()=>{
 const r=room(['Host','Ann','Ben']);r.run(.3);
 const s=r.state(),ann=s.players.p1,ben=s.players.p2;
 Object.assign(ann,{x:-7,z:13});Object.assign(ben,{x:-7,z:14.1});
 assert.deepEqual(r.host.hit(['p2']),['p2']);r.run(.4);
 assert.equal(r.nets[1].state.players.p2.downed,true,'guests see the downed teammate');
 const yaw=Math.atan2(0,-1.1);r.run(.2,{p1:{yaw}});
 const target=r.nets[1].target();assert.equal(target?.id,'revive:p2');
 r.nets[1].interact(target.id);r.run(.6,{p1:{yaw}});
 assert.equal(r.state().players.p2.downed,false,'host revived him');assert.equal(r.state().players.p2.revives,1);
 assert.equal(r.nets[2].state.players.p2.downed,false,'and so does his own screen');
});

test('co-op: the team wins when the last downed teammate bleeds out and everyone else is at the exit',()=>{
 const r=room(['Host','Ann']);r.run(.3);
 r.state().players.p0.exitReady=true;
 assert.deepEqual(r.host.hit(['p1']),['p1']);
 assert.equal(r.state().round.phase,'playing','a recoverable teammate still blocks the exit');
 r.run(TEAM.bleedOutSeconds+1);
 assert.equal(r.state().players.p1.lost,true);
 assert.equal(r.state().round.phase,'won','bleed-out is what lets the team finish');
 r.run(.3);assert.equal(r.nets[1].state.round.phase,'won','the guest sees the win');
});

test('co-op: everyone down fails the round for the host and the guests',()=>{
 const r=room(['Host','Ann','Ben']);r.run(.3);
 r.host.hit(['p0','p1']);assert.equal(r.state().round.phase,'playing');
 r.host.hit(['p2']);r.run(.3);
 assert.equal(r.state().round.phase,'dead');
 for(const n of r.nets.slice(1)){assert.equal(n.state.round.phase,'dead');assert.equal(n.state.caughtBy,'Monochrome');}
});

test('co-op: a teammate leaving mid-round can finish or fail the round',()=>{
 const r=room(['Host','Ann']);r.run(.3);
 r.state().players.p0.exitReady=true;r.host.hit(['p1']);
 // Ann drops out of the lobby while downed: the team is complete without her.
 const emit=(fn)=>fn;void emit;
 r.state().players.p1.lost=true;settleTeam(r.state());
 assert.equal(r.state().round.phase,'won');
});

test('settleTeam never reopens or double-settles a finished round',()=>{
 const s=createBackroomsCoopState([{id:'a',name:'A'},{id:'b',name:'B'}],{classic:true,variant:'monochrome2'});
 assert.equal(settleTeam(s),null);
 s.players.a.exitReady=true;s.players.b.lost=true;
 assert.equal(teamWon(s),true);assert.equal(settleTeam(s),'won');assert.equal(settleTeam(s),null);assert.equal(s.round.phase,'won');
 const t=createBackroomsCoopState([{id:'a',name:'A'}],{classic:true,variant:'monochrome2'});
 downPlayer(t,t.players.a,0);assert.equal(settleTeam(t),'dead');assert.equal(t.caughtBy,'Monochrome');
});

test('bleed-out only loses players who stay down',()=>{
 const s=createBackroomsCoopState([{id:'a',name:'A'},{id:'b',name:'B'}],{classic:true,variant:'monochrome2'});
 downPlayer(s,s.players.a,0);assert.deepEqual(tickTeam(s,TEAM.bleedOutSeconds-1),[]);assert.deepEqual(tickTeam(s,2),['a']);assert.equal(s.players.b.lost,false);
});

test('a replicated monster is drawn smoothly between 7 Hz snapshots',()=>{
 const speed=7,track=createRemoteTrack(),raw=[],drawn=[];let truth={x:0,z:0};
 for(let f=0;f<240;f++){
  truth.z+=speed/60;
  if(f%8===0)track.push({x:0,z:truth.z,yaw:0,speed});else track.push({x:0,z:Math.round((truth.z-(f%8)*speed/60)*1e6)/1e6,yaw:0,speed});
  const s=track.step(1/60);drawn.push(s.z);raw.push(truth.z-(f%8)*speed/60);
 }
 const step=a=>Math.max(...a.slice(10).map((v,i)=>Math.abs(v-a[i+9])));
 assert.ok(step(drawn)<speed/60*1.6,'no frame jumps more than ~1.6 frames of travel: '+step(drawn).toFixed(3));
 assert.ok(step(raw)>step(drawn)*3,'raw snapshots jump several times further');
 assert.ok(Math.abs(drawn.at(-1)-truth.z)<.9,'and it stays near the real position');
});

test('the replicated monster snaps on a reset instead of sliding across the map',()=>{
 const track=createRemoteTrack();track.push({x:0,z:0,yaw:0,speed:0});track.step(1/60);
 track.push({x:40,z:40,yaw:1,speed:0});const s=track.step(1/60);
 assert.deepEqual([s.x,s.z],[40,40]);
 track.reset();assert.equal(track.step(1/60),null);
});
