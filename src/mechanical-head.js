import * as THREE from 'three';
import {createCreature,applyIdle,applyRunning} from './creature.js';

/** A repaired Monochrome silhouette: original wide horns, visible industrial reconstruction. */
export function createMechanicalHead(){
 const root=new THREE.Group();root.name='monochrome-mechanical-head';
 const geometries=new Set(),materials=new Set(),textures=new Set();let disposed=false;
 const mat=(color,metalness,roughness)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness});materials.add(m);return m;};
 const steel=mat(0x555e5e,.82,.53),dark=mat(0x182326,.72,.6),edge=mat(0x9a9e94,.84,.4),rust=mat(0x503c2b,.5,.92),black=mat(0x07090a,.35,.72);
 const lens=mat(0xa1bfb0,.45,.35);lens.emissive.setHex(0x7aab95);lens.emissiveIntensity=.45;
 // Deterministic brushed wear. This is a small runtime texture, shared by this head's plates.
 const grain=new Uint8Array(96*96*4);let seed=3107;
 for(let i=0;i<96*96;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=165+(seed%70)-((i%96)%19===0?25:0);grain.set([v,v,v,255],i*4);}
 const wear=new THREE.DataTexture(grain,96,96);wear.colorSpace=THREE.SRGBColorSpace;wear.wrapS=wear.wrapT=THREE.RepeatWrapping;wear.repeat.set(12,12);wear.minFilter=wear.magFilter=THREE.LinearFilter;wear.needsUpdate=true;textures.add(wear);steel.map=wear;edge.map=wear;
 function mesh(geometry,material,name,parent=root){geometries.add(geometry);const o=new THREE.Mesh(geometry,material);o.name=name;o.castShadow=true;o.userData.mechanicalHead=true;parent.add(o);return o;}
 function box(w,h,d,x,y,z,m,name,parent=root){const o=mesh(new THREE.BoxGeometry(w,h,d),m,name,parent);o.position.set(x,y,z);return o;}
 function tube(points,r,m,name,parent=root){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,20,r,8,false),m,name,parent);}
 const collar=mesh(new THREE.CylinderGeometry(.155,.125,.16,16),dark,'severed-neck-collar');collar.position.y=-.035;
 const spine=mesh(new THREE.CylinderGeometry(.055,.07,.29,12),edge,'exposed-neck-piston');spine.position.y=.13;
 for(let i=0;i<4;i++){const ring=mesh(new THREE.TorusGeometry(.09,.012,6,18),rust,'neck-clamp-'+i);ring.rotation.x=Math.PI/2;ring.position.y=.055+i*.037;}
 const cables=new THREE.Group();cables.name='neck-cables';root.add(cables);
 for(let i=0;i<5;i++)tube([[Math.cos(i*1.4)*.12,-.11,Math.sin(i*1.4)*.09],[Math.cos(i)*.17,.07,-.1],[Math.cos(i*1.4)*.115,.26,-.1]],.009,i%2?black:rust,'neck-cable-'+i,cables);
 // Beveled, tapered shell rather than a box. Separate cheek plates expose the jaw mechanism.
 const outline=new THREE.Shape();outline.moveTo(-.14,.19);outline.lineTo(-.245,.5);outline.lineTo(-.25,.7);outline.lineTo(-.16,.81);outline.lineTo(.16,.81);outline.lineTo(.25,.7);outline.lineTo(.245,.5);outline.lineTo(.14,.19);outline.closePath();
 const shell=mesh(new THREE.ExtrudeGeometry(outline,{depth:.22,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025}),dark,'mechanical-skull-shell');shell.position.z=-.13;
 const face=new THREE.Shape();face.moveTo(-.11,.29);face.lineTo(-.205,.53);face.lineTo(-.20,.69);face.lineTo(-.12,.765);face.lineTo(.12,.765);face.lineTo(.20,.69);face.lineTo(.205,.53);face.lineTo(.11,.29);face.closePath();
 const faceplate=mesh(new THREE.ExtrudeGeometry(face,{depth:.035,bevelEnabled:true,bevelSegments:2,bevelThickness:.008,bevelSize:.012}),steel,'mechanical-faceplate');faceplate.position.z=.12;
 box(.012,.39,.012,.025,.56,.17,black,'faceplate-weld');
 for(const side of [-1,1]){
  const housing=box(.108,.047,.022,side*.105,.576,.179,black,'eye-housing');housing.rotation.z=side*.16;
  const eye=box(.062,.009,.006,side*.105,.576,.193,lens,'mechanical-eye');eye.rotation.z=side*.16;
  const brow=box(.13,.025,.045,side*.105,.612,.183,steel,'armored-eye-brow');brow.rotation.z=side*.17;
  const hinge=mesh(new THREE.CylinderGeometry(.063,.063,.075,12),edge,'jaw-hinge');hinge.rotation.z=Math.PI/2;hinge.position.set(side*.173,.31,.025);
  const rod=mesh(new THREE.CylinderGeometry(.018,.018,.29,10),edge,'cheek-piston');rod.position.set(side*.185,.415,.075);rod.rotation.z=side*.22;
  // Each horn follows Monochrome's original sweep, now segmented metal around a spine.
  const points=[[side*.16,.74,-.02],[side*.45,.77,-.04],[side*.8,.88,-.065],[side*1.13,1.02,-.08]];
  const horn=tube(points,.07,dark,side<0?'mechanical-horn-left':'mechanical-horn-right');
  const p=horn.geometry.attributes.position;const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  for(let ring=0;ring<=20;ring++){const center=curve.getPointAt(ring/20),scale=Math.max(.02,1-ring/20);for(let j=0;j<=8;j++){const i=ring*9+j,v=new THREE.Vector3().fromBufferAttribute(p,i).sub(center).multiplyScalar(scale).add(center);p.setXYZ(i,v.x,v.y,v.z);}}horn.geometry.computeVertexNormals();
  for(let i=0;i<5;i++){const t=.08+i*.155,point=curve.getPointAt(t),band=mesh(new THREE.TorusGeometry(.065*(1-t),.012,5,12),i%2?steel:rust,'horn-clamp');band.position.copy(point);band.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangentAt(t));}
 }
 const jaw=new THREE.Group();jaw.name='mechanical-jaw';jaw.position.set(0,.32,.015);root.add(jaw);
 box(.23,.065,.22,0,-.105,.045,dark,'lower-jaw-frame',jaw);
 for(const side of [-1,1]){const rail=box(.035,.15,.035,side*.14,-.035,.015,steel,'jaw-side-rail',jaw);rail.rotation.z=-side*.2;}
 box(.2,.105,.024,0,.332,.177,black,'mouth-interior');
 for(let i=0;i<7;i++){
  const x=(i-3)*.028,top=mesh(new THREE.ConeGeometry(.01,.041,4),edge,'upper-metal-tooth');top.position.set(x,.369,.198);top.rotation.x=Math.PI;
  const tooth=mesh(new THREE.ConeGeometry(.012,.05,4),edge,'lower-metal-tooth',jaw);tooth.position.set(x,-.059,.14);
 }
 for(const [x,y] of [[-.17,.69],[.17,.69],[-.17,.47],[.17,.47],[-.09,.33],[.09,.33]]){const bolt=mesh(new THREE.CylinderGeometry(.016,.016,.018,6),edge,'faceplate-bolt');bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.174);}
 for(let i=0;i<6;i++){const scratch=box(.002,.028+i*.006,.003,-.15+i*.055,.66-(i%3)*.082,.179,i%2?rust:edge,'steel-scratch');scratch.rotation.z=.6;}
 // Layered cheek armor and vent slots expose a dark, deep mechanism instead of a flat mask.
 for(const side of [-1,1]){
  const cheek=box(.078,.19,.052,side*.196,.41,.153,steel,'split-cheek-armor');cheek.rotation.z=side*.22;
  for(let i=0;i<4;i++)box(.047,.008,.005,side*.196,.386+i*.026,.184,black,'cheek-vent');
  const seam=box(.009,.29,.008,side*.222,.603,.16,rust,'oxidized-plate-seam');seam.rotation.z=-side*.13;
  const motor=mesh(new THREE.CylinderGeometry(.049,.049,.09,20),dark,'jaw-servo');motor.rotation.z=Math.PI/2;motor.position.set(side*.225,.31,.03);
  for(let i=0;i<3;i++){const lug=box(.028,.016,.025,side*.215,.72+i*.022,.17,edge,'repair-staple');lug.rotation.z=side*.22;}
 }
 const actuators=[-1,1].map(side=>{
  const rod=mesh(new THREE.CylinderGeometry(.012,.012,1,12),edge,side<0?'jaw-actuator-left':'jaw-actuator-right');
  const barrel=mesh(new THREE.CylinderGeometry(.023,.023,.14,14),dark,'jaw-actuator-barrel');
  return {rod,barrel,upper:new THREE.Vector3(side*.19,.49,.08),lower:new THREE.Vector3(side*.14,-.08,.13)};
 });
 function sample(time,{jaw:opening=0}={}){
  jaw.rotation.x=Math.max(0,Math.min(1,opening))*.65;
  lens.emissiveIntensity=.43+Math.sin(time*2.1)*.025;
  for(const {rod,barrel,upper,lower}of actuators){
   const end=lower.clone().applyEuler(jaw.rotation).add(jaw.position),axis=end.clone().sub(upper);
   rod.position.copy(upper).add(end).multiplyScalar(.5);rod.scale.y=axis.length();rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
   barrel.position.copy(upper).addScaledVector(axis,.065);barrel.quaternion.copy(rod.quaternion);
  }
 }
 sample(0);
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 return {root,jaw,sample,dispose};
}
export function createRebuiltMonochrome(){
 const body=createCreature(),mechanical=attachMechanicalHead(body),root=body.root;let disposed=false;
 const skin=new THREE.MeshStandardMaterial({color:0x060809,roughness:.92}),old=new Set();
 root.traverse(o=>{if(o.isMesh&&o.material.userData.creatureBody){old.add(o.material);o.material=skin;}});old.forEach(m=>m.dispose());
 function sample({time=0,travel=0,walk=0,position=[0,0,0],yaw=0,jaw=0}={}){
  applyIdle(body,{sway:0,pitch:0,yaw:0,arm:0});body.torso.rotation.x=0;body.torso.rotation.y=0;
  applyRunning(body,travel*.67,Math.max(0,Math.min(1,walk))*.65);
  root.position.x=position[0];root.position.y+=position[1];root.position.z=position[2];root.rotation.y=yaw;
  body.head.rotation.y=Math.sin(time*.6)*.025;mechanical.sample(time,{jaw});root.updateMatrixWorld(true);
 }
 function dispose(){if(disposed)return;disposed=true;mechanical.dispose();const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.removeFromParent();}
 return {root,body,mechanical,sample,dispose};
}

/** Add the same owned replacement to a posed gameplay body without changing its gait. */
export function attachMechanicalHead(body){
 if(body.mechanical)return body.mechanical;
 const original=body.head.children.map(node=>({node,visible:node.visible})),machine=createMechanicalHead(),release=machine.dispose;
 original.forEach(({node})=>node.visible=false);body.head.add(machine.root);body.mechanical=machine;
 let disposed=false;machine.dispose=()=>{if(disposed)return;disposed=true;release();original.forEach(({node,visible})=>node.visible=visible);delete body.mechanical;};
 return machine;
}
