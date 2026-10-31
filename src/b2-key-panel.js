import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createHalloweenSurfaces} from './halloween-surfaces.js';
export const B2_PANEL_POSITION={x:-5.35,y:4.95,z:-32.84};
const ease=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);
export function createB2KeyPanel(props){
 const surfaces=createHalloweenSurfaces({aged:true});
 const root=new THREE.Group();root.name='wall-mounted-b2-key-panel';root.position.set(B2_PANEL_POSITION.x,B2_PANEL_POSITION.y,B2_PANEL_POSITION.z);const owned=[],cube=new THREE.BoxGeometry(1,1,1);owned.push(cube);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});owned.push(m);return m;},iron=mat(0x202924,{metalness:.65,...surfaces.get('iron')}),edge=mat(0x5f6859,{metalness:.5,...surfaces.get('iron')}),gold=mat(0xb69b5d,{metalness:.72,roughness:.32}),glove=mat(0x141b18,{roughness:.68,...surfaces.get('cloth')}),suit=mat(0xa98f30,{...surfaces.get('cloth')}),black=mat(0x030604);
 function box(parent,w,h,d,x,y,z,m){const o=new THREE.Mesh(cube,m);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;}
 function sphere(parent,x,y,z,sx,sy,sz,m){const g=new THREE.SphereGeometry(1,20,16);owned.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
 box(root,.7,.84,.045,0,0,-.035,edge).name='b2-panel-backing';const plate=box(root,.58,.72,.08,0,0,0,iron);const bevel=new RoundedBoxGeometry(1,1,1,3,.055);owned.push(bevel);plate.geometry=bevel;
 for(const x of [-.035,.035])box(root,.018,.065,.01,x,-.28,.045,gold);
 const bezelGeo=new THREE.TorusGeometry(.039,.008,8,28);owned.push(bezelGeo);const bezel=new THREE.Mesh(bezelGeo,gold);bezel.position.set(0,.16,.047);root.add(bezel);
 for(const x of [-.28,.28])for(const y of [-.35,.35]){const g=new THREE.CylinderGeometry(.018,.018,.018,8);owned.push(g);const screw=new THREE.Mesh(g,edge);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.016);root.add(screw);box(root,.019,.003,.003,x,y,.028,black);}
 const icon=props.pumpkin({scale:.32,black:true});icon.position.set(0,-.13,.053);root.add(icon);box(root,.025,.095,.012,0,.15,.046,black);sphere(root,0,.19,.052,.022,.022,.004,black);
 const indicator=box(root,.13,.025,.018,0,.29,.051,mat(0x857346,{emissive:0x8b581c,emissiveIntensity:.2}));
 const key=new THREE.Group();key.name='inserted-halloween-key';key.visible=false;root.add(key);const ringGeo=new THREE.TorusGeometry(.045,.011,8,24);owned.push(ringGeo);key.add(new THREE.Mesh(ringGeo,gold));box(key,.018,.018,.15,0,0,-.085,gold);for(const z of [-.11,-.145])box(key,.048,.018,.018,.015,0,z,gold);
 const hand=new THREE.Group();hand.name='articulated-key-grip';hand.position.set(.014,-.07,.09);key.add(hand);sphere(hand,0,-.008,.004,.055,.069,.028,glove);
 const unitSphere=new THREE.SphereGeometry(1,16,12);owned.push(unitSphere);
 function joint(parent,a,b,r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),length=A.distanceTo(B),geo=new THREE.CapsuleGeometry(r,Math.max(.001,length-r*2),4,10);owned.push(geo);const mesh=new THREE.Mesh(geo,glove);mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());parent.add(mesh);return mesh;}
 for(let i=0;i<4;i++){
  const x=-.04+i*.026,y=.042-(i===0?.01:0),curl=.014+Math.sin(i/3*Math.PI)*.008;
  joint(hand,[x,.016,-.006],[x,y,-.018],.014);joint(hand,[x,y,-.018],[x,y+curl,-.049],.012);joint(hand,[x,y+curl,-.049],[x,y-.006,-.065],.0105);
  const knuckle=new THREE.Mesh(unitSphere,glove);knuckle.scale.set(.014,.014,.012);knuckle.position.set(x,y,-.017);hand.add(knuckle);
 }
 joint(hand,[.042,-.035,.002],[.067,-.006,-.02],.020);joint(hand,[.067,-.006,-.02],[.047,.025,-.047],.016);joint(hand,[.047,.025,-.047],[.027,.029,-.054],.013);
 const sleeveGeo=new THREE.CapsuleGeometry(.067,.17,6,20),cuffGeo=new THREE.CylinderGeometry(.065,.062,.055,20);owned.push(sleeveGeo,cuffGeo);const sleeve=new THREE.Mesh(sleeveGeo,suit);sleeve.position.set(.075,-.18,.12);sleeve.rotation.set(-.48,0,.38);hand.add(sleeve);const cuff=new THREE.Mesh(cuffGeo,glove);cuff.position.set(.014,-.082,.035);cuff.rotation.set(-.48,0,.25);hand.add(cuff);
 const seam=new THREE.Mesh(new THREE.TorusGeometry(.062,.003,5,24),edge);owned.push(seam.geometry);seam.position.copy(cuff.position);seam.rotation.set(Math.PI/2-.48,0,.25);hand.add(seam);
 let disposed=false;root.traverse(o=>{if(o.isMesh)o.userData.interactId='halloween:b2-panel';});
 function update(q){const active=q.visit?.stage==='unlock',t=active?q.visit.elapsed:0;key.visible=active;key.position.set(0,.15,.44-.27*ease(.25,1.2,t));key.rotation.z=-Math.PI/2*ease(1.25,1.95,t);hand.rotation.set(.08*ease(.25,1.2,t),-.1*ease(0,.3,t),-.04);indicator.material.emissive.setHex(q.seen||active&&t>1.8?0x77ab4d:0x8b581c);indicator.material.emissiveIntensity=q.key?.65:.12;}
 return {root,plate,key,update,dispose(){if(disposed)return;disposed=true;owned.forEach(r=>r.dispose());surfaces.dispose();root.removeFromParent();}};
}
