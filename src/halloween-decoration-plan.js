import {CELL,worldPoint,randomSource,shuffled} from './level.js';

/** Seeded dressing anchors follow the actual room orientation and solid wall faces. */
export function createHalloweenDecorationPlan(layout,seed){
 const rooms=[],walls=[],maze=!!layout.halloweenMaze;
 layout.rooms.forEach((room,roomIndex)=>{
  const p=worldPoint(room),normal=room.normal??{x:0,z:1},yaw=Math.atan2(normal.x,normal.z),c=Math.cos(yaw),s=Math.sin(yaw);
  const add=(kind,x,y,z,scale=1,options={})=>rooms.push({kind,x:p.x+c*x+s*z,y,z:p.z-s*x+c*z,yaw,scale,options,roomIndex,surface:'room'});
  if(maze){
   add('pumpkin',-.84,0,-.83,.65);add('candles',.84,0,-.83,.8);add('web',-1.1,2.57,-1.17,.58);add('bunting',0,2.51,-1.17,1,{width:1.85,count:9});add('bats',.45,2.12,-1.16,.86);
   if(roomIndex%4===0)add('string-lights',0,2.61,-1.16,1,{width:1.8,count:9,sag:.06});
  }else{
   add('pumpkin',-2.9,0,2.55,1.3);add('candles',-2.8,0,1.7,1);add('web',-3.65,4.05,3.65,1.1);add('bunting',0,3.7,-3.68,1,{width:3,count:12});add('bats',2.6,2.8,-3.67,1);
  }
 });
 if(!maze)return {rooms,walls};
 const candidates=[],rng=randomSource(seed^0xDECA2026),roomCells=new Set(layout.rooms.map(r=>`${r.x},${r.z}`));
 for(let z=9;z<layout.size-1;z++)for(let x=1;x<layout.size-1;x++){
  if(layout.grid[z][x]||layout.rooms.some(r=>Math.hypot(r.x-x,r.z-z)<2.3)||layout.closets.some(c=>Math.hypot(c.x-x,c.z-z)<=2)||Math.hypot(x-layout.entrance.x,z-layout.entrance.z)<5)continue;
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(layout.grid[z+dz]?.[x+dx]&&!roomCells.has(`${x+dx},${z+dz}`)){
   const p=worldPoint({x,z});candidates.push({cell:{x,z},normal:{x:dx,z:dz},x:p.x+dx*(CELL/2+.418),z:p.z+dz*(CELL/2+.418),yaw:Math.atan2(dx,dz)});
  }
 }
 const kinds=['web','bats','bunting','lantern','web','string-lights'],limit=Math.floor(layout.size*.72);
 for(const anchor of shuffled(candidates,rng)){
  if(walls.length>=limit)break;if(walls.some(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)<6.5))continue;
  const kind=kinds[walls.length%kinds.length],y=kind==='web'?2.53:kind==='lantern'?1.28:kind==='bats'?2.08:2.53;
  walls.push({...anchor,kind,y,scale:kind==='web'?.67:kind==='lantern'?.74:kind==='bats'?.85:1,options:kind==='bunting'?{width:1.1,count:6}:kind==='string-lights'?{width:1.1,count:7,sag:.045}:{},surface:'wall'});
 }
 return {rooms,walls};
}
