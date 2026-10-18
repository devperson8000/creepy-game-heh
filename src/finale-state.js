export const FINALE_DURATION=52;
const BOUNDS=[['fade',0,2],['chase',2,12],['stairs',12,19],['dive',19,23],['doors',23,30],['ascent',30,35],['defeat',35,39],['silence',39,44],['daylight',44,52]];
const clamp=(value)=>Math.min(FINALE_DURATION,Math.max(0,Number.isFinite(value)?value:0));
export function finaleShot(seconds){
 const time=clamp(seconds);
 const [name,start,end]=BOUNDS.find(([,start,end])=>time>=start&&time<end)??BOUNDS.at(-1);
 return {name,start,end};
}
export function finaleCast(state,elevator={x:-2.6,z:-31,height:3.6}){
 const candidates=[...state.players.values()].filter(p=>p.status==='alive'||p.status==='downed');
 if(!candidates.some(p=>p.status==='alive'))return null;
 const living=candidates.filter(p=>p.status==='alive');
 const distance=p=>Math.hypot((p.x??0)-elevator.x,(p.z??0)-elevator.z,(p.height??0)-(elevator.height??0));
 const runner=[...living].sort((a,b)=>distance(b)-distance(a)||a.slot-b.slot)[0];
 const button=[...living].filter(p=>p.id!==runner.id).sort((a,b)=>a.slot-b.slot)[0]??runner;
 return {cast:candidates.sort((a,b)=>a.slot-b.slot).map(({id,name,slot})=>({id,name,slot})),runnerId:runner.id,buttonId:button.id};
}
export function beginFinale(state,nowSeconds,{elevator}={}){
 const run=state.run;
 if(run.phase!=='playing'||run.finale||((run.originalTeamSize??state.players.size)<2)||run.banked.size!==4||!run.codeAccepted)return false;
 const selection=finaleCast(state,elevator);
 if(!selection)return false;
 const startedAt=Number.isFinite(nowSeconds)?nowSeconds:0;
 run.finale={id:`${state.seed}:${Math.round(startedAt*1000)}:${selection.runnerId}`,startedAt,duration:FINALE_DURATION,elapsed:0,...selection};
 run.phase='finale';run.exitOpen=true;
 return true;
}
export function advanceFinale(state,nowSeconds){
 const run=state.run,record=run.finale;
 if(!record||run.phase!=='finale')return false;
 record.elapsed=Math.max(record.elapsed??0,clamp(nowSeconds-record.startedAt));
 if(record.elapsed<FINALE_DURATION)return false;
 for(const member of record.cast){
  const player=state.players.get(member.id);
  if(player&&(player.status==='alive'||player.status==='downed')){player.status='escaped';player.downedUntil=null;player.hidden=false;}
 }
 run.phase='won';return true;
}
export function createFinaleClock({now=()=>performance.now()/1000}={}){
 let id=null,started=0,offset=0,lastSample=0,lastIncoming=-1;
 return {
  sync(record){
   if(!record?.id)return false;
   const time=clamp(record.elapsed??0);
   if(record.id!==id){id=record.id;started=now();offset=time;lastSample=time;lastIncoming=time;return true;}
   if(time<lastIncoming-.001)return false;
   lastIncoming=time;
   const predicted=clamp(offset+now()-started);
   if(time>predicted+.75){offset=time;started=now();}
   else if(time>predicted+.025){offset+=Math.min(.15,(time-predicted)*.2);}
   return true;
  },
  sample(){if(!id)return 0;lastSample=Math.max(lastSample,clamp(offset+now()-started));return lastSample;},
  reset(){id=null;started=0;offset=0;lastSample=0;lastIncoming=-1;},
  get id(){return id;}
 };
}
