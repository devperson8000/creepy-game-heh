/** Reference-informed geometry. Distances are authored, not claimed commercial-game measurements. */
export const PITFALLS=Object.freeze({room:{minX:42,maxX:74,minZ:-29.6,maxZ:-2.4},grid:{minX:46,maxX:68.4,minZ:-28.8,maxZ:-3.2,cell:3.2,columns:7,rows:8,beam:.6},floorY:-6.4,shaftBottomY:-3.2,ceilingY:2.8,
 upperWalls:[{x:57.2,z:-29.35,w:23,d:.5},{x:57.2,z:-2.65,w:23,d:.5}],
 upperVent:{id:'vent',x:79,z:-16},rope:{id:'rope',x:70.5,z:-14.5},
 altVent:{id:'alt-vent',x:21.2,z:-30},flashlight:{id:'flashlight',x:34,z:-23.8},
 lowerRooms:[{minX:42,maxX:74,minZ:-29.6,maxZ:-2.4},{minX:34,maxX:42.2,minZ:-27,maxZ:-23},{minX:20,maxX:36.2,minZ:-27.5,maxZ:-20},{minX:29,maxX:36.2,minZ:-32,maxZ:-27.5},{minX:20,maxX:29.2,minZ:-31,maxZ:-29}],
 houseWalls:[{x:29,z:-26.45,w:.2,d:2.1},{x:29,z:-21.8,w:.2,d:3.6},{x:31,z:-27.5,w:4,d:.2},{x:35.85,z:-27.5,w:.7,d:.2},{x:29,z:-31.5,w:.2,d:1},{x:29,z:-28.25,w:.2,d:1.5}],
 houseFurniture:[{x:20.6,z:-23.75,w:1.2,d:6.5},{x:24,z:-20.6,w:5.6,d:1.2},{x:27.8,z:-20.7,w:1.35,d:1.4},{x:24.6,z:-23,w:2.2,d:1.25},{x:34,z:-23.8,w:1.5,d:.7}],
 lowerWalls:[{x:51,z:-25.6,w:7,d:.25},{x:55.6,z:-17.6,w:.25,d:8},{x:65,z:-9.6,w:8,d:.25},{x:46,z:-11,w:.25,d:9}],
 lowerSpawn:{x:64,y:-6.4,z:-24}});
export const gridX=()=>Array.from({length:PITFALLS.grid.columns+1},(_,i)=>PITFALLS.grid.minX+i*PITFALLS.grid.cell);
export const gridZ=()=>Array.from({length:PITFALLS.grid.rows+1},(_,i)=>PITFALLS.grid.minZ+i*PITFALLS.grid.cell);
const inside=(p,x,z,r=0)=>x>=p.minX+r&&x<=p.maxX-r&&z>=p.minZ+r&&z<=p.maxZ-r;
export function inPitGrid(x,z){return inside(PITFALLS.grid,x,z,-PITFALLS.grid.beam/2);}
export function onPitBeam(x,z){const g=PITFALLS.grid;return gridX().some(v=>Math.abs(x-v)<=g.beam/2)||gridZ().some(v=>Math.abs(z-v)<=g.beam/2);}
export function lowerStairFloor(x,z){if(x<28.5&&z>=-31&&z<=-29)return PITFALLS.floorY+2;if(x>=27.5&&x<=32.5&&z>=-31&&z<=-29)return PITFALLS.floorY+Math.max(0,Math.min(2,(32.5-x)*.5));return PITFALLS.floorY;}
export function pitFloor(x,z,y=0){
 if(y<-.25){if(x<42)return lowerStairFloor(x,z);return PITFALLS.floorY;}
 return inPitGrid(x,z)&&!onPitBeam(x,z)?PITFALLS.floorY:0;
}
export function canWalkPit(x,z,y=0){
 const room=PITFALLS.room;
 if(y<-.25){
  // Once below the shaft lining, the player can pass underneath its walls.
  if(![[0,0],[.22,0],[-.22,0],[0,.22],[0,-.22]].every(([dx,dz])=>PITFALLS.lowerRooms.some(r=>inside(r,x+dx,z+dz))))return false;
  if(x>41.7&&y+1.68>PITFALLS.shaftBottomY&&inPitGrid(x,z)&&onPitBeam(x,z))return false;
  if(x>41.7&&x<42.3&&(z<-25.7||z>-24.3))return false;
  if(x<42)return ![...PITFALLS.houseWalls,...PITFALLS.houseFurniture].some(w=>Math.abs(x-w.x)<w.w/2+.22&&Math.abs(z-w.z)<w.d/2+.22);
  if(PITFALLS.lowerWalls.some(w=>Math.abs(x-w.x)<w.w/2+.22&&Math.abs(z-w.z)<w.d/2+.22))return false;
  const column=gridX().some((v,i)=>i>0&&i<PITFALLS.grid.columns&&i%2===0&&Math.abs(x-v)<.52)&&gridZ().some((v,i)=>i>0&&i<PITFALLS.grid.rows&&i%2===0&&Math.abs(z-v)<.52);
  return !column;
 }
 if(PITFALLS.upperWalls.some(w=>Math.abs(x-w.x)<w.w/2+.22&&Math.abs(z-w.z)<w.d/2+.22))return false;
 if(x<42.3)return z>-16.75&&z<-15.25;
 return inside(room,x,z,.22)||(x>=room.maxX-.3&&x<=79.78&&z>=-16.68&&z<=-15.32);
}
export function isLowerRoute(x,z,y){return y<-.25&&PITFALLS.lowerRooms.some(r=>inside(r,x,z));}
export function pitMoveSpeed(x,z,y,sprint,walkSpeed=5.4,sprintSpeed=9.2){return y>=-.25&&inPitGrid(x,z)?(sprint?4.4:2.1):(sprint?sprintSpeed:walkSpeed);}
