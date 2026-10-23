import * as THREE from 'three';
export const B2_PANEL_POSITION={x:-5.35,y:4.95,z:-32.84};
const ease=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);
export function createB2KeyPanel(props){
 const root=new THREE.Group();root.name='wall-mounted-b2-key-panel';root.position.set(B2_PANEL_POSITION.x,B2_PANEL_POSITION.y,B2_PANEL_POSITION.z);const owned=[],cube=new THREE.BoxGeometry(1,1,1);owned.push(cube);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});owned.push(m);return m;},iron=mat(0x202924,{metalness:.65}),edge=mat(0x5f6859,{metalness:.5}),gold=mat(0xb69b5d,{metalness:.72,roughness:.4}),glove=mat(0x141b18),suit=mat(0xc1a332),black=mat(0x030604);
 function box(parent,w,h,d,x,y,z,m){const o=new THREE.Mesh(cube,m);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;}
 function sphere(parent,x,y,z,sx,sy,sz,m){const g=new THREE.SphereGeometry(1,20,16);owned.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
 box(root,.7,.84,.045,0,0,-.035,edge).name='b2-panel-backing';const plate=box(root,.58,.72,.08,0,0,0,iron);
 for(const x of [-.28,.28])for(const y of [-.35,.35]){const g=new THREE.CylinderGeometry(.018,.018,.018,8);owned.push(g);const screw=new THREE.Mesh(g,edge);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.016);root.add(screw);box(root,.019,.003,.003,x,y,.028,black);}
 const icon=props.pumpkin({scale:.32,black:true});icon.position.set(0,-.13,.053);root.add(icon);box(root,.025,.095,.012,0,.15,.046,black);sphere(root,0,.19,.052,.022,.022,.004,black);
 const indicator=box(root,.13,.025,.018,0,.29,.051,mat(0x857346,{emissive:0x8b581c,emissiveIntensity:.2}));
 const key=new THREE.Group();key.name='inserted-halloween-key';key.visible=false;root.add(key);const ringGeo=new THREE.TorusGeometry(.045,.011,8,24);owned.push(ringGeo);key.add(new THREE.Mesh(ringGeo,gold));box(key,.018,.018,.15,0,0,-.085,gold);for(const z of [-.11,-.145])box(key,.048,.018,.018,.015,0,z,gold);
 const hand=new THREE.Group();hand.position.set(.02,-.07,.09);key.add(hand);sphere(hand,0,0,0,.061,.072,.04,glove);
 for(let i=0;i<4;i++)sphere(hand,-.044+i*.027,.042,-.04,.014,.044,.016,glove);sphere(hand,.055,-.005,-.04,.018,.042,.02,glove);
 const sleeveGeo=new THREE.CapsuleGeometry(.073,.19,6,20),cuffGeo=new THREE.CylinderGeometry(.075,.075,.055,20);owned.push(sleeveGeo,cuffGeo);const sleeve=new THREE.Mesh(sleeveGeo,suit);sleeve.position.set(.03,-.19,.11);sleeve.rotation.x=-.45;hand.add(sleeve);const cuff=new THREE.Mesh(cuffGeo,glove);cuff.position.set(0,-.08,.035);cuff.rotation.x=-.45;hand.add(cuff);
 let disposed=false;root.traverse(o=>{if(o.isMesh)o.userData.interactId='halloween:b2-panel';});
 function update(q){const active=q.visit?.stage==='unlock',t=active?q.visit.elapsed:0;key.visible=active;key.position.set(0,.15,.44-.27*ease(.25,1.2,t));key.rotation.z=-Math.PI/2*ease(1.25,1.95,t);indicator.material.emissive.setHex(q.seen||active&&t>1.8?0x77ab4d:0x8b581c);indicator.material.emissiveIntensity=q.key?.65:.12;}
 return {root,plate,key,update,dispose(){if(disposed)return;disposed=true;owned.forEach(r=>r.dispose());root.removeFromParent();}};
}
