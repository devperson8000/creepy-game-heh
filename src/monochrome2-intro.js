import * as THREE from 'three';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createBackroomsWorld} from './backrooms-world.js';
import {MONOCHROME2_DIALOGUE,MONOCHROME2_DURATION,sampleMonochrome2,sampleMonochrome2Actors} from './monochrome2-intro-timeline.js';
import './monochrome2-intro.css';

const root=document.querySelector('#scene');
if(!root)throw new Error('MONOCHROME 2 intro requires #scene');
document.title='MONOCHROME 2 — In the Backrooms';
document.body.classList.add('monochrome2-intro');
root.setAttribute('aria-label','MONOCHROME 2: Into the Backrooms cinematic');
const ui=document.createElement('div');
ui.className='m2-ui';
ui.innerHTML=
 '<div class="m2-topline"><strong>MONOCHROME ARCHIVE</strong><span>FIELD RECORDING / 002</span></div>'+
 '<div class="m2-subtitle" aria-live="polite"><b></b><span></span></div>'+
 '<div class="m2-progress"><i></i></div>'+
 '<div class="m2-start"><div class="m2-start-card"><div class="m2-kicker">AFTER THE ESCAPE</div><h1>JUST ONE<br>QUICK SUPPLY RUN.</h1><p>Three survivors. A little food. A wall that should not be there.</p><button class="m2-play" type="button" disabled>LOADING SURVIVORS…</button></div></div>'+
 '<button class="m2-sound" type="button" aria-pressed="false">SOUND ON</button>'+
 '<div class="m2-fade" aria-hidden="true"></div>'+
 '<div class="m2-title hidden"><div class="m2-title-inner"><h2>MONOCHROME 2<span>IN THE BACKROOMS</span></h2><div class="m2-rule"></div><button class="m2-replay" type="button">REPLAY INTRO</button></div></div>';
document.body.append(ui);
const startButton=ui.querySelector('.m2-play');
const replayButton=ui.querySelector('.m2-replay');
const soundButton=ui.querySelector('.m2-sound');
const startPanel=ui.querySelector('.m2-start');
const titlePanel=ui.querySelector('.m2-title');
const fadeLayer=ui.querySelector('.m2-fade');
const subtitle=ui.querySelector('.m2-subtitle');
const subtitleSpeaker=subtitle.querySelector('b');
const subtitleText=subtitle.querySelector('span');
const progressBar=ui.querySelector('.m2-progress i');
const prefersReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.append(renderer.domElement);

const scene=new THREE.Scene();
const introBackground=new THREE.Color(0x202a2a),introFogColor=new THREE.Color(0x65716d);
scene.background=introBackground.clone();
scene.fog=new THREE.FogExp2(introFogColor,.0125);
const camera=new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,.08,160);
scene.add(camera);
const geometries=new Set(),materials=new Set(),textures=new Set(),actors=[];
let disposed=false,started=false,startAt=0,lastFrame=0,lastCaption='',muted=false,audio=null;
let previousPoseTime=null,previousActorPositions=[null,null,null],walkAnimationTimes=[0,0,0],leadTravelDistance=0,nextFootstepDistance=.72;
let voiceChoices=new Map();
const shotSounds=new Set();

