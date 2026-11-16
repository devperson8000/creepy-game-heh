import * as THREE from 'three';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createBackroomsWorld} from './backrooms-world.js';
import {createCreature,applyRunning} from './creature.js';
import {MONOCHROME2_DIALOGUE,MONOCHROME2_DURATION,sampleMonochrome2,sampleMonochrome2Actors,monochrome2CrackVisibility,monochrome2FootPlantOffset,monochrome2NoclipCueGain,monochrome2ShopDoorOpen,MONOCHROME2_STAIR_OPENING} from './monochrome2-intro-timeline.js';
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
const leadHeadPoint=new THREE.Vector3();
let voiceChoices=new Map(),activeSpeechCue=null,narrationEpoch=0;
const subtitleTimers=new Map();
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
  if(xx<x+w/2-.35)box(.82,1.25,.07,xx,yy,z+d/2+.08,glassMat);
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
// Adjacent road bands meet edge-to-edge; no coplanar overlapping surfaces.
ground(10.8,52,0,-.01,-4,asphalt);
ground(.72,52,-5.76,-.01,-4,curb);ground(.72,52,5.76,-.01,-4,curb);
ground(4.5,52,-8.37,-.01,-4,grass);ground(4.5,52,8.37,-.01,-4,grass);
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
// The shop floor is built around a real stairwell void. A single continuous
// floor sheet used to cover the steps and hide the survivor below the surface.
const stairOpening=MONOCHROME2_STAIR_OPENING;
const openingWidth=stairOpening.right-stairOpening.left;
const openingFrontDepth=-20-stairOpening.front;
const openingCenterX=(stairOpening.left+stairOpening.right)/2;
ground(stairOpening.left+4.5,16,-4.5+(stairOpening.left+4.5)/2,-.005,-28,shopFloor);
ground(4.5-stairOpening.right,16,stairOpening.right+(4.5-stairOpening.right)/2,-.005,-28,shopFloor);
ground(openingWidth,openingFrontDepth,openingCenterX,-.005,(-20+stairOpening.front)/2,shopFloor);
box(.22,4.9,16,-4.45,2.4,-28,shopWall);box(.22,4.9,16,4.45,2.4,-28,shopWall);
// Continue the stairwell through the rear shop wall instead of letting the
// character or steps pass through a solid wall at the bottom of the floor.
box(stairOpening.left+4.5,4.9,.25,-4.5+(stairOpening.left+4.5)/2,2.4,-36,shopWall);
box(4.5-stairOpening.right,4.9,.25,stairOpening.right+(4.5-stairOpening.right)/2,2.4,-36,shopWall);
box(openingWidth,1.05,.25,openingCenterX,4.375,-36,shopWall);
box(9,.25,16,0,4.9,-28,mat({color:0x474b42}));

