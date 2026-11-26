import {BACTERIA} from './monochrome2-tuning.js';
import {tierSpeedFor,tierScale} from './monochrome2-bacteria-tuning.js';
import {strongestHeard} from './monochrome2-senses.js';
import {randomSource} from './level.js';
import {sweepMove} from './navigation.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const BACTERIA_MODES=Object.freeze(['absent','knock','roam','investigate','notice','chase','search','attack']);

/**
 * Pure Bacteria simulation (no rendering, audio or DOM), after Escape the Backrooms' Level 0 entity:
 *  - absent for the first three minutes, then it appears near the players, out of sight, knocking;
 *  - it roams aimlessly, stopping now and then to knock again;
 *  - it notices by sight or sound, screeches (a short, stationary 'notice'), then runs you down;
 *  - it chases until it has lost you for a while; a dead end or a clean break of sight makes it
 *    give up, search, then vanish and reappear somewhere else;
 *  - crouching and corners are the counterplay; there is no fighting it.
 * `knocks`, `notices` and `chases` are event counters so audio can react without the sim knowing about audio.
 */
export function createBacteria(space,{spawn,waypoints,seed=1}){
 const rng=randomSource(seed),range=([a,b])=>a+(b-a)*rng();
 const m={x:spawn.x,z:spawn.z,yaw:0,mode:'absent',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,searchLeft:0,probesLeft:0,probe:null,
  patrolGoal:null,speed:0,elapsed:0,targetId:null,sensedBy:null,attackId:null,attackAt:null,staggerLeft:0,graceUntil:new Map(),
  appeared:false,relocateLeft:0,knockLeft:0,knockClock:0,nextRoamKnock:0,noticeLeft:0,knocks:0,notices:0,chases:0,appearances:0,stuck:0,unstuck:0,travel:0};
 const home={x:spawn.x,z:spawn.z};
 const setMode=mode=>{if(m.mode!==mode){m.mode=mode;m.path=[];m.repath=0;}};
 const pool=()=>waypoints.map(w=>space.nearestStandable(w)).filter(Boolean);
 /** A standable landmark at least `minDistance` from every player and out of all their sight: nearest such, else farthest. */
 function chooseAppearance(players,minDistance,{nearest=true}={}){
  const candidates=pool(),scored=[];
  for(const g of candidates){
   if(!space.canStand(g.x,g.z))continue;
   let nearestPlayer=Infinity,seen=false;
   for(const p of players){const d=dist(g,p);nearestPlayer=Math.min(nearestPlayer,d);if(d<BACTERIA.sight.range*1.4&&space.lineClear(g,p))seen=true;}
   scored.push({g,d:players.length?nearestPlayer:0,ok:!seen&&(!players.length||nearestPlayer>=minDistance)});
  }
  const ok=scored.filter(s=>s.ok);
  if(ok.length)return (nearest?ok.sort((a,b)=>a.d-b.d)[0]:ok[Math.floor(rng()*ok.length)]).g;
  return scored.length?scored.sort((a,b)=>b.d-a.d)[0].g:home;
 }
 function appear(players,{knock,minDistance}){
  const g=chooseAppearance(players,minDistance,{nearest:knock});
  m.x=g.x;m.z=g.z;m.appeared=true;m.appearances++;m.path=[];m.lastSeen=m.lastHeard=null;m.targetId=null;m.lostFor=0;m.patrolGoal=null;
  m.nextRoamKnock=m.elapsed+range(BACTERIA.roamKnockEvery);
  if(knock){setMode('knock');m.knockLeft=BACTERIA.arrivalKnocks;m.knockClock=.6;}else setMode('roam');
 }
 function pickPatrolGoal(){
  const list=pool();
  for(let tries=0;tries<12&&list.length;tries++){
   const w=list[Math.floor(rng()*list.length)];
   if(dist(w,m)<4)continue;
   const path=space.navigator().findPath(m,w);if(path.length){m.patrolGoal=w;m.path=path;return;}
  }
  m.patrolGoal=null;m.path=[];
 }
 function startSearch(at,seconds=BACTERIA.search.seconds){
  setMode('search');m.searchLeft=seconds;m.probesLeft=BACTERIA.search.probes;m.probe=null;m.lastHeard=null;m.searchCentre={x:at.x,z:at.z};
 }
 function vanish(){setMode('absent');m.relocateLeft=range(BACTERIA.relocateDelay);m.targetId=null;m.lastSeen=m.lastHeard=null;m.speed=0;}
 function visibleTargets(players,sight){
  const out=[];
  for(const p of players){
   const dx=p.x-m.x,dz=p.z-m.z,d=Math.hypot(dx,dz),range=BACTERIA.sight.range*sight*(p.crouch?BACTERIA.sight.crouchFactor:1);
   if(d>=range)continue;
   const facing=Math.cos(Math.atan2(dx,dz)-m.yaw)>BACTERIA.sight.facingCos;
   if(!(facing||d<BACTERIA.sight.closeAllRound))continue;
   if(!space.lineClear(m,p))continue;
   out.push({player:p,distance:d});
  }
  return out.sort((a,b)=>a.distance-b.distance);
 }
 /** players: eligible {id,x,z,crouch}. Returns {caught:[ids],spotted,heard}. */
 function tick(delta,{players=[],noises=[],tier=0,released=true,time=0}={}){
  const dt=Math.max(0,Math.min(.25,Number.isFinite(delta)?delta:0)),result={caught:[],spotted:false,heard:null};
  m.elapsed+=dt;m.speed=0;
  if(!released){m.mode='absent';return result;}
  if(m.mode==='absent'){
   if(!m.appeared){appear(players,{knock:true,minDistance:BACTERIA.spawnMinDistance});}
   else{m.relocateLeft-=dt;if(m.relocateLeft<=0)appear(players,{knock:false,minDistance:BACTERIA.relocateMinDistance});}
   if(m.mode==='absent')return result;
  }
  const scale=tierScale(tier);
  if(m.staggerLeft>0){
   m.staggerLeft=Math.max(0,m.staggerLeft-dt);
   if(!m.staggerLeft){m.attackId=null;startSearch(m.attackAt??m,BACTERIA.postCatchSearch);}
   return result;
  }
  const seen=visibleTargets(players,scale.sight),heard=strongestHeard(m,noises,space,{scale:scale.hearing*BACTERIA.hearingScale});
  result.heard=heard;
  // The screech: stationary, facing what it noticed, then the chase begins.
  if(m.mode==='notice'){
   m.noticeLeft-=dt;
   const focus=seen[0]?.player??m.lastSeen;if(focus)m.yaw=Math.atan2(focus.x-m.x,focus.z-m.z);
   if(seen.length){m.lastSeen={x:seen[0].player.x,z:seen[0].player.z};m.targetId=seen[0].player.id;}
   if(m.noticeLeft<=0){setMode('chase');m.chases++;m.lostFor=0;}
   return result;
  }
  if(seen.length){
   const t=seen[0].player;m.sensedBy='sight';m.lastSeen={x:t.x,z:t.z};m.lostFor=0;m.targetId=t.id;
   if(m.mode!=='chase')return beginNotice(result);
  }else if(heard&&(m.mode!=='chase'||heard.urgent||dist(heard,m)<=BACTERIA.trackRadius)){
   const moved=!m.lastHeard||dist(heard,m.lastHeard)>.65;m.lastHeard={x:heard.x,z:heard.z};m.sensedBy='sound';
   if(m.mode==='chase'){m.lastSeen={x:heard.x,z:heard.z};m.lostFor=0;m.targetId=heard.playerId??m.targetId;if(moved){m.path=[];m.repath=0;}}
   else if(heard.urgent){m.lastSeen={x:heard.x,z:heard.z};m.targetId=heard.playerId??null;return beginNotice(result);}
   else{
    // A footstep or a voice: it comes to look. Close enough and loud enough, it has you.
    if(moved){m.path=[];m.repath=0;}
    if(dist(heard,m)<BACTERIA.trackRadius*.6&&heard.radius>=BACTERIA.trackRadius){m.lastSeen={x:heard.x,z:heard.z};m.targetId=heard.playerId??null;return beginNotice(result);}
    if(m.mode!=='search'||heard.radius>=12)setMode('investigate');
   }
  }else if(m.mode==='chase'){
   m.lostFor+=dt*(m.lastSeen&&dist(m,m.lastSeen)<.6?BACTERIA.deadEndGiveUp:1);
   if(m.lostFor>BACTERIA.chaseMemory)startSearch(m.lastSeen??m);
  }
  // Catch: a real, unobstructed line and real proximity. Revive grace protects freshly rescued players.
  for(const {player,distance} of seen){
   if(distance<BACTERIA.catchRadius&&(m.graceUntil.get(player.id)??-Infinity)<=time){result.caught.push(player.id);m.attackId=player.id;m.attackAt={x:player.x,z:player.z};}
  }
  if(result.caught.length){setMode('attack');m.staggerLeft=BACTERIA.catchStagger;m.yaw=Math.atan2(m.attackAt.x-m.x,m.attackAt.z-m.z);return result;}
  const px=m.x,pz=m.z;
  move(dt,tier,!!seen.length);
  if(m.mode!=='search'&&m.mode!=='knock'&&m.speed>0&&Math.hypot(m.x-px,m.z-pz)<1e-4){m.stuck+=dt;if(m.stuck>.4){unstick();m.stuck=0;m.unstuck++;if(m.unstuck%3===0&&m.mode==='roam'){m.patrolGoal=null;pickPatrolGoal();}}}
  else m.stuck=0;
  return result;
 }
 function beginNotice(result){
  result.spotted=true;m.notices++;m.noticeLeft=BACTERIA.noticeSeconds;setMode('notice');m.lostFor=0;
  if(m.lastSeen)m.yaw=Math.atan2(m.lastSeen.x-m.x,m.lastSeen.z-m.z);
  return result;
 }
 function unstick(){
  let best=null,bestScore=-1;
  for(let i=0;i<16;i++){
   const a=i/16*Math.PI*2,x=m.x+Math.cos(a)*.14,z=m.z+Math.sin(a)*.14;
   if(!space.canStand(x,z))continue;
   let score=0;for(let j=0;j<8;j++)if(space.canStand(x+Math.cos(j/8*Math.PI*2)*.5,z+Math.sin(j/8*Math.PI*2)*.5))score++;
   if(score>bestScore){best={x,z};bestScore=score;}
  }
  if(best){m.x=best.x;m.z=best.z;}
  m.path=[];m.repath=0;
 }
 function move(dt,tier,sees){
  if(m.mode==='knock'){
   // Standing at a wall, knocking. Counts down, then goes back to roaming.
   m.knockClock-=dt;
   if(m.knockClock<=0&&m.knockLeft>0){m.knocks++;m.knockLeft--;m.knockClock=BACTERIA.knockGap;if(!m.knockLeft)m.knockClock=BACTERIA.knockLinger;}
   else if(m.knockClock<=0&&m.knockLeft<=0){setMode('roam');pickPatrolGoal();}
   return;
  }
  if(m.mode==='search'){
   m.searchLeft-=dt;
   if(m.searchLeft<=0){vanish();return;}
   if(!m.probe&&m.probesLeft>0){
    for(let i=0;i<10&&!m.probe;i++){
     const a=rng()*Math.PI*2,r=2+rng()*BACTERIA.search.probeRadius,g={x:m.searchCentre.x+Math.cos(a)*r,z:m.searchCentre.z+Math.sin(a)*r};
     if(space.canStand(g.x,g.z)&&space.navigator().findPath(m,g).length){m.probe=g;m.path=space.navigator().findPath(m,g);m.probesLeft--;}
    }
    if(!m.probe)m.probesLeft=0;
   }
   if(m.probe){follow(dt,tier,'roam');if(dist(m,m.probe)<.4||!m.path.length)m.probe=null;}
   else m.yaw+=dt*1.1;
   return;
  }
  if(m.mode==='roam'&&m.elapsed>=m.nextRoamKnock&&m.appeared){m.nextRoamKnock=m.elapsed+range(BACTERIA.roamKnockEvery);setMode('knock');m.knockLeft=Math.max(1,Math.round(BACTERIA.roamKnockSeconds/BACTERIA.knockGap));m.knockClock=.4;return;}
  const goal=m.mode==='chase'?m.lastSeen:m.mode==='investigate'?m.lastHeard:m.patrolGoal;
  if(m.mode==='roam'&&(!goal||dist(m,goal)<.4)){pickPatrolGoal();if(!m.patrolGoal)return;}
  const target=m.mode==='chase'?m.lastSeen:m.mode==='investigate'?m.lastHeard:m.patrolGoal;
  if(!target)return;
  if(dist(m,target)<.4&&!sees){
   if(m.mode==='roam'){pickPatrolGoal();return;}
   if(m.mode==='investigate'){startSearch(target,3);return;}
   // Chase: standing on the last known spot with nobody there. The give-up timer runs faster (see tick).
   m.yaw+=dt*1.6;return;
  }
  m.repath-=dt;
  if(!m.path.length||m.mode==='chase'&&m.repath<=0){
   const goalPoint=space.canStand(target.x,target.z)?target:space.nearestStandable(target,3);
   m.path=goalPoint?space.navigator().findPath(m,goalPoint):[];
   m.repath=m.mode==='chase'?.25:.6;
   if(!m.path.length&&m.mode!=='roam'){startSearch(target);return;}
  }
  follow(dt,tier,m.mode);
 }
 function follow(dt,tier,kind){
  const base=tierSpeedFor(kind==='attack'?'chase':kind==='search'?'roam':kind,tier),factor=space.onBeam(m.x,m.z)?BACTERIA.beamSpeedFactor:1;
  let travel=dt*base*factor;m.speed=base*factor;
  while(m.path.length&&travel>0){
   const next=m.path[0],dx=next.x-m.x,dz=next.z-m.z,d=Math.hypot(dx,dz);
   if(d<.001){m.path.shift();continue;}
   m.yaw=Math.atan2(dx,dz);const step=Math.min(travel,d);
   const wanted={x:m.x+dx/d*step,z:m.z+dz/d*step},to=sweepMove(m,wanted,(x,z)=>space.canStand(x,z));
   const moved=dist(to,m);m.x=to.x;m.z=to.z;m.travel+=moved;travel-=step;
   if(moved<step-.001){m.path=[];m.repath=0;break;}
   if(step===d)m.path.shift();
  }
 }
 return {
  state:m,tick,home,
  protect(id,until){m.graceUntil.set(id,until);},
  reset(){Object.assign(m,{x:home.x,z:home.z,yaw:0,mode:'absent',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,searchLeft:0,probesLeft:0,probe:null,patrolGoal:null,speed:0,elapsed:0,targetId:null,sensedBy:null,attackId:null,attackAt:null,staggerLeft:0,appeared:false,relocateLeft:0,knockLeft:0,knockClock:0,nextRoamKnock:0,noticeLeft:0,knocks:0,notices:0,chases:0,appearances:0,stuck:0,unstuck:0,travel:0});m.graceUntil.clear();}
 };
}