function mat(options){const value=new THREE.MeshStandardMaterial({roughness:.88,...options});materials.add(value);return value;}
function basicMat(options){const value=new THREE.MeshBasicMaterial(options);materials.add(value);return value;}
function box(w,h,d,x,y,z,material,rotation=null){
 const geometry=new THREE.BoxGeometry(w,h,d);geometries.add(geometry);
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
 if(rotation)mesh.rotation.set(rotation[0]||0,rotation[1]||0,rotation[2]||0);
 mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function ground(w,d,x,y,z,material){
 const geometry=new THREE.PlaneGeometry(w,d);geometry.rotateX(-Math.PI/2);geometries.add(geometry);
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function canvasTex(width,height,draw){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');draw(context,width,height);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;textures.add(texture);return texture;
}
function textPanel(text,x,y,z,w,h,options={}){
 const texture=canvasTex(1024,256,(c,W,H)=>{
  c.fillStyle=options.background??'#121b1b';c.fillRect(0,0,W,H);
  c.strokeStyle=options.border??'#829086';c.lineWidth=7;c.strokeRect(12,12,W-24,H-24);
  c.fillStyle=options.color??'#e2e9db';c.textAlign='center';c.textBaseline='middle';
  c.font='700 92px Arial, sans-serif';c.fillText(text,W/2,H/2,940);
 });
 const material=basicMat({map:texture,toneMapped:false});
 const geometry=new THREE.PlaneGeometry(w,h);geometries.add(geometry);
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.renderOrder=2;scene.add(mesh);return mesh;
}
function addStreetBuilding(x,z,w,h,d,color,windowColor){
 const wall=mat({color,roughness:1}),glassMat=mat({color:windowColor,emissive:windowColor,emissiveIntensity:.22,metalness:.18,roughness:.32});
 box(w,h,d,x,h/2-.03,z,wall);
 for(let floorIndex=0;floorIndex<2;floorIndex++)for(let col=0;col<Math.max(2,Math.floor(w/2.3));col++){
  const xx=x-w/2+1.0+col*2.15,yy=1.2+floorIndex*2.35;
  if(xx<x+w/2-.35)box(.82,1.25,.045,xx,yy,z+d/2+.027,glassMat);
 }
 box(w+.2,.12,d+.2,x,h+.01,z,mat({color:0x303b37}));
}
function addTree(x,z,size=1){
 const trunk=mat({color:0x40372e}),leaf=mat({color:0x465d4a,roughness:1});
 box(.22*size,1.7*size,.22*size,x,.82*size,z,trunk);
 for(const [yy,scale] of [[1.8,1.0],[2.45,.8],[3.0,.55]]){
  const geometry=new THREE.IcosahedronGeometry(size*scale,1);geometries.add(geometry);
  const crown=new THREE.Mesh(geometry,leaf);crown.position.set(x,yy*size,z);crown.castShadow=true;scene.add(crown);
 }
}
function addLamp(x,z){
 const pole=mat({color:0x38413d,metalness:.6,roughness:.5}),lamp=mat({color:0xcdd6c2,emissive:0xc3d1b7,emissiveIntensity:1.4});
 box(.08,4.3,.08,x,2.1,z,pole);box(.7,.09,.18,x+.26,4.2,z,pole);box(.48,.08,.15,x+.45,4.14,z,lamp);
 const light=new THREE.PointLight(0xc2d6c1,8,11,2);light.position.set(x+.45,4.0,z);scene.add(light);
}
function makeCrate(x,y,z,color){const material=mat({color,roughness:.96});box(.42,.58,.42,x,y,z,material);box(.43,.07,.44,x,y+.3,z,mat({color:0xddd0a4}));}
function addProduct(x,surfaceY,z,index){
 const colors=[0xc86e4e,0x7599a8,0xc1aa64,0x81946d,0x9a7c9e,0xd5d0b9],color=colors[index%colors.length];
 if(index%3===0){const bottle=mat({color,roughness:.38,metalness:.05});const body=box(.16,.42,.16,x,surfaceY+.21,z,bottle);body.rotation.z=(index%2?.08:-.08);box(.075,.1,.075,x,surfaceY+.47,z,mat({color:0x363d39}));}
 else box(.28,.35,.22,x,surfaceY+.175,z,mat({color,roughness:.86}));
}
// The survivors are already outside, walking together toward the supply store.
const asphalt=mat({color:0x292f30,roughness:1}),curb=mat({color:0x777b72,roughness:1}),grass=mat({color:0x42533f,roughness:1}),roadLine=mat({color:0xb2b5a6,roughness:1});
ground(22,52,0,-.01,-4,asphalt);
ground(2.1,52,-5.4,-.01,-4,curb);ground(2.1,52,5.4,-.01,-4,curb);
ground(4.2,52,-8.3,-.01,-4,grass);ground(4.2,52,8.3,-.01,-4,grass);
for(let z=19;z>-28;z-=6)box(.11,.012,2.2,0,-.004,z,roadLine);
for(const z of [12,3,-6,-15,-24]){addLamp(-5.9,z);addTree(-8.7,z-1,1.05);addTree(8.6,z-3,.9);}
addStreetBuilding(-12,-1,5.5,7,7.8,0x4e5a55,0x80958b);
addStreetBuilding(12,-9,6,8,8.5,0x59635c,0x8a9889);
addStreetBuilding(-12,-20,5.8,6.5,7.5,0x4c5752,0x83948b);
for(let z=14;z>-25;z-=4)makeCrate(-6.5,.28,z,0x72664d);

// The shop front opens into a small, believable convenience store.
const shopWall=mat({color:0x77786a,roughness:.95}),shopFloor=mat({color:0x77796e,roughness:.95});
const shelfMat=mat({color:0x51483b,roughness:.95}),shelfEdge=mat({color:0xaaa28c,roughness:.7});
const glass=mat({color:0x8da7a4,metalness:.18,roughness:.22,transparent:true,opacity:.35});
const darkGlass=mat({color:0x172321,roughness:.3,metalness:.22});
ground(9,16,0,-.005,-28,shopFloor);
box(.22,4.9,16,-4.45,2.4,-28,shopWall);box(.22,4.9,16,4.45,2.4,-28,shopWall);
box(9,4.9,.25,0,2.4,-36,shopWall);box(9,.25,16,0,4.9,-28,mat({color:0x474b42}));
box(9,.3,.5,0,4.55,-19.95,shopWall);
box(.75,3.25,.12,-1.55,1.65,-20.05,darkGlass);box(.75,3.25,.12,1.55,1.65,-20.05,darkGlass);
box(.07,2.6,.12,-.78,1.35,-20.06,shelfEdge);box(.07,2.6,.12,.78,1.35,-20.06,shelfEdge);
textPanel('NORTHWAY  /  SUPPLY',0,4.12,-19.78,5.9,.72,{background:'#1f2a27',color:'#d7dfce',border:'#788c7c'});
const shopLights=[];
for(const x of [-2.8,0,2.8]){
 box(1.9,.06,.32,x,4.67,-26.3,mat({color:0xbfc7b5,emissive:0xaabda7,emissiveIntensity:1.4}));
 const light=new THREE.PointLight(0xd8e0c9,18,8,2);light.position.set(x,4.2,-27);scene.add(light);shopLights.push(light);
}
function makeShelf(x,z){
 box(1.45,2.35,.24,x,1.18,z,shelfMat);
 for(const y of [.38,1.12,1.86])box(1.55,.08,.72,x,y,z+.22,shelfEdge);
 for(let row=0;row<3;row++)for(let i=0;i<5;i++)addProduct(x-.57+i*.285,.42+row*.74,z+.22,(i+row*5+(x>0?2:0))%12);
}
makeShelf(-3.45,-24.2);makeShelf(-3.45,-29.2);makeShelf(3.4,-24.3);makeShelf(3.4,-28.8);
for(const z of [-25.1,-30.1]){box(.12,3.2,.9,-4.15,1.6,z,darkGlass);for(let y=.45;y<3;y+=.75)box(.13,.035,.85,-4.05,y,z,glass);}
box(2.1,1.02,.85,-1.3,.52,-33.5,shelfMat);box(2.1,.07,.88,-1.3,1.05,-33.5,shelfEdge);
for(let i=0;i<7;i++)addProduct(-2.1+i*.26,1.085,-33.5,i);
textPanel('STAFF  /  STORAGE',2.45,3.7,-35.78,2.1,.42,{background:'#252b25',color:'#c4cabb'});
// The descending service ramp ends at the impossible, nearly invisible seam.
const rampAngle=-Math.PI/2-Math.atan(2.65/11.1),rampFloor=mat({color:0x4e514c,roughness:1});
const rampPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.35,11.1),rampFloor);
geometries.add(rampPlane.geometry);rampPlane.rotation.x=rampAngle;rampPlane.position.set(2.42,-1.32,-34.55);rampPlane.receiveShadow=true;scene.add(rampPlane);
const rampSide=mat({color:0x343c39,roughness:1});
box(.14,3.7,11.2,1.17,-.15,-34.55,rampSide,[rampAngle,0,0]);
box(.14,3.7,11.2,3.67,-.15,-34.55,rampSide,[rampAngle,0,0]);
for(const z of [-31,-34,-37])box(2.3,.035,.06,2.42,(z+29)*.238+.08,z,mat({color:0x69736a,emissive:0x1b241e,emissiveIntensity:.3}));
const rampEnd=mat({color:0x535b55,roughness:1,transparent:true,opacity:1,depthWrite:false});
const rampEndWall=box(2.55,3.9,.3,2.42,-.66,-40.18,rampEnd);
rampEndWall.castShadow=false;rampEndWall.receiveShadow=false;
const crackMaterial=basicMat({color:0xffd99a,transparent:true,opacity:1,toneMapped:false,depthWrite:false});
const crack=box(.009,3.9,.016,2.39,-.66,-39.99,crackMaterial);
crack.castShadow=false;crack.receiveShadow=false;
const crackGlow=new THREE.PointLight(0xffd7a1,0,2.8,2);crackGlow.position.set(2.4,-.66,-39.65);scene.add(crackGlow);
const wallLight=new THREE.PointLight(0x9aa89b,1.1,5,2);wallLight.position.set(2.4,-.1,-37);scene.add(wallLight);
const rampFill=new THREE.PointLight(0xdde6df,0,9,2);scene.add(rampFill);

