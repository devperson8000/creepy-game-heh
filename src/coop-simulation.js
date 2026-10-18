import {createEnemy,tickEnemy,createAmbush,tickAmbush,SIGHT_RANGE} from './enemy.js';
import {groundHeight,moveInWorld,lineOfSight} from './level.js';
import {coopInteract,downPlayer,expireDowned,markEscaped,removeCoopPlayer,serializeCoopState} from './coop-state.js';
import {createRemoteMovement} from './coop-motion.js';
import {footstepNoise,interactionNoise} from './player-noise.js';

function observedPosition(player){
 // Seeing someone enter a cabinet reveals its entrance, not their concealed body.
 return player.hidden&&player.hideWitnessed&&player.closetExit?{...player,...player.closetExit,hidden:false}:player;
}
function visible(enemy,state,player,navigation={}){
 const observed=observedPosition(player);
 const distance=Math.hypot(observed.x-enemy.position.x,observed.z-enemy.position.z);
 const direction=Math.atan2(observed.x-enemy.position.x,observed.z-enemy.position.z);
 return observed.status==='alive'&&observed.height<1.5&&!observed.hidden&&distance<SIGHT_RANGE&&(Math.cos(direction-enemy.yaw)>.05||distance<3)&&lineOfSight(state.run.layout,enemy.position,observed)&&(!navigation.canSee||navigation.canSee(enemy.position,observed));
}
export function chooseMonsterTarget(enemy,state,navigation={}){
 const living=[...state.players.values()].filter(p=>p.status==='alive');
 const seen=living.filter(p=>visible(enemy,state,p,navigation));
 const current=seen.find(p=>p.id===enemy.targetId);
 if(current)return current;
 const nearest=players=>players.sort((a,b)=>Math.hypot(a.x-enemy.position.x,a.z-enemy.position.z)-Math.hypot(b.x-enemy.position.x,b.z-enemy.position.z))[0];
 return nearest(seen)||living.find(p=>p.id===enemy.targetId)||nearest(living)||null;
}
const instructions={boards:'The way downstairs is open.',key:'Key found. Return it to the elevator panel.',drawer:'Drawer searched.',clue:'The four-digit clue is recorded for the team.',locks:'Keys banked at the elevator.',keypad:'Access code accepted.',elevator:'The elevator is open. Get everyone inside.',closet:'Stay quiet. Hold E to leave.',leave:'You left the closet.',revive:'Teammate rescued.'};
const reasons={'wrong-code':'Access denied. Check the four-digit clue.','locked':'The elevator needs four banked keys and the code.','occupied':'Someone is already hiding here.','too-far':'Move closer.','blocked':'Something blocks the way.','unavailable':'That action is no longer available.'};

