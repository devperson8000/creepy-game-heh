import * as THREE from 'three';

export function createTorch(scene,camera){
 scene.add(camera);
 const reactive=new Map();
 // Signs, keys and the creature need to reflect the beam instead of being
 // permanently unlit surfaces. Ceiling tubes retain their own power control.
 scene.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.ceilingLight||mesh.material.transparent)return;
  mesh.castShadow=true;
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
 const beam=new THREE.SpotLight(0xe4e9dc,140,24,.58,1,1.5);
 beam.position.set(0,-.035,-.025);beam.castShadow=true;
 beam.shadow.mapSize.set(1024,1024);beam.shadow.camera.near=.05;beam.shadow.camera.far=24;beam.shadow.bias=-.00015;beam.shadow.normalBias=.015;
 const aim=new THREE.Object3D();aim.position.set(0,0,-20);camera.add(beam,aim);beam.target=aim;

 // Draw the held torch separately so its hand cannot clip into nearby walls
 // or obstruct interaction/sight rays through the scene.
 const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(66,1,.02,3),model=new THREE.Group();
 model.position.set(.27,-.28,-.55);model.rotation.set(-.12,-.16,-.06);viewScene.add(model);
 viewScene.add(new THREE.AmbientLight(0xdde0da,.8));
 const handLight=new THREE.PointLight(0xe0e2dc,1.5,3);handLight.position.set(-.15,.35,.2);viewScene.add(handLight);
 const metal=new THREE.MeshStandardMaterial({color:0x393d3d,roughness:.45,metalness:.65});
 const grip=new THREE.MeshStandardMaterial({color:0x151819,roughness:.9});
 const glove=new THREE.MeshStandardMaterial({name:'hazmat-glove',color:0x151819,roughness:.95});
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
 let on=true,exposure=.95;
 function toggle(){on=!on;beam.intensity=on?140:0;lens.material.color.setHex(on?0xcbd5c7:0x171b1a);return on;}
 function update({ceilingPower=1,time=0,moving=false}={}){
  exposure=.95*(on?1:ceilingPower);
  for(const material of reactive.values()){material.emissive.copy(material.color);material.emissiveIntensity=.35*ceilingPower;}
  const bob=moving?.009:0;model.position.y=-.28+Math.sin(time*8)*bob;model.position.x=Math.min(.27,.2*camera.aspect)+Math.cos(time*4)*bob*.5;
 }
 function render(renderer){
  viewCamera.projectionMatrix.copy(camera.projectionMatrix);viewCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);renderer.autoClear=autoClear;
 }
 return {beam,model,update,toggle,render,get on(){return on;},get exposure(){return exposure;}};
}
