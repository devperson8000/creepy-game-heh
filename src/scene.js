import * as THREE from 'three';
import {createCreature,applyIdle} from './creature.js';
import {idlePose} from './idle.js';
export function startScene(container) {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setClearColor(0x111214);renderer.toneMapping=THREE.ACESFilmicToneMapping;
 container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x191a1b,.06);
 const camera=new THREE.PerspectiveCamera(43,1,.1,40);
 const creature=createCreature();scene.add(creature.root);
 const concrete=new THREE.MeshStandardMaterial({color:0x626467,roughness:1});
 function box(w,h,d,x,y,z,material=concrete) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;
 }
 box(12,.12,16,0,-.06,0);box(12,5,.15,0,2.5,-3.2);
 box(.18,5,10,-3.5,2.5,.5);box(.18,5,10,3.5,2.5,.5);box(7.2,.15,10,0,4.6,.5);
 const recess=new THREE.MeshStandardMaterial({color:0x060708,roughness:1});
 box(1.35,3.6,.03,2.1,1.8,-3.1,recess);
 const strip=new THREE.MeshBasicMaterial({color:0xaaaead});box(1.8,.025,.13,-.7,4.5,-1.2,strip);
 scene.add(new THREE.AmbientLight(0x91969b,.65));
 const light=new THREE.SpotLight(0xe1e5e5,65,15,Math.PI/3,.7,1.5);
 light.position.set(-1.4,4.35,1);light.target.position.set(0,1.6,-1);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0002;scene.add(light,light.target);
 const back=new THREE.PointLight(0xc8cecf,13,8);back.position.set(-1.8,2.7,-2.4);scene.add(back);
 function resize(){
  const w=container.clientWidth,h=container.clientHeight;
  renderer.setSize(w,h);camera.aspect=w/h;
  const distance=Math.max(6.3,0.9/(Math.tan(THREE.MathUtils.degToRad(43/2))*camera.aspect));
  camera.position.set(0,1.95,distance);camera.lookAt(0,1.86,0);camera.updateProjectionMatrix();
 }
 resize();window.addEventListener('resize',resize);
 const start=performance.now();
 renderer.setAnimationLoop(()=>{
  const t=(performance.now()-start)/1000;
  applyIdle(creature,idlePose(t));
  renderer.render(scene,camera);
 });
 return {renderer,scene,camera,creature};
}