// Complete shopfront: solid piers, display glazing, and a proper double-door
// entrance. The hinged doors swing into the store as the three survivors arrive.
const shopFrontFrame=mat({color:0x3d4943,metalness:.48,roughness:.62});
box(1.25,4.8,.24,-3.875,2.4,-20.05,shopWall);
box(1.25,4.8,.24,3.875,2.4,-20.05,shopWall);
box(9,.34,.24,0,.17,-20.05,shopWall);
box(9,.78,.24,0,4.39,-20.05,shopWall);
for(const x of [-2.475,2.475]){
 box(1.55,3.1,.09,x,1.94,-20.06,glass);
 for(const edge of [-.775,.775])box(.055,3.16,.11,x+edge,1.94,-20.035,shopFrontFrame);
 box(1.58,.055,.11,x,.38,-20.035,shopFrontFrame);
 box(1.58,.055,.11,x,3.5,-20.035,shopFrontFrame);
}
const shopDoors=[];
for(const door of [{hingeX:-1.7,side:1},{hingeX:1.7,side:-1}]){
 const pivot=new THREE.Group();
 pivot.position.set(door.hingeX,.34,-20.065);
 scene.add(pivot);
 const leafWidth=1.7,leafHeight=2.76,leafDepth=.075;
 const leaf=new THREE.Mesh(new THREE.BoxGeometry(leafWidth,leafHeight,leafDepth),glass);
 geometries.add(leaf.geometry);leaf.position.set(door.side*leafWidth/2,leafHeight/2,0);
 leaf.castShadow=false;leaf.receiveShadow=true;pivot.add(leaf);
 const bar=(w,h,d,x,y,z)=>{
  const geometry=new THREE.BoxGeometry(w,h,d);geometries.add(geometry);
  const mesh=new THREE.Mesh(geometry,shopFrontFrame);mesh.position.set(x,y,z);
  mesh.castShadow=false;mesh.receiveShadow=true;pivot.add(mesh);
 };
 bar(.055,leafHeight,.085,0,leafHeight/2,.045);
 bar(.055,leafHeight,.085,door.side*leafWidth,leafHeight/2,.045);
 bar(leafWidth,.055,.085,door.side*leafWidth/2,.03,.045);
 bar(leafWidth,.055,.085,door.side*leafWidth/2,leafHeight-.03,.045);
 bar(.045,.55,.09,door.side*(leafWidth-.13),1.42,.075);
 shopDoors.push({pivot,direction:door.side});
}
box(.07,3.12,.14,-1.7,1.9,-20.05,shopFrontFrame);
box(.07,3.12,.14,1.7,1.9,-20.05,shopFrontFrame);
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
// Twelve proper stair treads replace the hard-to-read shallow ramp. The survivor's
// feet follow the same eased step heights in the cinematic timeline.
const stairFloor=mat({color:0x4e514c,roughness:1}),stairRiser=mat({color:0x333a36,roughness:1});
const stairNosing=mat({color:0x737a6e,emissive:0x171e19,emissiveIntensity:.28,roughness:.9});
const stairCount=12,stairStart=-29,stairEnd=-39.92,stairRun=(stairStart-stairEnd)/stairCount,stairRise=2.62/stairCount;
for(let i=0;i<stairCount;i++){
 const topY=-i*stairRise,edgeZ=stairStart-(i+1)*stairRun,centerZ=stairStart-(i+.5)*stairRun;
 box(2.35,.14,stairRun+.018,2.42,topY-.07,centerZ,stairFloor);
 box(2.35,stairRise,.075,2.42,topY-stairRise/2,edgeZ-.038,stairRiser);
 box(2.35,.022,.055,2.42,topY+.006,edgeZ-.065,stairNosing);
}
const rampAngle=-Math.PI/2-Math.atan(2.62/10.92),rampSide=mat({color:0x343c39,roughness:1});
box(.16,3.65,11.1,1.15,-1.3,-34.46,rampSide,[rampAngle,0,0]);
box(.16,3.65,11.1,3.69,-1.3,-34.46,rampSide,[rampAngle,0,0]);
const rampEnd=mat({color:0x535b55,roughness:1,transparent:true,opacity:1,depthWrite:false});
const rampEndWall=box(2.55,3.9,.3,2.42,-.66,-40.18,rampEnd);
rampEndWall.castShadow=false;rampEndWall.receiveShadow=false;
const crackMaterial=basicMat({color:0xffd99a,transparent:true,opacity:1,toneMapped:false,depthWrite:false});
const crack=box(.0022,3.9,.006,2.39,-.66,-39.99,crackMaterial);
crack.castShadow=false;crack.receiveShadow=false;
const crackGlow=new THREE.PointLight(0xffd7a1,0,.9,2);crackGlow.position.set(2.4,-.66,-39.65);scene.add(crackGlow);
const wallLight=new THREE.PointLight(0x9aa89b,1.1,5,2);wallLight.position.set(2.4,-.1,-37);scene.add(wallLight);
const rampFill=new THREE.PointLight(0xdde6df,0,9,2);scene.add(rampFill);

