import {createMazeLayout} from './maze-layout.js';
export const CELL=2.6,SIZE=17;
export function randomSource(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function shuffled(values,rng){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createLayout(seed,{playerCount=1,halloween=false,maze=true,mapUpdate=false}={}){
 if(mapUpdate||halloween&&maze){const layout=createMazeLayout(seed,{playerCount});return {...layout,narrowMaze:true,halloween,halloweenMaze:!!halloween};}
 const size=playerCount>=4?25:playerCount>=3?21:SIZE;
 const rng=randomSource(halloween?(seed^0xA1102026):seed),grid=Array.from({length:size},()=>Array(size).fill(0));
 const entrance={x:7,z:1},stack=[entrance];grid[1][7]=1;
 while(stack.length){const current=stack.at(-1);const next=shuffled([[2,0],[-2,0],[0,2],[0,-2]],rng).map(([dx,dz])=>({x:current.x+dx,z:current.z+dz})).find(p=>p.x>0&&p.z>0&&p.x<size-1&&p.z<size-1&&!grid[p.z][p.x]);
  if(!next){stack.pop();continue;}grid[(current.z+next.z)/2][(current.x+next.x)/2]=1;grid[next.z][next.x]=1;stack.push(next);
 }
 const rooms=[{x:3,z:3},{x:13,z:3},{x:3,z:13},{x:13,z:13},{x:9,z:9},{x:9,z:13}];
 if(size>=21)rooms.push({x:17,z:5},{x:5,z:17});
 if(size>=25)rooms.push({x:21,z:13},{x:17,z:21});
 if(halloween){
  // Keep room fixture clearance while changing landmarks and adding loop routes.
  rooms[4]={x:9,z:5};rooms[5]={x:9,z:11};
  for(let z=2;z<size-2;z++)for(let x=2;x<size-2;x++)if(!grid[z][x]&&((grid[z][x-1]&&grid[z][x+1])||(grid[z-1][x]&&grid[z+1][x]))&&rng()<.13)grid[z][x]=1;
 }
 for(const r of rooms)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)grid[r.z+dz][r.x+dx]=1;
 grid[0][7]=1;
 return {grid,entrance,rooms,seed,size,...(halloween?{halloween:true}:{})};
}
export function worldPoint(cell){return{x:(cell.x-8)*CELL,z:(cell.z-8)*CELL};}
export function gridPoint(point){return{x:Math.round(point.x/CELL+8),z:Math.round(point.z/CELL+8)};}
export function walkable(layout,cell){return layout.grid[cell.z]?.[cell.x]===1;}
export function pathBetween(layout,from,to){
 const key=p=>`${p.x},${p.z}`;if(!walkable(layout,from)||!walkable(layout,to))return[];
 const queue=[from],parents=new Map([[key(from),null]]),points=new Map([[key(from),from]]);
 for(let index=0;index<queue.length;index++){
  const p=queue[index];if(key(p)===key(to)){const result=[];for(let k=key(to);k!==null;k=parents.get(k))result.unshift(points.get(k));return result;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,z:p.z+dz},k=key(n);if(walkable(layout,n)&&!parents.has(k)){parents.set(k,key(p));points.set(k,n);queue.push(n);}}
 }return[];
}
export function lineOfSight(layout,a,b){const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.18));for(let i=0;i<=steps;i++){const f=i/steps;if(!walkable(layout,gridPoint({x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f})))return false;}return true;}
export function groundHeight(point,layout){if(layout?.narrowMaze){const s=layout.stairs;if(point.z<=s.topZ)return s.topHeight;if(point.z<s.bottomZ&&Math.abs(point.x-s.x)<s.width/2+.2)return s.topHeight+(s.bottomHeight-s.topHeight)*(point.z-s.topZ)/(s.bottomZ-s.topZ);return layout.floorHeight;}if(point.z<=-25)return 3.6;if(point.z<-18.2&&Math.abs(point.x+2.6)<1.3)return 3.6*(-18.2-point.z)/6.8;return 0;}
export function moveInWorld(position,input,yaw,delta,canMove,speed=2.5){
 const n=Math.max(1,Math.hypot(input.forward,input.right)),distance=Math.min(Math.max(0,delta),.05)*speed;
 const dx=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.right)*distance/n,dz=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.right)*distance/n;
 const next={x:position.x,z:position.z};if(canMove(next.x+dx,next.z))next.x+=dx;if(canMove(next.x,next.z+dz))next.z+=dz;return next;
}
