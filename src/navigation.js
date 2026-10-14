export function sweepMove(from,to,canMove){
 const distance=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(distance/.08));
 let p={...from};
 for(let i=1;i<=steps;i++){const f=i/steps,next={x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f};if(!canMove(next.x,next.z))break;p=next;}
 return p;
}
export function createNavigator(canMove,{minX=-22.1,maxX=22.1,minZ=-22.1,maxZ=22.1,spacing=.325}={}){
 const width=Math.round((maxX-minX)/spacing)+1,height=Math.round((maxZ-minZ)/spacing)+1,count=width*height;
 const open=new Uint8Array(count),point=id=>({x:minX+(id%width)*spacing,z:minZ+Math.floor(id/width)*spacing});
 for(let id=0;id<count;id++){const p=point(id);open[id]=Number(canMove(p.x,p.z));}
 function clear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.08));for(let i=0;i<=n;i++){const f=i/n;if(!canMove(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f))return false;}return true;}
 function snap(p,requireConnection=false){
  const cx=Math.round((p.x-minX)/spacing),cz=Math.round((p.z-minZ)/spacing);let best=-1,distance=Infinity;
  for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){const x=cx+dx,z=cz+dz,id=z*width+x;if(x<0||z<0||x>=width||z>=height||!open[id])continue;const q=point(id),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<distance&&(!requireConnection||clear(p,q))){best=id;distance=d;}}
  return best;
 }
 function findPath(from,to){
  if(clear(from,to))return [{...to}];
  const start=snap(from,true),goal=snap(to);if(start<0||goal<0)return[];
  const g=new Float64Array(count);g.fill(Infinity);g[start]=0;const parent=new Int32Array(count);parent.fill(-1);const closed=new Uint8Array(count),heap=[];
  const heuristic=id=>Math.abs(id%width-goal%width)+Math.abs(Math.floor(id/width)-Math.floor(goal/width));
  function push(id,score){heap.push({id,score});let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].score<=score)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let n=i,l=2*i+1,r=l+1;if(l<heap.length&&heap[l].score<heap[n].score)n=l;if(r<heap.length&&heap[r].score<heap[n].score)n=r;if(n===i)break;[heap[i],heap[n]]=[heap[n],heap[i]];i=n;}}return first.id;}
  push(start,heuristic(start));
  while(heap.length){
   const id=pop();if(closed[id])continue;closed[id]=1;
   if(id===goal){
    const raw=[];for(let at=id;at>=0;at=parent[at])raw.unshift(point(at));if(clear(raw.at(-1),to))raw.push({...to});
    const result=[];let anchor=from,index=0;
    while(index<raw.length){let far=index;while(far+1<raw.length&&clear(anchor,raw[far+1]))far++;result.push(raw[far]);anchor=raw[far];index=far+1;}
    return result;
   }
   const x=id%width,z=Math.floor(id/width);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,n=nz*width+nx;if(nx<0||nz<0||nx>=width||nz>=height||!open[n]||closed[n])continue;const score=g[id]+1;if(score<g[n]&&clear(point(id),point(n))){g[n]=score;parent[n]=id;push(n,score+heuristic(n));}}
  }
  return [];
 }
 return {findPath,clear};
}
