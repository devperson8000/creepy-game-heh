import * as THREE from 'three';
import {CELL,worldPoint,walkable,randomSource} from './level.js';

const MESSAGES=[
 'IT HEARS YOU',"DON'T LET IT SEE YOU","THE LIGHT WON'T SAVE YOU",
 'FOUR KEYS. ONE WAY OUT.','IT LEARNED OUR FOOTSTEPS',"DON'T WAIT FOR SILENCE",
 'WE WERE NOT ALONE','THE STAIRS ARE STILL THERE',"IT DOESN'T SLEEP",'KEEP MOVING',
];

function writing(text,rng){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
 const ctx=canvas.getContext('2d');ctx.font='italic bold 74px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const lines=[''];
 for(const word of text.split(' ')){
  if((lines.at(-1)+' '+word).trim().length>21)lines.push(word);
  else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();
 }
 lines.forEach((line,row)=>{
  const y=192+(row-(lines.length-1)/2)*102;
  [...line].forEach((letter,index)=>{
   ctx.fillStyle=`rgba(61,45,34,${.64+rng()*.3})`;
   ctx.fillText(letter,512+(index-(line.length-1)/2)*43,y+(rng()-.5)*8);
  });
 });
 // Erode the paint without giving it a rectangular paper background.
 ctx.globalCompositeOperation='destination-out';
 for(let i=0;i<480;i++){
  ctx.fillStyle=`rgba(0,0,0,${.15+rng()*.65})`;
  ctx.fillRect(rng()*1024,rng()*384,1+rng()*15,1+rng()*3);
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
}

export function createWallNotes(layout){
 return layout.rooms.flatMap((room,index)=>{
  const candidates=[];
  for(const lane of [0,-1,1])for(const [dx,dz] of [[0,-1],[-1,0],[0,1],[1,0]]){
   const offset=layout.narrowMaze?1:2;const cell={x:room.x+dx*offset+(dz?lane:0),z:room.z+dz*offset+(dx?lane:0)};
   const inside={x:cell.x-dx,z:cell.z-dz};
   if(!walkable(layout,cell)&&walkable(layout,inside))candidates.push({cell,dx,dz});
  }
  if(!candidates.length)return [];
  // Prefer the north/west wall, clear of the east-side closet and clue desk.
  const {cell,dx,dz}=candidates[0],p=worldPoint(cell),rng=randomSource(layout.seed^Math.imul(index+1,0x4e07));
  const text=MESSAGES[index%MESSAGES.length],note=new THREE.Mesh(new THREE.PlaneGeometry(2.1,.79),writing(text,rng));
  note.position.set(p.x-dx*(CELL/2+(layout.narrowMaze?.1:0)+.018),(layout.floorHeight??0)+1.93+(rng()-.5)*.18,p.z-dz*(CELL/2+(layout.narrowMaze?.1:0)+.018));
  note.rotation.y=Math.atan2(-dx,-dz);
  note.userData={wallNote:true,noteText:text,wallCell:cell,roomIndex:index};
  return [note];
 });
}
