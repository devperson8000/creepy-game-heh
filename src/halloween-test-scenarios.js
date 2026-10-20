import {interactHalloween,advanceHalloween} from './halloween-state.js';
import {worldPoint} from './level.js';
export const HALLOWEEN_TESTS=new Set(['full','coop','map','quest','key','b2','teaser','return']);
/** Shortcuts live only in the password-authorized test frame; normal runs never call this. */
export function setupHalloweenTest(game,scenario){
 if(!HALLOWEEN_TESTS.has(scenario)||!game.run.halloween)throw new Error('Unknown Halloween test');
 const {run,player,world,input,ui}=game,q=run.halloween;let room=0;
 const questItems=['invitation','seal-0','seal-1','seal-2','chest'];
 function aimAt(id){
  const target=world.targets.get('halloween:'+id);if(!target)return false;
  const at=target.mesh.getWorldPosition(game.camera.position.clone()),height=target.position.height;
  Object.assign(player,{x:at.x,z:at.z+1.2,height});input.clear();input.setView(0,Math.atan2(at.y-height-1.65,1.2));ui.hideScreen();return true;
 }
 function command(value){
  if(value==='room-next'&&scenario==='map'){
   const at=worldPoint(run.layout.rooms[room++%run.layout.rooms.length]);Object.assign(player,{x:at.x,z:at.z+1,height:0});input.clear();input.setView(0);ui.hideScreen();return true;
  }
  if(value.startsWith('quest:')&&scenario==='quest'){
   const id=value.slice(6),stage=questItems.indexOf(id);if(stage<0)return false;
   q.stage=stage;q.key=false;q.keyRevealAt=null;return aimAt(id);
  }
  if(value==='return'&&q.visit?.stage==='archive'){
   Object.assign(player,{x:0,z:3.2,height:0});return interactHalloween(run,'halloween:return',{players:[player]}).ok;
  }
  return false;
 }
 if(scenario!=='full'){
  run.boardsOpen=true;ui.hideScreen();input.clear();
  if(scenario==='map')command('room-next');
  if(scenario==='quest')command('quest:invitation');
  if(scenario==='key'){
   q.stage=4;aimAt('chest');const result=interactHalloween(run,'halloween:chest',{players:[player]});ui.toast(result.message);game.monsterAudio?.playNoise('key');
  }
  if(scenario==='b2'||scenario==='return'){
   q.stage=5;q.key=true;q.seen=scenario==='return';Object.assign(player,{x:-2.6,z:-31,height:3.6});
   const now=Date.now()/1000;interactHalloween(run,'halloween:b2-panel',{players:[player],now:scenario==='return'?now-6:now});
   if(scenario==='return'){advanceHalloween(run,[player],now);command('return');}
  }
 }
 return {command,tick(){
  if(['map','quest','key'].includes(scenario))run.huntElapsed=0;
  if(scenario==='b2'&&q.visit?.stage==='archive'&&!q.seen){Object.assign(player,{x:0,z:-.6,height:0});input.setView(0);}
 }};
}
