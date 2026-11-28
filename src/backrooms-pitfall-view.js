import * as T from 'three';
import {createPitfallHouse} from './backrooms-house-view.js';
import {PITFALLS as P,gridX,gridZ} from './backrooms-pitfalls.js';
import {EXIT} from './monochrome2-exit-layout.js';
import {ROPE,ropePoints,ropeBar} from './monochrome2-rope.js';
import {lowerArrows} from './backrooms-lower-route.js';
/** Top grid, shaft lining and lower route are generated from the same dimensions as collision. */
export function createPitfallView(world,round,{root,resources,mat,box,carpet,paperWall,label,wall,wood,paper,steel,dark}){
 const g=P.grid,room=P.room,width=room.maxX-room.minX,depth=room.maxZ-room.minZ,cx=(room.minX+room.maxX)/2,cz=(room.minZ+room.maxZ)/2;
 const lowerWall=wall.clone();lowerWall.color.multiplyScalar(.5);resources.add(lowerWall);const lining=wall.clone();lining.color.multiplyScalar(.65);resources.add(lining);const lowerFloor=mat(0x655d43);const ceilingMat=mat(0xb7b096);
 // Full ceiling, repeated acoustic panel texture and flush white fluorescent panels.
 if(world.surfaces?.ceilingTexture){const t=world.surfaces.ceilingTexture.clone();t.repeat.set(width/1.2,depth/1.2);resources.add(t);ceilingMat.map=t;}
 box(width,.12,depth,cx,P.ceilingY+.06,cz,ceilingMat);
 for(let x=room.minX;x<=room.maxX;x+=1.2)box(.014,.02,depth,x,P.ceilingY-.01,cz,steel);
 for(let z=room.minZ;z<=room.maxZ;z+=1.2)box(width,.02,.014,cx,P.ceilingY-.01,z,steel);
 const panelMats=new Map(),panelOn=1.5;
 for(let x=44.4;x<73;x+=4.8){const m=mat(0xf3f3d8,{emissive:0xfff4cc,emissiveIntensity:0});panelMats.set(x,m);for(let z=-27.6;z<-3;z+=4.8)box(1.05,.035,.55,x,P.ceilingY-.055,z,m);}
 for(const w of P.upperWalls)paperWall(w.w,P.ceilingY,w.d,w.x,P.ceilingY/2,w.z);
 for(const z of [room.minZ,room.maxZ])paperWall(width,P.ceilingY,.22,cx,P.ceilingY/2,z);
 for(const [a,b]of [[room.minZ,-16.9],[-15.1,room.maxZ]])paperWall(.22,P.ceilingY,b-a,room.maxX,P.ceilingY/2,(a+b)/2);
 paperWall(.22,P.ceilingY-2.4,1.8,room.maxX,(P.ceilingY+2.4)/2,-16);
 // ---- The lit exit: a framed door that fills its doorway, a white passage exactly as wide as the doorway, and the vent.
 const E=EXIT,X=E.passage,D=E.door,V=E.vent,B=E.button;
 const whiteMat=mat(0xf4f1e6,{emissive:0xfff3d2,emissiveIntensity:.5}),floorWhite=mat(0xe2dfd0,{emissive:0xfff3d2,emissiveIntensity:.25}),trimMat=mat(0xd9d4c2,{emissive:0xffffff,emissiveIntensity:.3}),glowMat=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:E.glow.intensity}),duct=mat(0x2b2d2e,{metalness:.6,roughness:.55});
 const pLen=X.x1-X.x0,pcx=(X.x0+X.x1)/2,pcz=(X.z0+X.z1)/2,pw=X.z1-X.z0;
 box(pLen,.12,pw,pcx,-.06,pcz,floorWhite);box(pLen,X.wall,pw,pcx,X.top+X.wall/2,pcz,whiteMat);
 for(const z of [X.z0-X.wall/2,X.z1+X.wall/2])box(pLen,X.top,X.wall,pcx,X.top/2,z,whiteMat);
 for(const x of [75.1,76.9,78.7])box(.5,.03,.9,x,X.top-.015,pcz,glowMat);
 for(const z of [X.z0+.012,X.z1-.012])box(pLen-.2,.05,.02,pcx,.14,z,glowMat);
 // Casing around the doorway on the pit-room side, and a threshold strip: the door sits inside a real frame.
 const o=E.opening,cw=.11,cd=.05,face=E.wallFaceX;
 box(cd,o.top+cw,cw,face-cd/2,(o.top+cw)/2,o.z0-cw/2,trimMat);box(cd,o.top+cw,cw,face-cd/2,(o.top+cw)/2,o.z1+cw/2,trimMat);box(cd,cw,o.z1-o.z0+2*cw,face-cd/2,o.top+cw/2,(o.z0+o.z1)/2,trimMat);
 box(.34,.02,o.z1-o.z0,E.wallX,.01,(o.z0+o.z1)/2,steel);
 const upperDoor=new T.Group();upperDoor.position.set(D.hingeX,0,D.hingeZ);root.add(upperDoor);
 box(D.thick,D.height,D.width,D.offsetX,D.sill+D.height/2,D.width/2,dark,upperDoor);
 for(const sx of [-1,1])box(.035,.1,.06,D.offsetX+sx*(D.thick/2+.016),1.05,D.width-.14,steel,upperDoor);
 // The vent: an end wall with a real opening, a trimmed frame, a hinged grate and a dark shaft behind it.
 const vx=V.wallX,vt=V.wallThick,face2=vx-vt/2;
 box(vt,V.y0,pw,vx,V.y0/2,pcz,whiteMat);box(vt,X.top-V.y1,pw,vx,(X.top+V.y1)/2,pcz,whiteMat);
 box(vt,V.y1-V.y0,V.z0-X.z0,vx,(V.y0+V.y1)/2,(X.z0+V.z0)/2,whiteMat);box(vt,V.y1-V.y0,X.z1-V.z1,vx,(V.y0+V.y1)/2,(V.z1+X.z1)/2,whiteMat);
 const ft=.06,fx=face2-.012;
 box(.025,ft,V.z1-V.z0+2*ft,fx,V.y0-ft/2,pcz,steel);box(.025,ft,V.z1-V.z0+2*ft,fx,V.y1+ft/2,pcz,steel);
 for(const z of [V.z0-ft/2,V.z1+ft/2])box(.025,V.y1-V.y0,ft,fx,(V.y0+V.y1)/2,z,steel);
 const tl=V.tunnelX1-vx-vt/2,tcx=(vx+vt/2+V.tunnelX1)/2;
 box(tl,.1,V.z1-V.z0,tcx,V.y0-.05,pcz,duct);box(tl,.1,V.z1-V.z0,tcx,V.y1+.05,pcz,duct);for(const z of [V.z0-.05,V.z1+.05])box(tl,V.y1-V.y0+.2,.1,tcx,(V.y0+V.y1)/2,z,duct);box(.1,V.y1-V.y0,V.z1-V.z0,V.tunnelX1+.05,(V.y0+V.y1)/2,pcz,dark);
 const ventMarker=new T.Group();ventMarker.name='pitfall-exit-vent';ventMarker.position.set(P.upperVent.x,1.1,P.upperVent.z);root.add(ventMarker);
 const flap=new T.Group();flap.position.set(face2,V.y1,pcz);root.add(flap);
 box(.04,V.flapLength,V.z1-V.z0-.04,0,-V.flapLength/2,0,duct,flap);for(let i=0;i<6;i++)box(.07,.03,V.z1-V.z0-.1,-.005,-.12-i*.18,0,steel,flap);
 // Release button on the south wall: a plate with a red cap that goes green when pressed.
 const capMat=mat(0xaa2a22,{emissive:0xaa1a14,emissiveIntensity:1.1}),red=new T.Color(0xaa1a14),green=new T.Color(0x22cc55);
 box(B.plate.w,B.plate.h,B.plate.d,B.x,B.y,X.z0+B.plate.d/2,steel);
 const cap=box(.07,.07,.022,B.x,B.y,X.z0+B.plate.d+.011,capMat);const capZ=cap.position.z;label('VENT',.28,.075,B.x,B.y+.18,X.z0+.0135);
 world.registerLight?.({x:76,z:-16,y:2.1,base:1.1,color:0xffffff});world.registerLight?.({x:79,z:-16,y:2.1,base:.9,color:0xffffff});
 const spill=new T.SpotLight(0xffffff,0,9,.9,.55,1.8),spillTarget=new T.Object3D();spill.position.set(75.4,2.1,-16);spillTarget.position.set(69,.2,-16);spill.target=spillTarget;root.add(spill,spillTarget);
