import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementPrediction,createRemoteMovement} from '../src/coop-motion.js';
const input={forward:1,right:0,yaw:Math.PI,pitch:0,sprint:false,torch:true,paused:false};
const player=()=>({x:0,z:-30,height:3.6,status:'alive',hidden:false});
const canMove=(x,z)=>Math.abs(x)<5&&z<-25;

test('delayed acknowledgements replay unprocessed movement instead of pulling the player backwards',()=>{
 const own=player(),host=player(),prediction=createMovementPrediction(own,canMove),remote=createRemoteMovement(host,canMove);
 const packets=[];let worst=0;
 for(let frame=0;frame<180;frame++){
  const command=frame<120?input:{...input,forward:0};
  prediction.step(command,1/60);
  if(frame%4===0)packets.push({due:frame+9,packet:prediction.packet(command)});
  while(packets[0]?.due<=frame)remote.receive(packets.shift().packet);
  remote.advance(1/60);
  if(frame%8===0&&frame>16){
   const before=own.z;prediction.reconcile({...host});
   worst=Math.max(worst,Math.abs(own.z-before));
  }
 }
 assert.ok(worst<.00001,`unexpected reconciliation displacement: ${worst}`);
 assert.ok(Math.abs(own.z-(-25))<.1||own.z>-25.1);
});

test('repeated and out-of-order input packets never apply the same movement twice',()=>{
 const own=player(),host=player(),prediction=createMovementPrediction(own,canMove),remote=createRemoteMovement(host,canMove);
 for(let i=0;i<6;i++)prediction.step(input,1/60);
 const packet=prediction.packet(input);remote.receive(packet);remote.receive(packet);remote.advance(.1);
 const z=host.z;remote.receive(packet);remote.advance(.2);
 assert.equal(host.z,z);assert.equal(host.inputSequence,6);
});

test('acknowledged collision corrections and genuine hiding transitions remain authoritative',()=>{
 const own=player(),prediction=createMovementPrediction(own,canMove);
 prediction.step(input,.05);prediction.step(input,.05);
 prediction.reconcile({...player(),x:2,inputSequence:1});
 assert.equal(own.x,2);assert.ok(own.z>-30);
 prediction.reconcile({...player(),x:3,z:-28,hidden:true,closetId:'closet',inputSequence:2});
 assert.equal(own.x,3);assert.equal(own.z,-28);assert.equal(prediction.pendingCount,0);
});

test('the host bounds input time and rejects malformed or impossible movement',()=>{
 const host=player(),remote=createRemoteMovement(host,canMove);
 assert.equal(remote.receive({...input,commands:[{...input,sequence:1,duration:50}]}),false);
 assert.equal(remote.receive({...input,commands:[{...input,sequence:1,duration:.05,yaw:NaN}]}),false);
 assert.equal(host.z,-30);
});

test('remote rendering interpolates steady motion between snapshots and bounds extrapolation',async()=>{
 const {createPoseBuffer}=await import('../src/coop-motion.js');
 const buffer=createPoseBuffer({delay:.1,extrapolation:.1});
 buffer.push(0,{x:0,z:0,yaw:3.1,moving:true,status:'alive'});
 buffer.push(.1,{x:.25,z:0,yaw:-3.1,moving:true,status:'alive'});
 const half=buffer.sample(.15);assert.ok(Math.abs(half.x-.125)<1e-8);assert.ok(Math.abs(half.yaw)>3);
 assert.ok(buffer.sample(2).x<=.5);
 buffer.push(.2,{x:.25,z:0,yaw:0,moving:false,status:'alive'});
 assert.equal(buffer.sample(.5).x,.25);
 buffer.push(.3,{x:3,z:2,hidden:true,status:'alive'});
 assert.equal(buffer.sample(.31).x,3);
});

