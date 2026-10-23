import {halloweenEnabled} from './halloween-release.js';
import {attachMechanicalHead} from './mechanical-head.js';
import {reducedMotion} from './preferences.js';
import * as THREE from 'three';
import {createCreature,applyRunning} from './creature.js';

// A real junction: the near walls occlude the runner at either end.
export function startMenuHallway(container) {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.setClearColor(0x080c0b);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 container.append(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x080c0b,.048);
 const camera=new THREE.PerspectiveCamera(54,1,.1,70);
 camera.position.set(0,1.65,7);camera.lookAt(0,1.5,-14);
 const concrete=new THREE.MeshStandardMaterial({color:0x515950,roughness:1});
 const dark=new THREE.MeshStandardMaterial({color:0x202a23,roughness:.9});
 function box(w,h,d,x,y,z,material=concrete){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);scene.add(mesh);return mesh;
 }
 box(24,.15,55,0,-.12,-17,dark);box(24,.15,55,0,3.9,-17);
 // Side walls stop at each crossing, leaving true passages behind them.
 for(const side of [-1,1]){
  for(const [z,length] of [[1,12],[-13,10],[-29,16]]){
   box(.4,4,length,side*2.5,1.9,z);
   box(.45,.12,length,side*2.48,.13,z,dark);
  }
  for(const z of [-1,-12,-24]){
   box(.06,2.7,1.3,side*2.27,1.35,z,dark);
   box(.14,2.85,.12,side*2.24,1.42,z+.7);
   box(.14,2.85,.12,side*2.24,1.42,z-.7);
  }
 }
 box(20,4,.3,0,1.9,-37,dark);
 scene.add(new THREE.AmbientLight(0x97ab99,.38));
 const lamps=[];
 for(const z of [1,-6.5,-19.5,-30]){
  const strip=new THREE.MeshBasicMaterial({color:0xb9c6ac});
  box(1.25,.04,.24,0,3.8,z,strip);
  const light=new THREE.PointLight(0xc1cfaf,15,13,2);light.position.set(0,3.45,z);scene.add(light);lamps.push(light);
 }
 const creature=createCreature();if(halloweenEnabled())attachMechanicalHead(creature);scene.add(creature.root);
 creature.root.scale.set(.82,.9,.82);
 // Eyes remain a suggestion at distance, without bright round pupils.
 creature.head.children.filter(child=>child.isMesh&&child.geometry.type==='SphereGeometry').forEach(eye=>{eye.visible=false;});
 let lastDraw=0;
 let elapsed=0,previous=performance.now(),next=.8+Math.random()*1.2,event=null,disposed=false;
 const observer=new ResizeObserver(()=>{
  const w=container.clientWidth,h=container.clientHeight;
  if(!w||!h)return;
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
 });observer.observe(container);
 renderer.setAnimationLoop(()=>{
  const now=performance.now(),dt=Math.min((now-previous)/1000,.25);previous=now;
  if(document.hidden||container.closest('.in-waiting-room'))return;
  elapsed+=dt;
  if(!reducedMotion()&&elapsed>=next&&!event){
   event={start:elapsed,direction:Math.random()<.5?-1:1,z:Math.random()<.65?-6.5:-19.5};
  }
  creature.root.visible=false;
  if(event){
   const age=elapsed-event.start;
   if(age<.78&&!reducedMotion()){
    creature.root.visible=true;
    applyRunning(creature,age*2.3);creature.mechanical?.sample(elapsed,{jaw:.2});
    creature.root.position.set(event.direction*(-5+age/.78*10),creature.root.position.y,event.z);
    creature.root.rotation.y=event.direction*Math.PI/2;
    creature.torso.rotation.x=.34;
    creature.head.rotation.y=-event.direction*1.1;
   }
   const flicker=age>.8&&age<1.06&&!reducedMotion();
   lamps[1].intensity=flicker?2:15;
   if(age>1.2){event=null;next=elapsed+1+Math.random()*2;}
  }
  if(!event&&now-lastDraw<1000/24)return;
  lastDraw=now;renderer.render(scene,camera);
 });
 return {dispose(){
  if(disposed)return;disposed=true;observer.disconnect();renderer.setAnimationLoop(null);
  creature.mechanical?.dispose();const materials=new Set();scene.traverse(node=>{node.geometry?.dispose();if(node.material)materials.add(node.material);});
  materials.forEach(material=>material.dispose());renderer.dispose();renderer.domElement.remove();
 }};
}
