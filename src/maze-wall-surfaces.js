import * as THREE from 'three';
import {CELL,worldPoint} from './level.js';
const round=n=>Math.round(n*1e5)/1e5,roomCache=new WeakMap();
export function mazeWallHalf(layout,x,z){let rooms=roomCache.get(layout);if(!rooms){rooms=new Set(layout.rooms.map(p=>`${p.x},${p.z}`));roomCache.set(layout,rooms);}return CELL/2+([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>rooms.has(`${x+dx},${z+dz}`))?.1:.4);}
/** Exterior of the wall/closet solid union. Adjacent blocks never draw coincident faces. */
export function buildMazeWallSurfaces(layout){
 const boxes=[],floor=layout.floorHeight,height=layout.ceilingHeight,closets=new Set(layout.closets.map(c=>`${c.x},${c.z}`));
 function box(x,y,z,w,h,d){boxes.push({min:[x-w/2,y-h/2,z-d/2].map(round),max:[x+w/2,y+h/2,z+d/2].map(round)});}
 for(let z=layout.mazeStart;z<layout.size;z++)for(let x=0;x<layout.size;x++)if(!layout.grid[z][x]&&!closets.has(`${x},${z}`)){const p=worldPoint({x,z}),w=mazeWallHalf(layout,x,z)*2;box(p.x,floor+height/2,p.z,w,height,w);}
 for(const c of layout.closets){const p=worldPoint(c),n=c.normal,w=mazeWallHalf(layout,c.x,c.z)*2,side=(w-1.12)/2;
  const local=(x,y,z,sx,sy,sz)=>box(p.x+n.z*x+n.x*z,floor+y,p.z-n.x*x+n.z*z,Math.abs(n.z)*sx+Math.abs(n.x)*sz,sy,Math.abs(n.x)*sx+Math.abs(n.z)*sz);
  for(const sign of [-1,1])local(sign*(.56+side/2),height/2,0,side,height,w);
  local(0,height/2,-.525,1.12,height,w-1.05);local(0,(height+2.25)/2,w/2-.525,1.12,height-2.25,1.05);
 }
 const axes=[0,1,2].map(axis=>[...new Set(boxes.flatMap(b=>[b.min[axis],b.max[axis]]))].sort((a,b)=>a-b)),maps=axes.map(values=>new Map(values.map((v,i)=>[v,i]))),sizes=axes.map(a=>a.length-1),[nx,ny,nz]=sizes,solid=new Uint8Array(nx*ny*nz),index=(x,y,z)=>(y*nz+z)*nx+x;
 for(const b of boxes){const a=b.min.map((v,i)=>maps[i].get(v)),end=b.max.map((v,i)=>maps[i].get(v));for(let y=a[1];y<end[1];y++)for(let z=a[2];z<end[2];z++)solid.fill(1,index(a[0],y,z),index(end[0],y,z));}
 const filled=p=>p.every((v,i)=>v>=0&&v<sizes[i])&&solid[index(...p)]===1,faces=[];
 // Greedy rectangles merge exposed runs, including the shallow closet headers.
 for(let axis=0;axis<3;axis++){const u=(axis+1)%3,v=(axis+2)%3,nu=sizes[u],nv=sizes[v];for(let plane=0;plane<=sizes[axis];plane++){
  const mask=new Int8Array(nu*nv);for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const p=[0,0,0];p[u]=i;p[v]=j;p[axis]=plane-1;const a=filled(p);p[axis]=plane;const b=filled(p);mask[j*nu+i]=a===b?0:a?1:-1;}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const sign=mask[j*nu+i];if(!sign)continue;let width=1,depth=1;while(i+width<nu&&mask[j*nu+i+width]===sign)width++;outer:while(j+depth<nv){for(let k=0;k<width;k++)if(mask[(j+depth)*nu+i+k]!==sign)break outer;depth++;}for(let row=0;row<depth;row++)mask.fill(0,(j+row)*nu+i,(j+row)*nu+i+width);faces.push({axis,plane:axes[axis][plane],sign,u0:axes[u][i],u1:axes[u][i+width],v0:axes[v][j],v1:axes[v][j+depth]});}
 }}
 const chunks=new Map();for(const f of faces){const u=(f.axis+1)%3,v=(f.axis+2)%3,centre=[0,0,0];centre[f.axis]=f.plane;centre[u]=(f.u0+f.u1)/2;centre[v]=(f.v0+f.v1)/2;const key=`${Math.floor(centre[0]/(CELL*8))},${Math.floor(centre[2]/(CELL*8))}`;if(!chunks.has(key))chunks.set(key,{positions:[],normals:[],uvs:[]});const out=chunks.get(key),vertices=[[f.u0,f.v0],[f.u1,f.v0],[f.u1,f.v1],[f.u0,f.v1]],order=f.sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];for(const i of order){const p=[0,0,0],n=[0,0,0];p[f.axis]=f.plane;p[u]=vertices[i][0];p[v]=vertices[i][1];n[f.axis]=f.sign;out.positions.push(...p);out.normals.push(...n);out.uvs.push(vertices[i][0]/2.6,vertices[i][1]/2.6);}}
 const geometries=[...chunks.values()].map(c=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(c.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(c.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(c.uvs,2));g.computeBoundingBox();g.computeBoundingSphere();return g;});return {geometries,faces};
}
