import * as THREE from 'three';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {loadNeedlelimbsAsset,createNeedlelimbsActor} from './needlelimbs-actor.js';
import {createRebuiltMonochrome} from './mechanical-head.js';
import {sampleNeedlelimbsTeaser} from './needlelimbs-timeline.js';

/** Current edit uses the supplied animated Needlelimbs rig in the corner reveal. */
export function createNeedlelimbsTeaserScene({needlelimbsAsset,survivorAsset,allowMissingNeedlelimbs=false}={}){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x060809);scene.fog=new THREE.Fog(0x080b0c,13,30);
 const camera=new THREE.PerspectiveCamera(49,16/9,.05,45);scene.add(camera);
 const target=new THREE.WebGLRenderTarget(960,540,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
 const geometries=new Set(),materials=new Set(),textures=new Set(),monsters=new Map();let survivor,needle,loadError=null,disposed=false,state=sampleNeedlelimbsTeaser(0);
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});materials.add(m);return m;};
 const concrete=material(0x444841),floor=material(0x272e2a),steel=material(0x252d2c,{metalness:.55,roughness:.56}),dark=material(0x10191a),fixture=material(0xc1d2b8,{emissive:0xa3b399,emissiveIntensity:1});
 function box(w,h,d,x,y,z,m=concrete){const g=new THREE.BoxGeometry(w,h,d);geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;}
 // A real right-hand branch: the return wall hides the approach until the head crosses its edge.
 box(5,.15,24,0,-.1,-5,floor);box(5,.15,24,0,4.3,-5,dark);box(.2,4.4,24,-2.5,2.1,-5);
 box(.2,4.4,10.5,2.5,2.1,.05);box(.2,4.4,8.8,2.5,2.1,-12.6);
 box(6,.15,2.6,5.3,-.1,-6.2,floor);box(6,.15,2.6,5.3,4.3,-6.2,dark);
 box(6,4.4,.2,5.3,2.1,-7.5);box(6,4.4,.2,5.3,2.1,-4.9);box(.2,4.4,2.6,8.3,2.1,-6.2,dark);
 for(const z of [-7.5,-4.9]){box(.26,4.35,.18,2.46,2.1,z,steel);box(.035,.8,.2,2.31,.4,z,steel);}
 for(let z=-15;z<7;z+=1.8)box(4.9,.006,.018,0,0,z,dark);
 for(const side of [-1,1])for(const z of [-12,-2,3]){box(.06,2.7,1.15,side*2.36,1.35,z,steel);box(.08,.09,.2,side*2.31,1.15,z+.3,fixture);}
 for(const z of [-11,-3,3]){box(1.2,.035,.25,0,4.17,z,fixture);const l=new THREE.PointLight(0xc0ccb4,17,9,2);l.position.set(0,3.85,z);scene.add(l);}
 box(.24,.04,.8,5.8,4.15,-6.2,fixture);
 const branchLight=new THREE.PointLight(0xb6c4bc,13,8,2);branchLight.position.set(4.6,3.7,-5.8);scene.add(branchLight);
 const rim=new THREE.PointLight(0x688d9a,15,6,2);rim.position.set(7.2,3.2,-6.5);scene.add(rim);
 scene.add(new THREE.HemisphereLight(0x9aa5a0,0x11160f,.62));
 const headLight=new THREE.PointLight(0xc6d7ce,0,5,2);scene.add(headLight);
 box(5,4.4,.2,0,2.1,6.5,dark);const doors=[box(1.15,3,.12,-.58,1.5,6.3,steel),box(1.15,3,.12,.58,1.5,6.3,steel)];
 box(.15,3.2,.25,-1.25,1.6,6.2);box(.15,3.2,.25,1.25,1.6,6.2);box(2.65,.12,.25,0,3.15,6.2,fixture);
 const rebuilt=createRebuiltMonochrome();scene.add(rebuilt.root);
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');ctx.fillStyle='#040707';ctx.fillRect(0,0,1280,720);ctx.textAlign='center';ctx.fillStyle='#e2e4da';ctx.font='bold 74px sans-serif';ctx.fillText('MONOCHROME',640,330,1000);ctx.fillStyle='#b6a07e';ctx.font='52px sans-serif';ctx.fillText('II',640,425);ctx.fillStyle='#65736d';ctx.fillRect(480,475,320,1);
 const titleTexture=new THREE.CanvasTexture(canvas);titleTexture.colorSpace=THREE.SRGBColorSpace;textures.add(titleTexture);
 const overlayGeometry=new THREE.PlaneGeometry(2*Math.tan(49*Math.PI/360)*16/9,2*Math.tan(49*Math.PI/360));geometries.add(overlayGeometry);
 const titleMaterial=new THREE.MeshBasicMaterial({map:titleTexture,depthTest:false,depthWrite:false,toneMapped:false});materials.add(titleMaterial);
 const title=new THREE.Mesh(overlayGeometry,titleMaterial);title.position.z=-1;title.renderOrder=100;camera.add(title);
 const blackMaterial=new THREE.MeshBasicMaterial({color:0,depthTest:false,depthWrite:false});materials.add(blackMaterial);const blackout=new THREE.Mesh(overlayGeometry,blackMaterial);blackout.position.z=-1;blackout.renderOrder=99;camera.add(blackout);
 const ready=Promise.all([survivorAsset??loadPlayerAvatarAsset(),needlelimbsAsset??(allowMissingNeedlelimbs?Promise.resolve(null):loadNeedlelimbsAsset())]).then(([player,asset])=>{
  if(disposed)return;
  if(asset){needle=createNeedlelimbsActor(asset);scene.add(needle.root);monsters.set('needlelimbs',needle);}
  survivor=createPlayerAvatar(player,{id:'teaser-survivor',slot:0,name:''});scene.add(survivor.root);
 }).catch(error=>{loadError=error;});
 const look=new THREE.Vector3();
 function sample(t,{reducedMotion=false}={}){
  state=sampleNeedlelimbsTeaser(t);const s=state,u=s.time;
  title.visible=s.shot==='title';blackout.visible=s.blackout;
  for(let i=0;i<2;i++)doors[i].position.x=(i?1:-1)*(.58+Math.min(1,u/1.25));
  survivor?.sampleCinematic({clip:u<3.8?'Walk':'Idle',time:Math.min(u,3.8),position:[-.45,0,5.5-Math.min(u,3.8)*.62],yaw:0});
  if(survivor)survivor.root.visible=u<4;
  if(needle){needle.root.visible=s.needle.visible;needle.sample(s.needle);}
  rebuilt.root.visible=s.monochrome.visible;rebuilt.sample({time:u,...s.monochrome});
  branchLight.intensity=u>=20.65?0:13;
  headLight.position.set(3.5,3.5,-4.8);headLight.intensity=s.monochrome.closeup*7;
  if(u<4){camera.position.set(-1.5,1.65,1.4);look.set(-.3,1.5,4.3-Math.min(u,3.8)*.52);}
  else if(u<12){camera.position.set(-1.2,1.65,-1.85);look.set(2.55,2.25,-6.05);if(!reducedMotion)camera.position.z-=(u-4)*.015;}
  else {
   const c=s.monochrome.closeup;
   camera.position.set(.6+c*2,2.3+c*.7,-5.95+c*.3);look.set(5.35-c*.95,2.5+c*.83,-6.2);
  }
  camera.lookAt(look);scene.updateMatrixWorld(true);return state;
 }
 function render(renderer,t,options={}){
  const width=options.quality==='low'?640:960;if(target.width!==width)target.setSize(width,width*9/16);sample(t,options);
  const previous=renderer.getRenderTarget(),exposure=renderer.toneMappingExposure,auto=renderer.autoClear,viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.autoClear=true;renderer.toneMappingExposure=1.1;renderer.render(scene,camera);}
  finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.toneMappingExposure=exposure;renderer.autoClear=auto;}
 }
 function dispose(){if(disposed)return;disposed=true;survivor?.dispose();needle?.dispose();rebuilt.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());target.dispose();}
 return {scene,camera,target,ready,sample,render,dispose,monsters,creature:rebuilt,get needlelimbsPending(){return allowMissingNeedlelimbs&&!needle;},get survivor(){return survivor;},get error(){return loadError;},get state(){return state;}};
}
