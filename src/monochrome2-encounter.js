import {MONOCHROME_SLOT,MONOCHROME_LOWER_SLOT,LOWER_PROFILE,BACTERIA_SLOT,reservedEntities} from './monochrome2-entities.js';
import {createBacteria} from './monochrome2-bacteria.js';
import {createMonochrome2Space} from './monochrome2-space.js';
import {createMonochromeMonster} from './monochrome2-monster.js';
import {footstepEmitter,interactionNoise,balanceNoise,microphoneNoise} from './monochrome2-senses.js';
import {MONSTER,BACTERIA,MONOCHROME_VISITS,tierFromRound,TELEGRAPH} from './monochrome2-tuning.js';
import {randomSource} from './level.js';
import {PITFALLS,inStairwell} from './backrooms-pitfalls.js';
import {canWalkLevelZero} from './backrooms-layout.js';
import {createNavigator} from './navigation.js';
import {createRemoteTrack} from './monochrome2-smoothing.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const SOLO='solo',MAZE_EAST=41.5;
const layerOf=p=>(p?.y??0)<-.25?'lower':'upper';
const alive=p=>!p.downed&&!p.lost&&!p.exitReady;
/** Who the maze monsters (the Bacteria and the rare upper Monochrome) can hunt: the normal Level 0 rooms only. */
export const mazeHuntable=p=>alive(p)&&layerOf(p)==='upper'&&(p.x??0)<MAZE_EAST;
/** Who the lower Monochrome can hunt: the dark layer beneath the pit grid. The stairwell is a safe zone. */
export const lowerHuntable=p=>alive(p)&&layerOf(p)==='lower'&&(p.x??0)>=42.5&&!inStairwell(p.x,p.z,.3);
/**
 * Monochrome 2's occupant of Level 0's encounter seam. Same shape as `createBackroomsEncounter`
 * (update / replicate / movement / reset / dispose), so the Level 0 game loop is unchanged.
 * The host (or solo player) simulates; other co-op clients only draw the replicated state.
 *
 * Injected factories keep this testable without WebGL or WebAudio:
 *  actorFactory(scene,slot) -> Promise<{update,clack,dispose}>
 *  audioFactory() -> {attach(context,master),gesture(),update(frame),jumpscare(),dispose()} | null
 */
