import * as THREE from 'three';
import {createCreature} from './creature.js';

export const JUMPSCARE_DURATION=2.25;
export const JUMPSCARE_MOUTH_URL='/images/jumpscare-mouth.png';
export function createJumpscare({mouthTexture}={}){
 const scene=new THREE.Scene(),background=new THREE.Color(0x121214);scene.background=background.clone();
 const camera=new THREE.PerspectiveCamera(52,1,.025,20);
 const face=createCreature().head;face.removeFromParent();face.position.set(0,0,0);scene.add(face);
 const eyes=[];
 face.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const white=mesh.material.color.r>.5;
  mesh.material=new THREE.MeshBasicMaterial({color:white?0xffffff:0x000000,toneMapped:false});
  if(white)eyes.push(mesh);
 });
 if(mouthTexture)mouthTexture.colorSpace=THREE.SRGBColorSpace;
 const mouth=new THREE.Mesh(new THREE.PlaneGeometry(.30,.24),new THREE.MeshBasicMaterial({map:mouthTexture??null,transparent:true,alphaTest:.02,depthWrite:false,toneMapped:false}));
 mouth.position.set(0,.23,.205);mouth.userData.jumpscareMouth=true;mouth.visible=false;mouth.renderOrder=1;face.add(mouth);
 const bounds=new THREE.Box3().setFromObject(face),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 let active=false,elapsed=0,borderOpacity=0;
 function pose(){
  const approach=1-Math.pow(Math.max(0,1-elapsed/.18),3),fade=THREE.MathUtils.clamp((elapsed-1.8)/.45,0,1);
  // Fit the entire head, not only the eye line. Keep the chin, forehead and
  // horn tips inside the view even on narrow portrait screens.
  const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const z=bounds.max.z+Math.max(size.x/(2*tangent*camera.aspect),size.y/(2*tangent))*1.12;
  const shake=.01*Math.exp(-elapsed*7);
  camera.position.set(center.x+(Math.random()-.5)*shake,center.y+(Math.random()-.5)*shake,z+.3*(1-approach));camera.lookAt(center.x,center.y,0);
  eyes.forEach(eye=>eye.material.color.setScalar(1-fade));
  // Never show an untextured white rectangle while the image is loading.
  mouth.visible=active&&!!mouthTexture?.image?.width&&!!mouthTexture?.image?.height&&fade<1;
  mouth.material.color.setScalar(1-fade);
  scene.background.copy(background).multiplyScalar(1-fade);
  borderOpacity=Math.max(0,1-Math.max(0,elapsed-1.25))*.95;
 }
 function start(){if(active)return false;active=true;elapsed=0;pose();return true;}
 function update(delta){if(!active)return;elapsed+=Math.max(0,Math.min(delta,.2));pose();if(elapsed>=JUMPSCARE_DURATION){active=false;borderOpacity=0;mouth.visible=false;}}
 function resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();if(active)pose();}
 function render(renderer){const size=renderer.getSize(new THREE.Vector2());if(camera.aspect!==size.x/size.y)resize(size.x/size.y);renderer.render(scene,camera);}
 return {scene,camera,face,eyes,mouth,start,update,resize,render,get active(){return active;},get elapsed(){return elapsed;},get borderOpacity(){return borderOpacity;}};
}
