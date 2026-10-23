import * as THREE from 'three';
import {buildMazeWallSurfaces,mazeWallHalf} from './maze-wall-surfaces.js';
import {CELL,worldPoint,gridPoint,walkable,groundHeight as sampleGround,randomSource} from './level.js';
import {createMazeNavigator} from './maze-navigation.js';
import {createHalloweenWorld} from './halloween-world.js';
import {createProximityLighting} from './proximity-lighting.js';
import {createWallNotes} from './wall-notes.js';
import {reducedMotion} from './preferences.js';

export function createMazeWorld(run){
 const layout=run.layout,floor=layout.floorHeight,height=layout.ceilingHeight,size=layout.size;
 const groundHeight=p=>sampleGround(p,layout),rng=randomSource(run.seed^0x53E771);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x030504);scene.fog=new THREE.FogExp2(0x030504,.057);
 const targets=new Map(),rayMeshes=[],blockers=[],drawerViews=[],closets=[],lamps=[];
 function texture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#777665';ctx.fillRect(0,0,256,256);for(let i=0;i<7000;i++){ctx.fillStyle=`rgba(12,18,10,${rng()*.18})`;ctx.fillRect(rng()*256,rng()*256,1+rng()*3,1+rng()*20);}for(let i=0;i<16;i++){ctx.fillStyle='#141b1022';ctx.fillRect(rng()*256,180,3+rng()*4,76);}const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;}
 const concrete=new THREE.MeshStandardMaterial({color:0x777d69,map:texture(),roughness:1}),floorMat=new THREE.MeshStandardMaterial({color:0x3c4337,map:texture(),roughness:1});
 const dark=new THREE.MeshStandardMaterial({color:0x18201a,roughness:1}),wood=new THREE.MeshStandardMaterial({color:0x30392e,map:texture(),roughness:1}),metal=new THREE.MeshStandardMaterial({color:0x474d47,roughness:.62,metalness:.4}),white=new THREE.MeshBasicMaterial({color:0xb2b69d});
 const boxGeometry=new THREE.BoxGeometry(1,1,1);
 function box(w,h,d,x,y,z,mat=concrete,parent=scene){const m=new THREE.Mesh(boxGeometry,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);rayMeshes.push(m);return m;}
 function collider(x,z,w,d,enabled=()=>true,wall=false){blockers.push({x,z,w,d,enabled,wall});}
 function target(id,type,mesh,data={}){const t={id,type,mesh,...data};mesh.userData.interactId=id;targets.set(id,t);return t;}
 function sign(text,w,h,x,y,z,{rotation=0,background='#171e17',color='#aaa993',size=58}={}){const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,768,256);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${size}px monospace`;ctx.fillText(text,384,128,720);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide,roughness:1}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);rayMeshes.push(mesh);return mesh;}
 function fixture(x,y,z,strength=8){box(.72,.07,.2,x,y+.04,z,dark);const tube=box(.6,.025,.12,x,y,z,white.clone());tube.userData.ceilingLight=true;const light=new THREE.PointLight(0xd7d9be,strength,7,1.7);light.position.set(x,y-.08,z);lamps.push({light,tube,base:strength,position:{x,z,height:groundHeight({x,z})}});}
 const halfWall=(x,z)=>mazeWallHalf(layout,x,z),wallSurfaces=buildMazeWallSurfaces(layout);
 for(const geometry of wallSurfaces.geometries){const mesh=new THREE.Mesh(geometry,concrete);mesh.name='joined-maze-wall';mesh.userData.mazeWall=true;mesh.receiveShadow=true;scene.add(mesh);rayMeshes.push(mesh);}
 const first=worldPoint({x:0,z:layout.mazeStart}),last=worldPoint({x:size-1,z:size-1}),center={x:(first.x+last.x)/2,z:(first.z+last.z)/2};
 box(size*CELL,.12,(size-layout.mazeStart)*CELL,center.x,floor-.06,center.z,floorMat);
 const roofStart=worldPoint({x:0,z:7}).z-CELL/2,roofEnd=last.z+CELL/2;box(size*CELL,.12,roofEnd-roofStart,center.x,floor+height+.06,(roofStart+roofEnd)/2);
 // Elevator hub, stair corridor, and enclosed cab are on the upper floor.
 box(12,.15,8,-2.6,3.525,-29,floorMat);box(12,.15,8,-2.6,7.85,-29);
 box(.2,4.4,8,-8.6,5.8,-29);box(.2,4.4,8,3.4,5.8,-29);
 box(4.9,4.4,.2,-6.05,5.8,-25);box(4.9,4.4,.2,.85,5.8,-25);
 box(4.85,4.4,.2,-6.075,5.8,-33);box(2.2,4.4,.2,-.45,5.8,-33);box(1.15,4.4,.2,2.725,5.8,-33);box(1.5,1.4,.2,1.4,7.1,-33);box(2.2,1.1,.2,-2.6,7.3,-33);
 box(2,.15,2.5,-2.6,3.525,-34.1,metal);box(2,4.4,.12,-2.6,5.8,-35.35,dark);box(.12,4.4,2.5,-3.65,5.8,-34.1,dark);box(.12,4.4,2.5,-1.55,5.8,-34.1,dark);
 for(const [x,z,w,d] of [[-8.6,-29,.2,8],[3.4,-29,.2,8],[-6.05,-25,4.9,.2],[.85,-25,4.9,.2],[-6.075,-33,4.85,.2],[.875,-33,4.85,.2],[-2.6,-35.35,2,.12],[-3.65,-34.1,.12,2.5],[-1.55,-34.1,.12,2.5]])collider(x,z,w,d,()=>true,true);
 const stair=layout.stairs,length=stair.bottomZ-stair.topZ,drop=stair.topHeight-stair.bottomHeight;
 for(let i=0;i<64;i++){const z=stair.topZ+(i+.5)*length/64,y=stair.topHeight-drop*i/64;box(stair.width,y-floor+.12,length/64,stair.x,(floor+y)/2-.06,z,floorMat);}
 const ceiling=box(stair.width+.2,.14,Math.hypot(length,drop),stair.x,(stair.topHeight+stair.bottomHeight)/2+2.65,(stair.topZ+stair.bottomZ)/2);ceiling.rotation.x=Math.atan2(drop,length);
 for(const x of [stair.x-stair.width/2-.1,stair.x+stair.width/2+.1])box(.2,15,length,x,.3,(stair.topZ+stair.bottomZ)/2);
 // Leave the descent clear: no hanging signs or decorative panels over the steps.
 fixture(-2.6,7.6,-29,25);fixture(-2.6,1,-13.8,4);
 const boards=[];
 for(let i=0;i<4;i++){const b=box(2.15,.18,.12,-2.6,4.1+i*.57,-25,wood);b.rotation.z=(i%2?1:-1)*.07;b.userData.interactId='boards';boards.push(b);}
 const boardHitbox=box(2.2,3.2,.04,-2.6,5.3,-25.09,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));boardHitbox.userData.interactId='boards';
 targets.set('boards',{id:'boards',type:'boards',mesh:boardHitbox});collider(-2.6,-25,2.4,.25,()=>!run.boardsOpen);
 const elevatorDoors=[box(1,3.2,.13,-3.1,5.2,-32.91,metal),box(1,3.2,.13,-2.1,5.2,-32.91,metal)];
 for(const d of elevatorDoors)d.userData.interactId='elevator';targets.set('elevator',{id:'elevator',type:'elevator',mesh:elevatorDoors[0]});
 sign('B2 SERVICE LIFT',1.9,.28,-2.6,7.05,-32.84,{size:48});
 // Quiet industrial details reinforce the elevator as the return landmark.
 const paint=new THREE.MeshStandardMaterial({color:0x9b9a82,roughness:.96});
 for(const x of [-8.47,3.27])box(.035,.18,7.7,x,3.73,-29,metal);
 for(const z of [-32.86,-25.14])for(const [x,w] of [[-6.1,4.6],[.9,4.5]])box(w,.18,.035,x,3.73,z,metal);
 for(const x of [-7,-4,0,2])box(.01,.006,7.65,x,3.604,-29,dark);
 for(const z of [-31.5,-29,-26.5])box(11.6,.006,.01,-2.6,3.605,z,dark);
 for(let i=0;i<9;i++){const stripe=box(.15,.008,.44,-3.45+i*.22,3.61,-26,paint);stripe.rotation.y=-.45;}
 sign('B1 / RETURN POINT',1.7,.32,-6.4,5.75,-32.84,{size:54});
 sign('HOUSE SERVICE',1.65,.22,1.4,6.75,-32.84,{size:48});

 const panel=box(.68,1.2,.14,-4.1,5,-32.79,dark);target('locks','locks',panel);
 const indicators=[];
 for(let i=0;i<4;i++){const mat=new THREE.MeshBasicMaterial({color:0x3b3c3c});const led=box(.14,.14,.025,-4.1,5.37-i*.24,-32.7,mat);led.userData.interactId='locks';indicators.push(led);}
 sign('4 LOCKS',.75,.22,-4.1,5.86,-32.68,{size:68});
 const keypad=box(.68,.95,.16,-1.03,5.1,-32.78,dark);target('keypad','keypad',keypad);
 const screen=box(.46,.16,.03,-1.03,5.38,-32.68,new THREE.MeshBasicMaterial({color:0x525953}));screen.userData.interactId='keypad';
 for(let r=0;r<3;r++)for(let c=0;c<3;c++){const button=box(.095,.085,.035,-1.17+c*.14,5.12-r*.13,-32.67,metal);button.userData.interactId='keypad';}
 sign('CODE',.6,.2,-1.03,5.75,-32.65,{size:72});
 // One cabinet per small room, with three independently searchable drawers.
 const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const rows=run.halloween.drawerRows;
 layout.rooms.forEach((room,index)=>{
  const p=worldPoint(room),n=room.normal,g=new THREE.Group();g.position.set(p.x-n.x*.83,floor,p.z-n.z*.83);g.rotation.y=Math.atan2(n.x,n.z);scene.add(g);
  const cabinetHeight=rows===3?1.42:.84;
  box(.91,cabinetHeight,.055,0,cabinetHeight/2,-.275,wood,g);for(const x of [-.455,.455])box(.055,cabinetHeight,.6,x,cabinetHeight/2,0,wood,g);box(.91,.055,.6,0,.0275,0,wood,g);box(.98,.065,.65,0,cabinetHeight+.04,0,metal,g);
  for(let row=0;row<rows;row++){
   const id=index*rows+row,y=rows===3?.25+row*.42:.6,drawer=new THREE.Group();drawer.position.set(0,y,0);g.add(drawer);
   const face=box(.83,rows===3?.36:.26,.055,0,0,.33,wood,drawer);face.userData.interactId=`drawer-${id}`;
   const handle=box(.2,.025,.05,0,0,.37,metal,drawer);handle.userData.interactId=`drawer-${id}`;
   const bottom=rows===3?-.155:-.11;box(.77,.035,.47,0,bottom,.03,wood,drawer);for(const x of [-.39,.39])box(.025,.2,.49,x,bottom+.08,.03,wood,drawer);
   const key=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(.06,.016,8,16),white);ring.rotation.x=Math.PI/2;key.add(ring);box(.025,.025,.19,0,0,.12,white,key);box(.07,.025,.025,.025,0,.19,white,key);key.position.set(0,rows===3?-.12:-.07,.08);drawer.add(key);
   drawer.traverse(m=>{if(m.isMesh){m.userData.drawerPart=true;m.userData.interactId=`drawer-${id}`;if(!rayMeshes.includes(m))rayMeshes.push(m);}});
   const hit=box(.95,rows===3?.4:.34,.025,0,y,.39,hitMaterial,g);hit.userData.interactId=`drawer-${id}`;hit.userData.interactionProxy=true;
   targets.set(`drawer-${id}`,{id:`drawer-${id}`,type:'drawer',drawerId:id,mesh:face});drawerViews.push({drawer,key,id});
  }
  g.traverse(m=>{if(m.isMesh&&!m.userData.interactId){if(rows===1)m.userData.interactId=`drawer-${index}`;else{m.userData.cabinetIndex=index;m.userData.cabinetFloor=floor;}}});
  collider(g.position.x,g.position.z,Math.abs(n.x)? .6:.94,Math.abs(n.z)?.6:.94);
  const at={x:p.x+n.x*1.335,z:p.z+n.z*1.335};sign(run.halloween?.rooms[0]===index?'— / —':String(index+1).padStart(2,'0'),.35,.065,at.x,floor+2.59,at.z,{rotation:Math.atan2(n.x,n.z),size:130});
  const frame=new THREE.Group();frame.position.set(p.x+n.x*1.28,floor,p.z+n.z*1.28);frame.rotation.y=Math.atan2(n.x,n.z);scene.add(frame);for(const x of [-.92,.92])box(.06,2.6,.09,x,1.3,0,metal,frame);box(1.9,.08,.09,0,2.59,0,metal,frame);
  if(index%3===0)fixture(p.x,floor+2.5,p.z,5);
 });
 layout.closets.forEach((cell,index)=>{
  const p=worldPoint(cell),n=cell.normal,w=halfWall(cell.x,cell.z)*2,g=new THREE.Group();g.position.set(p.x,floor,p.z);g.rotation.y=Math.atan2(n.x,n.z);scene.add(g);
  // Concrete casing is part of the joined wall union; only its inset door is separate.
  const door=new THREE.Group();door.position.set(0,0,w/2+.008);g.add(door);
  // Actual open grille: upper/lower panels surround separate world-space slats.
  box(1.08,.9,.06,0,.45,0,wood,door);box(1.08,.24,.06,0,2.13,0,wood,door);
  for(const x of [-.5,.5])box(.08,1.14,.06,x,1.47,0,wood,door);
  for(let i=0;i<10;i++){const bar=box(.94,.035,.04,0,.96+i*.108,.018,metal,door);bar.castShadow=true;}
  box(.035,.18,.05,.4,.82,.05,metal,door);
  const proxy=box(1.08,2.25,.015,0,1.125,.055,hitMaterial,door);proxy.userData.interactionProxy=true;
  const id=`closet-${index}`;door.traverse(m=>{if(m.isMesh)m.userData.interactId=id;});
  const front=w/2,hide={x:p.x+n.x*(front-.55),z:p.z+n.z*(front-.55),height:floor},exit={x:p.x+n.x*(front+.65),z:p.z+n.z*(front+.65),height:floor};
  const data={id,type:'closet',mesh:door,physicalGrille:true,hideYaw:Math.atan2(-n.x,-n.z),hide,exit};targets.set(id,data);closets.push(data);
 });
 // Sparse fixtures allow long passages to disappear into black between pools.
 for(let z=8;z<size-1;z++)for(let x=1;x<size-1;x++)if(layout.grid[z][x]){const p=worldPoint({x,z});if(lamps.every(l=>Math.hypot(p.x-l.position.x,p.z-l.position.z)>16))fixture(p.x,floor+2.5,p.z,9);}
 const clueRoom=layout.rooms[run.clueRoom],cp=worldPoint(clueRoom),cn=clueRoom.normal;
 const note=sign(run.code,.5,.21,cp.x-cn.x*1.14,floor+1.88,cp.z-cn.z*1.14,{rotation:Math.atan2(cn.x,cn.z),background:'#999681',color:'#11170e',size:145});target('clue','clue',note);
 const halloween=createHalloweenWorld(scene,run,targets,rayMeshes);
 const wallNotes=createWallNotes(layout);scene.add(...wallNotes);
 const lighting=createProximityLighting(lamps.map(l=>l.position)),ambient=new THREE.AmbientLight(0xa8b49b,.09),fill=new THREE.PointLight(0xb5bea8,.8,3,1.7);scene.add(ambient,fill);
 const ceilingLights=Array.from({length:6},()=>{const light=new THREE.PointLight(0xd7d9be,0,7,1.7);scene.add(light);return light;});
 let doorProgress=0,selection=[],lastX=Infinity,lastZ=Infinity;
 function domain(x,z,radius){
  if(z<=-25&&z>=-33&&x>=-8.5+radius&&x<=3.3-radius)return true;
  if(z<-32.5&&z>=-35.29+radius&&x>=-3.59+radius&&x<=-1.61-radius)return true;
  if(z>=layout.stairs.topZ-.1&&z<=layout.stairs.bottomZ+.1&&Math.abs(x+2.6)<=layout.stairs.width/2-radius)return true;
  const c=gridPoint({x,z});if(!walkable(layout,c)||c.z<7)return false;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(!layout.grid[c.z+dz]?.[c.x+dx]){const cell={x:c.x+dx,z:c.z+dz},p=worldPoint(cell),half=halfWall(cell.x,cell.z)+radius;if(Math.abs(x-p.x)<half&&Math.abs(z-p.z)<half)return false;}
  return true;
 }
 function canMove(x,z,radius=.23){if(!Number.isFinite(x)||!Number.isFinite(z)||!domain(x,z,radius)||z<-32.68&&doorProgress<.8)return false;
  for(const b of blockers)if(b.enabled()&&Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius)return false;return true;
 }
 canMove.groundHeight=groundHeight;canMove.gameplay='maze';
 const enemyCanMove=(x,z)=>groundHeight({x,z})<=floor+.05&&canMove(x,z,.32);
 const navigator=createMazeNavigator(layout,enemyCanMove),sightRay=new THREE.Raycaster(),a=new THREE.Vector3(),b=new THREE.Vector3();
 function canSee(from,to){a.set(from.x,groundHeight(from)+1.95,from.z);b.set(to.x,(to.height??groundHeight(to))+1.65,to.z);const length=a.distanceTo(b);sightRay.set(a,b.sub(a).normalize());sightRay.far=length-.07;return !sightRay.intersectObjects(rayMeshes.filter(m=>!m.userData.actor&&!m.userData.interactionProxy&&m.visible),false).length;}
 for(const t of targets.values())if(!t.position){const p=t.mesh.getWorldPosition(new THREE.Vector3());t.position={x:p.x,z:p.z,height:groundHeight(p)};}
 function update(delta,time,player,threat,hold=0,monster){
  halloween?.update(time,{player,visibility:lighting.visibility,reducedMotion:reducedMotion()});
  for(const view of drawerViews){const d=run.drawers[view.id];view.drawer.position.z=THREE.MathUtils.lerp(view.drawer.position.z,d.opened?.4:0,1-Math.exp(-delta*18));view.key.visible=d.key&&!d.taken&&d.opened;}
  boardHitbox.visible=!run.boardsOpen;boards.forEach(b=>{b.visible=!run.boardsOpen;});indicators.forEach((m,i)=>m.material.color.setHex(i<run.banked.size?0xe2e2d4:0x3b3c3c));screen.material.color.setHex(run.codeAccepted?0xc6cec3:0x525953);
  doorProgress=THREE.MathUtils.lerp(doorProgress,run.exitOpen?1:0,1-Math.exp(-delta*2));elevatorDoors[0].position.x=-3.1-doorProgress*.96;elevatorDoors[1].position.x=-2.1+doorProgress*.96;
  const power=lighting.update(delta,{monster:monster?.position,player:{...player,height:groundHeight(player)},hunting:monster?.hunting,active:!!monster?.active,reducedMotion:reducedMotion()});
  ambient.intensity=.09*power.visibility;fill.position.set(player.x,groundHeight(player)+1.6,player.z);fill.intensity=.8*power.visibility;
  lamps.forEach((l,i)=>{l.light.intensity=l.base*power.fixtures[i].intensity;l.tube.material.color.copy(white.color).multiplyScalar(power.fixtures[i].intensity);});
  if(Math.hypot(player.x-lastX,player.z-lastZ)>.7){selection=[...lamps].sort((a,b)=>Math.hypot(a.position.x-player.x,a.position.z-player.z,a.position.height-groundHeight(player))-Math.hypot(b.position.x-player.x,b.position.z-player.z,b.position.height-groundHeight(player)));lastX=player.x;lastZ=player.z;}
  ceilingLights.forEach((light,i)=>{const source=selection[i]?.light;light.intensity=source?.intensity??0;if(source)light.position.copy(source.position);});
 }
 return {scene,targets,rayMeshes,wallSurfaces,wallNotes,halloween,canMove,groundHeight,enemyNavigation:{canMove:enemyCanMove,findPath:navigator.findPath,canSee},update,lighting,closets,drawerViews,cluePosition:{x:cp.x-cn.x*.65,z:cp.z-cn.z*.65},get doorProgress(){return doorProgress;}};
}
