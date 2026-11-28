import {stepPitBalance,resetPitBalance} from './backrooms-balance.js';
import {planRope,ropeClimbPose,ropeGrabOk,ROPE_CLIMB_SECONDS} from './monochrome2-rope.js';
import {drainBattery} from './backrooms-battery.js';
import {VENT_STAGE} from './monochrome2-exit-layout.js';
import {createBackroomsRound,roundTarget,interactRound,canMoveRound,advanceRoundPhysics,roundFloor,backroomsMoveSpeed,BACKROOMS_SPEED} from './backrooms-round.js';
import {createLevelZero,canWalkLevelZero} from './backrooms-layout.js';
import {PITFALLS} from './backrooms-pitfalls.js';
import {moveInWorld} from './level.js';
import {MONOCHROME2_VARIANT,isMonochrome2State,initTeamPlayer,reviveCandidate,revivePlayer,teamWon} from './monochrome2-team.js';
import {TEAM} from './monochrome2-tuning.js';
const localKeys=['climbing','ladderHeight','velocity','fell'];
export function createBackroomsCoopState(members,{classic=true,variant=null}={}){
 if(!Array.isArray(members)||members.length<1||members.length>4)throw new RangeError('A team needs 1–4 players.');
 const players={};
 for(const [i,m]of members.entries()){if(!m.id||Object.hasOwn(players,m.id))throw new Error('Invalid player identity');const slot=m.slot??i;players[m.id]={id:m.id,name:m.name??'Wanderer',slot,x:-7+(slot%2)*.9,z:13+Math.floor(slot/2)*.9,y:0,yaw:-.45,pitch:0,climbing:false,ladderHeight:0,velocity:0,battery:1,fell:false,exitReady:false,inputSequence:0,torch:!classic,crouch:false,speed:0,sprint:false};if(variant===MONOCHROME2_VARIANT)initTeamPlayer(players[m.id]);}
 const round=createBackroomsRound();round.hasTorch=!classic;return {version:1,game:'backrooms',epoch:0,elapsed:0,classic,round,players,...(variant?{variant}:{})};
}
export function backroomsCoopView(s,id){const p=s.players[id];return {...s.round,...Object.fromEntries(localKeys.map(k=>[k,p[k]]))};}
export function stepBackroomsPlayer(s,p,input,delta,map=createLevelZero()){
 if(s.round.phase!=='playing'||!p||!input)return;
 const dt=Math.min(.05,Math.max(0,delta));if(!Number.isFinite(dt))return;
 const r=backroomsCoopView(s,p.id);p.speed=0;p.sprint=false;p.crouch=!input.paused&&!!input.crouch&&!p.downed;
 if(p.downed){if(Number.isFinite(input.yaw))p.yaw=input.yaw;if(Number.isFinite(input.pitch))p.pitch=input.pitch;resetPitBalance(p);advanceRoundPhysics(r,p,dt);for(const k of localKeys)p[k]=r[k];return;}
 if(p.ropeClimb){resetPitBalance(p);p.rescueTime=Math.min(ROPE_CLIMB_SECONDS,p.rescueTime+dt);const pose=ropeClimbPose(p.ropeRef,p.rescueTime,p.ropeStart);p.x=pose.x;p.y=pose.y;p.z=pose.z;p.velocity=0;if(pose.done){p.ropeClimb=false;p.ropeRef=null;}return;}

 if(!input.paused&&!p.climbing&&!p.exitReady){
  const speed=backroomsMoveSpeed(r,p,input.sprint);
  const next=moveInWorld(p,{forward:Math.max(-1,Math.min(1,input.forward||0)),right:Math.max(-1,Math.min(1,input.right||0))},input.yaw,dt,(x,z)=>canMoveRound(r,x,z,(a,b)=>canWalkLevelZero(map,a,b),p),speed);
  p.speed=dt?Math.hypot(next.x-p.x,next.z-p.z)/dt:0;p.sprint=!!input.sprint&&p.speed>.1;Object.assign(p,next);{const beamOn=!!input.torch&&s.round.hasTorch&&!input.paused&&(p.battery??1)>0;drainBattery(p,beamOn,dt);p.torch=beamOn&&p.battery>0;}
 }
 if(Number.isFinite(input.yaw))p.yaw=input.yaw;if(Number.isFinite(input.pitch))p.pitch=input.pitch;
 stepPitBalance(p,{...input,lean:input.paused?0:input.lean},dt,{canMove:(x,z)=>canMoveRound(r,x,z,(a,b)=>canWalkLevelZero(map,a,b),p),climbing:p.climbing||p.exitReady});advanceRoundPhysics(r,p,dt);for(const k of localKeys)p[k]=r[k];
}
export function backroomsCoopTarget(s,id,canSee){
 const p=s.players[id];if(!p||s.round.phase!=='playing'||p.ropeClimb||p.downed)return null;
 if(isMonochrome2State(s)){const v=reviveCandidate(s,id,canSee);if(v)return {id:'revive:'+v.id,label:'Revive '+v.name,duration:TEAM.reviveSeconds};}
 const ownRope=s.round.ropes.find(r=>r.playerId===id);if(p.y<PITFALLS.floorY+.3&&ownRope&&ropeGrabOk(ownRope,p))return {id:'rope:'+id,label:'Climb rescue rope',duration:.7};
 if(s.round.hasRope&&p.y>-.25&&p.x>42&&roundFloor(s.round,p.x,p.z)===0){const fallen=Object.values(s.players).find(v=>v.id!==id&&v.y<PITFALLS.floorY+.3&&!v.downed&&planRope(p,v));if(fallen)return {id:'deploy-rope:'+fallen.id,label:'Lower rescue rope to '+fallen.name,duration:1.2};}
 return roundTarget(backroomsCoopView(s,id),p,p.yaw,canSee);
}
export function interactBackroomsCoop(s,id,targetId,canSee){
 const p=s.players[id];if(!p||s.round.phase!=='playing'||p.downed)return {ok:false};
 const target=backroomsCoopTarget(s,id,canSee);if(target?.id!==targetId||target.disabled)return {ok:false};
 if(targetId.startsWith('revive:'))return {ok:revivePlayer(s,id,targetId.slice(7))};
 if(targetId.startsWith('deploy-rope:')){const victim=s.players[targetId.slice(12)];s.round.ropes=s.round.ropes.filter(r=>r.playerId!==victim.id);const plan=planRope(p,victim);if(!plan)return {ok:false};s.round.ropes.push({playerId:victim.id,...plan,at:s.elapsed});return {ok:true};}
 if(targetId==='rope:'+id){const rope=s.round.ropes.find(r=>r.playerId===id);if(!rope)return {ok:false};Object.assign(p,{ropeClimb:true,rescueTime:0,ropeStart:{x:p.x,y:p.y,z:p.z},ropeRef:{lip:{...rope.lip},hang:{...rope.hang},outward:{...rope.outward}}});return {ok:true};}

 if(targetId==='vent'){if(!s.round.ventOpen)return {ok:false};p.exitReady=true;if(isMonochrome2State(s)?teamWon(s):Object.values(s.players).every(v=>v.exitReady)){s.round.phase='won';for(const v of Object.values(s.players)){v.speed=0;v.sprint=false;}}return {ok:true};}
 const view=backroomsCoopView(s,id),ok=interactRound(view,targetId);if(!ok)return {ok:false};
 for(const k of ['collected','installed','repaired','hasKey','doorOpen','upperExitOpen','altDoorOpen','hasTorch','hasRope','ventOpen'])s.round[k]=view[k];
 // The release-button cutscene ends with the player a step in front of the vent.
 if(targetId==='vent-button')Object.assign(p,{x:VENT_STAGE.x,z:VENT_STAGE.z,yaw:-Math.PI/2});
 s.round.parts=view.parts;
 for(const k of localKeys)p[k]=view[k];
 if(targetId==='ladder'&&p.climbing){p.x=s.round.ladder.x;p.z=s.round.ladder.z+.45;}
 return {ok:true};
}
export function resetBackroomsCoop(s){const fresh=createBackroomsCoopState(Object.values(s.players),{classic:s.classic,variant:s.variant});Object.assign(s,fresh,{epoch:s.epoch+1});}
