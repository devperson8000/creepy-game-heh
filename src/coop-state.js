import {createRun,enterCode,openExit} from './game-state.js';

export const REVIVE_WINDOW_SECONDS=45;

const fail=reason=>({ok:false,reason});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.height??0)-(b.height??0));
const position=t=>t?.position;
const playing=(s,p)=>s.run.phase==='playing'&&p?.status==='alive';

export function createCoopState(seed,members){
 if(!Array.isArray(members)||members.length<1||members.length>4)throw new RangeError('A co-op team needs one to four players');
 const players=new Map(),slots=new Set();
 for(const member of members)if(typeof member!=='string'&&member.slot!==undefined){
  if(!Number.isInteger(member.slot)||member.slot<0||member.slot>3||slots.has(member.slot))throw new RangeError('Player slots must be unique integers from zero to three');
  slots.add(member.slot);
 }
 members.forEach(member=>{
  const id=typeof member==='string'?member:member.id;
  if(typeof id!=='string'||!id||players.has(id))throw new TypeError('Player IDs must be unique nonempty strings');
  const slot=typeof member!=='string'&&member.slot!==undefined?member.slot:[0,1,2,3].find(value=>!slots.has(value));slots.add(slot);
  players.set(id,{id,name:typeof member==='string'?member:member.name??id,slot,x:-2.6+(slot%2)*.65,z:-30.8+Math.floor(slot/2)*.65,height:3.6,yaw:Math.PI,pitch:0,torch:true,status:'alive',hidden:false,closetId:null,carried:new Set(),downedUntil:null,invulnerableUntil:0});
 });
 return {seed,ownerId:players.keys().next().value,run:{...createRun(seed,{playerCount:members.length}),initialPlayerCount:members.length},players,closets:new Map()};
}

function releaseCloset(state,player){
 if(player.closetId)state.closets.delete(player.closetId);
 if(player.hidden&&player.closetExit){player.x=player.closetExit.x;player.z=player.closetExit.z;player.height=player.closetExit.height??player.height;}
 player.hidden=false;player.hideWitnessed=false;player.closetId=null;player.closetExit=null;
}
function dropKeys(state,player){
 for(const id of player.carried)if(!state.run.banked.has(id)&&state.run.drawers[id])state.run.drawers[id].taken=false;
 player.carried.clear();
}
function updateOutcome(state){
 if(state.run.phase!=='playing')return;
 const players=[...state.players.values()];
 if(players.some(p=>p.status==='alive'))return;
 if(players.length&&players.every(p=>p.status==='escaped'||p.status==='dead')&&players.some(p=>p.status==='escaped'))state.run.phase='won';
 else state.run.phase='dead';
}

/** Targets contain trusted world positions (floor height), never client supplied positions. */
export function coopInteract(state,playerId,action,{targets=new Map(),canSee,now=state.run.elapsed}={}){
 const player=state.players.get(playerId);
 if(!playing(state,player))return fail('unavailable');
 if(action?.type==='leave'){
  const target=targets.get(player.closetId);
  if(!player.hidden||!target?.exit)return fail('not-hidden');
  player.x=target.exit.x;player.z=target.exit.z;player.height=target.exit.height??player.height;
  releaseCloset(state,player);return {ok:true,type:'leave'};
 }
 if(player.hidden)return fail('hidden');
 if(action?.type==='revive'&&typeof action.targetId==='string'&&action.targetId.startsWith('revive:'))return revivePlayer(state,playerId,action.targetId.slice(7),now,{canSee});
 const target=targets.get(action?.targetId),at=position(target);
 if(!target||target.type!==action?.type||!at)return fail('invalid-target');
 if(!Number.isFinite(distance(player,at))||distance(player,at)>2.6)return fail('too-far');
 if(canSee&&!canSee(player,target))return fail('blocked');
 const run=state.run;
 switch(target.type){
  case 'drawer':{
   const drawer=run.drawers[target.drawerId];if(!drawer)return fail('invalid-drawer');
   if(drawer.opened&&drawer.key&&!drawer.taken){drawer.taken=true;player.carried.add(drawer.id);return {ok:true,type:'key',drawerId:drawer.id};}
   drawer.opened=!drawer.opened;return {ok:true,type:'drawer',opened:drawer.opened,drawerId:drawer.id};
  }
  case 'clue':run.clueRead=true;return {ok:true,type:'clue',code:run.code};
  case 'boards':run.boardsOpen=true;return {ok:true,type:'boards'};
  case 'locks':{
   const count=player.carried.size;for(const id of player.carried)run.banked.add(id);player.carried.clear();return {ok:true,type:'locks',count};
  }
  case 'keypad':return enterCode(run,action.code)?{ok:true,type:'keypad'}:fail('wrong-code');
  case 'elevator':return openExit(run)?{ok:true,type:'elevator'}:fail('locked');
  case 'closet':{
   if(state.closets.has(target.id))return fail('occupied');
   if(!target.hide||!target.exit||distance({...target.hide,height:at.height??0},at)>2.6||distance({...target.exit,height:at.height??0},at)>2.6)return fail('invalid-closet');
   state.closets.set(target.id,playerId);player.hidden=true;player.closetId=target.id;player.closetExit={...target.exit};
   player.x=target.hide.x;player.z=target.hide.z;player.height=target.hide.height??player.height;return {ok:true,type:'closet'};
  }
  default:return fail('invalid-action');
 }
}

