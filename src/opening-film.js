import * as THREE from 'three';
import {createOpeningSet} from './opening-set.js';
import {createOpeningHands} from './opening-hands.js';
import {createOpeningAudio} from './opening-audio.js';
import {gamePreferences,createRenderQuality} from './preferences.js';
import {openingEase as ease} from './opening-sequence.js';

export function createOpeningFilm(container){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor(0x06090c);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.domElement.className='opening-canvas';renderer.domElement.setAttribute('aria-label','A Halloween party invitation leads through an impossible wall into darkness');container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(61,1,.025,110);scene.add(camera);
 const set=createOpeningSet(scene),hands=createOpeningHands(camera),audio=createOpeningAudio();
 const quality=createRenderQuality(renderer,{pixelRatio:Math.min(globalThis.devicePixelRatio||1,1.35)});
 const beam=new THREE.SpotLight(0xe5e6ce,100,30,.51,.7,1.4),aim=new THREE.Object3D();beam.position.set(.25,-.2,-.61);aim.position.set(0,-.02,-15);beam.target=aim;camera.add(beam,aim);
 // One flashlight is the sole light source in the passage. Shadow maps are an
 // optional high-quality detail; the beam and genuine open shaft always render.
 renderer.shadowMap.enabled=gamePreferences().quality==='high';renderer.shadowMap.type=THREE.PCFSoftShadowMap;beam.castShadow=renderer.shadowMap.enabled;beam.shadow.mapSize.set(512,512);beam.shadow.bias=-.0002;beam.shadow.camera.near=.05;beam.shadow.camera.far=30;
 let disposed=false,last=0;const look=new THREE.Vector3();
 function resize(){if(disposed)return;const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();quality.update(0,gamePreferences().quality);
 function render(frame,{reducedMotion=false}={}){if(disposed)return;const {time}=frame,delta=Math.max(0,time-last);quality.update(delta,gamePreferences().quality);last=time;
  set.update(time,{reducedMotion});camera.position.fromArray(frame.camera);look.fromArray(frame.look);
  const walking=(time<20||(time>28.8&&time<38))&&!reducedMotion;
  if(walking)camera.position.y+=Math.sin(time*9.4)*.012;
  camera.lookAt(look);const falling=ease(38,41,time);if(!reducedMotion)camera.rotateZ(Math.sin(falling*3.5)*.16);
  camera.fov=61+falling*9;camera.updateProjectionMatrix();hands.update(frame);
  const closeWall=ease(19.5,21,time)*(1-ease(30.4,32,time));
  beam.intensity=(100-99.5*closeWall)*frame.light;beam.angle=.51+falling*.12;aim.position.set(falling*.8,-.02-falling*3,-15);
  renderer.setClearColor(time<12?0x06090c:0x000000);renderer.toneMappingExposure=1.08;
  renderer.render(scene,camera);audio.update(frame);
 }
 // Warm the locally authored sets and decode the small voice clips before time starts.
 set.street.visible=set.house.visible=set.passage.visible=true;
 const ready=Promise.all([renderer.compileAsync(scene,camera),audio.ready]).then(()=>{if(disposed)return;audio.resume();});
 return {ready,render,pause:()=>audio.pause(),resume:()=>audio.resume(),toggleSound:()=>audio.toggle(),get soundEnabled(){return audio.enabled;},dispose(){if(disposed)return;disposed=true;observer.disconnect();audio.dispose();hands.dispose();set.dispose();renderer.dispose();renderer.domElement.remove();}};
}
