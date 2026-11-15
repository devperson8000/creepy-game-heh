import * as THREE from 'three';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {MONOCHROME2_DIALOGUE,MONOCHROME2_DURATION,sampleMonochrome2} from './monochrome2-intro-timeline.js';
import './monochrome2-intro.css';

const root=document.querySelector('#scene');
if(!root)throw new Error('MONOCHROME 2 intro requires #scene');
document.body.classList.add('monochrome2-intro');
root.setAttribute('aria-label','MONOCHROME 2: Into the Backrooms cinematic');
const ui=document.createElement('div');
ui.className='m2-ui';
ui.innerHTML=
 '<div class="m2-topline"><strong>MONOCHROME ARCHIVE</strong><span>FIELD RECORDING / 002</span></div>'+
 '<div class="m2-subtitle" aria-live="polite"><b></b><span></span></div>'+
 '<div class="m2-progress"><i></i></div>'+
 '<div class="m2-start"><div class="m2-start-card"><div class="m2-kicker">A NEW STORY BEGINS</div><h1>THE WAY OUT<br>WAS NOT THE END.</h1><p>Three survivors. One supply run. A wall that should not have been there.</p><button class="m2-play" type="button" disabled>LOADING SURVIVORS…</button></div></div>'+
 '<button class="m2-sound" type="button" aria-pressed="false">SOUND ON</button>'+
 '<div class="m2-title hidden"><div class="m2-title-inner"><div class="m2-kicker">THE NEXT CHAPTER</div><h2>MONOCHROME 2<span>IN THE BACKROOMS</span></h2><div class="m2-rule"></div><button class="m2-replay" type="button">REPLAY INTRO</button></div></div>';
document.body.append(ui);
const startButton=ui.querySelector('.m2-play');
const replayButton=ui.querySelector('.m2-replay');
const soundButton=ui.querySelector('.m2-sound');
const startPanel=ui.querySelector('.m2-start');
const titlePanel=ui.querySelector('.m2-title');
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
scene.background=new THREE.Color(0x202a2a);
scene.fog=new THREE.FogExp2(0x65716d,.0125);
const camera=new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,.08,160);
scene.add(camera);
const geometries=new Set(),materials=new Set(),textures=new Set(),actors=[];
let disposed=false,started=false,startAt=0,lastFrame=0,lastFootstep=-1,lastCaption='',muted=false,audio=null;
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
function makeCrate(x,y,z,color){const material=mat({color,roughness:.96});box(.42,.58,.42,x,y,z,material);box(.43,.07,.44,x,y+.06,z,mat({color:0xddd0a4}));}
function addProduct(x,y,z,index){
 const colors=[0xc86e4e,0x7599a8,0xc1aa64,0x81946d,0x9a7c9e,0xd5d0b9],color=colors[index%colors.length];
 if(index%3===0){const bottle=mat({color,roughness:.38,metalness:.05});const body=box(.16,.42,.16,x,y,z,bottle);body.rotation.z=(index%2?.08:-.08);box(.075,.1,.075,x,y+.25,z,mat({color:0x363d39}));}
 else box(.28,.35,.22,x,y,z,mat({color,roughness:.86}));
}
function makeWallpaper(){
 return canvasTex(512,512,(c,s)=>{
  c.fillStyle='#b9b078';c.fillRect(0,0,s,s);
  for(let x=0;x<s;x+=30){c.strokeStyle='#80784e55';c.lineWidth=2;c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke();for(let y=0;y<s;y+=54){c.beginPath();c.moveTo(x+5,y+30);c.lineTo(x+15,y+18);c.lineTo(x+25,y+30);c.stroke();}}
  for(let i=0;i<19000;i++){c.fillStyle=i%2?'#fff3be12':'#30281512';c.fillRect(Math.random()*s,Math.random()*s,1,2);}
 });
}
function makeCarpet(){
 return canvasTex(512,512,(c,s)=>{
  c.fillStyle='#a99b72';c.fillRect(0,0,s,s);
  for(let i=0;i<85000;i++){c.fillStyle=i%3?'#64583a28':'#e0cb8a35';c.fillRect(Math.random()*s,Math.random()*s,1,2);}
 });
}