/** The lobby owner runs one simulation; peers submit inputs, never positions or monster state. */
export function createCoopSimulation(state,world,{ambushChance=.12}={}){
 const enemy=createEnemy(state.run.layout),ambush=createAmbush(state.seed,{chance:ambushChance});
 const remoteMovement=new Map(),remoteAt=new Map();
 const inputs=new Map(),footsteps=new Map(),noisyUntil=new Map(),notices=[];
 let pendingNoise=[],sequence=0,noticeId=0,ambushResult={silent:false,triggered:false,targetId:null},reveal=0;
 const navigation=world.enemyNavigation??{};
 function tell(playerId,message){notices.push({id:++noticeId,playerId,message});if(notices.length>24)notices.shift();}
 function setInput(id,input){
  if(!state.players.has(id)||!input||!['forward','right','yaw','pitch'].every(k=>Number.isFinite(input[k])))return false;
  if(Array.isArray(input.commands)){
   if(!remoteMovement.has(id))remoteMovement.set(id,createRemoteMovement(state.players.get(id),world.canMove));
   if(!remoteMovement.get(id).receive(input))return false;
   remoteAt.set(id,state.run.elapsed);return true;
  }
  if(state.run.elapsed-(remoteAt.get(id)??-Infinity)<.65)return false;
  remoteMovement.delete(id);
  inputs.set(id,{forward:Math.max(-1,Math.min(1,input.forward)),right:Math.max(-1,Math.min(1,input.right)),yaw:input.yaw,pitch:Math.max(-1.3,Math.min(1.3,input.pitch)),sprint:!!input.sprint,torch:!!input.torch,paused:!!input.paused,at:state.run.elapsed});return true;
 }
 function emit(player,noise){
  if(!noise)return;noise.playerId=player.id;player.noise=noise.radius>12?'Loud':noise.radius>4?'Audible':'Quiet';noisyUntil.set(player.id,state.run.elapsed+.9);
  player.noiseSequence=(player.noiseSequence??0)+1;player.noiseType=noise.type;player.noiseAt=state.run.elapsed;
  if(state.run.boardsOpen)pendingNoise.push(noise);
 }
 function interact(id,action){
  const player=state.players.get(id);
  if(!player)return {ok:false,reason:'unavailable'};
  const targetId=typeof action?.targetId==='string'?action.targetId:undefined,target=world.targets.get(targetId);
  const type=targetId==='leave'?'leave':targetId?.startsWith('revive:')?'revive':target?.type;
  const wasTaken=type==='drawer'&&state.run.drawers[target.drawerId]?.opened&&state.run.drawers[target.drawerId]?.key&&!state.run.drawers[target.drawerId]?.taken;
  const witnessed=type==='closet'&&visible(enemy,state,player,navigation);
  const result=coopInteract(state,id,{type,targetId,code:action?.code},{targets:world.targets,canSee:world.canSeeInteraction,now:state.run.elapsed});
  if(result.ok){
   if(type==='closet')player.hideWitnessed=witnessed;
   emit(player,interactionNoise(type,player,{takingKey:wasTaken}));
   tell(id,instructions[result.type]??'Done.');
  }else tell(id,reasons[result.reason]??'You cannot do that right now.');
  return result;
 }
 function advance(delta){
  if(state.run.phase!=='playing')return;
  for(let remaining=Math.min(.2,Math.max(0,delta));remaining>0;remaining-=.025){
   const step=Math.min(.025,remaining);state.run.elapsed+=step;
   for(const player of state.players.values()){
    const command=inputs.get(player.id),fresh=command&&state.run.elapsed-command.at<.65;
    if(fresh){player.yaw=command.yaw;player.pitch=command.pitch;player.torch=command.torch;}
    let moved=0;
    if(remoteMovement.has(player.id)){
     remoteMovement.get(player.id).advance(step,(distance,input)=>{
      if(!footsteps.has(player.id))footsteps.set(player.id,{distance:0});
      emit(player,footstepNoise(footsteps.get(player.id),distance,input.sprint,player));
     });
     if(state.run.elapsed>(noisyUntil.get(player.id)??0))player.noise='Quiet';
     continue;
    }
    if(player.status==='alive'&&!player.hidden&&fresh&&!command.paused){
     const next=moveInWorld(player,{forward:command.forward,right:command.right},player.yaw,step,world.canMove,command.sprint?3.7:2.5);
     moved=Math.hypot(next.x-player.x,next.z-player.z);player.x=next.x;player.z=next.z;
     if(!footsteps.has(player.id))footsteps.set(player.id,{distance:0});
     emit(player,footstepNoise(footsteps.get(player.id),moved,command.sprint,{...player,height:groundHeight(player)}));
    }
    player.height=groundHeight(player);player.moving=moved>.0001;player.speed=moved/step;player.sprint=!!(fresh&&command.sprint&&player.moving);
    if(state.run.elapsed>(noisyUntil.get(player.id)??0))player.noise='Quiet';
   }
   const target=chooseMonsterTarget(enemy,state,navigation);
   if(target){
    enemy.targetId=target.id;
    ambushResult=tickAmbush(ambush,{enemy,layout:state.run.layout,player:target,delta:step,active:state.run.boardsOpen,navigation});
    if(ambushResult.triggered)reveal++;
    tickEnemy(enemy,state.run.layout,observedPosition(target),step,state.run.boardsOpen,pendingNoise,navigation);
    if(state.run.boardsOpen)for(const player of state.players.values()){
     const observed=observedPosition(player),d=Math.hypot(observed.x-enemy.position.x,observed.z-enemy.position.z);
     if(d<(player.hidden?1.8:1.35)&&visible(enemy,state,player,navigation))downPlayer(state,player.id,state.run.elapsed);
    }
   }
   pendingNoise=[];expireDowned(state,state.run.elapsed);
   if(state.run.exitOpen&&world.doorProgress>.8)for(const player of state.players.values())markEscaped(state,player.id);
   if(state.run.phase!=='playing')break;
  }
 }
 function enemySnapshot(){return {position:{...enemy.position},yaw:enemy.yaw,mode:enemy.mode,moving:enemy.path.length>0,targetId:enemy.targetId,silent:ambushResult.silent,silentTargetId:ambushResult.targetId,reveal};}
 function snapshot(){return {sequence:++sequence,state:serializeCoopState(state),enemy:enemySnapshot(),notices:[...notices]};}
 function removePlayer(id){inputs.delete(id);remoteMovement.delete(id);remoteAt.delete(id);footsteps.delete(id);noisyUntil.delete(id);removeCoopPlayer(state,id);}
 return {state,enemy,setInput,interact,advance,snapshot,enemySnapshot,removePlayer};
}
