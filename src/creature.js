import * as THREE from 'three';

// Smooth elliptical profiles connect the silhouette without squared limb ends.
function shape(rings, material, sides = 32) {
 const sorted=[...rings].sort((a,b)=>a[0]-b[0]);
 const curve=new THREE.CatmullRomCurve3(sorted.map(([y,w,d])=>new THREE.Vector3(w,y,d)),false,'centripetal');
 const samples=curve.getPoints((sorted.length-1)*8);
 const vertices=[],indices=[];
 for(const p of samples) for(let i=0;i<sides;i++) {
  const angle=i/sides*Math.PI*2;
  vertices.push(Math.cos(angle)*Math.max(0,p.x),p.y,Math.sin(angle)*Math.max(0,p.z));
 }
 for(let r=0;r<samples.length-1;r++) for(let i=0;i<sides;i++) {
  const a=r*sides+i,b=r*sides+(i+1)%sides,c=a+sides,d=b+sides;
  indices.push(a,c,b,b,c,d);
 }
 for(let i=1;i<sides-1;i++) {
  indices.push(0,i,i+1);const k=(samples.length-1)*sides;indices.push(k,k+i+1,k+i);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;return mesh;
}
function horn(side,material) {
 const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(side*.08,.58,0),new THREE.Vector3(side*.42,.66,0),
  new THREE.Vector3(side*.78,.8,-.025),new THREE.Vector3(side*1.14,.92,-.05),
 ]);
 const geometry=new THREE.TubeGeometry(curve,32,.2,24,false);
 const positions=geometry.attributes.position;
 for(let ring=0;ring<=32;ring++) {
  const t=ring/32,center=curve.getPointAt(t),scale=Math.pow(1-t,.85);
  for(let n=0;n<=24;n++) {
   const i=ring*25+n;
   const p=new THREE.Vector3().fromBufferAttribute(positions,i).sub(center).multiplyScalar(scale).add(center);
   positions.setXYZ(i,p.x,p.y,p.z);
  }
 }
 geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;return mesh;
}
export function createCreature() {
 const root=new THREE.Group(),black=new THREE.MeshBasicMaterial({color:0x010102});
 black.userData.creatureBody=true;
 const torso=new THREE.Group();torso.position.y=1.42;root.add(torso);
 torso.add(shape([[-.24,0,0],[-.18,.14,.09],[-.07,.29,.15],[.28,.32,.18],[.85,.44,.21],[1.06,.46,.21],[1.25,.35,.18],[1.4,.13,.12]],black));
 const head=new THREE.Group();head.position.y=1.39;torso.add(head);
 head.add(shape([[0,.115,.105],[.16,.16,.13],[.42,.235,.17],[.62,.27,.175],[.73,.22,.15],[.78,.04,.03]],black));
 head.add(horn(-1,black),horn(1,black));
 for(const side of [-1,1]) {
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.038,20,16),new THREE.MeshBasicMaterial({color:0xe4e6df}));
  eye.scale.set(1,.8,.3);eye.position.set(side*.108,.46,.174);head.add(eye);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.022,16,12),new THREE.MeshBasicMaterial({color:0}));
  pupil.scale.set(.65,1,.3);pupil.position.set(side*.108,.445,.187);head.add(pupil);
 }
 const arms=[],elbows=[],legs=[],knees=[],ankles=[];
 for(const side of [-1,1]) {
  const arm=new THREE.Group();arm.position.set(side*.39,1.04,0);torso.add(arm);
  arm.add(shape([[-.94,.069,.075],[-.72,.08,.09],[-.32,.10,.12],[.03,.11,.13],[.13,.055,.065],[.16,0,0]],black));
  const elbow=new THREE.Group();elbow.position.y=-.9;arm.add(elbow);
  elbow.add(shape([[-1.03,0,0],[-.99,.047,.046],[-.86,.06,.06],[-.52,.063,.068],[-.1,.068,.073],[.035,.063,.068]],black));
  arm.rotation.z=side*.06;arms.push(arm);elbows.push(elbow);
  const leg=new THREE.Group();leg.position.set(side*.18,1.43,0);root.add(leg);
  leg.add(shape([[-.77,.09,.105],[-.6,.11,.12],[-.24,.135,.14],[.015,.14,.145],[.13,.09,.10],[.17,0,0]],black));
  const knee=new THREE.Group();knee.position.y=-.72;leg.add(knee);
  knee.add(shape([[-.72,.07,.075],[-.62,.076,.08],[-.27,.095,.11],[-.06,.095,.11],[.04,.08,.09]],black));
  const ankle=new THREE.Group();ankle.position.y=-.7;knee.add(ankle);
  const foot=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),black);foot.scale.set(.09,.07,.17);foot.position.set(0,.055,.055);foot.castShadow=true;ankle.add(foot);
  legs.push(leg);knees.push(knee);ankles.push(ankle);
 }
 return {root,torso,head,arms,elbows,legs,knees,ankles};
}
export function applyIdle(c,pose) {
 c.root.position.y=0;c.torso.rotation.set(0,0,pose.sway);
 c.head.rotation.set(pose.pitch,pose.yaw,0);
 c.arms.forEach((arm,i)=>{arm.rotation.set(0,0,(i===0?-.06:.06)+pose.arm);c.elbows[i].rotation.x=0;});
 c.legs.forEach((leg,i)=>{leg.rotation.set(0,0,0);c.knees[i].rotation.x=0;c.ankles[i].rotation.x=0;});
}
export function applyRunning(c,time,weight=1) {
 const phase=time*Math.PI*2*1.65;
 c.root.position.y=Math.sin(phase*2)*.025*weight;
 c.torso.rotation.x=.13*weight;c.torso.rotation.y=Math.sin(phase)*.065*weight;c.torso.rotation.z=THREE.MathUtils.lerp(c.torso.rotation.z,Math.cos(phase)*.035,weight);
 c.head.rotation.x=THREE.MathUtils.lerp(c.head.rotation.x,-.1,weight);c.head.rotation.y=THREE.MathUtils.lerp(c.head.rotation.y,-c.torso.rotation.y*.5,weight);
 for(let i=0;i<2;i++) {
  const p=phase+i*Math.PI,z=.48*Math.cos(p),lift=.34*Math.max(0,Math.sin(p));
  const drop=1.43+c.root.position.y-.055-lift;
  const distance=Math.min(1.419,Math.hypot(z,drop));
  const bend=Math.acos(THREE.MathUtils.clamp((.72*.72+.7*.7-distance*distance)/(2*.72*.7),-1,1));
  const offset=Math.acos(THREE.MathUtils.clamp((.72*.72+distance*distance-.7*.7)/(2*.72*distance),-1,1));
  const hip=Math.atan2(-z,drop)-offset,knee=Math.PI-bend;
  c.legs[i].rotation.x=hip*weight;c.knees[i].rotation.x=knee*weight;
  c.ankles[i].rotation.x=-(hip+knee)*weight;
  c.arms[i].rotation.x=Math.cos(p)*.62*weight;
  c.arms[i].rotation.z=THREE.MathUtils.lerp(c.arms[i].rotation.z,(i===0?-.085:.085),weight);
  c.elbows[i].rotation.x=(-.45-.2*Math.max(0,-Math.cos(p)))*weight;
 }
}
