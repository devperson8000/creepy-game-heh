import {movePlayer,MAZE_MOVEMENT,MAZE_MONSTER_SPEED} from '../src/player-movement.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createMovementPrediction,createRemoteMovement} from '../src/coop-motion.js';
const command={forward:1,right:0,yaw:Math.PI,pitch:0,sprint:true,torch:true,paused:false};
function surface(){const canMove=()=>true;canMove.gameplay='maze';canMove.groundHeight=()=>-7.2;return canMove;}
function player(){return {x:0,z:0,height:-7.2,status:'alive',hidden:false};}
test('eight-second sprint exhausts, restores after a delay, and walking is slower than the chase',()=>{
 const p=player(),canMove=surface(),predict={step:(command,dt)=>movePlayer(p,command,dt,canMove)};
 for(let i=0;i<160;i++)predict.step(command,.05);
 assert.ok(p.stamina<1e-6);assert.equal(p.exhausted,true);assert.ok(Math.abs(p.z-8*6.2)<.01);
 const at=p.z;for(let i=0;i<20;i++)predict.step({...command,sprint:false},.05);assert.ok(Math.abs(p.z-at-4.6)<.01);assert.ok(p.stamina<1e-6);
 assert.ok(MAZE_MOVEMENT.walk<MAZE_MONSTER_SPEED.chase);assert.equal(MAZE_MOVEMENT.sprint,MAZE_MONSTER_SPEED.chase);
 for(let i=0;i<123;i++)predict.step({...command,sprint:false},.05);assert.ok(p.stamina>.99);assert.equal(p.exhausted,false);
});
test('delayed co-op command replay converges for position and stamina through exhaustion and recovery',()=>{
 const own=player(),host=player(),canMove=surface(),prediction=createMovementPrediction(own,canMove),remote=createRemoteMovement(host,canMove);
 for(let frame=0;frame<1100;frame++){
  const input={...command,sprint:frame<520||frame>900};prediction.step(input,1/60);
  if(frame%3===0)remote.receive(prediction.packet(input));remote.advance(1/60);
  if(frame%6===0)prediction.reconcile({...host});
  assert.ok(Math.abs(own.stamina-host.stamina)<.03);
 }
 assert.ok(Math.abs(own.z-host.z)<.5);assert.ok(own.stamina>=0&&own.stamina<=1);
});

test('stamina does not drain against walls and freezes on pause; hiding allows recovery',()=>{
 const p=player(),blocked=()=>false;blocked.gameplay='maze';
 for(let i=0;i<200;i++)movePlayer(p,command,.05,blocked);assert.equal(p.stamina,1);
 p.stamina=.1;p.staminaRest=0;p.exhausted=true;
 for(let i=0;i<200;i++)movePlayer(p,{...command,paused:true},.05,blocked);assert.equal(p.stamina,.1);
 p.hidden=true;for(let i=0;i<100;i++)movePlayer(p,command,.05,blocked);assert.ok(p.stamina>.7);assert.equal(p.exhausted,false);
});