// The outdoor escape route, beginning immediately outside the original elevator.
const asphalt=mat({color:0x292f30,roughness:1}),curb=mat({color:0x777b72,roughness:1}),grass=mat({color:0x42533f,roughness:1}),roadLine=mat({color:0xb2b5a6,roughness:1});
ground(22,52,0,-.01,-4,asphalt);
ground(2.1,52,-5.4,-.01,-4,curb);ground(2.1,52,5.4,-.01,-4,curb);
ground(4.2,52,-8.3,-.01,-4,grass);ground(4.2,52,8.3,-.01,-4,grass);
for(let z=19;z>-28;z-=6)box(.11,.012,2.2,0,.005,z,roadLine);
for(const z of [12,3,-6,-15,-24]){addLamp(-5.9,z);addTree(-8.7,z-1,1.05);addTree(8.6,z-3,.9);}
addStreetBuilding(-12,-1,5.5,7,7.8,0x4e5a55,0x80958b);
addStreetBuilding(12,-9,6,8,8.5,0x59635c,0x8a9889);
addStreetBuilding(-12,-20,5.8,6.5,7.5,0x4c5752,0x83948b);
for(let z=14;z>-25;z-=4)makeCrate(-6.5,.28,z,0x72664d);
const elevatorWall=mat({color:0x333c3c,metalness:.48,roughness:.56});
const elevatorDoor=mat({color:0x68716d,metalness:.68,roughness:.34});
const elevatorTrim=mat({color:0x151c1b,metalness:.5,roughness:.5});
box(1.05,5.1,.35,-1.68,2.5,13,elevatorWall);box(1.05,5.1,.35,1.68,2.5,13,elevatorWall);box(2.3,1.15,.35,0,4.48,13,elevatorWall);
box(.12,4.3,.16,-1.2,2.15,12.78,elevatorTrim);box(.12,4.3,.16,1.2,2.15,12.78,elevatorTrim);
const elevatorDoors=[box(1.15,3.9,.16,-.58,2,12.72,elevatorDoor),box(1.15,3.9,.16,.58,2,12.72,elevatorDoor)];
box(2.5,.16,.24,0,4.22,12.7,elevatorTrim);
textPanel('ELEVATOR  /  EXIT',0,4.68,12.78,2.9,.42,{background:'#1a2220',color:'#d7ded3'});
const elevatorLight=new THREE.PointLight(0xb9d2c2,2.4,8,2);elevatorLight.position.set(0,3.5,11.9);scene.add(elevatorLight);

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
 for(let row=0;row<3;row++)for(let i=0;i<5;i++)addProduct(x-.57+i*.285,.65+row*.74,z+.22,(i+row*5+(x>0?2:0))%12);
}
makeShelf(-3.45,-24.2);makeShelf(-3.45,-29.2);makeShelf(3.4,-24.3);makeShelf(3.4,-28.8);
for(const z of [-25.1,-30.1]){box(.12,3.2,.9,-4.15,1.6,z,darkGlass);for(let y=.45;y<3;y+=.75)box(.13,.035,.85,-4.05,y,z,glass);}
box(2.1,1.02,.85,-1.3,.52,-33.5,shelfMat);box(2.1,.07,.88,-1.3,1.05,-33.5,shelfEdge);
for(let i=0;i<7;i++)addProduct(-2.1+i*.26,1.28,-33.5,i);
textPanel('STAFF  /  STORAGE',2.45,3.7,-35.78,2.1,.42,{background:'#252b25',color:'#c4cabb'});
// The descending service ramp ends at the impossible, nearly invisible seam.
const rampAngle=-Math.PI/2-Math.atan(2.65/11.1),rampFloor=mat({color:0x4e514c,roughness:1});
const rampPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.35,11.1),rampFloor);
geometries.add(rampPlane.geometry);rampPlane.rotation.x=rampAngle;rampPlane.position.set(2.42,-1.32,-34.55);rampPlane.receiveShadow=true;scene.add(rampPlane);
const rampSide=mat({color:0x343c39,roughness:1});
box(.14,3.7,11.2,1.17,-.15,-34.55,rampSide,[rampAngle,0,0]);
box(.14,3.7,11.2,3.67,-.15,-34.55,rampSide,[rampAngle,0,0]);
for(const z of [-31,-34,-37])box(2.3,.035,.06,2.42,(z+29)*.238+.08,z,mat({color:0x69736a,emissive:0x1b241e,emissiveIntensity:.3}));
const rampEnd=mat({color:0x383d39,roughness:1,transparent:true,opacity:1});
box(2.55,3.9,.3,2.42,-.66,-40.18,rampEnd);
const crackMaterial=basicMat({color:0xffe3ae,transparent:true,opacity:1,toneMapped:false});
const crack=box(.018,.31,.012,2.39,-1.12,-39.99,crackMaterial);
const crackGlow=new THREE.PointLight(0xffd7a1,0,2.8,2);crackGlow.position.set(2.4,-1.15,-39.65);scene.add(crackGlow);
const wallLight=new THREE.PointLight(0x9aa89b,1.1,5,2);wallLight.position.set(2.4,-.1,-37);scene.add(wallLight);
for(let i=0;i<5;i++)box(.05,.12,.15,1.16,-.45-i*.55,-31.2-i*1.7,mat({color:0x7e8277}));

