import * as THREE from 'three';
import {CELL,SIZE,worldPoint,gridPoint,walkable,groundHeight} from './level.js';
import {createNavigator} from './navigation.js';
import {createProximityLighting} from './proximity-lighting.js';

function texture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#727272';ctx.fillRect(0,0,256,256);
 for(let i=0;i<15000;i++){const v=Math.floor(65+Math.random()*90);ctx.fillStyle=`rgba(${v},${v},${v},${Math.random()*.2})`;ctx.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,1+Math.random()*8);}
 const grime=ctx.createLinearGradient(0,0,0,256);grime.addColorStop(0,'rgba(5,5,5,.1)');grime.addColorStop(.6,'rgba(5,5,5,0)');grime.addColorStop(1,'rgba(5,5,5,.45)');ctx.fillStyle=grime;ctx.fillRect(0,0,256,256);
 for(let i=0;i<12;i++){ctx.fillStyle='rgba(20,20,20,.025)';ctx.fillRect(Math.random()*256,0,4+Math.random()*12,256);}
 const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
export function createWorld(run){
 const size=run.layout.size??SIZE,span=size*CELL;
 const firstCell=worldPoint({x:0,z:0}),lastCell=worldPoint({x:size-1,z:size-1});
 const center={x:(firstCell.x+lastCell.x)/2,z:(firstCell.z+lastCell.z)/2};
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x090a0b);scene.fog=new THREE.FogExp2(0x101112,.026);
 const targets=new Map(),rayMeshes=[],blockers=[],drawerViews=[],closets=[],lamps=[];
 const concrete=new THREE.MeshStandardMaterial({map:texture(),color:0x999999,roughness:1});
 const floorMat=new THREE.MeshStandardMaterial({map:texture(),color:0x56585a,roughness:1});
 const dark=new THREE.MeshStandardMaterial({color:0x242527,roughness:.95});
 const wood=new THREE.MeshStandardMaterial({map:texture(),color:0x42413f,roughness:1});
 const metal=new THREE.MeshStandardMaterial({color:0x646669,roughness:.6,metalness:.4});
 const white=new THREE.MeshBasicMaterial({color:0xc4c5be});
 const boxGeometry=new THREE.BoxGeometry(1,1,1);
 function box(w,h,d,x,y,z,mat=concrete,parent=scene){const m=new THREE.Mesh(boxGeometry,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);rayMeshes.push(m);return m;}
 function collider(x,z,w,d,enabled=()=>true,wall=false){blockers.push({x,z,w,d,enabled,wall});}
 function target(id,type,mesh,data={}){const t={id,type,mesh,...data};mesh.userData.interactId=id;targets.set(id,t);return t;}
 function sign(text,w,h,x,y,z,{rotation=0,background='#18191a',color='#d2d1c8',size=58}={}){
  const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,768,256);ctx.strokeStyle='#777';ctx.lineWidth=4;ctx.strokeRect(12,12,744,232);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${size}px monospace`;ctx.fillText(text,384,128,720);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);rayMeshes.push(m);return m;
 }
 function fixture(x,y,z,strength=15){
  box(1.05,.09,.25,x,y+.06,z,dark);
  const tube=box(.9,.04,.17,x,y,z,white.clone());
  tube.userData.ceilingLight=true;
  const light=new THREE.PointLight(0xdddcd4,strength,9,1.4);light.position.set(x,y-.12,z);
  lamps.push({light,tube,base:strength,position:{x,z,height:groundHeight({x,z})}});
 }
 const walls=[];
 for(let z=0;z<size;z++)for(let x=0;x<size;x++)if(!run.layout.grid[z][x])walls.push(worldPoint({x,z}));
 const wallMesh=new THREE.InstancedMesh(boxGeometry,concrete,walls.length),matrix=new THREE.Matrix4();
 walls.forEach((p,i)=>{matrix.compose(new THREE.Vector3(p.x,2.2,p.z),new THREE.Quaternion(),new THREE.Vector3(CELL,4.4,CELL));wallMesh.setMatrixAt(i,matrix);});wallMesh.receiveShadow=true;scene.add(wallMesh);rayMeshes.push(wallMesh);
 box(span,.12,span,center.x,-.06,center.z,floorMat);box(span,.1,span,center.x,4.45,center.z,concrete);
 // Elevator hub, stair corridor, and enclosed cab are on the upper floor.
 box(12,.15,8,-2.6,3.525,-29,floorMat);box(12,.15,8,-2.6,7.85,-29);
 box(.2,4.4,8,-8.6,5.8,-29);box(.2,4.4,8,3.4,5.8,-29);
 box(4.9,4.4,.2,-6.05,5.8,-25);box(4.9,4.4,.2,.85,5.8,-25);
 box(4.85,4.4,.2,-6.075,5.8,-33);box(4.85,4.4,.2,.875,5.8,-33);box(2.2,1.1,.2,-2.6,7.3,-33);
 box(2,.15,2.5,-2.6,3.525,-34.1,metal);box(2,4.4,.12,-2.6,5.8,-35.35,dark);box(.12,4.4,2.5,-3.65,5.8,-34.1,dark);box(.12,4.4,2.5,-1.55,5.8,-34.1,dark);
 for(const [x,z,w,d] of [[-8.6,-29,.2,8],[3.4,-29,.2,8],[-6.05,-25,4.9,.2],[.85,-25,4.9,.2],[-6.075,-33,4.85,.2],[.875,-33,4.85,.2],[-2.6,-35.35,2,.12],[-3.65,-34.1,.12,2.5],[-1.55,-34.1,.12,2.5]])collider(x,z,w,d,()=>true,true);
 box(2.4,.2,6.8,-2.6,7.7,-21.6);
 for(let i=0;i<24;i++){const z=-25+(i+.5)*6.8/24,y=3.6*(1-i/24);box(2.2,y+.1,6.8/24,-2.6,y/2-.05,z,floorMat);}
 box(.2,7.4,6.8,-3.8,3.7,-21.6);box(.2,7.4,6.8,-1.4,3.7,-21.6);
 sign('IT HEARS YOU',1.4,.3,-3.68,3.4,-20.8,{rotation:Math.PI/2});
 sign('RETURN / ELEVATOR',1.8,.45,-2.6,2.4,-18.08,{rotation:Math.PI});
 sign('DO NOT ENTER',1.9,.5,-2.6,6.85,-25.16,{rotation:Math.PI});
 sign('BASEMENT',1.7,.4,-2.6,7,-25.14);
 fixture(-2.6,7.6,-29,32);fixture(-2.6,6.9,-22.5,15);fixture(-2.6,4.2,-18.2,20);
 const boards=[];
 for(let i=0;i<4;i++){const b=box(2.15,.18,.12,-2.6,4.1+i*.57,-25,wood);b.rotation.z=(i%2?1:-1)*.07;b.userData.interactId='boards';boards.push(b);}
 const boardHitbox=box(2.2,3.2,.04,-2.6,5.3,-25.09,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));boardHitbox.userData.interactId='boards';
 targets.set('boards',{id:'boards',type:'boards',mesh:boardHitbox});collider(-2.6,-25,2.4,.25,()=>!run.boardsOpen);
 const elevatorDoors=[box(1,3.2,.13,-3.1,5.2,-32.91,metal),box(1,3.2,.13,-2.1,5.2,-32.91,metal)];
 for(const d of elevatorDoors)d.userData.interactId='elevator';targets.set('elevator',{id:'elevator',type:'elevator',mesh:elevatorDoors[0]});
 sign('EXIT',1.2,.35,-2.6,7.05,-32.84);
 const panel=box(.68,1.2,.14,-4.1,5,-32.79,dark);target('locks','locks',panel);
 const indicators=[];
 for(let i=0;i<4;i++){const mat=new THREE.MeshBasicMaterial({color:0x3b3c3c});const led=box(.14,.14,.025,-4.1,5.37-i*.24,-32.7,mat);led.userData.interactId='locks';indicators.push(led);}
 sign('4 LOCKS',.75,.22,-4.1,5.86,-32.68,{size:68});
 const keypad=box(.68,.95,.16,-1.03,5.1,-32.78,dark);target('keypad','keypad',keypad);
 const screen=box(.46,.16,.03,-1.03,5.38,-32.68,new THREE.MeshBasicMaterial({color:0x525953}));screen.userData.interactId='keypad';
 for(let r=0;r<3;r++)for(let c=0;c<3;c++){const button=box(.095,.085,.035,-1.17+c*.14,5.12-r*.13,-32.67,metal);button.userData.interactId='keypad';}
 sign('CODE',.6,.2,-1.03,5.75,-32.65,{size:72});
 function keyMesh(){const key=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.068,.018,8,16),white);ring.rotation.x=Math.PI/2;key.add(ring);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.18,8),white);shaft.rotation.x=Math.PI/2;shaft.position.z=.13;key.add(shaft);for(let i=0;i<2;i++){const tooth=new THREE.Mesh(boxGeometry,white);tooth.scale.set(.065,.025,.022);tooth.position.set(.025,0,.18+i*.04);key.add(tooth);}return key;}
 function cabinet(x,z,index){
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  box(1.04,1.45,.12,0,.725,-.3,wood,group);box(.09,1.45,.72,-.51,.725,0,wood,group);box(.09,1.45,.72,.51,.725,0,wood,group);box(1.12,.1,.8,0,1.5,0,wood,group);box(1.05,.08,.72,0,.05,0,wood,group);
  collider(x,z,1.12,.8);
  for(let i=0;i<3;i++){
   const id=index*3+i,drawer=new THREE.Group();drawer.position.set(0,.25+i*.42,0);group.add(drawer);
   const face=box(.91,.36,.07,0,0,.36,wood,drawer);face.userData.interactId=`drawer-${id}`;
   const handle=box(.23,.025,.05,0,.025,.42,metal,drawer);handle.userData.interactId=`drawer-${id}`;
   box(.84,.045,.58,0,-.155,.02,wood,drawer);box(.035,.2,.58,-.44,-.05,.02,wood,drawer);box(.035,.2,.58,.44,-.05,.02,wood,drawer);
   const key=keyMesh();key.position.set(0,-.08,.07);drawer.add(key);key.traverse(m=>{if(m.isMesh){m.userData.interactId=`drawer-${id}`;rayMeshes.push(m);}});
   targets.set(`drawer-${id}`,{id:`drawer-${id}`,type:'drawer',drawerId:id,mesh:face});drawerViews.push({drawer,key,id});
  }
 }
 run.layout.rooms.forEach((room,index)=>{
  const p=worldPoint(room);cabinet(p.x-1.65,p.z-1.25,index*2);cabinet(p.x+1.65,p.z-1.25,index*2+1);
  sign(`STORAGE ${String(index+1).padStart(2,'0')}`,1.25,.28,p.x,2.8,p.z-3.72);
  fixture(p.x,4.15,p.z,26);
  const x=p.x+2.35,z=p.z+1.4,closet=new THREE.Group();closet.position.set(x,0,z);scene.add(closet);
  box(1.3,2.85,.12,0,1.425,-.45,wood,closet);box(.1,2.85,1,-.65,1.425,0,wood,closet);box(.1,2.85,1,.65,1.425,0,wood,closet);box(1.4,.1,1,0,2.85,0,wood,closet);
  const door=box(1.22,2.75,.09,0,1.39,.5,wood,closet);door.userData.interactId=`closet-${index}`;
  for(let j=0;j<4;j++){const slit=box(.62,.018,.015,0,2.1-j*.08,.553,dark,closet);slit.userData.interactId=`closet-${index}`;}
  const handle=box(.035,.2,.035,.45,1.4,.57,metal,closet);handle.userData.interactId=`closet-${index}`;
  collider(x,z,1.4,1.1);const data={id:`closet-${index}`,type:'closet',mesh:door,hide:{x,z:z+.17},exit:{x,z:z+1.35}};targets.set(data.id,data);closets.push(data);
 });
 // Spread ceiling fixtures through the corridors as well as the storage rooms.
 for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++){
  if(!run.layout.grid[z][x])continue;
  const p=worldPoint({x,z});
  if(run.layout.rooms.some(room=>{const r=worldPoint(room);return Math.hypot(p.x-r.x,p.z-r.z)<4.5;}))continue;
  if(lamps.some(lamp=>Math.hypot(p.x-lamp.position.x,p.z-lamp.position.z)<7))continue;
  fixture(p.x,4.15,p.z,18);
 }
 const clueRoom=worldPoint(run.layout.rooms[run.clueRoom]);
 box(1.6,.08,.72,clueRoom.x,.9,clueRoom.z+2.3,wood);box(.08,.9,.6,clueRoom.x-.65,.45,clueRoom.z+2.3,wood);box(.08,.9,.6,clueRoom.x+.65,.45,clueRoom.z+2.3,wood);collider(clueRoom.x,clueRoom.z+2.3,1.6,.72);
 box(.84,.37,.04,clueRoom.x,1.25,clueRoom.z+2.42,wood);box(.045,.35,.045,clueRoom.x,1.08,clueRoom.z+2.4,wood);
 const note=sign(run.code,.8,.3,clueRoom.x,1.25,clueRoom.z+2.45,{background:'#b7b5aa',color:'#151515',size:125});target('clue','clue',note);
 const ambient=new THREE.AmbientLight(0xaeb4be,.65);scene.add(ambient);
 const dustPositions=[];for(let i=0;i<900;i++){const x=1+Math.floor(Math.random()*(size-2)),z=1+Math.floor(Math.random()*(size-2));if(!run.layout.grid[z][x])continue;const p=worldPoint({x,z});dustPositions.push(p.x+(Math.random()-.5)*2,p.y||.25+Math.random()*3.8,p.z+(Math.random()-.5)*2);}
 const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
 const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xaeb2ae,size:.018,transparent:true,opacity:.15,depthWrite:false}));scene.add(dust);
 const pipeMaterial=new THREE.MeshStandardMaterial({color:0x292c2d,roughness:.9,metalness:.3});
 for(const room of run.layout.rooms){const p=worldPoint(room);const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,6.8,8),pipeMaterial);pipe.rotation.z=Math.PI/2;pipe.position.set(p.x,3.95,p.z+.65);scene.add(pipe);}
 // Keep shader light counts fixed as co-op basements grow. Every physical
 // fixture retains its own electrical state; nearby ones supply these lights.
 const ceilingLights=Array.from({length:8},()=>{
  const light=new THREE.PointLight(0xdddcd4,0,9,1.4);scene.add(light);return light;
 });
 const lightEye=new THREE.Vector3();
 const fill=new THREE.PointLight(0xc8cbd0,7,5,1.7);scene.add(fill);
 const lighting=createProximityLighting(lamps.map(lamp=>lamp.position));
 const backgroundColor=scene.background.clone(),fogColor=scene.fog.color.clone();
 let doorProgress=0;
 function domain(x,z,radius){
  if(z<=-25-radius-.1&&z>=-33+radius+.1&&x>=-8.6+radius+.1&&x<=3.4-radius-.1)return true;
  if(z<-32.5&&z>=-35.35+radius+.06&&x>=-3.65+radius+.06&&x<=-1.55-radius-.06)return true;
  if(z>=-25.5&&z<=-18.0&&x>=-3.7+radius-1e-7&&x<=-1.5-radius+1e-7)return true;
  // Allow the lobby approach to the stair opening and elevator, with wall colliders below.
  if(z>=-33&&z<=-25&&x>=-8.6+radius+.1&&x<=3.4-radius-.1)return true;
  for(const dx of [-radius,radius])for(const dz of [-radius,radius])if(!walkable(run.layout,gridPoint({x:x+dx,z:z+dz})))return false;return true;
 }
 function canMove(x,z,radius=.23,wallRadius=radius){
  if(!domain(x,z,wallRadius))return false;
  if(z<-32.68&&doorProgress<.8)return false;
  for(const b of blockers){const pad=b.wall?wallRadius:radius;if(b.enabled()&&Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad)return false;}
  return true;
 }
 const sightRay=new THREE.Raycaster(),sightStart=new THREE.Vector3(),sightEnd=new THREE.Vector3();
 function canSee(from,to){
  sightStart.set(from.x,groundHeight(from)+3.25,from.z);sightEnd.set(to.x,to.height+1.65,to.z);
  const length=sightStart.distanceTo(sightEnd);sightRay.set(sightStart,sightEnd.sub(sightStart).normalize());sightRay.far=length-.05;
  const solids=rayMeshes.filter(mesh=>{if(mesh.userData.actor)return false;for(let p=mesh;p;p=p.parent)if(!p.visible)return false;return true;});
  return !sightRay.intersectObjects(solids,false).length;
 }
 const enemyCanMove=(x,z)=>canMove(x,z,.6,1.1);
 const navigator=createNavigator(enemyCanMove,{minX:firstCell.x-CELL/2,maxX:lastCell.x+CELL/2,minZ:firstCell.z-CELL/2,maxZ:lastCell.z+CELL/2});
 function update(delta,time,player,threat,hold=0,monster){
  for(const view of drawerViews){const d=run.drawers[view.id];view.drawer.position.z=THREE.MathUtils.lerp(view.drawer.position.z,d.opened?.47:0,Math.min(1,delta*12));view.key.visible=d.key&&!d.taken&&d.opened;}
  boardHitbox.visible=!run.boardsOpen;
  boards.forEach((b,i)=>{b.visible=!run.boardsOpen;b.position.z=-25-(hold>0?.1*Math.sin(hold*20+i):0);});
  indicators.forEach((m,i)=>m.material.color.setHex(i<run.banked.size?0xe2e2d4:0x3b3c3c));screen.material.color.setHex(run.codeAccepted?0xc6cec3:0x525953);
  doorProgress=THREE.MathUtils.lerp(doorProgress,run.exitOpen?1:0,Math.min(1,delta*2));
  elevatorDoors[0].position.x=-3.1-doorProgress*.96;elevatorDoors[1].position.x=-2.1+doorProgress*.96;
  fill.position.set(player.x,groundHeight(player)+1.7,player.z);
  const power=lighting.update(delta,{monster:monster?.position,player:{...player,height:groundHeight(player)},hunting:monster?.hunting,active:!!monster?.active});
  ambient.intensity=.65*(1-power.warning*.9)*power.visibility;
  fill.intensity=7*(1-power.warning*.96)*power.visibility;
  scene.background.copy(backgroundColor).multiplyScalar(power.visibility);
  scene.fog.color.copy(fogColor).multiplyScalar(power.visibility);
  dust.position.y=Math.sin(time*.16)*.06;
  lamps.forEach(({light,tube,base},index)=>{
   const intensity=power.fixtures[index].intensity;
   light.intensity=base*intensity;
   tube.material.color.copy(white.color).multiplyScalar(intensity);
  });
  lightEye.set(player.x,groundHeight(player)+1.65,player.z);
  const nearest=[...lamps].sort((a,b)=>a.light.position.distanceToSquared(lightEye)-b.light.position.distanceToSquared(lightEye));
  ceilingLights.forEach((light,index)=>{
   const source=nearest[index]?.light;
   light.intensity=source?.intensity??0;
   if(source)light.position.copy(source.position);
  });
 }
 return {scene,targets,rayMeshes,canMove,enemyNavigation:{canMove:enemyCanMove,findPath:navigator.findPath,canSee},update,lighting,closets,drawerViews,cluePosition:{x:clueRoom.x,z:clueRoom.z+2.45},get doorProgress(){return doorProgress;}};
}
