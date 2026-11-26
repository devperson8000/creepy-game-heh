import * as T from 'three';
import {createPitfallHouse} from './backrooms-house-view.js';
import {PITFALLS as P,gridX,gridZ} from './backrooms-pitfalls.js';
/** Top grid, shaft lining and lower route are generated from the same dimensions as collision. */
export function createPitfallView(world,round,{root,resources,mat,box,carpet,paperWall,label,wall,wood,paper,steel,dark}){
 const g=P.grid,room=P.room,width=room.maxX-room.minX,depth=room.maxZ-room.minZ,cx=(room.minX+room.maxX)/2,cz=(room.minZ+room.maxZ)/2;
 const lowerWall=wall.clone();lowerWall.color.multiplyScalar(.5);resources.add(lowerWall);const lining=wall.clone();lining.color.multiplyScalar(.65);resources.add(lining);const lowerFloor=mat(0x655d43);const ceilingMat=mat(0xb7b096);
 // Full ceiling, repeated acoustic panel texture and flush white fluorescent panels.
 if(world.surfaces?.ceilingTexture){const t=world.surfaces.ceilingTexture.clone();t.repeat.set(width/1.2,depth/1.2);resources.add(t);ceilingMat.map=t;}
 box(width,.12,depth,cx,P.ceilingY+.06,cz,ceilingMat);
 for(let x=room.minX;x<=room.maxX;x+=1.2)box(.014,.02,depth,x,P.ceilingY-.01,cz,steel);
 for(let z=room.minZ;z<=room.maxZ;z+=1.2)box(width,.02,.014,cx,P.ceilingY-.01,z,steel);
 const glow=mat(0xf3f3d8,{emissive:0xfff4cc,emissiveIntensity:1.5});
 for(let x=44.4;x<73;x+=4.8)for(let z=-27.6;z<-3;z+=4.8)box(1.05,.035,.55,x,P.ceilingY-.055,z,glow);
 for(const w of P.upperWalls)paperWall(w.w,P.ceilingY,w.d,w.x,P.ceilingY/2,w.z);
 for(const z of [room.minZ,room.maxZ])paperWall(width,P.ceilingY,.22,cx,P.ceilingY/2,z);
 for(const [a,b]of [[room.minZ,-16.9],[-15.1,room.maxZ]])paperWall(.22,P.ceilingY,b-a,room.maxX,P.ceilingY/2,(a+b)/2);
 paperWall(.22,P.ceilingY-2.4,1.8,room.maxX,(P.ceilingY+2.4)/2,-16);
 const upperDoor=new T.Group();upperDoor.position.set(73.9,0,-16.9);root.add(upperDoor);box(.1,2.38,1.8,0,1.19,.9,dark,upperDoor);box(.15,.1,.06,-.07,1.1,1.55,steel,upperDoor);
 const white=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:1.6});box(6,.12,1.8,77,-.06,-16,paper);for(const z of [-16.9,-15.1])box(6,2.4,.1,77,1.2,z,paper);box(6,.1,1.8,77,2.45,-16,paper);box(.15,2.4,1.8,80,1.2,-16,paper);
 for(const z of [-16.8,-15.2])box(.12,2.35,.1,74.2,1.18,z,white);box(.12,.1,1.7,74.2,2.36,-16,white);box(4,.03,.6,76.8,2.38,-16,white);
 world.registerLight?.({x:76,z:-16,y:2.1,base:1.1,color:0xffffff});world.registerLight?.({x:79,z:-16,y:2.1,base:.9,color:0xffffff});
 const spill=new T.SpotLight(0xffffff,55,9,.55,.55,1.8),spillTarget=new T.Object3D();spill.position.set(75,2.1,-16);spillTarget.position.set(70,.6,-16);spill.target=spillTarget;root.add(spill,spillTarget);
 let upperDoorAngle=.35;
 carpet(g.minX-room.minX,depth,(g.minX+room.minX)/2,cz);carpet(room.maxX-g.maxX,depth,(room.maxX+g.maxX)/2,cz);
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
 const arrowMat=mat(0x080906,{emissive:0x15140d,emissiveIntensity:.2});
 function arrow(x,z,angle){const group=new T.Group();group.position.set(x,P.floorY+.012,z);group.rotation.y=angle;root.add(group);box(.1,.012,.8,0,0,0,arrowMat,group);for(const side of [-1,1]){const arm=box(.075,.012,.4,side*.12,0,-.32,arrowMat,group);arm.rotation.y=side*.65;}}
 for(const [x,z,a]of [[62,-25,Math.PI/2],[54,-26,Math.PI/2],[46,-25,Math.PI/2],[39,-25,Math.PI/2],[34,-25,Math.PI/2],[30.5,-24.5,Math.PI/2],[26.5,-25,Math.PI/2],[34,-26.5,0],[34,-28.5,0]])arrow(x,z,a);
 label('←',.8,.55,43.5,P.floorY+1.5,-27,Math.PI);label('←',.7,.5,36.4,P.floorY+1.5,-23.12,0);
 const torch=new T.Group();torch.position.set(P.flashlight.x,P.floorY+.82,P.flashlight.z);root.add(torch);const barrel=new T.CylinderGeometry(.065,.05,.3,12);resources.add(barrel);const torchBody=new T.Mesh(barrel,steel);torchBody.rotation.x=Math.PI/2;torch.add(torchBody);box(.14,.14,.04,0,0,-.17,paper,torch);
 function vent(x,y,z,rotation=0){const group=new T.Group();group.name='pitfall-exit-vent';group.position.set(x,y,z);group.rotation.y=rotation;root.add(group);box(.18,1.1,1.4,0,0,0,dark,group);for(let yy=-.45;yy<.5;yy+=.12)box(.2,.035,1.3,-.06,yy,0,steel,group);}
 vent(P.altVent.x,-3.3,P.altVent.z);vent(P.upperVent.x,1.1,P.upperVent.z);
 const ropeItem=new T.Group();ropeItem.position.set(P.rope.x,.06,P.rope.z);root.add(ropeItem);const ropeMat=mat(0xb5a276),torus=new T.TorusGeometry(.18,.018,6,30);resources.add(torus);for(let i=0;i<5;i++){const ring=new T.Mesh(torus,ropeMat);ring.rotation.x=Math.PI/2;ring.position.y=i*.02;ropeItem.add(ring);}
 const ropeLines=new Map(),lineMat=new T.LineBasicMaterial({color:0xb6a17b});resources.add(lineMat);
 for(let x=44.4;x<73;x+=4.8)for(let z=-27.6;z<-3;z+=4.8)world.registerLight?.({x,z,y:P.ceilingY-.25,base:1});
 for(const [x,z]of [[48,-25],[67,-6],[55,-11],[62,-23],[38,-25]])world.registerLight?.({x,z,y:P.floorY+2.5,base:.25});
 let doorAngle=0;
 return {update(dt){upperDoorAngle+=((round.upperExitOpen?-Math.PI/2:.35)-upperDoorAngle)*(1-Math.exp(-dt*5));upperDoor.rotation.y=upperDoorAngle;ropeItem.visible=!round.hasRope;torch.visible=!round.hasTorch;doorAngle+=( (round.altDoorOpen?Math.PI/2:0)-doorAngle)*(1-Math.exp(-dt*5));lowDoor.rotation.y=doorAngle;
  const ids=new Set();for(const r of round.ropes??[]){ids.add(r.playerId);if(!ropeLines.has(r.playerId)){const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(r.anchor.x,.08,r.anchor.z),new T.Vector3(r.bottom.x,-.15,r.bottom.z),new T.Vector3(r.bottom.x,P.floorY+.15,r.bottom.z)]);resources.add(geometry);const line=new T.Line(geometry,lineMat);root.add(line);ropeLines.set(r.playerId,line);}
   const line=ropeLines.get(r.playerId),a=line.geometry.attributes.position;a.setXYZ(0,r.anchor.x,.08,r.anchor.z);a.setXYZ(1,r.bottom.x,-.15,r.bottom.z);a.setXYZ(2,r.bottom.x,P.floorY+.15,r.bottom.z);a.needsUpdate=true;line.geometry.computeBoundingSphere();}
  for(const [id,line]of ropeLines)if(!ids.has(id)){line.removeFromParent();resources.delete(line.geometry);line.geometry.dispose();ropeLines.delete(id);}
 }};
}
