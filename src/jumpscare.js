import * as THREE from 'three';
import {createCreature} from './creature.js';

export const JUMPSCARE_DURATION=2.25;
export function createJumpscare(){
 const scene=new THREE.Scene(),background=new THREE.Color(0x070708);scene.background=background.clone();
 const camera=new THREE.PerspectiveCamera(52,1,.025,5);
 const face=createCreature().head;face.removeFromParent();face.position.set(0,0,0);scene.add(face);
 const eyes=[];
 face.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const white=mesh.material.color.r>.5;
  mesh.material=new THREE.MeshBasicMaterial({color:white?0xffffff:0x000000,toneMapped:false});
  if(white)eyes.push(mesh);
 });
 let active=false,elapsed=0,borderOpacity=0;
 function pose(){
  const approach=1-Math.pow(Math.max(0,1-elapsed/.18),3),fade=THREE.MathUtils.clamp((elapsed-1.8)/.45,0,1);
  const z=.174+Math.max(.35,.17/(Math.tan(THREE.MathUtils.degToRad(26))*camera.aspect));
  const shake=.01*Math.exp(-elapsed*7);
  camera.position.set((Math.random()-.5)*shake,.445+(Math.random()-.5)*shake,z+.3*(1-approach));camera.lookAt(0,.445,0);
  eyes.forEach(eye=>eye.material.color.setScalar(1-fade));
  scene.background.copy(background).multiplyScalar(1-fade);
  borderOpacity=Math.max(0,1-Math.max(0,elapsed-1.25))*.95;
 }
 function start(){if(active)return false;active=true;elapsed=0;pose();return true;}
 function update(delta){if(!active)return;elapsed+=Math.max(0,Math.min(delta,.2));pose();if(elapsed>=JUMPSCARE_DURATION){active=false;borderOpacity=0;}}
 function resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();if(active)pose();}
 function render(renderer){const size=renderer.getSize(new THREE.Vector2());if(camera.aspect!==size.x/size.y)resize(size.x/size.y);renderer.render(scene,camera);}
 return {scene,camera,face,eyes,start,update,resize,render,get active(){return active;},get elapsed(){return elapsed;},get borderOpacity(){return borderOpacity;}};
}
