import * as THREE from 'three';
import {createImportedKeeper} from './imported-keeper.js';
/** Authored fallback remains available if the source-backed keeper cannot load. */
export function createHoodedStranger({asset}={}){
 if(asset)return createImportedKeeper(asset);
 const root=new THREE.Group();root.name='hooded-archive-keeper';root.position.set(.55,.06,-3);const geometry=[],materials=[];
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:1,...extra});materials.push(m);return m;},cloth=mat(0x101112),edge=mat(0x202224),glove=mat(0x090c0d),voidMat=new THREE.MeshBasicMaterial({color:0});materials.push(voidMat);
 function mesh(g,m,parent=root,name=''){geometry.push(g);const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;parent.add(o);return o;}
 const points=[new THREE.Vector2(.54,0),new THREE.Vector2(.5,.3),new THREE.Vector2(.43,.8),new THREE.Vector2(.4,1.24),new THREE.Vector2(.25,1.5)],robeGeometry=new THREE.LatheGeometry(new THREE.SplineCurve(points).getPoints(42),96),vertices=robeGeometry.attributes.position;
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),angle=Math.atan2(x,z),fold=1+.075*Math.cos(angle*14+.08*Math.sin(y*4))*Math.max(.12,1-y/1.6);vertices.setXYZ(i,x*fold,y,z*fold);}robeGeometry.computeVertexNormals();const robe=mesh(robeGeometry,cloth,root,'folded-black-robe');
 const head=new THREE.Group();head.position.y=1.68;root.add(head);
 const hood=mesh(new THREE.SphereGeometry(.37,64,40,2.2,5.1,0,Math.PI*.9),cloth,head,'hood-shell');hood.scale.set(1,1.2,1.05);
 const cavity=mesh(new THREE.SphereGeometry(.285,48,32),voidMat,head,'hood-opening');cavity.position.z=.035;cavity.scale.set(.88,1.12,.7);
 const rimPoints=[[-.22,-.25,.24],[-.27,0,.25],[-.2,.25,.22],[0,.42,.13],[.2,.25,.22],[.27,0,.25],[.22,-.25,.24]].map(p=>new THREE.Vector3(...p));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints),40,.018,8,false),edge,head,'hood-seam');
 const hem=mesh(new THREE.TorusGeometry(.515,.014,6,96),edge,root,'robe-hem');hem.rotation.x=Math.PI/2;hem.position.y=.035;
 const limbs=[-1,1].map(side=>{
  const upper=mesh(new THREE.CapsuleGeometry(.09,.31,8,20),cloth,root,'sleeve-upper'),fore=mesh(new THREE.CapsuleGeometry(.075,.29,8,20),cloth,root,'sleeve-forearm');
  const hand=new THREE.Group();root.add(hand);const palm=mesh(new THREE.SphereGeometry(1,20,16),glove,hand,'gloved-palm');palm.scale.set(.047,.035,.065);
  let fingerTip;
  for(let i=0;i<4;i++){const finger=mesh(new THREE.CapsuleGeometry(.011,.05,4,10),glove,hand,'gloved-finger');finger.rotation.x=Math.PI/2;finger.position.set((i-1.5)*.021,.005,.065);if(i===1){fingerTip=new THREE.Object3D();fingerTip.position.set((i-1.5)*.021,.005,.102);hand.add(fingerTip);}}
  const thumb=mesh(new THREE.CapsuleGeometry(.014,.034,4,10),glove,hand);thumb.rotation.z=.65;thumb.position.set(side*.05,0,.018);
  return {side,upper,fore,hand,fingerTip,shoulder:new THREE.Vector3(side*.32,1.28,.03)};
 });
 function segment(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());}
 function sample(time,{reach=0,press=0,switchAt=[.4,1.11,-2.13],headYaw=0,reducedMotion=false}={}){
  head.rotation.y=THREE.MathUtils.clamp(headYaw,-.9,.9);head.rotation.x=-.025;robe.rotation.y=reducedMotion?0:Math.sin(time*.48)*.006;root.updateMatrixWorld(true);
  for(const limb of limbs){const {side,upper,fore,hand,shoulder}=limb,goal=new THREE.Vector3(side*.38,.72,.32);
   if(side===-1){const local=root.worldToLocal(new THREE.Vector3(...switchAt));local.z-=.102;local.x+=.0105;local.y-=.005+press*.008;goal.lerp(local,THREE.MathUtils.clamp(reach,0,1));}
   const axis=goal.clone().sub(shoulder),distance=THREE.MathUtils.clamp(axis.length(),.03,.889);axis.normalize();goal.copy(shoulder).addScaledVector(axis,distance);
   const pole=new THREE.Vector3(side*.6,-.2,-.1).addScaledVector(axis,-new THREE.Vector3(side*.6,-.2,-.1).dot(axis)).normalize(),along=(.45**2-.44**2+distance**2)/(2*distance),elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,.45**2-along**2)));
   segment(upper,shoulder,elbow);segment(fore,elbow,goal);hand.position.copy(goal);hand.rotation.set(0,0,side*.04*(1-reach));
  }root.updateMatrixWorld(true);
 }
 let disposed=false;sample(0);return {root,head,fingerTip:limbs[0].fingerTip,sample,dispose(){if(disposed)return;disposed=true;geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
