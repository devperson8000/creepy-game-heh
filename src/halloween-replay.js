import {TEASER_START,TEASER_DURATION} from './teaser-timeline.js';
import * as THREE from 'three';
import {createHalloweenExperience} from './halloween-experience.js';
export function startHalloweenReplay(container,{onExit}){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=THREE.ACESFilmicToneMapping;container.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(66,1,.06,85),run={halloween:{seen:true,visit:{id:'replay',stage:'conversation',startedAt:0,elapsed:TEASER_START}}};
 const ui={root:document.createElement('div'),overlay:null};const input={clear(){},setView(){},updateView(){}};let muted=false,finished=false;
 const experience=createHalloweenExperience({renderer,camera,run,input,ui,replay:true,isMuted:()=>muted,onMute:()=>{muted=!muted;}});
 const back=document.createElement('button');back.className='recovered-footage';back.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:90;width:220px';back.textContent='Return to menu';document.body.append(back);
 let start=null;const loading=document.createElement('p');loading.className='round-loading';loading.textContent='RESTORING TAPE 02…';document.body.append(loading);void experience.teaser.ready.then(()=>{if(!finished){if(experience.teaser.error){loading.setAttribute('role','alert');loading.textContent='Tape could not load. Return to the menu and try again.';}else{start=performance.now();loading.remove();}}});function resize(){renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();}resize();window.addEventListener('resize',resize);
 function dispose(){if(finished)return;finished=true;renderer.setAnimationLoop(null);experience.dispose();loading.remove();renderer.dispose();renderer.domElement.remove();back.remove();window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);onExit();}
 function key(event){if(event.code==='Escape')dispose();if(event.code==='KeyM')muted=!muted;}window.addEventListener('keydown',key);
 back.onclick=dispose;renderer.setAnimationLoop(()=>{if(start===null)return;const t=(performance.now()-start)/1000;run.halloween.visit.elapsed=TEASER_START+Math.min(TEASER_DURATION-.05,t);experience.render(1/60);if(t>=TEASER_DURATION+1)dispose();});
 return {dispose,experience};
}
