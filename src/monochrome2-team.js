import {TEAM} from './monochrome2-tuning.js';

/**
 * Downed / revive / ending rules for Monochrome 2, on the shared co-op state (1–4 players).
 * A hit downs a player, a teammate can revive them, the round fails once everyone is down.
 * Solo is a team of one: the first hit ends the round.
 */
export const MONOCHROME2_VARIANT='monochrome2';
export const isMonochrome2State=s=>s?.variant===MONOCHROME2_VARIANT;

export function initTeamPlayer(p){
 p.downed=false;p.lost=false;p.revives=0;p.downedFor=0;p.reviveGraceUntil=0;
 return p;
}
const finite=v=>Number.isFinite(v);

/** Monochrome's hit. A player already down cannot be downed again. Returns false if ignored. */
export function downPlayer(s,p,elapsed=s.elapsed,by=null){
 if(!p||p.downed||p.lost||p.exitReady)return false;
 p.downed=true;p.downedFor=0;p.downedBy=by;
 // Out of revives: this one is final.
 if(p.revives>=TEAM.maxRevives)p.lost=true;
 Object.assign(p,{speed:0,sprint:false,climbing:false,crouch:false,torch:false,downedAt:elapsed});
 if(p.ropeClimb){p.ropeClimb=false;}
 return true;
}
export function canRevive(rescuer,victim){
 if(!rescuer||!victim||rescuer.id===victim.id)return false;
 if(rescuer.downed||rescuer.lost||rescuer.exitReady||!victim.downed||victim.lost)return false;
 if((rescuer.y??0)<-.25||(victim.y??0)<-.25)return false;
 return Math.hypot(rescuer.x-victim.x,rescuer.z-victim.z)<=TEAM.reviveReach;
}
/** Closest revivable teammate the rescuer is facing, or null. */
export function reviveCandidate(s,id,canSee=()=>true){
 const me=s.players[id];if(!me)return null;
 let best=null,bestD=Infinity;
 for(const v of Object.values(s.players)){
  if(!canRevive(me,v))continue;
  const dx=v.x-me.x,dz=v.z-me.z,d=Math.hypot(dx,dz),facing=d<.4?1:(-Math.sin(me.yaw)*dx-Math.cos(me.yaw)*dz)/d;
  if(facing<.5||!canSee(me,v))continue;
  if(d<bestD){best=v;bestD=d;}
 }
 return best;
}
export function revivePlayer(s,rescuerId,victimId){
 const r=s.players[rescuerId],v=s.players[victimId];
 if(!canRevive(r,v))return false;
 v.downed=false;v.downedFor=0;v.revives++;v.reviveGraceUntil=s.elapsed+TEAM.reviveGrace;
 // Standing back up is not a free sprint away from the spot he is searching.
 return true;
}
/** Bleed-out: a downed player nobody reaches in time is lost for good. Returns ids lost this tick. */
export function tickTeam(s,delta){
 const out=[],dt=Math.max(0,finite(delta)?delta:0);
 for(const p of Object.values(s.players)){
  if(!p.downed||p.lost)continue;
  p.downedFor+=dt;
  if(p.downedFor>=TEAM.bleedOutSeconds){p.lost=true;out.push(p.id);}
 }
 return out;
}
/** Players Monochrome can sense on the upper layer. */
export const huntable=p=>!p.downed&&!p.lost&&!p.exitReady&&(p.y??0)>-.25;
export const standing=p=>!p.downed&&!p.lost;

export function teamFailed(s){
 const all=Object.values(s.players);
 return all.length>0&&all.every(p=>(p.downed||p.lost)&&!p.exitReady);
}
/**
 * Win: every player is either at the exit or lost, with at least one at the exit.
 * A downed-but-recoverable teammate blocks the exit until revived or bled out.
 */
export function teamWon(s){
 const all=Object.values(s.players);
 return all.some(p=>p.exitReady)&&all.every(p=>p.exitReady||p.lost);
}
/**
 * Re-check the ending after anything that can change it: a hit, a bleed-out, a teammate leaving or
 * reaching the exit. A teammate bleeding out can be the very thing that lets the rest escape, so this
 * must run every tick, not only when someone touches the vent. Returns 'won', 'dead' or null.
 */
export function settleTeam(s){
 if(!s||s.round?.phase!=='playing')return null;
 const outcome=teamWon(s)?'won':teamFailed(s)?'dead':null;
 if(!outcome)return null;
 s.round.phase=outcome;if(outcome==='dead')s.caughtBy='Monochrome';
 for(const p of Object.values(s.players)){p.speed=0;p.sprint=false;}
 return outcome;
}
export function teamSummary(s){
 const all=Object.values(s.players);
 return {total:all.length,standing:all.filter(standing).length,downed:all.filter(p=>p.downed&&!p.lost).length,lost:all.filter(p=>p.lost).length,atExit:all.filter(p=>p.exitReady).length};
}
