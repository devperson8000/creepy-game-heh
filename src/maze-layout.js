import {randomSource,shuffled,pathBetween} from './level.js';
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
export function createMazeLayout(seed,{playerCount=1}={}){
 const size=playerCount>=4?65:playerCount>=3?61:55,rng=randomSource(seed^0xA1102026),grid=Array.from({length:size},()=>Array(size).fill(0));
 const entrance={x:7,z:7},start={x:7,z:9},stack=[start];grid[start.z][start.x]=1;
 const inside=(x,z)=>x>=3&&z>=9&&x<size-3&&z<size-3;
 while(stack.length){const p=stack.at(-1),n=shuffled(directions,rng).map(([dx,dz])=>({x:p.x+dx*4,z:p.z+dz*4})).find(q=>inside(q.x,q.z)&&!grid[q.z][q.x]);
  if(!n){stack.pop();continue;}for(let i=1;i<=4;i++)grid[p.z+(n.z-p.z)*i/4][p.x+(n.x-p.x)*i/4]=1;stack.push(n);
 }
 // Sparse loops provide chase escapes without turning the maze into open rooms.
 for(let z=9;z<size-3;z+=4)for(let x=3;x<size-3;x+=4)for(const [dx,dz]of [[1,0],[0,1]]){
  if(!inside(x+dx*4,z+dz*4)||rng()>.075)continue;
  for(let i=1;i<4;i++)grid[z+dz*i][x+dx*i]=1;
 }
 for(let z=6;z<=9;z++)grid[z][7]=1;
 const adjacent=(x,z)=>directions.filter(([dx,dz])=>grid[z+dz]?.[x+dx]===1);
 function candidates(){const a=[];for(let z=8;z<size-2;z++)for(let x=2;x<size-2;x++)if(!grid[z][x]&&adjacent(x,z).length===1)a.push({x,z});return shuffled(a,rng);}
 const rooms=[],roomCount=playerCount>=4?32:playerCount>=3?28:24;
 for(const p of candidates()){
  if(rooms.length>=roomCount)break;if(adjacent(p.x,p.z).length!==1||rooms.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<4))continue;
  const [dx,dz]=adjacent(p.x,p.z)[0];grid[p.z][p.x]=1;rooms.push({...p,normal:{x:dx,z:dz},door:{x:p.x+dx,z:p.z+dz}});
 }
 const layout={grid,rooms,entrance,seed,size,narrowMaze:true,mazeStart:6,floorHeight:-7.2,ceilingHeight:2.65,corridorWidth:1.8,stairs:{x:-2.6,topZ:-25,bottomZ:-2.6,width:1.65,topHeight:3.6,bottomHeight:-7.2}};
 rooms.sort((a,b)=>pathBetween(layout,entrance,a).length-pathBetween(layout,entrance,b).length);
 const closets=[],atEnd=p=>{const n=adjacent(p.x,p.z)[0];return n?adjacent(p.x+n[0],p.z+n[1]).length===1:false;};
 for(const p of candidates().sort((a,b)=>Number(atEnd(b))-Number(atEnd(a)))){
  if(closets.length>=18+playerCount*2)break;
  if(adjacent(p.x,p.z).length!==1||rooms.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<2.5)||closets.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<5))continue;
  const [dx,dz]=adjacent(p.x,p.z)[0];closets.push({...p,normal:{x:dx,z:dz},atEnd:atEnd(p)});
 }
 return {...layout,closets};
}
