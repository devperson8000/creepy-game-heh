import {CELL,gridPoint,worldPoint,pathBetween} from './level.js';
/** Cell graph over a few hundred route cells, rather than a huge sub-cell lattice. */
export function createMazeNavigator(layout,canMove){
 function clear(a,b){const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.12));for(let i=0;i<=steps;i++){const t=i/steps;if(!canMove(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;}
 function findPath(from,to){
  if(clear(from,to))return [{...to}];
  const cells=pathBetween(layout,gridPoint(from),gridPoint(to));if(!cells.length)return [];
  const raw=cells.map(worldPoint);if(clear(raw.at(-1),to))raw.push({...to});
  const result=[];let anchor=from,index=0;
  while(index<raw.length){let far=index;if(!clear(anchor,raw[index]))return [];while(far+1<raw.length&&clear(anchor,raw[far+1]))far++;result.push(raw[far]);anchor=raw[far];index=far+1;}
  return result;
 }
 return {findPath,clear,spacing:CELL};
}
