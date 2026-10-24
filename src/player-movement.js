import {groundHeight,moveInWorld} from './level.js';
export const MAZE_MOVEMENT=Object.freeze({walk:4.6,sprint:6.2,sprintSeconds:8,recoveryDelay:1.1,recoverySeconds:6,restartAt:.25});
export const MAZE_MONSTER_SPEED=Object.freeze({patrol:3.2,investigate:4.6,chase:MAZE_MOVEMENT.sprint});
export function mazeMovement(canMove){return (typeof canMove.gameplay==='function'?canMove.gameplay():canMove.gameplay)==='maze';}
/** Identical bounded physics for solo, host inputs, prediction and command replay. */
export function movePlayer(player,command,delta,canMove){
 const dt=Math.max(0,Math.min(.05,delta)),maze=mazeMovement(canMove),p=MAZE_MOVEMENT;
 player.yaw=command.yaw;player.pitch=command.pitch??player.pitch??0;if(command.torch!==undefined)player.torch=!!command.torch;
 if(maze){player.stamina??=1;player.staminaRest??=0;player.exhausted??=false;}
 const active=!command.paused&&(!player.status||player.status==='alive'),canWalk=active&&!player.hidden;
 const wantsSprint=canWalk&&!!command.sprint&&(!maze||!player.exhausted&&player.stamina>0);
 const sprintTime=maze&&wantsSprint?Math.min(dt,player.stamina*p.sprintSeconds):wantsSprint?dt:0;
 const speed=maze?p.walk+(p.sprint-p.walk)*(dt?sprintTime/dt:0):wantsSprint?3.7:2.5;
 const before={x:player.x,z:player.z};
 if(canWalk){const next=moveInWorld(player,command,command.yaw,dt,canMove,speed);player.x=next.x;player.z=next.z;}
 const distance=Math.hypot(player.x-before.x,player.z-before.z),sprinting=sprintTime>0&&distance>.00001;
 if(maze&&active){
  if(sprinting){player.stamina=Math.max(0,player.stamina-sprintTime/p.sprintSeconds);player.staminaRest=0;if(player.stamina<1e-8){player.stamina=0;player.exhausted=true;}}
  else{const rest=player.staminaRest;player.staminaRest+=dt;const recover=Math.max(0,player.staminaRest-p.recoveryDelay)-Math.max(0,rest-p.recoveryDelay);player.stamina=Math.min(1,player.stamina+recover/p.recoverySeconds);if(player.stamina>=p.restartAt)player.exhausted=false;}
 }
 player.height=(canMove.groundHeight??groundHeight)(player);player.moving=distance>.00001;player.speed=dt?distance/dt:0;player.sprint=sprinting;
 return distance;
}