export function createMonochrome2Encounter(world,{round=()=>({}),slot=MONOCHROME_SLOT,seed=0x4D32,actorFactory=null,audioFactory=null,onNotice=()=>{},bacteriaSlot=BACTERIA_SLOT,bacteriaActorFactory=null,lowerSlot=MONOCHROME_LOWER_SLOT}={}){
 const space=createMonochrome2Space(world.map,round,{region:'maze'}),lowerSpace=createMonochrome2Space(world.map,round,{region:'lower'});
 // Interaction checks (can the player see the target) keep Level 0's own walk-line test.
 const baseNav=createNavigator((x,z)=>canWalkLevelZero(world.map,x,z,.35),{...world.map.bounds,spacing:.5});
 const spawn=space.nearestStandable(slot.spawn)??slot.spawn;
 const brain=createMonochromeMonster(space,{spawn,waypoints:slot.patrol,seed});
 // The lower Monochrome patrols the dark layer under the pits from the moment the pit door opens.
 const lowerSpawn=lowerSpace.nearestStandable(lowerSlot.spawn)??lowerSlot.spawn;
 const lowerBrain=createMonochromeMonster(lowerSpace,{spawn:lowerSpawn,waypoints:lowerSlot.patrol,seed:seed^0x10E4,profile:LOWER_PROFILE}),lowerState=lowerBrain.state,lowerTrack=createRemoteTrack();
 const layerSeen=new Map();let lowerActor=null,lowerWasAttack=false,lowerReady=Promise.resolve();
 const state=brain.state,steps=footstepEmitter(),balance=new Map(),voiceClock=new Map();
 const track=createRemoteTrack();let wasAttack=false;
 let noises=[],actor=null,audio=audioFactory?.()??null,disposed=false,ready=Promise.resolve(),lastTime=0,telegraphDistance=Infinity;
 if(actorFactory)ready=Promise.resolve(actorFactory(world.scene,slot)).then(a=>{if(disposed)a?.dispose?.();else actor=a;}).catch(error=>{onNotice('Monochrome could not load. Level 0 continues without him.');console.error(error);});
 if(actorFactory)lowerReady=Promise.resolve(actorFactory(world.scene,lowerSlot)).then(a=>{if(disposed)a?.dispose?.();else lowerActor=a;}).catch(error=>{console.error(error);});
 // The Bacteria is the monster of the level. It only runs once its model has loaded (never an invisible killer);
 // until then, and if the model fails, Monochrome patrols as he did before.
 const bSpawn=space.nearestStandable(bacteriaSlot.spawn)??bacteriaSlot.spawn;
 const bacteria=createBacteria(space,{spawn:bSpawn,waypoints:bacteriaSlot.patrol,seed:seed^0xBAC7}),bState=bacteria.state,bTrack=createRemoteTrack();
 let lowerWasReleased=false,bActor=null,bOnline=false,bWasAttack=false,bReady=Promise.resolve(),wasReleased=false;
 if(bacteriaActorFactory)bReady=Promise.resolve(bacteriaActorFactory(world.scene,bacteriaSlot)).then(a=>{if(disposed)a?.dispose?.();else{bActor=a;bOnline=true;}}).catch(error=>{onNotice('The Bacteria could not load. Monochrome patrols Level 0 instead.');console.error(error);});
 // Monochrome is rare once the Bacteria is out: two short visits, long gaps, then he withdraws to his room.
 const visitRng=randomSource(seed^0x6D31),pick=([a,b])=>a+(b-a)*visitRng(),visit={index:0,start:0,end:0};
 const planVisit=(from)=>{visit.start=from;visit.end=from+pick(MONOCHROME_VISITS.length);};
 planVisit(pick(MONOCHROME_VISITS.first));
 function monochromeReleased(time){
  if(!bOnline)return time>=MONSTER.grace;
  while(time>=visit.end&&visit.index<MONOCHROME_VISITS.max-1){visit.index++;planVisit(visit.end+pick(MONOCHROME_VISITS.gap));}
  return time>=visit.start&&time<visit.end;
 }
 const emit=(n,p=null)=>{if(n&&Number.isFinite(n.x))noises.push({...n,layer:n.layer??layerOf(p??{y:n.y}),at:lastTime});};
 const idOf=p=>p?.id??SOLO;
 function focusPoints(){
  const r=round(),f=[];
  // He lingers where the team still has work: unfetched ladder sections, the ladder site, the door.
  for(const p of r.parts??[])if(!p.taken)f.push({x:p.x,z:p.z});
  if(r.ladder&&!r.hasKey)f.push({x:r.ladder.x,z:r.ladder.z});
  if(r.hasKey&&!r.doorOpen&&r.door)f.push({x:r.door.x-2,z:r.door.z});
  return f;
 }
 function hearVoices(targets,voices,time){
  for(const p of targets){
   const level=voices?.[p.id]??0;if(!level)continue;
   if(time<(voiceClock.get(p.id)??-1))continue;voiceClock.set(p.id,time+.25);
   emit(microphoneNoise(level,{...p,id:p.id}),p);
  }
 }
 function simulate(dt,time,targets,voices){
  lastTime=time;
  for(const p of targets){let s=balance.get(idOf(p));if(!s){s={};balance.set(idOf(p),s);}emit(balanceNoise({...p,id:idOf(p)},s,time),p);
   // Landing in the dark is a noise only the lower layer hears.
   const now=layerOf(p),was=layerSeen.get(idOf(p));layerSeen.set(idOf(p),now);if(was==='upper'&&now==='lower')emit({x:p.x,z:p.z,radius:14,type:'land',playerId:idOf(p),layer:'lower'},p);}
  hearVoices(targets,voices,time);
  noises=noises.filter(n=>time-n.at<=MONSTER.hearing.ttl);
  for(const p of targets)if(p.reviveGraceUntil>time)brain.protect(idOf(p),p.reviveGraceUntil);
  const pack=p=>({id:idOf(p),x:p.x,z:p.z,crouch:!!p.crouch}),eligible=targets.filter(mazeHuntable).map(pack),lowerEligible=targets.filter(lowerHuntable).map(pack);
  // The pit room above and the maze are separate worlds: maze monsters ignore noise made east of the pit door.
  const mazeNoises=noises.filter(n=>n.layer!=='lower'&&n.x<MAZE_EAST),lowerNoises=noises.filter(n=>n.layer==='lower');
  const r=round(),tier=tierFromRound(r);
  const released=monochromeReleased(time);
  if(wasReleased&&!released)brain.reset();wasReleased=released;
  const result=brain.tick(dt,{players:eligible,noises:mazeNoises,tier,time,released,focus:focusPoints()});
  const lowerReleased=!!r.doorOpen;if(lowerWasReleased&&!lowerReleased)lowerBrain.reset();lowerWasReleased=lowerReleased;
  for(const p of targets)if(p.reviveGraceUntil>time)lowerBrain.protect(idOf(p),p.reviveGraceUntil);
  const lowerResult=lowerBrain.tick(dt,{players:lowerEligible,noises:lowerNoises,tier,time,released:lowerReleased,focus:[]});
  let bResult={caught:[],spotted:false};
  if(bOnline){
   for(const p of targets)if(p.reviveGraceUntil>time)bacteria.protect(idOf(p),p.reviveGraceUntil);
   bResult=bacteria.tick(dt,{players:eligible,noises:mazeNoises,tier,time,released:time>=BACTERIA.spawnDelay});
  }
  return {result,lowerResult,bResult,eligible};
 }
 function entityState(){return {mode:state.mode,x:state.x,z:state.z,yaw:state.yaw,speed:state.speed,tier:tierFromRound(round())};}
 function lowerEntityState(){return {mode:lowerState.mode,x:lowerState.x,z:lowerState.z,yaw:lowerState.yaw,speed:lowerState.speed,tier:tierFromRound(round())};}
 function bacteriaState(){return {mode:bState.mode,x:bState.x,z:bState.z,yaw:bState.yaw,speed:bState.speed,tier:tierFromRound(round()),knocks:bState.knocks,notices:bState.notices,chases:bState.chases};}
 function presentBacteria(es,dt,player){bActor?.update({x:es.x,z:es.z,yaw:es.yaw,mode:es.mode,speed:es.speed,visible:(player.y??0)>-.25||dist(es,player)<40},dt);}
 let lowerFocus=false;
 function present(es,les,dt,player,yaw,pitch,paused){
  const listener={x:player.x,y:(player.y??0)+(player.crouch?1.05:1.68),z:player.z,yaw,pitch:pitch??0};
  const below=layerOf(player)==='lower';lowerFocus=below;
  const dUpper=es.mode==='dormant'?Infinity:dist(es,player),dBacteria=bOnline&&bState.mode!=='absent'?dist(bState,player):Infinity,dLower=les.mode==='dormant'?Infinity:dist(les,player);
  // The servo whine follows whichever Monochrome belongs to the player's own layer; the layers never mix.
  telegraphDistance=below?dLower:Math.min(dUpper,dBacteria);
  actor?.update({x:es.x,z:es.z,yaw:es.yaw,mode:es.mode,visible:!below||dUpper<40},dt);
  lowerActor?.update({x:les.x,y:PITFALLS.floorY,z:les.z,yaw:les.yaw,mode:les.mode,visible:below||dLower<30},dt);
  const src=below?les:es,sp=below?lowerSpace:space;
  audio?.update({listener,source:{x:src.x,y:below?PITFALLS.floorY+1.4:1.4,z:src.z},distance:telegraphDistance,occluded:sp.wallsBetween(src,player)>0,mode:src.mode,speed:src.speed,delta:paused?0:dt,paused,onClack:()=>(below?lowerActor:actor)?.clack?.()});
 }
 return {
  slot,bacteriaSlot,reserved:reservedEntities(),space,get ready(){return Promise.all([ready,bReady,lowerReady]).then(()=>undefined);},get bacteriaOnline(){return bOnline;},
  simulation:{state,clear:baseNav.clear,noise:n=>{emit(n);return true;}},
  get actor(){return actor;},get entityState(){return entityState();},
  /** Co-op snapshot payload: Monochrome live, bacteria still reserved. */
  snapshot(){return {monochrome:entityState(),monochromeLower:lowerEntityState(),bacteria:bOnline?bacteriaState():null};},
  get telegraphDistance(){return telegraphDistance;},
  get mode(){if(lowerFocus)return lowerState.mode;return bOnline&&['notice','chase','attack'].includes(bState.mode)?bState.mode:state.mode;}, get lowerMode(){return lowerState.mode;}, lowerSimulation:{state:lowerState}, get lowerEntityState(){return lowerEntityState();}, lowerSpace,get bacteriaMode(){return bState.mode;},bacteriaSimulation:{state:bState},get bacteriaState(){return bacteriaState();},get tier(){return tierFromRound(round());},
  /** Every player's movement, reported by whoever simulates movement (solo or co-op host). */
  movement(moved,sprint,player){emit(steps.step(idOf(player),moved,{sprint,crouch:!!player?.crouch,x:player?.x,z:player?.z}));},
  interaction(player,targetId){emit(interactionNoise(targetId,{x:player.x,z:player.z,id:idOf(player)}));},
  distract(){return false;},unlock(){},
  protect(id,time){brain.protect(id,time);},
  attachAudio(context,master){audio?.attach?.(context,master);},
  audioGesture(){audio?.gesture?.();},
  /**
   * Solo: targets null -> just `player`. Co-op host: every player in the shared state.
   * Returns downedIds for the host to apply; `caught` is true only when the whole team is down.
   */
  update(dt,time,player,yaw,{paused=false,targets=null,voices=null,pitch=0}={}){
   if(disposed)return {caught:false,scare:false,ready:true,downedIds:[]};
   if(paused){present(entityState(),lowerEntityState(),0,player,yaw,pitch,true);return {caught:false,scare:false,ready:true,downedIds:[]};}
   const list=targets??[{...player,id:SOLO}];
   const {result,lowerResult,bResult}=simulate(dt,time,list,voices);
   present(entityState(),lowerEntityState(),dt,player,yaw,pitch,false);if(bOnline)presentBacteria(bacteriaState(),dt,player);
   const downs=[...result.caught.map(id=>({id,by:'Monochrome'})),...lowerResult.caught.filter(id=>!result.caught.includes(id)).map(id=>({id,by:'Monochrome'})),...bResult.caught.filter(id=>!result.caught.includes(id)&&!lowerResult.caught.includes(id)).map(id=>({id,by:'Bacteria'}))];
   const downedIds=downs.map(d=>d.id);
   // Only Monochrome's metal jumpscare plays here; the Bacteria's is designed separately.
   if(result.caught.length||lowerResult.caught.length){audio?.jumpscare?.();}
   // A team of one has nobody to revive it.
   const everyoneDown=downedIds.length>0&&list.filter(p=>!p.downed&&!p.lost).every(p=>downedIds.includes(idOf(p)));
   const spotted=result.spotted||lowerResult.spotted||bResult.spotted;
   return {caught:everyoneDown,scare:spotted||downedIds.length>0,caughtBy:downs.at(-1)?.by??'Monochrome',ready:true,downedIds,downs,spotted,attacked:downedIds.length>0};
  },
  /** Non-host co-op clients: draw the host's monster. */
  replicate(monsters,time,player,yaw,paused,dt=1/60){
   const es=monsters?.monochrome;
   if(es&&Number.isFinite(es.x)&&Number.isFinite(es.z)){
    Object.assign(state,{x:es.x,z:es.z,yaw:es.yaw,mode:es.mode,speed:es.speed});
    track.push(es);const shown=track.step(paused?0:dt)??es;
    // The host plays the jumpscare sound when it simulates the catch; everyone else hears it as it lands.
    if(es.mode==='attack'&&!wasAttack&&!paused)audio?.jumpscare?.();wasAttack=es.mode==='attack';
    present({...es,x:shown.x,z:shown.z,yaw:shown.yaw},paused?0:dt,player,yaw,0,paused);
   }
   const el=monsters?.monochromeLower;
   if(el&&Number.isFinite(el.x)&&Number.isFinite(el.z)){
    Object.assign(lowerState,{x:el.x,z:el.z,yaw:el.yaw,mode:el.mode,speed:el.speed});
    lowerTrack.push(el);const shownLower=lowerTrack.step(paused?0:dt)??el;
    if(el.mode==='attack'&&!lowerWasAttack&&!paused)audio?.jumpscare?.();lowerWasAttack=el.mode==='attack';
    lowerActor?.update({x:shownLower.x,y:PITFALLS.floorY,z:shownLower.z,yaw:shownLower.yaw,mode:el.mode,visible:true},paused?0:dt);
   }
   const eb=monsters?.bacteria;
   if(eb&&Number.isFinite(eb.x)&&Number.isFinite(eb.z)){
    bOnline=bOnline||!!bActor;
    Object.assign(bState,{x:eb.x,z:eb.z,yaw:eb.yaw,mode:eb.mode,speed:eb.speed,knocks:eb.knocks,notices:eb.notices,chases:eb.chases});
    bTrack.push(eb);const shown=bTrack.step(paused?0:dt)??eb;
    if(bActor&&!paused)presentBacteria({...eb,x:shown.x,z:shown.z,yaw:shown.yaw},dt,player);
    bWasAttack=eb.mode==='attack';
   }else if(bActor)bActor.update({x:bState.x,z:bState.z,yaw:0,mode:'absent',speed:0,visible:false},0);
   return {caught:false,scare:false,ready:true};
  },
  reset(){lowerBrain.reset();lowerTrack.reset();lowerWasAttack=false;lowerWasReleased=false;layerSeen.clear();bacteria.reset();bTrack.reset();bWasAttack=false;visit.index=0;planVisit(pick(MONOCHROME_VISITS.first));wasReleased=false;brain.reset();track.reset();wasAttack=false;noises=[];balance.clear();voiceClock.clear();steps.reset();telegraphDistance=Infinity;},
  dispose(){disposed=true;lowerActor?.dispose?.();lowerActor=null;actor?.dispose?.();bActor?.dispose?.();audio?.dispose?.();actor=null;bActor=null;audio=null;}
 };
}
export {TELEGRAPH};