// Bring the real Level Zero world into the cinematic. Its authored walls,
// ceiling grid, wallpaper, lighting and layout are the same ones used in-game.
const levelZero=createBackroomsWorld();
const backroomsGroup=new THREE.Group();backroomsGroup.name='real-level-zero-map';
backroomsGroup.position.set(9.55,-2.62,-58.3);backroomsGroup.visible=false;
for(const child of [...levelZero.scene.children])backroomsGroup.add(child);
const backroomsFloorGeometry=new THREE.PlaneGeometry(72,72);
backroomsFloorGeometry.rotateX(-Math.PI/2);geometries.add(backroomsFloorGeometry);
const backroomsFloor=new THREE.Mesh(backroomsFloorGeometry,mat({map:levelZero.surfaces.carpetTexture,roughness:1}));
backroomsFloor.position.set(6,.004,-6);backroomsFloor.receiveShadow=true;backroomsGroup.add(backroomsFloor);
scene.add(backroomsGroup);

// World lighting, atmospheric dust, and the two very different colour temperatures.
scene.add(new THREE.HemisphereLight(0xb9c7bd,0x1c2722,.92));
const moon=new THREE.DirectionalLight(0xb8c6c2,1.15);moon.position.set(-8,14,11);moon.castShadow=true;
moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-25;moon.shadow.camera.right=25;moon.shadow.camera.top=25;moon.shadow.camera.bottom=-25;scene.add(moon);
const streetGlow=new THREE.PointLight(0x8fae9d,2.8,24,2);streetGlow.position.set(-1,5,2);scene.add(streetGlow);
function createSoundscape(){
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C)return {start(){},setMuted(){},footstep(){},fx(){},dispose(){}};
 const context=new C(),master=context.createGain();master.gain.value=.22;master.connect(context.destination);
 const active=new Set();
 function oscillator(freq,type='sine',gain=.01,duration=1,endFreq=null){
  const osc=context.createOscillator(),level=context.createGain();osc.type=type;
  osc.frequency.setValueAtTime(freq,context.currentTime);
  if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),context.currentTime+duration);
  level.gain.setValueAtTime(.0001,context.currentTime);level.gain.linearRampToValueAtTime(gain,context.currentTime+.08);
  level.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);osc.connect(level);level.connect(master);
  active.add(osc);osc.onended=()=>{active.delete(osc);osc.disconnect();level.disconnect();};
  osc.start();osc.stop(context.currentTime+duration+.03);
 }
 let droneA,droneB,noiseSource;
 function start(){
  if(context.state==='suspended')void context.resume();if(droneA)return;
  droneA=context.createOscillator();droneB=context.createOscillator();
  const gainA=context.createGain(),gainB=context.createGain();
  droneA.type='sine';droneB.type='triangle';droneA.frequency.value=46;droneB.frequency.value=68;gainA.gain.value=.021;gainB.gain.value=.005;
  droneA.connect(gainA);droneB.connect(gainB);gainA.connect(master);gainB.connect(master);droneA.start();droneB.start();
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.11;
  noiseSource=context.createBufferSource();noiseSource.buffer=buffer;noiseSource.loop=true;
  const filter=context.createBiquadFilter(),noiseGain=context.createGain();filter.type='lowpass';filter.frequency.value=360;noiseGain.gain.value=.025;
  noiseSource.connect(filter);filter.connect(noiseGain);noiseGain.connect(master);noiseSource.start();
 }
 function footstep(){if(context.state!=='running')return;oscillator(76,'triangle',.045,.12,28);oscillator(118,'sine',.018,.08,50);}
 function fx(kind){
  if(context.state!=='running')return;
  if(kind==='store'){oscillator(740,'sine',.028,.34,520);setTimeout(()=>oscillator(990,'sine',.02,.32,720),110);}
  if(kind==='liminal'){oscillator(52,'sine',.075,2.1,24);oscillator(410,'triangle',.025,.7,92);}
  if(kind==='transition'){oscillator(130,'sine',.055,1.5,34);oscillator(680,'sine',.018,.8,180);}
 }
 function setMuted(value){master.gain.setTargetAtTime(value?0:.22,context.currentTime,.045);}
 function dispose(){try{droneA?.stop();droneB?.stop();noiseSource?.stop();}catch{}for(const node of active){try{node.stop();}catch{}}void context.close().catch(()=>{});}
 return {start,setMuted,footstep,fx,dispose};
}

