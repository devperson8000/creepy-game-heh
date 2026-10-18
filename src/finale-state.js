export const FINALE_DURATION=52;
const SHOTS=[['black',0,2],['chase',2,12],['stairs',12,19],['dive',19,23],['trapped',23,30],['ascent',30,35],['sever',35,39],['death',39,44],['escape',44,52]];
const clamp=value=>Math.max(0,Math.min(FINALE_DURATION,Number.isFinite(value)?value:0));
export function finaleShot(seconds){const t=clamp(seconds),[name,start,end]=SHOTS.find(([,a,b])=>t>=a&&t<b)??SHOTS.at(-1);return {name,start,end};}
export function beginFinale(state,nowSeconds){
 const run=state.run;
 if(run.phase!=='playing'||run.finale||(run.initialPlayerCount??state.players.size)<2||run.banked.size!==4||!run.codeAccepted||!Number.isFinite(nowSeconds))return false;
 const cast=[...state.players.values()].filter(p=>p.status==='alive'||p.status==='downed').sort((a,b)=>a.slot-b.slot);
 const living=cast.filter(p=>p.status==='alive');if(!living.length)return false;
 const distance=p=>Math.hypot(p.x+2.6,p.z+34,p.height-3.6);
 const runner=[...living].sort((a,b)=>distance(b)-distance(a)||a.slot-b.slot)[0],button=cast.find(p=>p.id!==runner.id)??runner;
 run.finale={id:`${state.seed}:${nowSeconds}`,startedAt:nowSeconds,duration:FINALE_DURATION,elapsed:0,cast:cast.map(({id,name,slot})=>({id,name,slot})),runnerId:runner.id,buttonId:button.id};
 run.phase='finale';return true;
}
export function advanceFinale(state,nowSeconds){
 const run=state.run;if(run.phase!=='finale'||!run.finale)return false;
 const f=run.finale;f.elapsed=Math.max(f.elapsed,clamp(nowSeconds-f.startedAt));
 if(f.elapsed<FINALE_DURATION)return false;
 for(const {id} of f.cast){const p=state.players.get(id);if(p&&(p.status==='alive'||p.status==='downed')){p.status='escaped';p.hidden=false;p.closetId=null;p.downedUntil=null;}}
 state.closets.clear();run.phase='won';return true;
}
export function createFinaleClock({now=()=>performance.now()/1000}={}){
 let id=null,at=now(),value=0,drift=0,latest=-1;
 function sample(){const t=now(),delta=Math.max(0,t-at);at=t;if(id!==null){const correction=Math.min(drift,delta*.25);value=clamp(value+delta+correction);drift-=correction;}return value;}
 return {sample,sync(record){
  if(!record||typeof record.id!=='string'||!Number.isFinite(record.elapsed))return;
  if(record.id!==id){id=record.id;value=clamp(record.elapsed);latest=record.elapsed;at=now();drift=0;return;}
  const current=sample();if(record.elapsed<=latest)return;latest=record.elapsed;
  const difference=clamp(record.elapsed)-current;if(difference>.75){value=clamp(record.elapsed);drift=0;}else if(difference>0)drift=difference;
 },reset(){id=null;value=0;latest=-1;drift=0;at=now();}};
}