// Bring the real Level Zero world into the cinematic. Its authored walls,
// ceiling grid, wallpaper, lighting and layout are the same ones used in-game.
const levelZero=createBackroomsWorld();
const backroomsGroup=new THREE.Group();backroomsGroup.name='real-level-zero-map';
backroomsGroup.position.set(9.55,-2.62,-58.3);backroomsGroup.visible=false;
for(const child of [...levelZero.scene.children])backroomsGroup.add(child);
scene.add(backroomsGroup);

// Use the game's own Monochrome model as a distant, silent silhouette.
// No creature sound is attached to this cameo.
const monochrome=createCreature(),monochromeMaterial=basicMat({color:0x010101});
monochrome.root.name='distant-monochrome-silhouette';
monochrome.root.scale.setScalar(.52);monochrome.root.rotation.y=Math.PI/2;monochrome.root.visible=false;
monochrome.root.traverse(object=>{
 if(!object.isMesh)return;
 geometries.add(object.geometry);
 const prior=Array.isArray(object.material)?object.material:[object.material];
 prior.forEach(surface=>{if(surface)materials.add(surface);});
 object.material=monochromeMaterial;object.castShadow=false;object.receiveShadow=false;
});
materials.add(monochromeMaterial);
backroomsGroup.add(monochrome.root);

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
function cameraFor(time,lead,headPoint){
 const look=new THREE.Vector3(),position=new THREE.Vector3();
 let fov=48;
 if(time<34){
  position.set(lead.x+1.4,lead.y+2.45,lead.z+5.6);
  look.set(lead.x,lead.y+1.05,lead.z-2.3);
  if(time<18){position.x=lead.x+2.4;position.y=2.8;}
 }else if(time<43.4){
  // Rear tracking down the stairs, with both stair edges inside the frame.
  // A higher, downward-looking follow shot keeps the stair treads in view
  // and makes the descent readable instead of framing only the landing wall.
  position.set(lead.x-.72,lead.y+3.4,lead.z+4.9);
  look.set(lead.x,lead.y-.35,lead.z-2.8);fov=49;
 }else if(time<49.05){
  // The camera stays just beyond the wall's right edge, framing the head and hand.
  position.copy(headPoint).add(new THREE.Vector3(3.35,.16,.55));
  look.copy(headPoint).add(new THREE.Vector3(0,-.03,-.12));fov=37;
 }else if(time<50.35){
  // Follow the same head point through the opening as the character falls.
  position.copy(headPoint).add(new THREE.Vector3(2.75,.16,.82));
  look.copy(headPoint).add(new THREE.Vector3(0,-.1,-.2));fov=40;
 }else if(time<53){
  const p=ease((time-50.35)/2.65);
  position.copy(headPoint).add(new THREE.Vector3(lerp(2.75,4.45,p),.14,lerp(.82,4.4,p)));
  look.copy(headPoint).add(new THREE.Vector3(0,-.18,-.3));fov=lerp(40,58,p);
 }else{
  // Ease from the low recovery view into a medium close-up, leaving enough
  // depth behind him to read the distant silent silhouette.
  const p=ease((time-59)/1.2);
  position.lerpVectors(
   headPoint.clone().add(new THREE.Vector3(4.45,.14,4.4)),
   headPoint.clone().add(new THREE.Vector3(2.2,.12,2.75)),p
  );
  look.copy(headPoint).add(new THREE.Vector3(0,-.06,-.12));fov=lerp(58,51,p);
 }
 if(time>=50.35)position.y=Math.min(position.y,backroomsGroup.position.y+2.68);
 camera.fov=fov;camera.updateProjectionMatrix();
 camera.position.copy(position);camera.lookAt(look);
}
function showSubtitle(cue){
 activeSpeechCue=cue;subtitleSpeaker.textContent=cue.speaker;subtitleText.textContent=cue.text;subtitle.classList.add('visible');
}
function clearSubtitle(cue){
 if(activeSpeechCue?.id!==cue.id)return;
 activeSpeechCue=null;subtitle.classList.remove('visible');
}
function fallbackSubtitle(cue){
 const old=subtitleTimers.get(cue.id);if(old)window.clearTimeout(old);
 showSubtitle(cue);
 const duration=Math.max(1.2,Math.min(6.5,cue.text.length/(12.5*(cue.rate??1))));
 const timer=window.setTimeout(()=>{subtitleTimers.delete(cue.id);clearSubtitle(cue);},duration*1000);
 subtitleTimers.set(cue.id,timer);
}
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
 if(muted||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){fallbackSubtitle(cue);return;}
 const epoch=narrationEpoch,utterance=new SpeechSynthesisUtterance(cue.text),voice=voiceChoices.get(cue.voice);
 if(voice)utterance.voice=voice;
 utterance.lang=voice?.lang??'en-AU';utterance.rate=cue.rate??.94;utterance.pitch=cue.pitch??1;utterance.volume=.98;
 let began=false;
 utterance.onstart=()=>{
  if(epoch!==narrationEpoch)return;
  began=true;
  const timer=subtitleTimers.get(cue.id);if(timer)window.clearTimeout(timer);
  subtitleTimers.delete(cue.id);showSubtitle(cue);
 };
 utterance.onend=()=>{if(epoch===narrationEpoch)clearSubtitle(cue);};
 utterance.onerror=()=>{
  if(epoch!==narrationEpoch)return;
  if(!began&&!muted)fallbackSubtitle(cue);else clearSubtitle(cue);
 };
 window.speechSynthesis.speak(utterance);
}
function updateNarration(time){
 for(const cue of MONOCHROME2_DIALOGUE)if(time>=cue.at&&!shotSounds.has('voice:'+cue.id)){shotSounds.add('voice:'+cue.id);say(cue);}
}
function showTitle(){titlePanel.classList.remove('hidden');titlePanel.classList.add('visible');}
function reset(){
 narrationEpoch++;if(window.speechSynthesis)window.speechSynthesis.cancel();
 subtitleTimers.forEach(timer=>window.clearTimeout(timer));subtitleTimers.clear();activeSpeechCue=null;
 shotSounds.clear();lastCaption='';subtitle.classList.remove('visible');
 titlePanel.classList.remove('visible');titlePanel.classList.add('hidden');startPanel.classList.add('hidden');
 previousPoseTime=null;previousActorPositions=[null,null,null];walkAnimationTimes=[0,0,0];leadTravelDistance=0;nextFootstepDistance=.72;
 backroomsGroup.visible=false;monochrome.root.visible=false;rampEndWall.visible=true;rampEnd.opacity=1;fadeLayer.style.opacity='0';
 noclipCue.pause();noclipCue.currentTime=0;noclipCue.volume=.72;noclipCueStarted=false;noclipCueStopped=false;
 scene.background.copy(introBackground);scene.fog.color.copy(introFogColor);scene.fog.density=.0125;
 started=true;startAt=performance.now();audio?.start();audio?.setMuted(muted);
}
function update(t){
 const state=sampleMonochrome2(t),poses=sampleMonochrome2Actors(t);
 if(t>=46.55&&!noclipCueStarted){
  noclipCueStarted=true;noclipCue.currentTime=0;noclipCue.muted=muted;noclipCue.play().catch(()=>{});
 }
 const cueDuck=activeSpeechCue&&(activeSpeechCue.id?.startsWith('descending')||['sound','light','wall'].includes(activeSpeechCue.id))?.48:1;
 noclipCue.volume=monochrome2NoclipCueGain(t,cueDuck);
 if(state.fade>=.999&&!noclipCueStopped){noclipCue.pause();noclipCue.currentTime=0;noclipCueStopped=true;}
 const frameDelta=previousPoseTime===null?0:Math.max(0,t-previousPoseTime);
 actors.forEach((actor,index)=>{
  const p=poses[index],position=new THREE.Vector3(p.x,p.y,p.z),previous=previousActorPositions[index];
  const travel=previous?position.distanceTo(previous):0;
  if(p.clip==='Walk'&&frameDelta>0&&travel>0){
   // Drive the baked foot cycle and footsteps from actual ground distance.
   walkAnimationTimes[index]+=travel/(index===0&&t>=34&&t<43.4?1.35:2.5);
   if(index===0&&t<53.5){
    leadTravelDistance+=travel;
    while(leadTravelDistance>=nextFootstepDistance){audio?.footstep();nextFootstepDistance+=.72;}
   }
  }
  const options={
   clip:p.clip,time:p.clip==='Walk'?walkAnimationTimes[index]:t*.42,
   position:[p.x,p.y,p.z],yaw:p.yaw,action:p.action??'none',progress:p.progress??0,
   headTurn:p.headTurn??0,headTilt:p.headTilt??0,torsoLean:p.torsoLean??0,crouch:p.crouch??0
  };
  if(p.handTarget){options.handTarget=p.handTarget;options.progress=p.handProgress??0;}
  actor.sampleCinematic(options);
  if(index===0&&t>=34&&t<43.4){
   actor.root.position.y+=monochrome2FootPlantOffset(actor.getFootWorldPositions());
   actor.root.updateMatrixWorld(true);
  }
  previousActorPositions[index]=position;
 });
 previousPoseTime=t;
 actors[0].getHeadWorldPosition(leadHeadPoint);
 cameraFor(t,poses[0],leadHeadPoint);
 shopLights.forEach(light=>{light.intensity=t>22?17:4;});
 const doorOpen=monochrome2ShopDoorOpen(t);
 shopDoors.forEach(({pivot,direction})=>{pivot.rotation.y=direction*doorOpen*(Math.PI/2);});
 const crackDistance=Math.hypot(poses[0].x-2.39,poses[0].z+39.99);
 const crackVisibility=monochrome2CrackVisibility(state.crack,crackDistance);
 crackMaterial.opacity=crackVisibility;crackGlow.intensity=crackVisibility*.14;crack.visible=crackVisibility>.015;
 wallLight.intensity=t>44.2?1.55:.95;
 rampFill.position.set(poses[0].x+2.8,poses[0].y+2.1,poses[0].z+2.0);
 rampFill.intensity=t>=34&&t<54?3.8:0;
 rampEnd.opacity=1-state.fallThrough;rampEndWall.visible=state.fallThrough<.995;
 backroomsGroup.visible=state.backrooms>.001;
 monochrome.root.visible=Boolean(state.monochromeActive)&&state.backrooms>.8;
 if(monochrome.root.visible){
  const run=state.monochromeRun;
  monochrome.root.position.set(lerp(-7.2,6.2,run),0,-2);
  monochrome.root.rotation.y=Math.PI/2;
  applyRunning(monochrome,(t-63.6)*1.7,1);
 }
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
 if(t>=68.5)showTitle();
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
 audio?.dispose();noclipCue.pause();actors.forEach(actor=>actor.dispose());levelZero.dispose();
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
 textures.forEach(texture=>texture.dispose());renderer.dispose();renderer.domElement.remove();ui.remove();document.body.classList.remove('monochrome2-intro');
}
window.addEventListener('resize',resize);window.addEventListener('pagehide',cleanup,{once:true});
audio=createSoundscape();
const noclipCue=new Audio('/audio/monochrome2/noclip-build-12s.mp3');
noclipCue.preload='auto';noclipCue.loop=true;noclipCue.volume=.72;
let noclipCueStarted=false,noclipCueStopped=false;
startButton.addEventListener('click',()=>{if(!started){reset();startButton.blur();}});
replayButton.addEventListener('click',()=>reset());
soundButton.addEventListener('click',()=>{
 muted=!muted;soundButton.textContent=muted?'SOUND OFF':'SOUND ON';soundButton.setAttribute('aria-pressed',String(muted));
 audio?.setMuted(muted);noclipCue.muted=muted;if(muted&&window.speechSynthesis){narrationEpoch++;window.speechSynthesis.cancel();activeSpeechCue=null;subtitle.classList.remove('visible');}
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