export function downPlayer(state,playerId,now=state.run.elapsed){
 const player=state.players.get(playerId);
 if(!playing(state,player)||now<player.invulnerableUntil)return false;
 dropKeys(state,player);releaseCloset(state,player);player.status='downed';player.downedUntil=now+REVIVE_WINDOW_SECONDS;state.run.deaths++;updateOutcome(state);return true;
}
export function revivePlayer(state,rescuerId,targetId,now=state.run.elapsed,{canSee}={}){
 const rescuer=state.players.get(rescuerId),player=state.players.get(targetId);
 if(!playing(state,rescuer)||rescuer.hidden||player?.status!=='downed'||now>=player.downedUntil)return fail('unavailable');
 if(!Number.isFinite(distance(rescuer,player))||distance(rescuer,player)>2)return fail('too-far');
 if(canSee&&!canSee(rescuer,{id:`revive:${targetId}`,type:'revive',position:player}))return fail('blocked');
 player.status='alive';player.downedUntil=null;player.invulnerableUntil=now+3;return {ok:true,type:'revive',playerId:targetId};
}
export function expireDowned(state,now=state.run.elapsed){
 let count=0;
 for(const player of state.players.values())if(player.status==='downed'&&now>=player.downedUntil){player.status='dead';player.downedUntil=null;count++;}
 updateOutcome(state);return count;
}
export function markEscaped(state,playerId){
 const player=state.players.get(playerId);
 if(!playing(state,player)||!state.run.exitOpen||player.z>=-33.6)return false;
 releaseCloset(state,player);player.status='escaped';updateOutcome(state);return true;
}
export function removeCoopPlayer(state,playerId){
 const player=state.players.get(playerId);if(!player)return false;
 dropKeys(state,player);releaseCloset(state,player);state.players.delete(playerId);
 if(state.ownerId===playerId)state.ownerId=state.players.keys().next().value??null;
 updateOutcome(state);return true;
}
export function serializeCoopState(state){
 const {layout,carried,banked,code,...run}=state.run;
 return {seed:state.seed,ownerId:state.ownerId,run:{...run,drawers:run.drawers.map(d=>({...d})),carried:[...carried],banked:[...banked],...(run.clueRead?{code}:{})},players:[...state.players.values()].map(p=>({...p,carried:[...p.carried]})),closets:[...state.closets]};
}
function replaceSet(set,values){set.clear();for(const value of values??[])set.add(value);}
export function applyCoopSnapshot(state,snapshot){
 if(snapshot.seed!==state.seed)throw new Error('Snapshot belongs to a different run');
 const {drawers,carried,banked,layout,...run}=snapshot.run;
 Object.assign(state.run,run);replaceSet(state.run.carried,carried);replaceSet(state.run.banked,banked);
 drawers.forEach((drawer,index)=>{if(state.run.drawers[index])Object.assign(state.run.drawers[index],drawer);else state.run.drawers[index]={...drawer};});
 state.run.drawers.length=drawers.length;
 const ids=new Set(snapshot.players.map(p=>p.id));for(const id of state.players.keys())if(!ids.has(id))state.players.delete(id);
 for(const data of snapshot.players){const player=state.players.get(data.id)??{carried:new Set()}, {carried:keys,...fields}=data;Object.assign(player,fields);replaceSet(player.carried,keys);state.players.set(player.id,player);}
 state.closets.clear();for(const [id,playerId] of snapshot.closets??[])state.closets.set(id,playerId);
 state.ownerId=snapshot.ownerId;return state;
}
