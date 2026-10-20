import {B2_CONVERSATION_DURATION} from './teaser-timeline.js';
export const B2_DURATION={descent:5,conversation:B2_CONVERSATION_DURATION,return:4};
export const B2_NPC={x:0,z:-3};
export const B2_RETURN={x:0,z:3.4,height:0};
export function createHalloweenQuest(seed,roomCount){
 const first=(seed>>>0)%Math.min(4,roomCount),second=(first+Math.max(1,Math.floor(roomCount/2)))%roomCount;
 return {stage:0,key:false,seen:false,rooms:[first,second],visit:null,keyRevealAt:null};
}
export function halloweenClue(q){
 return [
  'A folded invitation waits by the pumpkins at the stairs.',
  'Find the storage room they scratched from the records.',
  `Beneath the pipes in storage ${String((q?.rooms?.[1]??0)+1).padStart(2,'0')}, the dead keep watch.`,
  'Your last light waits where the descent began.',
  'Three seals. One key. Return to the chained pumpkin chest upstairs.',
  q?.seen?'Recovered footage · return to the elevator whenever you are ready.':'The Halloween Key fits the pumpkin-marked service panel upstairs.'
 ][q?.stage??0];
}
export function halloweenTargetInfo(run,target){
 if(!target?.id?.startsWith('halloween:')||!run.halloween)return null;
 const q=run.halloween,id=target.id;
 const defs={
  'halloween:invitation':['Read the folded invitation',.3],
  'halloween:seal-0':['Recover the first wax seal',.45],
  'halloween:seal-1':['Recover the second wax seal',.45],
  'halloween:seal-2':['Recover the final wax seal',.45],
  'halloween:chest':[q.key?'The Halloween Key is yours':q.stage===4?'Unseal the Halloween Key':'Inspect the chained pumpkin chest',.7],
  'halloween:b2-panel':[q.key?'Turn the Halloween Key · descend to B2':'Inspect the pumpkin-marked service panel',.6]
 };
 const sealIndex=['halloween:seal-0','halloween:seal-1','halloween:seal-2'].indexOf(id);if(sealIndex>=0&&q.stage>sealIndex+1)defs[id]=['Seal already recovered',.2];
 const def=defs[id];return def?{...target,type:'halloween',label:def[0],duration:def[1]}:null;
}
export function interactHalloween(run,id,{now=Date.now()/1000,players=[]}={}){
 const q=run.halloween;if(!q)return {ok:false,reason:'unavailable'};
 if(id==='halloween:return'){
  if(q.visit?.stage!=='archive')return {ok:false,reason:'unavailable'};
  q.visit.stage='return';q.visit.elapsed=0;q.visit.startedAt=now;return {ok:true,message:'Returning to B1.'};
 }
 if(run.phase!=='playing')return {ok:false,reason:'unavailable'};
 if(id==='halloween:b2-panel'){
  if(!q.key)return {ok:false,reason:'quest',message:'A pumpkin-shaped keyhole. Its key is hidden upstairs.'};
  const team=players.filter(p=>p.status===undefined||p.status==='alive'||p.status==='downed');
  if(!team.length||team.some(p=>p.status==='downed'||p.hidden||Math.hypot(p.x+2.6,p.z+31,(p.height??0)-3.6)>4.6))return {ok:false,reason:'team',message:'Gather every survivor at the upstairs service panel. Revive anyone downed first.'};
  q.visit={id:`${run.seed}:${now}`,stage:'descent',startedAt:now,elapsed:0,cast:team.map(p=>({id:p.id??'solo',x:p.x,z:p.z,height:p.height,yaw:p.yaw??0,pitch:p.pitch??0,slot:p.slot??0}))};
  run.phase='halloween';return {ok:true,message:'B2 service access granted.'};
 }
 const order=['halloween:invitation','halloween:seal-0','halloween:seal-1','halloween:seal-2','halloween:chest'],index=order.indexOf(id);
 if(index<0)return {ok:false,reason:'unavailable'};
 if(index<q.stage)return {ok:true,message:index===4?'You already carry the Halloween Key.':halloweenClue(q),repeated:true};
 if(index!==q.stage)return {ok:false,reason:'quest',message:halloweenClue(q)};
 q.stage++;
 if(q.stage===5){q.key=true;q.keyRevealAt=now;}
 return {ok:true,message:q.key?'HALLOWEEN KEY FOUND · B2 service access unlocked.':q.stage===1?`INVITATION FOUND · ${halloweenClue(q)}`:`SEAL ${q.stage-1} / 3 · ${halloweenClue(q)}`,reveal:q.stage===5};
}
export function advanceHalloween(run,players,now=Date.now()/1000){
 const q=run.halloween,v=q?.visit;if(!v||run.phase!=='halloween')return false;
 v.elapsed=Math.max(v.elapsed,Math.max(0,now-v.startedAt));
 if(v.stage==='descent'&&v.elapsed>=B2_DURATION.descent){
  for(const p of players){const pose=v.cast.find(c=>c.id===(p.id??'solo'));if(pose){p.x=(pose.slot%2-.5)*1.1;p.z=2.4+Math.floor(pose.slot/2)*.55;p.height=0;p.yaw=0;p.pitch=0;}}
  v.stage='archive';v.elapsed=0;v.startedAt=now;return true;
 }
 if(v.stage==='archive'&&!q.seen&&players.some(p=>(p.status===undefined||p.status==='alive')&&Math.hypot(p.x-B2_NPC.x,p.z-B2_NPC.z)<2.7)){
  v.stage='conversation';v.elapsed=0;v.startedAt=now;return true;
 }
 if(v.stage==='conversation'&&v.elapsed>=B2_DURATION.conversation){q.seen=true;v.stage='archive';v.elapsed=0;v.startedAt=now;return true;}
 if(v.stage==='return'&&v.elapsed>=B2_DURATION.return){
  for(const p of players){const pose=v.cast.find(c=>c.id===(p.id??'solo'));if(pose)for(const key of ['x','z','height','yaw','pitch'])p[key]=pose[key];}
  q.visit=null;run.phase='playing';return true;
 }
 return false;
}
export function canMoveB2(x,z){
 return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<3.55&&z>-3.5&&z<4.1&&!(Math.abs(x)<1.55&&z<-.8);
}
