import {MONSTER,tierSpeed,tierScale} from './monochrome2-tuning.js';
import {strongestHeard} from './monochrome2-senses.js';
import {randomSource} from './level.js';
import {sweepMove} from './navigation.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const MONSTER_MODES=Object.freeze(['dormant','patrol','investigate','chase','search','attack']);

/**
 * Pure Monochrome simulation (no rendering, audio or DOM) so tuning and counterplay are testable.
 * Senses: hears footsteps, sprinting, interactions and microphone noise (walls soften it);
 * sees only along a direct, unobstructed line. States: patrol, investigate, chase, search.
 */
export function createMonochromeMonster(space,{spawn,waypoints,seed=1,profile={}}){
 const speedScale=profile.speedScale??1,sightScale=profile.sightScale??1,hearingScale=profile.hearingScale??1;
 if(!space.canStand(spawn.x,spawn.z))throw new RangeError('Monochrome spawn is not standable');
 const rng=randomSource(seed),m={
  x:spawn.x,z:spawn.z,yaw:0,mode:'dormant',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,
  searchLeft:0,probesLeft:0,probe:null,patrolGoal:null,idle:0,staggerLeft:0,speed:0,elapsed:0,targetId:null,
  sensedBy:null,spotted:false,attackId:null,graceUntil:new Map(),travel:0,stuck:0,unstuck:0
 };
 const home={x:spawn.x,z:spawn.z};
 function pickPatrolGoal(focus=[]){
  // Weighted: every landmark once, plus extra weight on places the players still need.
  const pool=[];for(const w of waypoints)pool.push(w);for(const f of focus)pool.push(f,f);
  for(let tries=0;tries<12;tries++){
   const w=pool[Math.floor(rng()*pool.length)],g=space.nearestStandable(w);
   if(!g||dist(g,m)<4)continue;
   const path=space.navigator().findPath(m,g);if(path.length){m.patrolGoal=g;m.path=path;return;}
  }
  m.patrolGoal=null;m.path=[];
 }
 function setMode(mode){if(m.mode!==mode){m.mode=mode;m.path=[];m.repath=0;}}
 function startSearch(at,seconds=MONSTER.search.seconds){
  setMode('search');m.searchLeft=seconds;m.probesLeft=MONSTER.search.probes;m.probe=null;m.lastHeard=null;m.searchCentre={x:at.x,z:at.z};
 }
 function visibleTargets(players,tierSight,time){
  const out=[];
  for(const p of players){
   const dx=p.x-m.x,dz=p.z-m.z,d=Math.hypot(dx,dz),range=MONSTER.sight.range*sightScale*tierSight*(p.crouch?MONSTER.sight.crouchFactor:1);
   if(d>=range)continue;
   const facing=Math.cos(Math.atan2(dx,dz)-m.yaw)>MONSTER.sight.facingCos;
   if(!(facing||d<MONSTER.sight.closeAllRound))continue;
   if(!space.lineClear(m,p))continue;
   out.push({player:p,distance:d});
  }
  return out.sort((a,b)=>a.distance-b.distance);
 }
 /**
  * players: eligible (alive, upper layer, not at the exit) {id,x,z,crouch}.
  * Returns {caught:[ids], spotted:boolean, heard:noise|null}.
  */
 function tick(delta,{players=[],noises=[],tier=0,released=true,time=0,focus=[]}={}){
  const dt=Math.max(0,Math.min(.25,Number.isFinite(delta)?delta:0)),result={caught:[],spotted:false,heard:null};
  m.elapsed+=dt;m.speed=0;
  if(!released){m.mode='dormant';return result;}
  if(m.mode==='dormant'){setMode('patrol');}
  const scale=tierScale(tier);
  if(m.staggerLeft>0){
   m.staggerLeft=Math.max(0,m.staggerLeft-dt);
   if(!m.staggerLeft){startSearch(m.attackAt??m,MONSTER.postCatchSearch);m.attackId=null;}
   return result;
  }
  const seen=visibleTargets(players,scale.sight,time),heard=strongestHeard(m,noises,space,{scale:scale.hearing*hearingScale});
  result.heard=heard;
  if(seen.length){
   const t=seen[0].player;
   if(m.mode!=='chase'){result.spotted=true;m.repath=0;}
   setMode('chase');m.lastSeen={x:t.x,z:t.z};m.lostFor=0;m.targetId=t.id;m.sensedBy='sight';
  }else if(heard){
   const moved=!m.lastHeard||dist(heard,m.lastHeard)>.65;m.lastHeard={x:heard.x,z:heard.z};m.sensedBy='sound';
   if(moved){m.path=[];m.repath=0;}
   if(heard.urgent||m.mode==='chase'){if(m.mode!=='chase')result.spotted=true;setMode('chase');m.lastSeen={x:heard.x,z:heard.z};m.lostFor=0;m.targetId=heard.playerId??null;}
   else if(m.mode!=='search'||heard.radius>=12)setMode('investigate');
  }else if(m.mode==='chase'){
   m.lostFor+=dt;
   if(m.lostFor>MONSTER.chaseMemory){startSearch(m.lastSeen??m);}
  }
  // Catch: a real, unobstructed line and real proximity. Revive grace protects freshly rescued players.
  for(const {player,distance} of seen){
   if(distance<MONSTER.catchRadius&&(m.graceUntil.get(player.id)??-Infinity)<=time){
    result.caught.push(player.id);m.attackId=player.id;m.attackAt={x:player.x,z:player.z};
   }
  }
  if(result.caught.length){
   setMode('attack');m.staggerLeft=MONSTER.catchStagger;m.yaw=Math.atan2(m.attackAt.x-m.x,m.attackAt.z-m.z);return result;
  }
  const px=m.x,pz=m.z;
  move(dt,tier,focus,!!seen.length);
  // Navigation grids and swept collision disagree by a sliver at wall corners: if he presses on
  // without moving, ease him off the wall rather than letting him stand there forever.
  if(m.mode!=='search'&&m.speed>0&&Math.hypot(m.x-px,m.z-pz)<1e-4){m.stuck+=dt;if(m.stuck>.4){unstick();m.stuck=0;m.unstuck++;if(m.unstuck%3===0&&m.mode==='patrol'){m.patrolGoal=null;pickPatrolGoal(focus);}}}
  else m.stuck=0;
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
 function move(dt,tier,focus,sees){
  if(m.mode==='search'){
   m.searchLeft-=dt;
   if(m.searchLeft<=0){setMode('patrol');pickPatrolGoal(focus);return;}
   if(!m.probe&&m.probesLeft>0){
    for(let i=0;i<10&&!m.probe;i++){
     const a=rng()*Math.PI*2,r=2+rng()*MONSTER.search.probeRadius,g={x:m.searchCentre.x+Math.cos(a)*r,z:m.searchCentre.z+Math.sin(a)*r};
     if(space.canStand(g.x,g.z)&&space.navigator().findPath(m,g).length){m.probe=g;m.path=space.navigator().findPath(m,g);m.probesLeft--;}
    }
    if(!m.probe)m.probesLeft=0;
   }
   if(m.probe){follow(dt,tier,'patrol');if(dist(m,m.probe)<.4||!m.path.length)m.probe=null;}
   else m.yaw+=dt*.95;
   return;
  }
  const goal=m.mode==='chase'?m.lastSeen:m.mode==='investigate'?m.lastHeard:m.patrolGoal;
  if(m.mode==='patrol'&&(!goal||dist(m,goal)<.4)){pickPatrolGoal(focus);if(!m.patrolGoal){m.idle+=dt;return;}}
  const target=m.mode==='chase'?m.lastSeen:m.mode==='investigate'?m.lastHeard:m.patrolGoal;
  if(!target)return;
  if(dist(m,target)<.4&&!sees){
   if(m.mode==='patrol'){pickPatrolGoal(focus);return;}
   startSearch(target);return;
  }
  m.repath-=dt;
  if(!m.path.length||m.mode==='chase'&&m.repath<=0){
   const goalPoint=space.canStand(target.x,target.z)?target:space.nearestStandable(target,3);
   m.path=goalPoint?space.navigator().findPath(m,goalPoint):[];
   m.repath=m.mode==='chase'?.25:.6;
   if(!m.path.length&&m.mode!=='patrol'){startSearch(target);return;}
  }
  follow(dt,tier,m.mode);
 }
 function follow(dt,tier,kind){
  const base=tierSpeed(kind==='attack'?'chase':kind,tier)*speedScale,factor=space.onBeam(m.x,m.z)?MONSTER.beamSpeedFactor:1;
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
  /** Called when a downed player is revived so he cannot instantly re-catch them. */
  protect(id,until){m.graceUntil.set(id,until);},
  reset(){Object.assign(m,{x:home.x,z:home.z,yaw:0,mode:'dormant',path:[],repath:0,lastSeen:null,lastHeard:null,lostFor:0,searchLeft:0,probesLeft:0,probe:null,patrolGoal:null,idle:0,staggerLeft:0,speed:0,elapsed:0,targetId:null,sensedBy:null,attackId:null,travel:0,stuck:0,unstuck:0});m.graceUntil.clear();}
 };
}
