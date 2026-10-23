import {reducedMotion} from './preferences.js';
import * as THREE from 'three';

export function createTorch(scene,camera,{halloween=false}={}){
 scene.add(camera);
 const reactive=new Map();
 // Signs, keys and the creature need to reflect the beam instead of being
 // permanently unlit surfaces. Ceiling tubes retain their own power control.
 scene.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.ceilingLight||mesh.userData.flame||mesh.material.transparent)return;
  if(!mesh.userData.halloweenDetail)mesh.castShadow=true;
  if(!mesh.material.isMeshBasicMaterial)return;
  const original=mesh.material;
  if(!reactive.has(original)){
   const properties={color:original.color,map:original.map,side:original.side,roughness:.78,metalness:.03,emissive:original.color,emissiveMap:original.map,emissiveIntensity:.35};
   // Keep the creature black and matte: round specular spots previously made
   // its torso and joints appear swollen under the torch.
   reactive.set(original,original.userData.creatureBody?new THREE.MeshPhysicalMaterial({...properties,roughness:1,metalness:0,specularIntensity:0}):new THREE.MeshStandardMaterial(properties));
  }
  mesh.material=reactive.get(original);
 });
 const basePower=halloween?85:140;let power=basePower;
 const beam=new THREE.SpotLight(0xe4e9dc,basePower,24,.58,1,1.5);
 beam.position.set(0,-.035,-.025);beam.castShadow=true;
 beam.shadow.mapSize.set(512,512);beam.shadow.camera.near=.05;beam.shadow.camera.far=24;beam.shadow.bias=-.00015;beam.shadow.normalBias=.015;
 const aim=new THREE.Object3D();aim.position.set(0,0,-20);camera.add(beam,aim);beam.target=aim;

 // Draw the held torch separately so its hand cannot clip into nearby walls
 // or obstruct interaction/sight rays through the scene.
 const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(66,1,.02,3),model=new THREE.Group();
 model.scale.setScalar(.88);model.position.set(.27,-.28,-.55);model.rotation.set(-.12,-.16,-.06);viewScene.add(model);
 viewScene.add(new THREE.AmbientLight(0xdde0da,1.15));
 const handLight=new THREE.PointLight(0xe0e2dc,2.3,3);handLight.position.set(-.15,.35,.2);viewScene.add(handLight);
 const metal=new THREE.MeshStandardMaterial({color:0x393d3d,roughness:.45,metalness:.65});
 const grip=new THREE.MeshStandardMaterial({color:0x151819,roughness:.9});
 const glove=new THREE.MeshStandardMaterial({name:'hazmat-glove',color:0x242b29,roughness:.95});
 const suit=new THREE.MeshStandardMaterial({name:'hazmat-sleeve',color:0xd9b525,roughness:.85});
 function cylinder(top,bottom,length,z,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,length,24),material);mesh.rotation.x=Math.PI/2;mesh.position.z=z;model.add(mesh);return mesh;}
 cylinder(.046,.05,.25,.055,grip);cylinder(.078,.053,.105,-.12,metal);
 for(let i=0;i<5;i++)cylinder(.052,.052,.012,-.04+i*.045,metal);
 cylinder(.081,.081,.013,-.18,metal);
 const lens=new THREE.Mesh(new THREE.CircleGeometry(.066,24),new THREE.MeshBasicMaterial({color:0xcbd5c7,side:THREE.DoubleSide}));lens.position.z=-.188;model.add(lens);
 const palm=new THREE.Mesh(new THREE.CapsuleGeometry(.053,.10,4,12),glove);palm.rotation.z=Math.PI/2;palm.position.set(-.024,-.04,.07);model.add(palm);
 for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.017,.066,4,8),glove);finger.rotation.z=Math.PI/2;finger.position.set(.006,-.033,.004+i*.034);model.add(finger);}
 const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.022,.055,4,8),glove);thumb.position.set(-.055,.005,.07);thumb.rotation.z=-.65;model.add(thumb);
 const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.074,.34,4,12),suit);sleeve.position.set(.018,-.23,.18);sleeve.rotation.x=-.55;model.add(sleeve);
 const switchBase=new THREE.Mesh(new THREE.BoxGeometry(.035,.014,.065),grip);switchBase.position.set(0,.051,-.035);model.add(switchBase);
 const switchLever=new THREE.Mesh(new THREE.BoxGeometry(.022,.009,.028),metal);switchLever.position.set(0,.062,-.05);model.add(switchLever);
 for(const x of [-.06,.06]){const bolt=new THREE.Mesh(new THREE.SphereGeometry(.007,8,6),metal);bolt.position.set(x,.036,-.11);model.add(bolt);}
 const seam=new THREE.Mesh(new THREE.TorusGeometry(.071,.004,6,24),glove);seam.rotation.x=Math.PI/2-.55;seam.position.set(.014,-.14,.125);model.add(seam);
 let on=true,exposure=.95,motion=0,swayX=0,swayY=0,lastYaw=null,lastPitch=null;
 function toggle(){on=!on;beam.intensity=on?power:0;lens.material.color.setHex(on?0xcbd5c7:0x171b1a);return on;}
 function update({ceilingPower=1,time=0,moving=false,sprinting=false,hold=0,delta=1/60,surfaceDistance=Infinity}={}){
  exposure=.95*(on?1:ceilingPower);
  for(const material of reactive.values()){material.emissive.copy(material.color);material.emissiveIntensity=.35*ceilingPower;}
  const reduced=reducedMotion(),dt=Math.max(0,Math.min(.1,delta)),blend=1-Math.exp(-dt*12),yaw=camera.rotation.y,pitch=camera.rotation.x;
  const distance=Number.isFinite(surfaceDistance)?Math.max(0,surfaceDistance):Infinity,target=basePower*(halloween?THREE.MathUtils.clamp((distance/2.5)**1.5,.14,1):1);
  power+=(target-power)*blend;beam.intensity=on?power:0;
  motion+=(Number(moving&&!reduced)-motion)*blend;
  const turn=lastYaw===null?0:Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw));
  const tilt=lastPitch===null?0:pitch-lastPitch;lastYaw=yaw;lastPitch=pitch;
  swayX+=(THREE.MathUtils.clamp(-turn*.35,-.04,.04)-swayX)*blend;swayY+=(THREE.MathUtils.clamp(-tilt*.3,-.025,.025)-swayY)*blend;
  const pace=sprinting?10:8,bob=reduced?0:motion*(sprinting?.012:.009),effort=reduced?0:Math.sin(Math.min(1,hold)*Math.PI)*.012;
  model.rotation.z=-.06+(reduced?0:Math.sin(time*1.7)*.003+Math.sin(time*pace)*motion*.006+swayX);
  model.rotation.x=-.12+(reduced?0:swayY);model.rotation.y=-.16+(reduced?0:swayX);
  model.position.y=-.28+Math.sin(time*pace)*bob-effort;model.position.x=Math.min(.27,.2*camera.aspect)+Math.cos(time*pace*.5)*bob*.5;
  switchLever.position.z=THREE.MathUtils.lerp(switchLever.position.z,on?-.05:-.02,blend);

 }
 function render(renderer){
  viewCamera.projectionMatrix.copy(camera.projectionMatrix);viewCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);renderer.autoClear=autoClear;
 }
 return {beam,model,update,toggle,render,get on(){return on;},get power(){return power;},get exposure(){return exposure;}};
}
