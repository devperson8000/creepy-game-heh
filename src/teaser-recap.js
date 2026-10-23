import * as THREE from 'three';
import {RECAP_DURATION,recapFrame} from './teaser-recap-timeline.js';
export {RECAP_DURATION,recapFrame} from './teaser-recap-timeline.js';
import {createFinaleScene} from './finale-scene.js';
import {createFinaleAudio} from './finale-audio.js';
import {loadPlayerAvatarAsset} from './player-avatar.js';
import {JUMPSCARE_MOUTH_URL} from './jumpscare.js';
export function prependFinaleRecap(film,{loadAsset=loadPlayerAvatarAsset,createHistoryAudio=createFinaleAudio}={}){
 let disposed=false,historical=null,failure=null,historyAudio=null,last=-1;
 const cast=[0,1].map(slot=>({id:`memory-${slot}`,name:slot?'Survivor':'You',slot}));
 const slate=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,10);camera.position.z=2;slate.background=new THREE.Color(0x030504);
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');ctx.fillStyle='#030504';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#c2c7b9';ctx.textAlign='center';ctx.font='24px monospace';ctx.fillText('MONOCHROME',640,288);ctx.font='bold 46px sans-serif';ctx.fillText('PREVIOUSLY',640,384);ctx.fillStyle='#7e7761';ctx.fillRect(565,423,150,1);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const geometry=new THREE.PlaneGeometry(16,9),material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),plane=new THREE.Mesh(geometry,material);slate.add(plane);
 const veilMaterial=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
 const veil=new THREE.Mesh(new THREE.PlaneGeometry(2,2),veilMaterial);veil.position.z=-.1;veil.frustumCulled=false;veil.renderOrder=1000;
 veil.onBeforeRender=()=>{};
 const mouthTexture=new THREE.TextureLoader().load(JUMPSCARE_MOUTH_URL);
 const historyReady=Promise.resolve().then(loadAsset).then(asset=>{if(disposed)return;historical=createFinaleScene({asset,cast,runnerId:cast[0].id,buttonId:cast[1].id,mouthTexture,quality:'low'});historical.resize(16/9);historical.scene.add(historical.camera);
  // A camera-attached plane covers the exact frame for the final short fade.
  const fov=THREE.MathUtils.degToRad(historical.camera.fov),distance=.08;veil.geometry.dispose();veil.geometry=new THREE.PlaneGeometry(2*Math.tan(fov/2)*distance*16/9,2*Math.tan(fov/2)*distance);veil.position.z=-distance;historical.camera.add(veil);
 }).catch(error=>{failure=error;});
 const ready=Promise.all([film.scene.ready,historyReady]).catch(error=>{failure=error;});
 function sample(time){const f=recapFrame(time);return f.phase==='teaser'?film.sample(f.teaserTime):{...f,time,shot:f.phase,subtitle:f.subtitle};}
 function render(renderer,time,options){
  const f=recapFrame(time);if(f.phase==='teaser'){film.scene.render(renderer,f.teaserTime,options);return;}
  if(historical&&f.phase==='recap'){historical.sample(f.finaleTime,options);veilMaterial.opacity=f.fade;}
  const previous=renderer.getRenderTarget(),exposure=renderer.toneMappingExposure,auto=renderer.autoClear,viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{renderer.setRenderTarget(film.scene.target);renderer.setViewport(0,0,film.scene.target.width,film.scene.target.height);renderer.setScissorTest(false);renderer.autoClear=true;renderer.toneMappingExposure=.85;
   renderer.render(f.phase==='recap'&&historical?historical.scene:slate,f.phase==='recap'&&historical?historical.camera:camera);
  }finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.toneMappingExposure=exposure;renderer.autoClear=auto;}
 }
 function stopHistory(){historyAudio?.dispose();historyAudio=null;}
 const audio={resume(){film.audio.resume();if(!historyAudio)historyAudio=createHistoryAudio();return historyAudio.resume();},update(time,options={}){
  const f=recapFrame(time);if(document.hidden){audio.pause();last=time;return;}
  if(f.phase==='teaser'){stopHistory();film.audio.update(f.teaserTime,options);}
  else if(f.phase==='recap'&&historical){film.audio.pause();if(time<last-.5||time-last>2)stopHistory();if(!historyAudio){historyAudio=createHistoryAudio(options);void historyAudio.resume();}historyAudio.setMuted(!!options.muted);historyAudio.setVolume(options.volume??.8);historyAudio.sample(f.finaleTime);}
  else{stopHistory();film.audio.pause();}
  last=time;
 },pause(){stopHistory();film.audio.pause();},dispose(){stopHistory();film.audio.dispose();}};
 function dispose(){if(disposed)return;disposed=true;historical?.dispose();film.scene.dispose();texture.dispose();mouthTexture.dispose();geometry.dispose();material.dispose();veil.geometry.dispose();veilMaterial.dispose();slate.clear();}
 const scene={target:film.scene.target,ready,render,dispose,sample,get error(){return failure??film.scene.error;},get needlelimbsPending(){return film.scene.needlelimbsPending;},get historical(){return historical;},get film(){return film.scene;}};
 return {scene,audio,sample};
}