// The first glimpse beyond the wall: the familiar yellow Level 0 palette.
const wallpaperMap=makeWallpaper(),carpetMap=makeCarpet();
const backWall=mat({color:0xffffff,map:wallpaperMap,roughness:1}),backCarpet=mat({color:0xffffff,map:carpetMap,roughness:1});
const ceilingMat=mat({color:0xd4cfb7,roughness:1});
ground(14,13,2.5,-.055,-54.5,backCarpet);
box(.2,4.5,13,-4.5,2.2,-54.5,backWall);box(.2,4.5,13,9.5,2.2,-54.5,backWall);
box(14,4.5,.2,2.5,2.2,-61,backWall);box(14,4.5,.2,2.5,2.2,-48,backWall);
box(14,.12,13,2.5,4.52,-54.5,ceilingMat);
const backLights=[];
for(const [x,z] of [[-1.5,-52],[2.8,-56.8],[6.4,-52.2]]){
 box(1.35,.055,.44,x,4.4,z,mat({color:0xdce4ca,emissive:0xdce4c2,emissiveIntensity:1.7}));
 const light=new THREE.PointLight(0xd9e4c8,15,8,2);light.position.set(x,4.15,z);scene.add(light);backLights.push(light);
}
for(const x of [-1.5,6.4])for(const z of [-59,-56,-53,-50])box(.035,3.9,.035,x,2.0,z,mat({color:0x8f885e}));