function lerp(a,b,t){return a+(b-a)*THREE.MathUtils.clamp(t,0,1);}
function ease(t){const v=THREE.MathUtils.clamp(t,0,1);return v*v*(3-2*v);}
function cameraFor(time,lead){
 const look=new THREE.Vector3(),position=new THREE.Vector3();
 let fov=48;
 if(time<34){
  // Calm shoulder-height tracking while all three survivors walk to the store.
  position.set(lead.x+1.4,lead.y+2.45,lead.z+5.6);
  look.set(lead.x,lead.y+1.05,lead.z-2.3);
  if(time<18){position.x=lead.x+2.4;position.y=2.8;}
 }else if(time<43.4){
  // Directly behind the lead, centred between the rails so nothing crosses the frame.
  position.set(lead.x,lead.y+2.05,lead.z+5.15);
  look.set(lead.x,lead.y+.95,lead.z-1.7);fov=46;
 }else if(time<45.2){
  // Profile from just beyond the ramp's right rail. Stay outside the wall slab.
  position.set(lead.x+3.7,lead.y+1.5,lead.z+.55);
  look.set(lead.x,lead.y+1.42,lead.z-.12);fov=40;
 }else if(time<48.4){
  // Tight side close-up from the open edge, keeping both visor and reaching hand clear.
  position.set(lead.x+3.8,lead.y+1.5,lead.z+.55);
  look.set(lead.x+.08,lead.y+1.18,lead.z-.12);fov=33;
 }else if(time<53.5){
  // Track beside his face as the camera crosses the opening after the wall fades.
  position.set(lead.x+3.1,lead.y+1.15,lead.z+1.75);
  look.set(lead.x,lead.y+1.05,lead.z-.3);fov=39;
 }else{
  // Rise to an overhead rear three-quarter view without crossing back through
  // the arrival partition or clipping the existing Level Zero ceiling.
  const p=ease((time-53.5)/5.5);
  position.lerpVectors(
   new THREE.Vector3(lead.x+3.1,lead.y+1.15,lead.z+1.75),
   new THREE.Vector3(lead.x+3.2,lead.y+2.42,lead.z+3.6),p
  );
  look.lerpVectors(
   new THREE.Vector3(lead.x,lead.y+1.05,lead.z-.3),
   new THREE.Vector3(lead.x,lead.y+.78,lead.z-1.1),p
  );fov=lerp(39,62,p);
 }
 camera.fov=fov;camera.updateProjectionMatrix();
 camera.position.copy(position);camera.lookAt(look);
}
function captionFor(time){return MONOCHROME2_DIALOGUE.find(cue=>time>=cue.at&&time<cue.end)??null;}
function refreshVoices(){
 const all=window.speechSynthesis?.getVoices?.()??[];
 const english=all.filter(voice=>/^en[-_]/i.test(voice.lang));
 if(!english.length)return;
 const preferred=english.slice().sort((a,b)=>{
  const rank=voice=>(/en[-_]AU/i.test(voice.lang)?4:/en[-_]GB/i.test(voice.lang)?3:/en[-_]US/i.test(voice.lang)?2:1);
  return rank(b)-rank(a);
 });
 const profiles=[
  ['lead',[/daniel|alex|oliver|arthur|fred|aaron|tom/i]],
  ['friend1',[/karen|moira|samantha|tessa|fiona|victoria|serena/i]],
  ['friend2',[/eddy|lee|rishi|google.*english|ava|zoe|susan/i]]
 ];
 const used=new Set(),next=new Map();
 for(const [speaker,patterns] of profiles){
  let voice=null;
  for(const pattern of patterns){voice=preferred.find(item=>pattern.test(item.name)&&!used.has(item.name));if(voice)break;}
  if(!voice)voice=preferred.find(item=>!used.has(item.name));
  if(voice){used.add(voice.name);next.set(speaker,voice);}
 }
 voiceChoices=next;
}
window.speechSynthesis?.getVoices?.();
if('speechSynthesis'in window){window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoices);refreshVoices();}
function say(cue){
 if(muted||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
 const utterance=new SpeechSynthesisUtterance(cue.text),voice=voiceChoices.get(cue.voice);
 if(voice)utterance.voice=voice;
 utterance.lang=voice?.lang??'en-AU';utterance.rate=cue.rate??.94;utterance.pitch=cue.pitch??1;utterance.volume=.98;
 window.speechSynthesis.speak(utterance);
}
function updateNarration(time){
 for(const cue of MONOCHROME2_DIALOGUE)if(time>=cue.at&&!shotSounds.has('voice:'+cue.id)){shotSounds.add('voice:'+cue.id);say(cue);}
 const cue=captionFor(time),key=cue?.id??'';
 if(key!==lastCaption){lastCaption=key;subtitleSpeaker.textContent=cue?.speaker??'';subtitleText.textContent=cue?.text??'';subtitle.classList.toggle('visible',!!cue);}
}
function showTitle(){titlePanel.classList.remove('hidden');titlePanel.classList.add('visible');}
function reset(){
 if(window.speechSynthesis)window.speechSynthesis.cancel();
 shotSounds.clear();lastCaption='';subtitle.classList.remove('visible');
 titlePanel.classList.remove('visible');titlePanel.classList.add('hidden');startPanel.classList.add('hidden');
 previousPoseTime=null;previousActorPositions=[null,null,null];walkAnimationTimes=[0,0,0];leadTravelDistance=0;nextFootstepDistance=.72;
 backroomsGroup.visible=false;rampEndWall.visible=true;rampEnd.opacity=1;fadeLayer.style.opacity='0';
 scene.background.copy(introBackground);scene.fog.color.copy(introFogColor);scene.fog.density=.0125;
 started=true;startAt=performance.now();audio?.start();audio?.setMuted(muted);
}
function update(t){
 const state=sampleMonochrome2(t),poses=sampleMonochrome2Actors(t);
 const frameDelta=previousPoseTime===null?0:Math.max(0,t-previousPoseTime);
 actors.forEach((actor,index)=>{
  const p=poses[index],position=new THREE.Vector3(p.x,p.y,p.z),previous=previousActorPositions[index];
  const travel=previous?position.distanceTo(previous):0;
  if(p.clip==='Walk'&&frameDelta>0&&travel>0){
   // Drive the baked foot cycle and footsteps from actual ground distance.
   walkAnimationTimes[index]+=travel/2.5;
   if(index===0&&t<53.5){
    leadTravelDistance+=travel;
    while(leadTravelDistance>=nextFootstepDistance){audio?.footstep();nextFootstepDistance+=.72;}
   }
  }
  const options={
   clip:p.clip,time:p.clip==='Walk'?walkAnimationTimes[index]:t*.42,
   position:[p.x,p.y,p.z],yaw:p.yaw,action:p.action??'none',progress:p.progress??0,
   headTurn:p.headTurn??0,headTilt:p.headTilt??0,torsoLean:p.torsoLean??0
  };
  if(p.handTarget){options.handTarget=p.handTarget;options.progress=p.handProgress??0;}
  actor.sampleCinematic(options);
  previousActorPositions[index]=position;
 });
 previousPoseTime=t;
 cameraFor(t,poses[0]);
 shopLights.forEach(light=>{light.intensity=t>22?17:4;});
 const crackDistance=Math.hypot(poses[0].x-2.39,poses[0].z+39.99);
 const crackVisibility=state.crack*ease((crackDistance-.005)/.055);
 crackMaterial.opacity=crackVisibility;crackGlow.intensity=crackVisibility*2.6;crack.visible=crackVisibility>.015;
 wallLight.intensity=t>44.2?1.55:.95;
 rampFill.position.set(poses[0].x+2.8,poses[0].y+2.1,poses[0].z+2.0);
 rampFill.intensity=t>=34&&t<54?3.8:0;
 rampEnd.opacity=1-state.fallThrough;rampEndWall.visible=state.fallThrough<.995;
 backroomsGroup.visible=state.backrooms>.001;
 if(state.backrooms>0){
  const localPlayer={x:poses[0].x-backroomsGroup.position.x,y:0,z:poses[0].z-backroomsGroup.position.z};
  levelZero.update(t,localPlayer,prefersReducedMotion);
  scene.background.lerpColors(introBackground,levelZero.scene.background,state.backrooms);
  scene.fog.color.lerpColors(introFogColor,levelZero.scene.fog.color,state.backrooms);
  scene.fog.density=lerp(.0125,levelZero.scene.fog.density,state.backrooms);
  streetGlow.intensity=lerp(2.8,.12,state.backrooms);
 }
 if(t>=29&&!shotSounds.has('store')){shotSounds.add('store');audio?.fx('store');}
 if(t>=44&&!shotSounds.has('liminal')){shotSounds.add('liminal');audio?.fx('liminal');}
 if(t>=48.4&&!shotSounds.has('transition')){shotSounds.add('transition');audio?.fx('transition');}
 updateNarration(t);
 progressBar.style.width=(100*t/MONOCHROME2_DURATION)+'%';
 fadeLayer.style.opacity=state.fade.toFixed(3);
 if(t>=64.5)showTitle();
 renderer.render(scene,camera);
}
function animate(now){
 if(disposed)return;
 if(started){const time=Math.min(MONOCHROME2_DURATION,(now-startAt)/1000);update(time);}
 else renderer.render(scene,camera);
 lastFrame=now;
}
function resize(){
 camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.setSize(window.innerWidth,window.innerHeight);
}
function cleanup(){
 if(disposed)return;disposed=true;renderer.setAnimationLoop(null);window.removeEventListener('resize',resize);window.removeEventListener('pagehide',cleanup);
 if(window.speechSynthesis)window.speechSynthesis.cancel();
 audio?.dispose();actors.forEach(actor=>actor.dispose());levelZero.dispose();
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
 textures.forEach(texture=>texture.dispose());renderer.dispose();renderer.domElement.remove();ui.remove();document.body.classList.remove('monochrome2-intro');
}
window.addEventListener('resize',resize);window.addEventListener('pagehide',cleanup,{once:true});
audio=createSoundscape();
startButton.addEventListener('click',()=>{if(!started){reset();startButton.blur();}});
replayButton.addEventListener('click',()=>reset());
soundButton.addEventListener('click',()=>{
 muted=!muted;soundButton.textContent=muted?'SOUND OFF':'SOUND ON';soundButton.setAttribute('aria-pressed',String(muted));
 audio?.setMuted(muted);if(muted&&window.speechSynthesis)window.speechSynthesis.cancel();
});
const ready=loadPlayerAvatarAsset().then(asset=>{
 if(disposed)return;
 actors.push(
  createPlayerAvatar(asset,{id:'monochrome2-lead',name:'LEAD',slot:0}),
  createPlayerAvatar(asset,{id:'monochrome2-riley',name:'RILEY',slot:1}),
  createPlayerAvatar(asset,{id:'monochrome2-jamie',name:'JAMIE',slot:2})
 );
 actors.forEach(actor=>scene.add(actor.root));
 startButton.disabled=false;startButton.textContent='PLAY CINEMATIC';
}).catch(error=>{
 console.error('MONOCHROME 2 survivor models could not load:',error);
 startButton.disabled=true;startButton.textContent='MODEL LOAD FAILED';
 subtitleSpeaker.textContent='SYSTEM';subtitleText.textContent='The survivor model could not be loaded. Please reload the page.';subtitle.classList.add('visible');
});
void ready;
renderer.setAnimationLoop(animate);
export function startMonochrome2Intro(){return {ready,dispose:cleanup};}
