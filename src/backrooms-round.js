import {PITFALLS,pitFloor,canWalkPit,isLowerRoute,pitMoveSpeed} from './backrooms-pitfalls.js';
export const BACKROOMS_SPEED=Object.freeze({walk:5.4,sprint:9.2});
export function createBackroomsRound(){return {phase:'playing',collected:0,parts:[{id:'part-1',x:-6,z:12,taken:false},{id:'part-2',x:18,z:6,taken:false},{id:'part-3',x:25,z:-37,taken:false},{id:'part-4',x:24,z:25,taken:false}],ladder:{id:'ladder',x:-23,z:-18.8},key:{id:'key',x:-23,z:-19.45},door:{id:'door',x:41,z:-16},vent:{...PITFALLS.upperVent},pitExitDoor:{id:'pit-exit-door',x:73.9,z:-16},upperExitOpen:false,altVent:{...PITFALLS.altVent},altDoor:{id:'alt-door',x:42.4,z:-25},altDoorOpen:false,rope:{...PITFALLS.rope},ropes:[],hasRope:false,flashlight:{...PITFALLS.flashlight},hasTorch:false,installed:0,repaired:false,climbing:false,ladderHeight:0,hasKey:false,doorOpen:false,fell:false,velocity:0};}
export function roundTarget(r,player,yaw,canSee=()=>true){
 if(r.phase!=='playing')return null;
 const lower=isLowerRoute(player.x,player.z,player.y??0);
 const targets=lower?[r.altDoor,...(!r.hasTorch?[r.flashlight]:[]),r.altVent]:player.x>42?[...(!r.hasRope?[r.rope]:[]),r.upperExitOpen?r.vent:r.pitExitDoor]:[...r.parts.filter(p=>!p.taken),...(r.climbing&&r.ladderHeight>.75&&!r.hasKey?[r.key]:[r.ladder]),r.door];
 return targets.map(t=>{const dx=t.x-player.x,dz=t.z-player.z,distance=Math.hypot(dx,dz),facing=distance<.15?1:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
 const labels={ladder:!r.repaired?(r.collected>r.installed?'Fit ladder section '+(r.installed+1)+' / 4':'Find ladder sections · '+r.installed+' / 4 fitted'):r.climbing?'Climb down':'Climb ladder',key:'Take escape key',door:r.doorOpen?'Door unlocked':r.hasKey?'Unlock pitfall door':'Locked — find the ladder key',flashlight:'Take flashlight',rope:'Take rescue rope',vent:'Enter white-lit exit passage','pit-exit-door':'Open the lit exit door','alt-vent':'Enter alternate exit vent','alt-door':r.altDoorOpen?'Close lower passage door':'Open lower passage door'};
 return {...t,distance,facing,disabled:t.id==='ladder'&&!r.repaired&&r.collected<=r.installed,duration:t.id==='ladder'&&!r.repaired?.8:.45,label:labels[t.id]??'Take ladder fragment'};
 }).filter(t=>t.distance<2.1&&t.facing>.6&&(t.id==='alt-door'?lower:t.id==='alt-vent'?player.y>PITFALLS.floorY+1.65&&player.y<PITFALLS.floorY+2.15:t.id==='flashlight'?lower&&player.y<=PITFALLS.floorY+.3:t.id==='vent'||t.id==='rope'||t.id==='pit-exit-door'?player.y>-.25:canSee(player,t))).sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function interactRound(r,id){
 if(r.phase!=='playing')return false;
 if(id==='ladder'){if(!r.repaired){if(r.collected<=r.installed)return false;r.installed++;r.repaired=r.installed===4;}else r.climbing=!r.climbing;return true;}
 if(id==='key'){if(!r.repaired||r.ladderHeight<.75||r.hasKey)return false;r.hasKey=true;r.climbing=false;return true;}
 if(id==='door'){if(!r.hasKey||r.doorOpen)return false;r.doorOpen=true;return true;}
 if(id==='flashlight'){if(!r.doorOpen||r.hasTorch)return false;r.hasTorch=true;return true;}
 if(id==='pit-exit-door'){if(!r.doorOpen||r.upperExitOpen)return false;r.upperExitOpen=true;return true;}
 if(id==='alt-door'){if(!r.doorOpen)return false;r.altDoorOpen=!r.altDoorOpen;return true;}
 if(id==='rope'){if(!r.doorOpen||r.hasRope)return false;r.hasRope=true;return true;}
 if(id==='vent'||id==='alt-vent'){if(!r.doorOpen||id==='vent'&&!r.upperExitOpen)return false;r.phase='won';return true;}
 const part=r.parts.find(p=>p.id===id);if(!part||part.taken)return false;part.taken=true;r.collected++;return true;
}
export function canMoveRound(r,x,z,base,player=null){
 const y=player?.y??0;if(y<-.25){if(!r.doorOpen||!canWalkPit(x,z,y))return false;if(x>41.7&&x<42.3&&(!r.altDoorOpen||z<-25.7||z>-24.3))return false;return pitFloor(x,z,y)<=y+.3;}
 if(x<41.5)return base(x,z);return r.doorOpen&&canWalkPit(x,z,y);
}
export function roundFloor(r,x,z,y=0){return r.doorOpen?pitFloor(x,z,y):0;}
export function backroomsMoveSpeed(r,p,sprint){return r.doorOpen?pitMoveSpeed(p.x,p.z,p.y??0,sprint,BACKROOMS_SPEED.walk,BACKROOMS_SPEED.sprint):(sprint?BACKROOMS_SPEED.sprint:BACKROOMS_SPEED.walk);}
export function advanceRoundPhysics(r,p,delta){
 const dt=Math.min(.1,Math.max(0,delta));
 if(r.climbing){r.ladderHeight=Math.min(.9,r.ladderHeight+dt*1.1);p.y=r.ladderHeight;p.x=r.ladder.x;p.z=r.ladder.z+.4-r.ladderHeight*.26;r.velocity=0;return;}
 r.ladderHeight=Math.max(0,r.ladderHeight-dt*2);
 p.y??=0;const floor=roundFloor(r,p.x,p.z,p.y);
 // Lower route cannot snap up through a beam or the far landing.
 const support=floor;
 if(p.y>support+.01){r.velocity-=dt*12;p.y=Math.max(support,p.y+r.velocity*dt);}else{p.y=support;r.velocity=0;}
 if(p.y<=PITFALLS.floorY+.05)r.fell=true;
}
export function roundObjective(r,player=null){
 if(!r.repaired)return [r.collected===4?'ASSEMBLE THE LADDER':r.collected+' / 4 SECTIONS FOUND',r.collected>r.installed?'Return to the ladder. Hold E to fit sections · '+r.installed+' / 4 built.':'Search the arrival rooms, column hall, far offices and gallery.'];
 if(!r.hasKey)return ['RETRIEVE THE KEY','Climb the repaired ladder and take the key above it.'];
 if(!r.doorOpen)return ['FIND THE LOCKED DOOR','The key opens the door beyond the long passage.'];
 const below=player?(player.y??0)<-.25:r.fell;return [below?'FIND THE LOWER EXIT':'REACH THE LIT EXIT DOOR',below?'Follow arrows to the lower door and alternate stair/vent, or climb a rescue rope.':'Cross the grid slowly. Rope and the white-lit exit door are on the far side.'];
}
