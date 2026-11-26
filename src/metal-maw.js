import * as THREE from 'three';

/**
 * Monochrome's jumpscare is machinery, not flesh. As his jaw drops the faceplate splits like an
 * industrial iris, a serrated saw-maw spins up behind it, white-hot, while steel lances punch out
 * from the cheek servos and sparks spray. Everything is plain geometry and colour (no textures),
 * so it works in headless tests and costs one small draw group.
 *
 * Units match mechanical-head.js: the face is about 0.45 wide, its plate at z ~ .14.
 */
const MAW_CENTRE=[0,.5,.2];
const BLADES=8,TEETH=18,LANCES=4,SPARKS=72;
const ease=(x,a,b)=>THREE.MathUtils.smoothstep(x,a,b);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

export function createMetalMaw(){
 const root=new THREE.Group();root.name='metal-maw';root.position.set(...MAW_CENTRE);
 const geometries=new Set(),materials=new Set();let disposed=false;
 const std=(color,metalness,roughness,emissive=0x000000)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive});materials.add(m);return m;};
 const basic=(color,extra={})=>{const m=new THREE.MeshBasicMaterial({color,toneMapped:false,...extra});materials.add(m);return m;};
 const steel=std(0x6a7373,.88,.38),edge=std(0xb6bab0,.9,.28),dark=std(0x14191b,.7,.55);
 const mesh=(g,m,name,parent=root)=>{geometries.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=false;o.userData.mechanicalHead=true;o.userData.metalMaw=true;parent.add(o);return o;};

 // 1. Furnace core: a white-hot disc with an additive halo behind the saw.
 const coreMaterial=basic(0xff7a2a),core=mesh(new THREE.CircleGeometry(.105,24),coreMaterial,'maw-furnace-core');core.position.z=-.02;
 const haloMaterial=basic(0xff5a14,{transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),halo=mesh(new THREE.CircleGeometry(.26,24),haloMaterial,'maw-heat-halo');halo.position.z=-.012;
 const heat=new THREE.PointLight(0xff6a2a,0,2.4);heat.position.set(0,0,.12);root.add(heat);

 // 2. Saw-maw: a serrated disc that spins up as the iris opens.
 const saw=new THREE.Group();saw.name='maw-saw';saw.position.z=.0;root.add(saw);
 const disc=mesh(new THREE.CylinderGeometry(.083,.083,.016,32),dark,'maw-saw-disc',saw);disc.rotation.x=Math.PI/2;
 const rim=mesh(new THREE.TorusGeometry(.083,.008,6,32),edge,'maw-saw-rim',saw);
 for(let i=0;i<TEETH;i++){
  const a=i/TEETH*Math.PI*2,tooth=mesh(new THREE.ConeGeometry(.0105,.04,4),edge,'maw-saw-tooth',saw);
  tooth.position.set(Math.cos(a)*.096,Math.sin(a)*.096,0);tooth.rotation.z=a-Math.PI/2;
 }
 for(let i=0;i<5;i++){const spoke=mesh(new THREE.BoxGeometry(.075,.007,.012),steel,'maw-saw-spoke',saw);spoke.rotation.z=i/5*Math.PI;spoke.position.z=.01;}

 // 3. Iris plates: eight wedges that meet at the centre when closed and slide out as the face splits.
 const plates=[];
 for(let i=0;i<BLADES;i++){
  const a=i/BLADES*Math.PI*2,half=Math.PI/BLADES*1.04,shape=new THREE.Shape();
  shape.moveTo(0,0);shape.lineTo(Math.cos(-half)*.16,Math.sin(-half)*.16);shape.lineTo(Math.cos(half)*.16,Math.sin(half)*.16);shape.closePath();
  const pivot=new THREE.Group();pivot.rotation.z=a;root.add(pivot);
  const plate=mesh(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),i%2?steel:dark,'maw-iris-plate',pivot);plate.position.z=.052;
  const bolt=mesh(new THREE.CylinderGeometry(.007,.007,.008,6),edge,'maw-iris-bolt',pivot);bolt.rotation.x=Math.PI/2;bolt.position.set(.12,0,.07);
  plates.push({pivot,plate});
 }

 // 4. Lances: telescoping steel spears punched out of the cheek servos toward the viewer.
 const lances=[];
 const mounts=[[-.215,-.17,-.02],[.215,-.17,-.02],[-.23,.12,-.03],[.23,.12,-.03]];
 for(let i=0;i<LANCES;i++){
  const [x,y,z]=mounts[i],group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=Math.sign(x)*.32;group.rotation.x=-Math.sign(y)*.06;root.add(group);
  const sleeve=mesh(new THREE.CylinderGeometry(.026,.026,.12,12),dark,'lance-sleeve',group);sleeve.rotation.x=Math.PI/2;sleeve.position.z=.04;
  const shaft=mesh(new THREE.CylinderGeometry(.013,.013,1,10),edge,'lance-shaft',group);shaft.rotation.x=Math.PI/2;
  const tip=mesh(new THREE.ConeGeometry(.022,.1,10),edge,'lance-tip',group);tip.rotation.x=Math.PI/2;
  lances.push({group,shaft,tip,delay:i*.035});
 }

 // 5. Sparks: additive points thrown from the maw, deterministic so every play looks the same.
 const positions=new Float32Array(SPARKS*3),sparkGeometry=new THREE.BufferGeometry();sparkGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometries.add(sparkGeometry);
 const sparkMaterial=new THREE.PointsMaterial({color:0xffb04a,size:.012,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true,toneMapped:false});materials.add(sparkMaterial);
 const sparks=new THREE.Points(sparkGeometry,sparkMaterial);sparks.frustumCulled=false;sparks.userData.mechanicalHead=true;root.add(sparks);
 const seeds=Array.from({length:SPARKS},(_,i)=>({a:hash(i)*Math.PI*2,speed:.35+hash(i+9)*.9,lift:(hash(i+21)-.35)*.55,born:hash(i+40)*.5,life:.28+hash(i+60)*.34}));

 /** open 0..1 splits the face; lunge 0..1 drives the lances; darkness 1..0 fades the glow at the end. */
 function sample(time,{open=0,lunge=0,darkness=1}={}){
  const o=THREE.MathUtils.clamp(open,0,1),l=THREE.MathUtils.clamp(lunge,0,1),d=THREE.MathUtils.clamp(darkness,0,1);
  const flicker=.86+.14*Math.sin(time*53)+.06*Math.sin(time*131);
  // iris: wedges slide outward and tilt away as the face splits
  for(const {pivot,plate} of plates){plate.position.x=o*.13;plate.rotation.y=-o*.55;plate.position.z=.052+o*.012;}
  root.visible=o>.001||l>.001;
  // saw spins up fast, with a slight wobble like a blade at full speed
  saw.rotation.z=time*(8+o*46);saw.rotation.x=Math.sin(time*37)*.012*o;saw.scale.setScalar(.35+.65*ease(o,.05,.9));
  coreMaterial.color.setRGB(1,.35+.45*flicker*o,.1+.35*o).multiplyScalar(Math.max(.05,o)*d);
  haloMaterial.opacity=o*.85*flicker*d;halo.scale.setScalar(.7+.7*o+.05*Math.sin(time*29));
  heat.intensity=o*7.5*flicker*d;
  // lances: stagger out, overshoot a hair, then settle with a servo shudder
  for(const {group,shaft,tip,delay} of lances){
   const t=ease(l,delay,delay+.55),len=.04+t*.5*(1+.06*Math.sin(t*Math.PI)),shudder=Math.sin(time*61+delay*90)*.004*t;
   shaft.scale.y=len;shaft.position.z=.04+len/2;tip.position.z=.04+len+.05;group.position.x+=0;group.rotation.z=shudder*8;
  }
  // sparks burst as the maw opens, then keep a steady spray
  sparkMaterial.opacity=Math.min(1,o*1.6)*d;
  for(let i=0;i<SPARKS;i++){
   const s=seeds[i],cycle=((time-.04-s.born)%s.life+s.life)%s.life,u=cycle/s.life,live=time>.04+s.born&&o>.05;
   const r=live?s.speed*u:0,fall=live?-.9*u*u*.4:0;
   positions[i*3]=Math.cos(s.a)*r*.5;positions[i*3+1]=Math.sin(s.a)*r*.35+s.lift*u+fall;positions[i*3+2]=live?.05+r*1.1:0;
  }
  sparkGeometry.attributes.position.needsUpdate=true;
 }
 sample(0);
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 return {root,sample,dispose,get parts(){return {plates:plates.length,teeth:TEETH,lances:lances.length,sparks:SPARKS};}};
}