test('loss and jitter recover from redundant commands without reverse local movement',()=>{
 const own=player(),host=player(),prediction=createMovementPrediction(own,()=>true),remote=createRemoteMovement(host,()=>true);
 const packets=[],snapshots=[];let worst=0;
 for(let frame=0;frame<300;frame++){
  prediction.step(input,1/60);
  // Drop every third input packet and vary delivery by 50–180 ms.
  if(frame%5===0&&frame%15!==0)packets.push({due:frame+3+(frame%8),packet:prediction.packet(input)});
  for(let i=packets.length-1;i>=0;i--)if(packets[i].due<=frame){remote.receive(packets[i].packet);packets.splice(i,1);}
  remote.advance(1/60);
  if(frame%8===0)snapshots.push({due:frame+6,pose:{...host}});
  while(snapshots[0]?.due<=frame){const before=own.z;prediction.reconcile(snapshots.shift().pose);worst=Math.max(worst,Math.abs(own.z-before));}
 }
 assert.ok(worst<1e-7,`jitter correction moved local player by ${worst}`);
 assert.ok(prediction.pendingCount<80);
});

test('network packet spacing does not flicker a walking animation to idle between inputs',()=>{
 const own=player(),host=player(),prediction=createMovementPrediction(own,()=>true),remote=createRemoteMovement(host,()=>true);
 prediction.step(input,1/60);remote.receive(prediction.packet(input));remote.advance(1/60);assert.equal(host.moving,true);
 remote.advance(1/60);assert.equal(host.moving,true);
 remote.advance(.2);assert.equal(host.moving,false);
});

test('hiding and leaving starts a fresh stream so abandoned commands cannot freeze movement',()=>{
 const own=player(),host=player(),prediction=createMovementPrediction(own,()=>true),remote=createRemoteMovement(host,()=>true);
 for(let i=0;i<2;i++)prediction.step(input,1/60);
 remote.receive(prediction.packet(input));remote.advance(.05);
 for(let i=0;i<3;i++)prediction.step(input,1/60);
 prediction.reconcile({...host,hidden:true,closetId:'cabinet'});
 Object.assign(host,{hidden:true,closetId:'cabinet'});
 prediction.step(input,1/60);assert.equal(remote.receive(prediction.packet(input)),true);remote.advance(.05);
 prediction.reconcile({...host,hidden:false,closetId:null});Object.assign(host,{hidden:false,closetId:null});
 prediction.step(input,1/60);assert.equal(remote.receive(prediction.packet(input)),true);const before=host.z;remote.advance(.05);assert.ok(host.z>before);
});

test('prediction preserves walking speed at 15 fps as well as 60 fps',()=>{
 const fast=player(),slow=player(),a=createMovementPrediction(fast,()=>true),b=createMovementPrediction(slow,()=>true);
 for(let i=0;i<60;i++)a.step(input,1/60);
 for(let i=0;i<15;i++)b.step(input,1/15);
 assert.ok(Math.abs(fast.z-slow.z)<1e-7,`60fps=${fast.z}, 15fps=${slow.z}`);
});

test('buffered remote poses keep moving forward under irregular, out-of-order snapshot delivery',async()=>{
 const {createPoseBuffer}=await import('../src/coop-motion.js');
 const buffer=createPoseBuffer({adaptive:true});let packets=[],latest=-Infinity,previous=0,moved=false;
 for(let frame=0;frame<300;frame++){
  const now=frame/60;
  if(frame%6===0)packets.push({source:now,arrival:now+(frame%18===0?.18:.03),x:2.5*now});
  for(let i=packets.length-1;i>=0;i--)if(packets[i].arrival<=now){const packet=packets[i];if(packet.source>latest){latest=packet.source;buffer.push(now,{x:packet.x,z:0,moving:true,status:'alive'});}packets.splice(i,1);}
  const pose=buffer.sample(now);if(!pose)continue;
  assert.ok(pose.x>=previous-1e-8,'a delayed snapshot must not reverse a forward-running teammate');moved||=pose.x>previous;previous=pose.x;
 }
 assert.equal(moved,true);assert.ok(previous>10);
});
