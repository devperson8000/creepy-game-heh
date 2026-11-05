import {createBackroomsCoopState,stepBackroomsPlayer,interactBackroomsCoop,backroomsCoopView,backroomsCoopTarget,resetBackroomsCoop} from './backrooms-coop-state.js';
import {createNavigator} from './navigation.js';
import {canWalkLevelZero} from './backrooms-layout.js';
const copy=v=>structuredClone(v);
const validCommand=c=>c&&Number.isSafeInteger(c.sequence)&&c.sequence>0&&Number.isFinite(c.duration)&&c.duration>0&&c.duration<=.05&&['forward','right','yaw','pitch'].every(k=>Number.isFinite(c[k]))&&Math.abs(c.forward)<=1&&Math.abs(c.right)<=1&&Math.abs(c.pitch)<=1.571;
export function validBackroomsSnapshot(p){
 const s=p?.state;return p?.game==='backrooms'&&Number.isSafeInteger(p.tick)&&s?.game==='backrooms'&&Number.isSafeInteger(s.epoch)&&['playing','won','dead'].includes(s.round?.phase)&&Array.isArray(s.round.parts)&&s.round.parts.length===4&&Object.values(s.players??{}).length>0&&Object.values(s.players).length<=4&&Object.values(s.players).every(v=>['x','z','y','yaw','pitch'].every(k=>Number.isFinite(v[k]))&&v.x>=-31&&v.x<=69&&v.z>=-43&&v.z<=31&&v.y>=-4.1&&v.y<=2);
}
export function createBackroomsCoop({client,session,world,onNotice=()=>{},onMove=()=>{},onReset=()=>{},onDistract=()=>{},onInteract=()=>{}}){
 const host=client.id===session.ownerId,nav=createNavigator((x,z)=>canWalkLevelZero(world.map,x,z,.35),{...world.map.bounds,spacing:.5});
 let state=createBackroomsCoopState(session.players,{classic:session.classic}),disposed=false,sequence=0,pending=[],motionId=crypto.randomUUID(),lastTick=-1,tick=0,sentAt=0,now=0,lastSnapshot=performance.now(),monsters=null,waitingAction=null,retryAt=0,actionUntil=0,connection='connected';
 const queues=new Map(),seen=new Map();let acks={};
 function execute(id,action){
  if(!state.players[id]||!action)return;
  if(action.code==='distract'){if(!state.classic&&state.round.phase==='playing')onDistract(state.players[id],state.elapsed);return;}
  if(!action.code.startsWith('interact:')||seen.get(id)?.has(action.code))return;
  const result=interactBackroomsCoop(state,id,action.targetId,nav.clear);
  if(result.ok){onInteract(state.players[id]);if(!seen.has(id))seen.set(id,new Set());const set=seen.get(id);set.add(action.code);if(set.size>64)set.delete(set.values().next().value);acks[id]=action.code;}
 }
 function receive(id,packet){
  if(!state.players[id]||!packet||typeof packet.motionId!=='string'||!Array.isArray(packet.commands)||packet.commands.length>180||!packet.commands.every(validCommand))return;
  let q=queues.get(id);if(q?.motionId!==packet.motionId){q={motionId:packet.motionId,commands:[],last:0,budget:0};queues.set(id,q);state.players[id].inputSequence=0;}
  const fresh=packet.commands.filter(c=>c.sequence>q.last);if(fresh.some((c,i)=>c.sequence!==(i?fresh[i-1].sequence:q.last)+1)||q.commands.length+fresh.length>180)return;
  q.commands.push(...fresh);if(fresh.length)q.last=fresh.at(-1).sequence;
 }
 function accept(packet){
  if(!validBackroomsSnapshot(packet)||packet.tick<=lastTick||!packet.state.players[client.id])return;
  lastTick=packet.tick;lastSnapshot=performance.now();connection='connected';const oldEpoch=state.epoch;state=copy(packet.state);monsters=packet.monsters??null;
  if(oldEpoch!==state.epoch){pending=[];sequence=0;motionId=crypto.randomUUID();waitingAction=null;onReset();}
  const p=state.players[client.id];
  pending=pending.filter(c=>c.sequence>(p.inputSequence??0));
  for(const c of pending)stepBackroomsPlayer(state,p,c,c.duration,world.map);
  if(waitingAction&&packet.acks?.[client.id]===waitingAction.code)waitingAction=null;
 }
 const unsubscribe=client.subscribe(e=>{
  if(disposed)return;
  if(e.type==='input'&&host)receive(e.playerId,e.input);
  if(e.type==='action'&&host)execute(e.playerId,e.action);
  if(e.type==='snapshot'&&!host)accept(e.snapshot);
  if(e.type==='connection'){connection=e.status;if(e.status==='reconnecting')onNotice('Reconnecting to the team…');}
  if(e.type==='roomClosed'){connection='closed';onNotice('The host left. Return to the lobby to play again.');}
  if(e.type==='lobby'&&e.lobby){const ids=new Set(e.lobby.members.map(m=>m.id));for(const id of Object.keys(state.players))if(id!==client.id&&!ids.has(id)){delete state.players[id];queues.delete(id);}if(host&&state.round.phase==='playing'&&Object.values(state.players).every(p=>p.exitReady))state.round.phase='won';if(e.lobby.ownerId!==session.ownerId){connection='closed';onNotice('The host left. Return to the lobby to play again.');}}
  if(e.type==='error')onNotice(e.message);
 });
 function move(p,c,dt){const before={x:p.x,z:p.z};stepBackroomsPlayer(state,p,c,dt,world.map);onMove(Math.hypot(p.x-before.x,p.z-before.z),p.sprint,p);}
 function step(delta,input){
  if(disposed)return;const dt=Math.min(.1,Math.max(0,delta));now+=dt;
  if(connection==='closed')return;
  if(host){
   if(state.round.phase==='playing')state.elapsed+=dt;
   const p=state.players[client.id];for(let left=dt;left>1e-8;left-=.025)move(p,input,Math.min(.025,left));
   for(const [id,q]of queues){q.budget=Math.min(.1,q.budget+dt);const p=state.players[id];if(!p)continue;p.speed=0;
    while(q.commands.length&&q.commands[0].duration<=q.budget+1e-8){const c=q.commands.shift();q.budget-=c.duration;move(p,c,c.duration);p.inputSequence=c.sequence;}
   }
  }else{
   if(performance.now()-lastSnapshot>5000){onNotice('Connection interrupted. Waiting for the host…');return;}
   for(let left=dt;left>1e-8&&pending.length<180;left-=.05){const c={...input,sequence:++sequence,duration:Math.min(.05,left)};pending.push(c);stepBackroomsPlayer(state,state.players[client.id],c,c.duration,world.map);}
   client.send('input',{input:{...input,motionId,commands:pending}});
   if(waitingAction&&now>actionUntil){waitingAction=null;onNotice('Interaction timed out. Move closer and try again.');}
   if(waitingAction&&now>=retryAt){client.send('action',{action:waitingAction});retryAt=now+.3;}
  }
 }
 function publish(encounter){
  if(!host||disposed)return;monsters={needle:copy(encounter.simulation.state),hunter:encounter.hunter?copy(encounter.hunterSimulation.state):null};
  if(now-sentAt<.13)return;
  if(client.send('snapshot',{snapshot:{game:'backrooms',tick:++tick,state:copy(state),monsters,acks}}))sentAt=now;
 }
 function interact(targetId){if(host)execute(client.id,{code:'interact:'+crypto.randomUUID(),targetId});else if(!waitingAction){waitingAction={code:'interact:'+crypto.randomUUID(),targetId};retryAt=0;actionUntil=now+4;}return true;}
 function restart(){if(!host)return false;resetBackroomsCoop(state);queues.clear();seen.clear();acks={};onReset();return true;}
 return {host,step,publish,interact,restart,finish(reason){if(host&&state.round.phase==='playing'){state.round.phase='dead';state.caughtBy=reason;for(const p of Object.values(state.players)){p.speed=0;p.sprint=false;}}},distract(){if(host)onDistract(state.players[client.id],state.elapsed);else client.send('action',{action:{code:'distract',targetId:'distract'}});},target:()=>backroomsCoopTarget(state,client.id,nav.clear),view:()=>backroomsCoopView(state,client.id),get state(){return state;},get player(){return state.players[client.id];},get monsters(){return monsters;},get connected(){return connection!=='closed'&&(host||performance.now()-lastSnapshot<5000);},dispose(){disposed=true;unsubscribe();}};
}