// World lighting, atmospheric dust, and the two very different colour temperatures.
scene.add(new THREE.HemisphereLight(0xb9c7bd,0x1c2722,.92));
const moon=new THREE.DirectionalLight(0xb8c6c2,1.15);moon.position.set(-8,14,11);moon.castShadow=true;
moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-25;moon.shadow.camera.right=25;moon.shadow.camera.top=25;moon.shadow.camera.bottom=-25;scene.add(moon);
const streetGlow=new THREE.PointLight(0x8fae9d,2.8,24,2);streetGlow.position.set(-1,5,2);scene.add(streetGlow);
const dustCount=260,dustPositions=new Float32Array(dustCount*3),dustGeometry=new THREE.BufferGeometry();
for(let i=0;i<dustCount;i++){dustPositions[i*3]=(Math.random()-.5)*12;dustPositions[i*3+1]=.25+Math.random()*3.8;dustPositions[i*3+2]=-49-Math.random()*11;}
const dustBase=dustPositions.slice();
dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));geometries.add(dustGeometry);
const dustMaterial=basicMat({color:0xe0d8b9,transparent:true,opacity:.25,size:.025,depthWrite:false});
const dust=new THREE.Points(dustGeometry,dustMaterial);scene.add(dust);

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
  if(kind==='elevator'){oscillator(78,'sawtooth',.045,1.5,29);oscillator(160,'sine',.016,.6,62);}
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
function slopeY(z){return Math.max(-2.62,Math.min(0,(z+29)*.238));}
function sampleActors(time){
 const lead={x:0,y:0,z:14.8,yaw:0,clip:'Walk',action:'none',progress:0};
 if(time<4)lead.z=lerp(14.8,4,time/4);
 else if(time<14)lead.z=lerp(4,-14,(time-4)/10);
 else if(time<17)lead.z=lerp(-14,-20,(time-14)/3);
 else if(time<24)lead.z=lerp(-20,-29,(time-17)/7);
 else if(time<28){const p=ease((time-24)/4);lead.x=lerp(0,2.38,p);lead.z=lerp(-29,-31.6,p);lead.y=slopeY(lead.z);}
 else if(time<32){lead.x=2.38;lead.z=lerp(-31.6,-39.25,(time-28)/4);lead.y=slopeY(lead.z);}
 else if(time<35){lead.x=2.38;lead.z=-39.25;lead.y=-2.44;lead.clip='Idle';lead.action='brace';lead.progress=ease((time-32)/2);}
 else if(time<39){lead.x=2.38;lead.z=lerp(-39.25,-41.5,(time-35)/4);lead.y=-2.44;lead.clip='Walk';}
 else{lead.x=2.55;lead.y=0;lead.z=-54.5;lead.clip='Death';lead.action='prone';}
 if(time>=40&&time<45){lead.clip='Death';lead.action='get-up';lead.progress=ease((time-40)/4.4);}
 if(time>=45){lead.clip='Idle';lead.action='none';}
 const friend1={x:-.82,y:0,z:15.2,yaw:0,clip:'Walk'};
 if(time<4)friend1.z=lerp(15.2,5.4,time/4);
 else if(time<14)friend1.z=lerp(5.4,-14.2,(time-4)/10);
 else if(time<17)friend1.z=lerp(-14.2,-20.2,(time-14)/3);
 else if(time<22)friend1.z=lerp(-20.2,-25.8,(time-17)/5);
 else{friend1.x=-2.75;friend1.z=-26.3;friend1.yaw=Math.PI/2;friend1.clip='Idle';}
 const friend2={x:.82,y:0,z:15.9,yaw:0,clip:'Walk'};
 if(time<4)friend2.z=lerp(15.9,6.2,time/4);
 else if(time<14)friend2.z=lerp(6.2,-13.2,(time-4)/10);
 else if(time<17)friend2.z=lerp(-13.2,-20.0,(time-14)/3);
 else if(time<22.7)friend2.z=lerp(-20,-27.4,(time-17)/5.7);
 else{friend2.x=3.15;friend2.z=-28.1;friend2.yaw=Math.PI/2;friend2.clip='Idle';}
 if(time>=35){friend1.clip='Idle';friend2.clip='Idle';}
 return [lead,friend1,friend2];
}
function cameraFor(time,lead){
 const look=new THREE.Vector3(),position=new THREE.Vector3();
 if(time<4){position.set(3.5,2.7,18.2);look.set(0,1.25,11.6);}
 else if(time<14){position.set(2.7,2.75,lead.z+5.4);look.set(0,1.35,lead.z-2.8);}
 else if(time<17){position.set(3.6,2.75,-16.8);look.set(0,1.45,-21.5);}
 else if(time<24){position.set(1.6,2.7,-21.6);look.set(1.0,1.3,-29.2);}
 else if(time<28){position.set(4.9,.45,-30.7);look.set(2.45,-.7,-35.1);}
 else if(time<32){position.set(4.55,-.1,-35.1);look.set(2.42,-1.5,-39.9);}
 else if(time<35){position.set(4.35,-.35,-36.6);look.set(2.4,-1.35,-40.1);}
 else if(time<39){const p=ease((time-35)/4);position.lerpVectors(new THREE.Vector3(4.15,-.45,-37.3),new THREE.Vector3(3.45,2.15,-51.2),p);look.lerpVectors(new THREE.Vector3(2.4,-1.3,-40.4),new THREE.Vector3(2.55,1,-54.4),p);}
 else{position.set(5.55,3.7,-49.8);look.set(2.55,1.05,-54.6);}
 if(prefersReducedMotion&&time>4&&time<35)position.x=THREE.MathUtils.damp(camera.position.x,position.x,5,1/60);
 camera.position.copy(position);camera.lookAt(look);
}
function captionFor(time){return MONOCHROME2_DIALOGUE.find(cue=>time>=cue.at&&time<cue.end)??null;}
function chooseVoice(speaker){
 const voices=window.speechSynthesis?.getVoices?.()??[],english=voices.filter(voice=>/^en/i.test(voice.lang));
 if(!english.length)return null;
 const au=english.filter(voice=>/en[-_]AU/i.test(voice.lang)),preferred=au.length?au:english;
 const index=speaker==='lead'?0:speaker==='friend1'?Math.min(1,preferred.length-1):Math.min(2,preferred.length-1);
 return preferred[index]??english[0]??null;
}
function say(cue){
 if(muted||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
 const utterance=new SpeechSynthesisUtterance(cue.text),voice=chooseVoice(cue.voice);
 if(voice)utterance.voice=voice;
 utterance.lang=voice?.lang??'en-AU';utterance.rate=cue.rate??.94;utterance.pitch=cue.pitch??1;utterance.volume=.9;
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
 shotSounds.clear();lastCaption='';lastFootstep=-1;subtitle.classList.remove('visible');
 titlePanel.classList.remove('visible');titlePanel.classList.add('hidden');startPanel.classList.add('hidden');
 started=true;startAt=performance.now();audio?.start();audio?.setMuted(muted);if(!muted&&audio)audio.fx('elevator');
}
function update(t){
 const state=sampleMonochrome2(t),poses=sampleActors(t);
 actors.forEach((actor,index)=>{
  const p=poses[index],options={clip:p.clip,time:t*1.65,position:[p.x,p.y,p.z],yaw:p.yaw,action:p.action??'none',progress:p.progress??0};
  if(index===0&&t>=32&&t<35)options.handTarget=[2.42,-1.18,-39.8];
  if(index===1&&t>=22.2&&t<24.25){options.handTarget=[-3.35,1.15,-26.15];options.progress=ease((t-22.2)/.9);}
  if(index===2&&t>=22.5&&t<24.45){options.handTarget=[3.38,1.1,-28.0];options.progress=ease((t-22.5)/.9);}
  actor.sampleCinematic(options);
  if(index===0&&t>=38&&t<39.05)actor.root.visible=false;
  if(index>0&&t>25)actor.root.visible=true;
 });
 cameraFor(t,poses[0]);
 const doorOpen=ease(t/1.4);
 elevatorDoors[0].position.x=lerp(-.58,-1.55,doorOpen);elevatorDoors[1].position.x=lerp(.58,1.55,doorOpen);
 elevatorLight.intensity=t>=14.1&&t<17.5?.4:2.4;
 shopLights.forEach(light=>{light.intensity=t>17?17:4;});
 crackMaterial.opacity=state.crack;crackGlow.intensity=state.crack*3.3;crack.visible=state.crack>.015;
 wallLight.intensity=t>29.4?1.2:.8;
 rampEnd.opacity=1-state.noclip*.95;
 backLights.forEach((light,index)=>{light.intensity=t>=38.5?14+Math.sin(t*5+index)*.25:0;});
 const attr=dustGeometry.attributes.position;
 for(let i=0;i<dustCount;i++)attr.array[i*3+1]=dustBase[i*3+1]+Math.sin(t*.7+i)*.08;
 attr.needsUpdate=true;
 if(t<32&&t-lastFootstep>.56){audio?.footstep();lastFootstep=t;}
 if(t>=16.4&&!shotSounds.has('store')){shotSounds.add('store');audio?.fx('store');}
 if(t>=35&&!shotSounds.has('liminal')){shotSounds.add('liminal');audio?.fx('liminal');}
 if(t>=38.4&&!shotSounds.has('transition')){shotSounds.add('transition');audio?.fx('transition');}
 updateNarration(t);
 progressBar.style.width=(100*t/MONOCHROME2_DURATION)+'%';
 if(t>=45)showTitle();
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
 audio?.dispose();actors.forEach(actor=>actor.dispose());
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
