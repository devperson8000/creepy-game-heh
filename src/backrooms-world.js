import * as T from 'three';
import {createDustField,sampleDustField} from './backrooms-dust.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createLevelZero,canWalkLevelZero} from './backrooms-layout.js';

export function createBackroomsWorld(){
 const map=createLevelZero(),scene=new T.Scene(),resources=new Set(),lights=[];
 scene.background=new T.Color(0x51482a);scene.fog=new T.FogExp2(0x817343,.014);
 let seed=190991;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function texture(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;resources.add(t);return t;}
 const wallpaper=texture((c,s)=>{
  c.fillStyle='#b7aa60';c.fillRect(0,0,s,s);
  for(let i=0;i<45000;i++){c.fillStyle=rand()>.5?'#fff6b609':'#48391b0d';c.fillRect(rand()*s,rand()*s,1,1+rand()*3);}
  for(let x=0;x<s;x+=32)for(let y=-32;y<s;y+=64){const cy=y+(x/32%2)*32;c.strokeStyle='#82783b66';c.lineWidth=1.2;c.beginPath();c.moveTo(x+16,cy+5);c.bezierCurveTo(x+8,cy+19,x+8,cy+30,x+16,cy+43);c.bezierCurveTo(x+24,cy+30,x+24,cy+19,x+16,cy+5);c.stroke();c.beginPath();c.moveTo(x+16,cy+15);c.lineTo(x+11,cy+25);c.lineTo(x+16,cy+35);c.lineTo(x+21,cy+25);c.closePath();c.stroke();}
  const g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,'#47381a20');g.addColorStop(.5,'#fff9cf05');g.addColorStop(1,'#35281355');c.fillStyle=g;c.fillRect(0,0,s,s);
  c.fillStyle='#65542b35';c.fillRect(0,0,2,s);
 });
 const carpet=texture((c,s)=>{c.fillStyle='#8b794c';c.fillRect(0,0,s,s);for(let i=0;i<110000;i++){const v=rand();c.fillStyle=v>.65?'#d0bd8155':v>.3?'#51472744':'#a0956044';c.fillRect(rand()*s,rand()*s,.5+rand()*1.3,1+rand()*2);}for(let i=0;i<13;i++){const x=rand()*s,y=rand()*s,r=15+rand()*90,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#392f2018');g.addColorStop(1,'#392f2000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}});
 const ceiling=texture((c,s)=>{c.fillStyle='#d2ccad';c.fillRect(0,0,s,s);for(let i=0;i<18000;i++){c.fillStyle=rand()>.4?'#4e482a35':'#fff9df77';c.fillRect(rand()*s,rand()*s,.7+rand()*1.8,.7+rand()*1.5);}c.fillStyle='#615b4244';c.fillRect(0,0,s,3);c.fillRect(0,0,3,s);c.fillStyle='#fff2ca66';c.fillRect(3,3,s,2);});
 const lightmap=texture((c,s)=>{c.fillStyle='#e9ecd3';c.fillRect(0,0,s,s);for(let y=0;y<s;y+=4){c.fillStyle=y%8?'#afbda755':'#fffbe977';c.fillRect(0,y,s,1);}const g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,'#54634955');g.addColorStop(.18,'#ffffff00');g.addColorStop(.8,'#ffffff00');g.addColorStop(1,'#54634955');c.fillStyle=g;c.fillRect(0,0,s,s);});
 const material=(options)=>{const m=new T.MeshStandardMaterial({roughness:1,...options});resources.add(m);return m;};
 const paper=material({map:wallpaper,bumpMap:wallpaper,bumpScale:.008}),trim=material({color:0x72623c}),rail=material({color:0x9b967f,metalness:.35,roughness:.6});
 const cube=new T.BoxGeometry(1,1,1);resources.add(cube);
 function box(w,h,d,x,y,z,m){const mesh=new T.Mesh(cube,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 // Per-wall UVs preserve wallpaper scale instead of stretching a tiny motif across long walls.
 for(const w of map.walls){
  const g=new T.BoxGeometry(w.w,map.height,w.d),uv=g.attributes.uv;
  for(let face=0;face<6;face++){const span=face<2?w.d:w.w;for(let i=0;i<4;i++){const n=face*4+i;uv.setXY(n,uv.getX(n)*span/2.4,uv.getY(n));}}
  resources.add(g);const mesh=new T.Mesh(g,paper);mesh.position.set(w.x,map.height/2,w.z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  box(w.w+.026,.095,w.d+.026,w.x,.048,w.z,trim);
  box(w.w+.018,.035,w.d+.018,w.x,map.height-.018,w.z,rail);
 }
 const floorMap=carpet.clone();floorMap.repeat.set(36,36);resources.add(floorMap);
 box(72,.1,72,6,-.055,-6,material({map:floorMap,bumpMap:floorMap,bumpScale:.018}));
 const tile=ceiling.clone();tile.repeat.set(60,60);resources.add(tile);
 box(72,.08,72,6,map.height+.04,-6,material({map:tile,bumpMap:tile,bumpScale:.012}));
 // Suspended ceiling T-grid: 1.2 m acoustic modules, including lamps seated inside the grid.
 for(let x=-30;x<=42;x+=1.2)box(.018,.018,72,x,map.height-.016,-6,rail);
 for(let z=-42;z<=30;z+=1.2)box(72,.018,.018,6,map.height-.016,z,rail);
 const diffuser=material({map:lightmap,color:0xcdd6b6,emissive:0xe5edc5,emissiveMap:lightmap,emissiveIntensity:1.9}),housing=material({color:0x827e66});
 const dimDiffuser=diffuser.clone();dimDiffuser.emissiveIntensity=.08;resources.add(dimDiffuser);
 for(let x=-27;x<41;x+=4.8)for(let z=-39;z<29;z+=4.8){
  if(!canWalkLevelZero(map,x,z,.7)||rand()<.13)continue;
  const dark=(x<-17&&z<-6)||(z<-28&&x>18&&rand()<.6),base=dark?.13:.9+rand()*.16;
  box(1.13,.045,.61,x,map.height-.04,z,housing);
  const m=dark?dimDiffuser:diffuser;
  box(1.07,.025,.55,x,map.height-.069,z,m);
  lights.push({x,z,base,material:m,phase:rand()*10});
 }
 const ambient=new T.HemisphereLight(0xf0e5b3,0x6e5934,1.25);scene.add(ambient);
 // Pool the nearest ceiling lights to keep the material shader cost bounded.
 const pool=Array.from({length:6},()=>{const l=new T.PointLight(0xffedb5,0,11,1.5);scene.add(l);return l;});
 // Tiny wall sockets and discolored seams sell human scale without furnishing the empty rooms.
 const socket=material({color:0xc2b78b}),hole=material({color:0x3d3724});
 for(const w of map.walls.filter(w=>w.w>7&&w.d<1)){
  for(const side of [-1,1]){box(.12,.18,.025,w.x+.7,.32,w.z+side*(w.d/2+.014),socket);for(const dx of [-.025,.025])box(.012,.039,.028,w.x+.7+dx,.33,w.z+side*(w.d/2+.027),hole);}
 }
 // Merge static meshes by material: long ceiling grids should not cost hundreds of draw calls.
 const batches=new Map();
 for(const mesh of [...scene.children])if(mesh.isMesh){mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(g);scene.remove(mesh);}
 for(const [m,parts]of batches){const g=mergeGeometries(parts);resources.add(g);const mesh=new T.Mesh(g,m);mesh.receiveShadow=true;scene.add(mesh);for(const part of parts)part.dispose();}
 const dustBase=createDustField(map),dustPositions=new Float32Array(dustBase);
 const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3).setUsage(T.DynamicDrawUsage));resources.add(dustGeometry);
 const dustMap=texture((c,s)=>{c.clearRect(0,0,s,s);const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,248,216,.7)');g.addColorStop(.25,'rgba(255,248,216,.25)');g.addColorStop(1,'rgba(255,248,216,0)');c.fillStyle=g;c.fillRect(0,0,s,s);},64);
 const dustMaterial=new T.PointsMaterial({map:dustMap,color:0xd2c393,size:.025,transparent:true,opacity:.28,depthTest:true,depthWrite:false,sizeAttenuation:true});resources.add(dustMaterial);
 const dust=new T.Points(dustGeometry,dustMaterial);dust.name='level-zero-world-dust';dustGeometry.computeBoundingSphere();scene.add(dust);
 let lastX=Infinity,lastZ=Infinity,near=[];
 function update(time,player,reduced=false){
  sampleDustField(dustBase,reduced?0:time,dustPositions);dustGeometry.attributes.position.needsUpdate=true;
  if(Math.hypot(player.x-lastX,player.z-lastZ)>.7){near=[...lights].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)).slice(0,pool.length);lastX=player.x;lastZ=player.z;}
  pool.forEach((l,i)=>{const f=near[i];if(!f){l.intensity=0;return;}const flicker=reduced?1:1-.018*Math.sin(time*97+f.phase)-.012*Math.sin(time*131+f.phase);l.position.set(f.x,map.height-.19,f.z);l.intensity=17*f.base*flicker;});
 }
 return {scene,map,update,canMove:(x,z)=>canWalkLevelZero(map,x,z),dispose(){for(const r of resources)r.dispose();scene.clear();}};
}