let upperDoorAngle=0,flapProgress=0,buttonProgress=0,revealTime=-1,viewTime=0;
 const ropeViews=new Map(),ropeSegGeometry=new T.CylinderGeometry(.018,.018,1,6),glowStickGeometry=new T.CylinderGeometry(.016,.016,.16,8),glowStickMat=mat(0x0a2a12,{emissive:0x55ff88,emissiveIntensity:2.2}),ropeA=new T.Vector3(),ropeB=new T.Vector3(),ropeDir=new T.Vector3(),ropeUp=new T.Vector3(0,1,0);resources.add(ropeSegGeometry);resources.add(glowStickGeometry);
 carpet(g.minX-room.minX,depth,(g.minX+room.minX)/2,cz);
 // The east landing has a stairwell cut into it: the lower route climbs out here, one short walk from the exit door.
 const SW=P.stairwell;
 carpet(SW.minX-g.maxX,depth,(g.maxX+SW.minX)/2,cz);carpet(room.maxX-SW.maxX,depth,(room.maxX+SW.maxX)/2,cz);
 carpet(SW.maxX-SW.minX,room.maxZ-SW.maxZ,(SW.minX+SW.maxX)/2,(SW.maxZ+room.maxZ)/2);carpet(SW.maxX-SW.minX,SW.minZ-room.minZ,(SW.minX+SW.maxX)/2,(SW.minZ+room.minZ)/2);
 carpet(g.maxX-g.minX,g.minZ-room.minZ,(g.minX+g.maxX)/2,(g.minZ+room.minZ)/2);carpet(g.maxX-g.minX,room.maxZ-g.maxZ,(g.minX+g.maxX)/2,(g.maxZ+room.maxZ)/2);
 // The deep webs make each opening a shaft; below their bottoms the floor connects into a lower layer.
 for(const x of gridX()){paperWall(g.beam,-P.shaftBottomY,g.maxZ-g.minZ,x,P.shaftBottomY/2,cz,lining);carpet(g.beam,g.maxZ-g.minZ,x,cz);}
 for(const z of gridZ()){paperWall(g.maxX-g.minX,-P.shaftBottomY,g.beam,(g.minX+g.maxX)/2,P.shaftBottomY/2,z,lining);for(let i=0;i<g.columns;i++)carpet(g.cell-g.beam,g.beam,g.minX+(i+.5)*g.cell,z);}
 box(width,.16,depth,cx,P.floorY-.08,cz,lowerFloor);
 for(const z of [room.minZ,room.maxZ])box(width,-P.floorY,.22,cx,P.floorY/2,z,lowerWall);
 box(.22,-P.floorY,depth,room.maxX,P.floorY/2,cz,lowerWall);
 // Lower west wall, with a real doorway into the alternate route.
 for(const [a,b]of [[room.minZ,-25.9],[-24.1,room.maxZ]])box(.22,3.2,b-a,42,P.floorY+1.6,(a+b)/2,lowerWall);
 box(.22,1.1,1.8,42,P.floorY+2.65,-25,lowerWall);
 for(let i=1;i<g.columns;i++)if(i%2===0)for(let j=1;j<g.rows;j++)if(j%2===0)box(.6,-P.floorY,.6,g.minX+i*g.cell,P.floorY/2,g.minZ+j*g.cell,lowerWall);
 for(const w of P.lowerWalls)box(w.w,2.85,w.d,w.x,P.floorY+1.425,w.z,lowerWall);
 // The enclosed side corridor opens into a domestic blue kitchen and a dark adjoining room.
 box(8.2,.15,4,38.1,P.floorY-.08,-25,lowerFloor);
 for(const z of [-27,-23])box(6,3.1,.2,39,P.floorY+1.55,z,lowerWall);
 box(8,.12,4,38,P.floorY+3.1,-25,dark);
 createPitfallHouse(world,{box,mat,wood,steel,dark,paper});
 const lowDoor=new T.Group();lowDoor.position.set(42,P.floorY,-25.9);root.add(lowDoor);box(.12,2.2,1.8,0,1.1,.9,wood,lowDoor);box(.16,.1,.06,.08,1,1.6,steel,lowDoor);
 for(let i=0;i<20;i++){const top=P.floorY+(i+1)*.1;box(.2,.12,2,32.5-(i+.5)*.2,top-.06,-30,paper);}
 box(.5,.15,2,28.25,P.floorY+2-.075,-30,paper);
 // Glowing arrows: they stay visible with no light at all, and each points along the real shortest walk to the stairwell.
 const arrowMat=mat(0x0a1a0e,{emissive:0x39c26a,emissiveIntensity:.9});
 function arrow(x,z,angle){const group=new T.Group();group.position.set(x,P.floorY+.012,z);group.rotation.y=angle;root.add(group);box(.1,.012,.8,0,0,0,arrowMat,group);for(const side of [-1,1]){const arm=box(.075,.012,.4,side*.12,0,-.32,arrowMat,group);arm.rotation.y=side*.65;}}
 for(const a of lowerArrows())arrow(a.x,a.z,a.angle);
 // Stairwell: solid treads rising to the landing, with side walls below and rails above.
 {const steps=32,rise=-P.floorY/steps,run=(SW.maxZ-SW.minZ)/steps,sw=SW.maxX-SW.minX,scx=(SW.minX+SW.maxX)/2;
  for(let i=0;i<steps;i++){const h=(i+1)*rise;box(sw,h,run,scx,P.floorY+h/2,SW.minZ+(i+.5)*run,lowerFloor);}
  for(const x of [SW.minX-.06,SW.maxX+.06]){box(.12,-P.floorY,SW.maxZ-SW.minZ,x,P.floorY/2,(SW.minZ+SW.maxZ)/2,lowerWall);box(.05,1,SW.maxZ-SW.minZ,x,.5,(SW.minZ+SW.maxZ)/2,steel);}
  label('EXIT',.7,.2,scx,P.floorY+2.3,P.room.minZ+.13);}
 // Supply room: a table against the west wall, with the flashlight on it.
 box(.7,.8,1.4,P.flashlight.x,P.floorY+.4,P.flashlight.z,wood);
 const torch=new T.Group();torch.position.set(P.flashlight.x,P.floorY+.83,P.flashlight.z);root.add(torch);const barrel=new T.CylinderGeometry(.065,.05,.3,12);resources.add(barrel);const torchBody=new T.Mesh(barrel,steel);torchBody.rotation.x=Math.PI/2;torch.add(torchBody);box(.14,.14,.04,0,0,-.17,paper,torch);
 function vent(x,y,z,rotation=0){const group=new T.Group();group.name='pitfall-exit-vent';group.position.set(x,y,z);group.rotation.y=rotation;root.add(group);box(.18,1.1,1.4,0,0,0,dark,group);for(let yy=-.45;yy<.5;yy+=.12)box(.2,.035,1.3,-.06,yy,0,steel,group);}
 vent(P.altVent.x,-3.3,P.altVent.z);
 const ropeItem=new T.Group();ropeItem.position.set(P.rope.x,.06,P.rope.z);root.add(ropeItem);const ropeMat=mat(0xb5a276),torus=new T.TorusGeometry(.18,.018,6,30);resources.add(torus);for(let i=0;i<5;i++){const ring=new T.Mesh(torus,ropeMat);ring.rotation.x=Math.PI/2;ring.position.y=i*.02;ropeItem.add(ring);}
 const ropeLines=new Map(),lineMat=new T.LineBasicMaterial({color:0xb6a17b});resources.add(lineMat);
 // Pit-room lights start dark and come on in a flickering sweep from the door when it opens.
 const roomLights=[];for(let x=44.4;x<73;x+=4.8)for(let z=-27.6;z<-3;z+=4.8){const rec=world.registerLight?.({x,z,y:P.ceilingY-.25,base:0});if(rec&&typeof rec==='object')roomLights.push({light:rec,x});}
 // The dark layer has no ceiling lights at all. Only a faint green emergency lamp over the supply room and a cold
 // glow from the stairwell, both too weak to read by.
 world.registerLight?.({x:P.flashRoom.maxX+.4,z:P.flashRoom.doorZ,y:P.floorY+2.4,base:.07,color:0x44ff88});world.registerLight?.({x:(P.stairwell.minX+P.stairwell.maxX)/2,z:P.stairwell.maxZ-1,y:-2.2,base:.1,color:0xbfd2ff});
 let doorAngle=0;
 const ease=(v,t,k,dt)=>v+(t-v)*(1-Math.exp(-dt*k));
 return {update(dt,{exit=null,climbing=null}={}){
  // Exit door and the sweep of lights across the pit room when the pit door opens.
  upperDoorAngle=ease(upperDoorAngle,round.upperExitOpen?D.openAngle:0,5,dt);upperDoor.rotation.y=upperDoorAngle;spill.intensity=55*Math.min(1,upperDoorAngle/D.openAngle);
  if(round.doorOpen&&revealTime<0)revealTime=0;if(revealTime>=0)revealTime+=dt;if(!round.doorOpen)revealTime=-1;
  const sweep=x=>{if(revealTime<0)return 0;const local=(revealTime-(x-room.minX)/(room.maxX-room.minX)*1.6)/.55;if(local<=0)return 0;if(local>=1)return 1;return Math.sin(local*53)>-.2?Math.min(1,local*1.4):.12;};
  for(const [x,m]of panelMats)m.emissiveIntensity=panelOn*sweep(x);for(const r of roomLights)r.light.base=sweep(r.x);
  // Vent grate and button: driven by the cutscene while it plays, otherwise by the shared round state.
  const flapTarget=exit?exit.flap:round.ventOpen?1:0,buttonTarget=exit?exit.button:round.ventOpen?1:0;
  flapProgress=exit?flapTarget:ease(flapProgress,flapTarget,4,dt);buttonProgress=exit?buttonTarget:ease(buttonProgress,buttonTarget,12,dt);
  flap.rotation.z=V.flapOpen*flapProgress;cap.position.z=capZ-B.capTravel*buttonProgress;capMat.emissive.copy(red).lerp(green,buttonProgress);
  ropeItem.visible=!round.hasRope;torch.visible=!round.hasTorch;doorAngle=ease(doorAngle,round.altDoorOpen?Math.PI/2:0,5,dt);lowDoor.rotation.y=doorAngle;
  // Rescue ropes: an anchor bar over the opening, a rope that pays out and settles, and a glow stick at its foot so
  // it can be found in the dark. Sway calms while someone is climbing.
  viewTime+=dt;const ids=new Set(),climbers=climbing instanceof Set?climbing:new Set(climbing??[]);
  for(const r of round.ropes??[]){
   ids.add(r.playerId);let rope=ropeViews.get(r.playerId);
   if(!rope){const group=new T.Group();root.add(group);const segs=Array.from({length:16},()=>{const m=new T.Mesh(ropeSegGeometry,ropeMat);group.add(m);return m;});
    const bar=ropeBar(r),dx=bar.to.x-bar.from.x,dz=bar.to.z-bar.from.z,len=Math.hypot(dx,dz);
    const barMesh=box(.05,.04,len+.12,(bar.from.x+bar.to.x)/2,ROPE.barY-.02,(bar.from.z+bar.to.z)/2,steel,group);barMesh.rotation.y=Math.atan2(dx,dz);
    const clamp=box(.16,.1,.16,bar.from.x,ROPE.barY-.02,bar.from.z,steel,group);void clamp;
    const stick=new T.Mesh(glowStickGeometry,glowStickMat);stick.position.set(r.bottom.x+.07,P.floorY+.03,r.bottom.z);stick.rotation.z=Math.PI/2;group.add(stick);
    const light=world.registerLight?.({x:r.bottom.x,z:r.bottom.z,y:P.floorY+.35,base:.14,color:0x66ff88});
    rope={group,segs,start:viewTime,light:light&&typeof light==='object'?light:null};ropeViews.set(r.playerId,rope);
   }
   const unroll=Math.min(1,(viewTime-rope.start)/ROPE.unrollSeconds),pts=ropePoints(r,viewTime,unroll,climbers.has(r.playerId)?1:0);
   for(let i=0;i<rope.segs.length;i++){const a=pts[i],b=pts[i+1],m=rope.segs[i];ropeA.set(a.x,a.y,a.z);ropeB.set(b.x,b.y,b.z);ropeDir.copy(ropeB).sub(ropeA);const l=ropeDir.length();m.visible=l>1e-4;if(!m.visible)continue;m.position.copy(ropeA).add(ropeB).multiplyScalar(.5);m.scale.set(1,l,1);m.quaternion.setFromUnitVectors(ropeUp,ropeDir.normalize());}
  }
  for(const [id,rope]of ropeViews)if(!ids.has(id)){rope.group.removeFromParent();if(rope.light)rope.light.base=0;ropeViews.delete(id);}
 }};
}
