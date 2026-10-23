import {HUNT_START_SECONDS} from './hunt-clock.js';
import {interactHalloween,advanceHalloween} from './halloween-state.js';
import {worldPoint} from './level.js';
export const HALLOWEEN_TESTS=new Set(['opening','new-gameplay','full','coop','map','quest','key','b2','teaser','return']);
/** Shortcuts live only in the password-authorized test frame; normal runs never call this. */
export function setupHalloweenTest(game,scenario){
 if(!HALLOWEEN_TESTS.has(scenario)||!game.run.halloween)throw new Error('Unknown Halloween test');
 const {run,player,world,input,ui}=game,q=run.halloween;let room=0,closetIndex=0,newHunt=false;
 const questItems=['invitation','seal-0','seal-1','seal-2','chest'];
 function aimAt(id){
  const target=world.targets.get('halloween:'+id);if(!target)return false;
  const at=target.mesh.getWorldPosition(game.camera.position.clone()),height=target.position.height;
  if(run.layout.halloweenMaze&&world.canMove){for(const radius of [.85,1.2,.5,1.6])for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=at.x+Math.sin(angle)*radius,z=at.z+Math.cos(angle)*radius;if(!world.canMove(x,z))continue;Object.assign(player,{x,z,height:world.groundHeight({x,z})});input.clear();input.setView(Math.atan2(x-at.x,z-at.z),Math.atan2(at.y-player.height-1.65,radius));ui.hideScreen();return true;}return false;}
  Object.assign(player,{x:at.x,z:at.z+1.2,height});input.clear();input.setView(0,Math.atan2(at.y-height-1.65,1.2));ui.hideScreen();return true;
 }
 function command(value){
  if(scenario==='new-gameplay'&&value.startsWith('new:')){
   const action=value.slice(4);
   if(action==='hunt'){newHunt=true;run.huntElapsed=HUNT_START_SECONDS;ui.hideScreen();input.clear();ui.toast('6:00 · Monochrome is hunting.');return true;}
   if(action==='stamina'){player.stamina=1;player.exhausted=false;player.staminaRest=0;return true;}
   if(action==='closet'){const t=world.closets[closetIndex++%world.closets.length];if(!t)return false;Object.assign(player,t.exit);input.clear();input.setView(t.hideYaw+Math.PI,0);ui.hideScreen();return true;}
   const r=action==='stairs'?run.layout.entrance:action==='drawer'?run.layout.rooms[room++%run.layout.rooms.length]:null;if(!r)return false;
   const p=worldPoint(r),n=r.normal??{x:0,z:1};Object.assign(player,{x:p.x+n.x*.55,z:p.z+n.z*.55,height:world.groundHeight?.(p)??0});input.clear();const rows=q.drawerRows??1,drawer=action==='drawer'?world.targets.get('drawer-'+(run.layout.rooms.indexOf(r)*rows+rows-1)):null;const point=drawer?.mesh.getWorldPosition(game.camera.position.clone());input.setView(Math.atan2(n.x,n.z),point?Math.atan2(point.y-player.height-1.65,Math.hypot(point.x-player.x,point.z-player.z)):0);ui.hideScreen();return true;
  }

  if(value==='room-next'&&scenario==='map'){
   const r=run.layout.rooms[room++%run.layout.rooms.length],at=worldPoint(r),n=r.normal??{x:0,z:1};Object.assign(player,{x:at.x+n.x*.5,z:at.z+n.z*.5,height:world.groundHeight?.(at)??0});input.clear();input.setView(Math.atan2(n.x,n.z));ui.hideScreen();return true;
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
  if(scenario==='new-gameplay')command('new:stairs');
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
  if(['map','quest','key'].includes(scenario)||scenario==='new-gameplay'&&!newHunt)run.huntElapsed=0;
  if(scenario==='b2'&&q.visit?.stage==='archive'&&!q.seen){Object.assign(player,{x:0,z:-.6,height:0});input.setView(0);}
 }};
}
