import {createBackroomsRound,roundTarget,interactRound,canMoveRound,advanceRoundPhysics,roundFloor,BACKROOMS_SPEED} from './backrooms-round.js';
import {createLevelZero,canWalkLevelZero} from './backrooms-layout.js';
import {moveInWorld} from './level.js';
const localKeys=['climbing','ladderHeight','velocity','fell'];
export function createBackroomsCoopState(members,{classic=true}={}){
 if(!Array.isArray(members)||members.length<1||members.length>4)throw new RangeError('A team needs 1–4 players.');
 const players={};
 for(const [i,m]of members.entries()){if(!m.id||Object.hasOwn(players,m.id))throw new Error('Invalid player identity');const slot=m.slot??i;players[m.id]={id:m.id,name:m.name??'Wanderer',slot,x:-7+(slot%2)*.9,z:13+Math.floor(slot/2)*.9,y:0,yaw:-.45,pitch:0,climbing:false,ladderHeight:0,velocity:0,fell:false,exitReady:false,inputSequence:0,torch:!classic,speed:0,sprint:false};}
 const round=createBackroomsRound();round.hasTorch=!classic;return {version:1,game:'backrooms',epoch:0,elapsed:0,classic,round,players};
}
export function backroomsCoopView(s,id){const p=s.players[id];return {...s.round,...Object.fromEntries(localKeys.map(k=>[k,p[k]]))};}
export function stepBackroomsPlayer(s,p,input,delta,map=createLevelZero()){
 if(s.round.phase!=='playing'||!p||!input)return;
 const dt=Math.min(.05,Math.max(0,delta));if(!Number.isFinite(dt))return;
 const r=backroomsCoopView(s,p.id);p.speed=0;p.sprint=false;
 if(!input.paused&&!p.climbing&&!p.exitReady){
  const speed=input.sprint?BACKROOMS_SPEED.sprint:BACKROOMS_SPEED.walk;
  const next=moveInWorld(p,{forward:Math.max(-1,Math.min(1,input.forward||0)),right:Math.max(-1,Math.min(1,input.right||0))},input.yaw,dt,(x,z)=>canMoveRound(r,x,z,(a,b)=>canWalkLevelZero(map,a,b),p),speed);
  p.speed=dt?Math.hypot(next.x-p.x,next.z-p.z)/dt:0;p.sprint=!!input.sprint&&p.speed>.1;Object.assign(p,next);p.torch=!!input.torch&&s.round.hasTorch;
 }
 if(Number.isFinite(input.yaw))p.yaw=input.yaw;if(Number.isFinite(input.pitch))p.pitch=input.pitch;
 advanceRoundPhysics(r,p,dt);for(const k of localKeys)p[k]=r[k];
}
export function backroomsCoopTarget(s,id,canSee){
 const p=s.players[id];if(!p||s.round.phase!=='playing')return null;
 if(p.y>-.25&&p.x>42&&roundFloor(s.round,p.x,p.z)===0){const fallen=Object.values(s.players).find(v=>v.id!==id&&v.y<-3&&Math.hypot(v.x-p.x,v.z-p.z)<2.5);if(fallen)return {id:'rope:'+fallen.id,label:'Lower rescue rope to '+fallen.name,duration:1.2};}
 return roundTarget(backroomsCoopView(s,id),p,p.yaw,canSee);
}
export function interactBackroomsCoop(s,id,targetId,canSee){
 const p=s.players[id];if(!p||s.round.phase!=='playing')return {ok:false};
 const target=backroomsCoopTarget(s,id,canSee);if(target?.id!==targetId)return {ok:false};
 if(targetId.startsWith('rope:')){const victim=s.players[targetId.slice(5)];Object.assign(victim,{x:p.x,z:p.z,y:0,velocity:0});return {ok:true};}
 if(targetId==='vent'){p.exitReady=true;if(Object.values(s.players).every(v=>v.exitReady)){s.round.phase='won';for(const v of Object.values(s.players)){v.speed=0;v.sprint=false;}}return {ok:true};}
 const view=backroomsCoopView(s,id),ok=interactRound(view,targetId);if(!ok)return {ok:false};
 for(const k of ['collected','repaired','hasKey','doorOpen','hasTorch'])s.round[k]=view[k];
 s.round.parts=view.parts;
 for(const k of localKeys)p[k]=view[k];
 if(targetId==='ladder'&&p.climbing){p.x=s.round.ladder.x;p.z=s.round.ladder.z+.45;}
 return {ok:true};
}
export function resetBackroomsCoop(s){const fresh=createBackroomsCoopState(Object.values(s.players),{classic:s.classic});Object.assign(s,fresh,{epoch:s.epoch+1});}
