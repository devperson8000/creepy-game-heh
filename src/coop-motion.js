import {groundHeight,moveInWorld} from './level.js';

const MAX_PENDING=180;
const valid=c=>c&&Number.isSafeInteger(c.sequence)&&c.sequence>0&&Number.isFinite(c.duration)&&c.duration>0&&c.duration<=.05&&['forward','right','yaw','pitch'].every(k=>Number.isFinite(c[k]))&&Math.abs(c.forward)<=1&&Math.abs(c.right)<=1&&Math.abs(c.yaw)<=1000000&&Math.abs(c.pitch)<=1.571;
function move(player,command,canMove){
 player.yaw=command.yaw;player.pitch=command.pitch;player.torch=!!command.torch;
 const before={x:player.x,z:player.z};
 if(!command.paused&&!player.hidden&&player.status==='alive'){
  for(let left=command.duration;left>1e-8;left-=.025){
   const next=moveInWorld(player,command,command.yaw,Math.min(.025,left),canMove,command.sprint?3.7:2.5);
   player.x=next.x;player.z=next.z;
  }
 }
 player.height=groundHeight(player);
 const distance=Math.hypot(player.x-before.x,player.z-before.z);
 player.moving=distance>.00001;player.speed=distance/command.duration;player.sprint=!!command.sprint&&player.moving;
 return distance;
}

/** Both ends replay identical bounded commands. Snapshots acknowledge simulated time. */
export function createMovementPrediction(player,canMove){
 let sequence=0,pending=[];
 let motionId=crypto.randomUUID();
 function step(input,delta){
  for(let remaining=Math.min(.2,Math.max(0,delta));remaining>1e-8&&pending.length<MAX_PENDING;remaining-=.05){
   const command={...input,sequence:++sequence,duration:Math.min(.05,remaining)};
   pending.push(command);move(player,command,canMove);
  }
 }
 function reconcile(authority,before=player){
  const transition=before.status!==authority.status||before.hidden!==authority.hidden||before.closetId!==authority.closetId;
  if(!transition&&authority.inputMotionId&&authority.inputMotionId!==motionId){
   const {x,z,height,yaw,pitch}=before;Object.assign(player,authority,{x,z,height,yaw,pitch});return;
  }
  if(transition){pending=[];sequence=0;motionId=crypto.randomUUID();}
  else pending=pending.filter(c=>c.sequence>(authority.inputSequence??0));
  const yaw=before.yaw,pitch=before.pitch;
  Object.assign(player,authority);
  for(const command of pending)move(player,command,canMove);
  if(!transition){player.yaw=yaw;player.pitch=pitch;}
 }
 return {step,reconcile,packet:input=>({...input,motionId,commands:pending.slice(0,MAX_PENDING)}),get pendingCount(){return pending.length;}};
}

export function createRemoteMovement(player,canMove){
 let queue=[],lastQueued=0,budget=0,motionId,idleFor=0;const oldMotions=new Set();
 function receive(packet){
  if(typeof packet?.motionId!=='string'||!/^[-a-f0-9]{36}$/.test(packet.motionId)||!Array.isArray(packet?.commands)||packet.commands.length>MAX_PENDING||!packet.commands.every(valid))return false;
  if(packet.motionId!==motionId){
   if(oldMotions.has(packet.motionId))return false;
   if(motionId)oldMotions.add(motionId);if(oldMotions.size>8)oldMotions.delete(oldMotions.values().next().value);
   motionId=packet.motionId;queue=[];lastQueued=0;budget=0;
   player.inputSequence=0;player.inputMotionId=motionId;
  }
  const fresh=packet.commands.filter(c=>c.sequence>lastQueued);
  for(let i=0;i<fresh.length;i++)if(fresh[i].sequence!==(i?fresh[i-1].sequence:lastQueued)+1)return false;
  if(queue.length+fresh.length>MAX_PENDING)return false;
  queue.push(...fresh);if(fresh.length)lastQueued=fresh.at(-1).sequence;
  return true;
 }
 function advance(delta,onMove=()=>{}){
  // Never accumulate permission to fast-forward after a stalled connection.
  budget=Math.min(.1,budget+Math.max(0,Math.min(.2,delta)));
  idleFor+=Math.max(0,delta);
  if(idleFor>.15){player.moving=false;player.speed=0;player.sprint=false;}
  while(queue.length&&queue[0].duration<=budget+1e-8){
   idleFor=0;const command=queue.shift();budget=Math.max(0,budget-command.duration);
   const distance=move(player,command,canMove);player.inputSequence=command.sequence;onMove(distance,command);
  }
 }
 return {receive,advance};
}

const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
/** Render remote actors slightly behind their authority, between actual samples. */
export function createPoseBuffer({delay=.1,extrapolation=.1,adaptive=false}={}){
 let frames=[],spacing=delay/2,targetDelay=delay,lastNow=null,lastSample=-Infinity;
 return {
  push(time,pose){
   if(!Number.isFinite(time)||!pose||!Number.isFinite(pose.x)||!Number.isFinite(pose.z))return;
   if(frames.length&&time<=frames.at(-1).time)return;
   if(adaptive&&frames.length){spacing=spacing*.8+Math.min(.5,time-frames.at(-1).time)*.2;targetDelay=Math.max(delay,Math.min(.35,spacing*1.5));}
   const previous=frames.at(-1)?.pose;
   if(previous&&(previous.hidden!==pose.hidden||previous.status!==pose.status||Math.hypot(previous.x-pose.x,previous.z-pose.z)>6))frames=[];
   frames.push({time,pose:{...pose}});if(frames.length>32)frames.shift();
  },
  sample(now){
   if(!frames.length)return null;
   let time=now-targetDelay;
   if(lastNow!==null)time=Math.max(lastSample,Math.min(lastSample+Math.max(0,now-lastNow)*1.15,time));
   lastNow=now;lastSample=time;
   while(frames.length>2&&frames[1].time<=time)frames.shift();
   const first=frames[0],second=frames[1];
   if(!second||time<=first.time)return {...first.pose};
   const dt=second.time-first.time;
   const t=Math.min(1+extrapolation/dt,Math.max(0,(time-first.time)/dt));
   const latest=frames.at(-1).pose;
   // Stop cleanly instead of extrapolating a stopped or hidden teammate.
   const mix=t>1&&(!second.pose.moving||second.pose.hidden||second.pose.status&&second.pose.status!=='alive')?1:t;
   return {...latest,x:first.pose.x+(second.pose.x-first.pose.x)*mix,z:first.pose.z+(second.pose.z-first.pose.z)*mix,height:(first.pose.height??0)+((second.pose.height??0)-(first.pose.height??0))*Math.min(1,mix),yaw:angle(first.pose.yaw??0,second.pose.yaw??0,Math.min(1,mix)),pitch:(first.pose.pitch??0)+((second.pose.pitch??0)-(first.pose.pitch??0))*Math.min(1,mix)};
  }
 };
}
