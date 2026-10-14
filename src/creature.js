import * as THREE from 'three';

// Elliptical rings give the reference's angular silhouette without visible joints.
function shape(rings, material, sides = 8) {
 rings = [...rings].sort((a,b)=>a[0]-b[0]);
 const vertices = [], indices = [];
 for (const [y, width, depth] of rings) {
  for (let i=0; i<sides; i++) {
   const angle = i / sides * Math.PI * 2;
   vertices.push(Math.cos(angle)*width, y, Math.sin(angle)*depth);
  }
 }
 for(let r=0; r<rings.length-1; r++) for(let i=0;i<sides;i++) {
  const a=r*sides+i, b=r*sides+(i+1)%sides, c=a+sides, d=b+sides;
  indices.push(a,c,b,b,c,d);
 }
 for(let i=1;i<sides-1;i++) {
  indices.push(0,i,i+1);
  const k=(rings.length-1)*sides; indices.push(k,k+i+1,k+i);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function createCreature() {
 const root=new THREE.Group();
 const black=new THREE.MeshBasicMaterial({color:0x010102});
 const torso=new THREE.Group();torso.position.y=1.42;root.add(torso);
 torso.add(shape([[0,.29,.19],[.3,.32,.2],[1.06,.5,.23],[1.27,.36,.2],[1.42,.13,.12]],black));
 const head=new THREE.Group();head.position.y=1.42;torso.add(head);
 head.add(shape([[0,.12,.11],[.15,.16,.15],[.48,.24,.19],[.72,.28,.19],[.8,.23,.15]],black));
 // The small white crescent eyes are the only bright parts of the creature.
 for(const side of [-1,1]) {
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.036,16,12),new THREE.MeshBasicMaterial({color:0xe4e6df}));
  eye.scale.set(1,.8,.3);eye.position.set(side*.108,.46,.18);head.add(eye);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.019,12,8),new THREE.MeshBasicMaterial({color:0x000000}));
  pupil.scale.set(.6,1,.25);pupil.position.set(side*.108,.445,.191);head.add(pupil);
 }
 const arms=[];
 for(const side of [-1,1]) {
  const arm=new THREE.Group();arm.position.set(side*.44,1.08,0);torso.add(arm);
  arm.add(shape([[.02,.13,.16],[-.35,.11,.13],[-.83,.074,.09],[-1.33,.065,.068],[-1.58,.06,.06],[-1.65,.035,.04]],black));
  arm.rotation.z=side*.055;arms.push(arm);
  const leg=shape([[0,.11,.13],[.11,.105,.1],[.72,.14,.14],[1.18,.18,.18],[1.47,.2,.18]],black);
  leg.position.set(side*.2,0,0);root.add(leg);
  const foot=new THREE.Mesh(new THREE.BoxGeometry(.22,.09,.34),black);foot.position.set(side*.2,.045,.075);foot.castShadow=true;root.add(foot);
 }
 return {root,torso,head,arms};
}
export function applyIdle(creature, pose) {
 creature.torso.rotation.z=pose.sway;
 creature.head.rotation.y=pose.yaw;
 creature.head.rotation.x=pose.pitch;
 creature.arms[0].rotation.z=-.055+pose.arm;
 creature.arms[1].rotation.z=.055+pose.arm;
}
