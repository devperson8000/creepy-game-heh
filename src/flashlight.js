import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** A camera-mounted first-person view model. The black GLB is shared by the pickup and held view. */
export function createHeldFlashlight(camera,{url='/models/monochrome2/flashlight.glb',onError=()=>{}}={}){
 const mount=new T.Group();mount.name='monochrome2-held-flashlight';
 mount.position.set(.315,-.245,-.47);
 camera.add(mount);
 const modelRoot=new T.Group();modelRoot.name='flashlight-model-axis';
 // The source model is authored upright on +Y; its lens is on -Y. Rotate it to point forward.
 modelRoot.rotation.x=Math.PI/2;
 modelRoot.scale.set(.105,.155,.105);
 mount.add(modelRoot);
 const emitter=new T.Object3D();emitter.name='flashlight-emitter';emitter.position.set(0,-.965,0);modelRoot.add(emitter);
 let asset=null,disposed=false,available=false,on=false,thirdPerson=false;
 const ready=new GLTFLoader().loadAsync(url).then(gltf=>{
  if(disposed){gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material??[]))m.dispose();}});return null;}
  asset=gltf.scene;asset.name='matte-black-flashlight';
  asset.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;}});
  modelRoot.add(asset);mount.visible=available&&!thirdPerson;
  return asset;
 }).catch(error=>{if(!disposed)onError(error);return null;});
 function setState({hasTorch=available,torchOn=on,inThirdPerson=thirdPerson}={}){
  available=!!hasTorch;on=!!torchOn;thirdPerson=!!inThirdPerson;
  mount.visible=available&&!thirdPerson;
 }
 function emitterWorldPosition(target=new T.Vector3()){
  camera.updateMatrixWorld(true);emitter.getWorldPosition(target);return target;
 }
 function dispose(){if(disposed)return;disposed=true;mount.removeFromParent();if(asset)asset.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material??[])){for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])m[key]?.dispose?.();m.dispose();}}});}
 return {mount,modelRoot,emitter,ready,setState,emitterWorldPosition,dispose,get loaded(){return !!asset;}};
}

/** Short, tactile two-stage switch click synthesized locally with Web Audio. */
export function playFlashlightSwitch(context,output,enabled=true){
 if(!context||!output||context.state!=='running')return false;
 const now=context.currentTime,voice=context.createGain();voice.gain.value=.42;voice.connect(output);
 const pulses=enabled?[{at:0,level:.9,body:148,bright:1650},{at:.026,level:.28,body:245,bright:2450}]:[{at:0,level:.72,body:185,bright:2050},{at:.021,level:.2,body:285,bright:2850}];
 let finished=0;
 const complete=()=>{if(++finished===pulses.length*2){voice.disconnect();}};
 for(const pulse of pulses){
  const length=Math.ceil(context.sampleRate*.075),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++){const t=i/context.sampleRate,decay=Math.exp(-t/(enabled?.009:.008));data[i]=(Math.random()*2-1)*decay*(.78+.22*Math.sin(t*9500));}
  const source=context.createBufferSource(),hp=context.createBiquadFilter(),bp=context.createBiquadFilter(),noiseGain=context.createGain();
  source.buffer=buffer;hp.type='highpass';hp.frequency.value=520;bp.type='bandpass';bp.frequency.value=pulse.bright;bp.Q.value=.9;
  const at=now+pulse.at;noiseGain.gain.setValueAtTime(0,at);noiseGain.gain.linearRampToValueAtTime(.24*pulse.level,at+.001);noiseGain.gain.exponentialRampToValueAtTime(.0001,at+.052);
  source.connect(hp);hp.connect(bp);bp.connect(noiseGain);noiseGain.connect(voice);source.onended=()=>{source.disconnect();hp.disconnect();bp.disconnect();noiseGain.disconnect();complete();};source.start(at);source.stop(at+.075);
  const osc=context.createOscillator(),bodyGain=context.createGain();osc.type='triangle';osc.frequency.setValueAtTime(pulse.body,at);osc.frequency.exponentialRampToValueAtTime(pulse.body*.58,at+.028);
  bodyGain.gain.setValueAtTime(.0001,at);bodyGain.gain.linearRampToValueAtTime(.11*pulse.level,at+.001);bodyGain.gain.exponentialRampToValueAtTime(.0001,at+.038);
  osc.connect(bodyGain);bodyGain.connect(voice);osc.onended=()=>{osc.disconnect();bodyGain.disconnect();complete();};osc.start(at);osc.stop(at+.04);
 }
 return true;
}
