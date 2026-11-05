export const BACKROOMS_SPEED=Object.freeze({walk:5.4,sprint:9.2,needlePatrol:2.8,needleHunt:8.4,stalkerPatrol:3.2,stalkerHunt:9.8});
export function createBackroomsRound(){return {phase:'playing',collected:0,fuses:[{id:'fuse-1',x:-23,z:-13,taken:false},{id:'fuse-2',x:25,z:-37,taken:false},{id:'fuse-3',x:24,z:25,taken:false}],exit:{id:'exit',x:-28.5,z:25}};}
export function roundTarget(round,player,yaw,canSee=()=>true){
 if(round.phase!=='playing')return null;
 return [...round.fuses.filter(f=>!f.taken),round.exit].map(t=>{const dx=t.x-player.x,dz=t.z-player.z,distance=Math.hypot(dx,dz),facing=distance<.15?1:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;return {...t,distance,facing,duration:t.id==='exit'?.85:.45,label:t.id==='exit'?(round.collected===3?'Open emergency exit':'Exit requires 3 power fuses'):'Take emergency power fuse'};}).filter(t=>t.distance<2.1&&t.facing>.6&&canSee(player,t)).sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function interactRound(round,id){
 if(round.phase!=='playing')return false;
 if(id==='exit'){if(round.collected!==3)return false;round.phase='won';return true;}
 const fuse=round.fuses.find(f=>f.id===id);if(!fuse||fuse.taken)return false;fuse.taken=true;round.collected++;return true;
}
