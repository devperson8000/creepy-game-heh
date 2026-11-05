export const BACKROOMS_SPEED=Object.freeze({walk:5.4,sprint:9.2,needlePatrol:2.8,needleHunt:8.4,stalkerPatrol:3.2,stalkerHunt:9.8});
export function createBackroomsRound(){return {phase:'playing',collected:0,parts:[{id:'part-1',x:-25,z:-12,taken:false},{id:'part-2',x:-20,z:-14,taken:false},{id:'part-3',x:-24,z:-17,taken:false},{id:'part-4',x:-19,z:-11,taken:false}],ladder:{id:'ladder',x:-23,z:-18.8},key:{id:'key',x:-23,z:-18.8},door:{id:'door',x:41,z:-16},vent:{id:'vent',x:66,z:-16},flashlight:{id:'flashlight',x:63,z:-18},hasTorch:false,repaired:false,climbing:false,ladderHeight:0,hasKey:false,doorOpen:false,fell:false,velocity:0};}
export function roundTarget(r,player,yaw,canSee=()=>true){
 if(r.phase!=='playing')return null;
 const targets=player.x>42?[...(!r.hasTorch?[r.flashlight]:[]),r.vent]:[...r.parts.filter(p=>!p.taken),...(r.climbing&&r.ladderHeight>.75&&!r.hasKey?[r.key]:[r.ladder]),r.door];
 return targets.map(t=>{const dx=t.x-player.x,dz=t.z-player.z,distance=Math.hypot(dx,dz),facing=distance<.15?1:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
 const labels={ladder:!r.repaired?(r.collected===4?'Repair ladder':'Ladder needs 4 wooden fragments'):r.climbing?'Climb down':'Climb ladder',key:'Take escape key',door:r.doorOpen?'Door unlocked':r.hasKey?'Unlock pitfall door':'Locked — find the ladder key',flashlight:'Take flashlight',vent:'Enter exit vent'};
 return {...t,distance,facing,duration:t.id==='ladder'&&!r.repaired?1.2:.45,label:labels[t.id]??'Take ladder fragment'};
 }).filter(t=>t.distance<2.1&&t.facing>.6&&(t.id==='vent'||t.id==='flashlight'?player.y>-.25:canSee(player,t))).sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function interactRound(r,id){
 if(r.phase!=='playing')return false;
 if(id==='ladder'){if(!r.repaired){if(r.collected!==4)return false;r.repaired=true;}else r.climbing=!r.climbing;return true;}
 if(id==='key'){if(!r.repaired||r.ladderHeight<.75||r.hasKey)return false;r.hasKey=true;r.climbing=false;return true;}
 if(id==='door'){if(!r.hasKey||r.doorOpen)return false;r.doorOpen=true;return true;}
 if(id==='flashlight'){if(!r.doorOpen||r.hasTorch)return false;r.hasTorch=true;return true;}
 if(id==='vent'){if(!r.doorOpen)return false;r.phase='won';return true;}
 const part=r.parts.find(p=>p.id===id);if(!part||part.taken)return false;part.taken=true;r.collected++;return true;
}
export function canMoveRound(r,x,z,base,player=null){
 if(player&&player.y<-1&&(x<46||(x>=60&&z>-13&&roundFloor(r,x,z)>player.y+.3)))return false;
 if(x<41.5)return base(x,z);
 if(!r.doorOpen)return false;
 if(x<42.3)return z>-16.75&&z<-15.25;
 return x<67.7&&z>-21.7&&z<-10.3;
}
export function roundFloor(r,x,z){
 if(!r.doorOpen||x<=46)return 0;
 // The staircase is physically accessible from the pit floor.
 if(z>-13&&x>=60)return Math.min(0,-4+(x-60)*2/3);
 if(x>=60)return 0;
 const beam=Math.abs(z+16)<.36||Math.abs(x-49)<.3||Math.abs(x-56)<.3;
 return beam?0:-4;
}
export function advanceRoundPhysics(r,p,delta){
 const dt=Math.min(.1,Math.max(0,delta));
 if(r.climbing){r.ladderHeight=Math.min(.9,r.ladderHeight+dt*1.1);p.y=r.ladderHeight;r.velocity=0;return;}
 r.ladderHeight=Math.max(0,r.ladderHeight-dt*2);
 const floor=roundFloor(r,p.x,p.z);p.y??=0;
 // Lower route cannot snap up through a beam or the far landing.
 const support=p.y<-1&&floor===0?-4:floor;
 if(p.y>support+.01){r.velocity-=dt*12;p.y=Math.max(support,p.y+r.velocity*dt);}else{p.y=support;r.velocity=0;}
 if(p.y<=-3.95)r.fell=true;
}
export function roundObjective(r){
 if(!r.repaired)return [r.collected===4?'REPAIR THE LADDER':r.collected+' / 4 LADDER PARTS','Search the dark offices. Return the wooden fragments to the ladder.'];
 if(!r.hasKey)return ['RETRIEVE THE KEY','Climb the repaired ladder and take the key above it.'];
 if(!r.doorOpen)return ['FIND THE LOCKED DOOR','The key opens the door beyond the long passage.'];
 return ['REACH THE EXIT VENT',r.fell?'Follow the arrows below. The staircase returns to the exit.':'Walk the narrow beams. A fall leads to the lower escape route.'];
}
