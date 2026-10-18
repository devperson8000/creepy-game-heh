import * as THREE from 'three';

/** A sealed, walkable decontamination antechamber. All artwork is generated locally. */
export function createWaitingRoomScene(){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x171e20);scene.fog=new THREE.Fog(0x202829,12,27);
 const geometries=new Set(),materials=new Set(),textures=new Set(),colliders=[];
 const material=options=>{const m=new THREE.MeshStandardMaterial(Object.fromEntries(Object.entries(options).filter(([,value])=>value!==undefined)));materials.add(m);return m;};
 const mesh=(geometry,surface,x=0,y=0,z=0)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,surface);m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;};
 const box=(w,h,d,surface,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),surface,x,y,z);
 const solid=(w,h,d,surface,x,y,z)=>{colliders.push({x,z,halfX:w/2,halfZ:d/2});return box(w,h,d,surface,x,y,z);};
 function canvas(width,height,draw){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');if(!ctx)return null;
  draw(ctx);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);return {texture,ctx,c};
 }
 let seed=47;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const concrete=canvas(512,512,ctx=>{
  ctx.fillStyle='#74776e';ctx.fillRect(0,0,512,512);
  for(let i=0;i<11000;i++){const shade=Math.floor(65+random()*90);ctx.fillStyle=`rgba(${shade},${shade},${shade-6},${random()*.15})`;ctx.fillRect(random()*512,random()*512,1+random()*5,1+random()*5);}
  for(let i=0;i<28;i++){const x=random()*512,y=random()*512,r=15+random()*75,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(25,35,29,.18)');g.addColorStop(1,'rgba(25,35,29,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 });
 if(concrete){concrete.texture.wrapS=concrete.texture.wrapT=THREE.RepeatWrapping;concrete.texture.repeat.set(3,3);}
 const wall=material({color:0x858b7d,map:concrete?.texture,roughness:.97});
 const floor=material({color:0x777d73,map:concrete?.texture,roughness:.93});
 const metal=material({color:0x48544e,roughness:.72,metalness:.45});
 const dark=material({color:0x252f2e,roughness:.77,metalness:.5});
 const edge=material({color:0x89958a,roughness:.55,metalness:.65});
 const yellow=material({color:0xb8a04a,roughness:.85});
 const black=material({color:0x252c28,roughness:.9});
 const rust=material({color:0x795741,roughness:.98});
 const lamp=material({color:0xd1e4c8,emissive:0xb7d5bc,emissiveIntensity:1.3,roughness:.35});
 const amber=material({color:0xe1ad57,emissive:0xbb792d,emissiveIntensity:.6});
 box(12,.2,14,floor,0,-.1,0);box(12,.2,14,wall,0,3.9,0);
 box(.25,3.8,14,wall,-6.125,1.9,0);box(.25,3.8,14,wall,6.125,1.9,0);
 box(12,3.8,.25,wall,0,1.9,-7.125);box(12,3.8,.25,wall,0,1.9,7.125);
 for(const x of [-5.96,5.96]){box(.07,.65,14,metal,x,.36,0);box(.09,.055,14,edge,x,.71,0);}
 for(const z of [-6.96,6.96]){box(12,.65,.07,metal,0,.36,z);box(12,.055,.09,edge,0,.71,z);}
 // Expansion joints and a yellow lane lead from arrival positions to the sealed door.
 for(const z of [-5,-1,3])box(12,.008,.018,dark,0,.006,z);
 for(const x of [-2.6,2.6]){box(.075,.012,11.7,yellow,x,.012,.2);for(let z=-5;z<6;z+=1.5)box(.3,.014,.07,yellow,x+(x<0?-.12:.12),.014,z);}
 for(let i=0;i<15;i++){const stripe=box(.13,.016,1.25,i%2?black:yellow,-2.1+i*.3,.017,-5.75);stripe.rotation.y=-.4;}
 for(let i=0;i<4;i++){box(.7,.012,.055,yellow,[-1.8,-.6,.6,1.8][i],.013,3.9);box(.055,.012,.45,yellow,[-1.8,-.6,.6,1.8][i]-.35,.013,3.7);}
 // Locker bank, with recessed vents, numbered plates and worn handles.
 for(let i=0;i<5;i++){
  const z=.2+i*1.02;solid(.78,2.48,.94,metal,-5.52,1.24,z);
  box(.035,2.3,.84,edge,-5.11,1.23,z);box(.045,2.18,.76,metal,-5.075,1.23,z);
  for(let j=0;j<5;j++)box(.012,.025,.37,dark,-5.043,1.99-j*.065,z);
  box(.075,.23,.045,black,-5.015,1.05,z-.28);box(.09,.13,.06,edge,-5.015,1.08,z-.28);
  box(.018,.1,.14,yellow,-5.038,1.67,z);box(.8,.1,.97,dark,-5.52,.07,z);
 }
 // Bolted bench and its obstruction occupy the right wall, leaving a generous aisle.
 solid(1.05,.46,4.8,dark,5.25,.23,1.45);
 for(let i=0;i<5;i++)box(.16,.085,4.8,metal,4.82+i*.2,.5,1.45);
 for(const z of [-.65,3.55]){box(.09,.5,.13,edge,4.85,.25,z);box(.09,.5,.13,edge,5.65,.25,z);}
 box(.12,.48,4.8,metal,5.76,.85,1.45);
 // Wall-mounted decontamination console. The DOM interaction is owned by the caller.
 solid(.72,1.12,.7,dark,-4.5,.56,-3);
 const console=box(.88,.55,.62,metal,-4.5,1.3,-3);console.rotation.x=.12;
 const screen=material({color:0x83b5a4,emissive:0x426d5f,emissiveIntensity:.65});
 const consoleScreen=box(.64,.33,.025,screen,-4.5,1.34,-2.675);consoleScreen.rotation.x=.12;
 for(let i=0;i<3;i++)box(.1,.045,.035,i===2?amber:edge,-4.72+i*.21,1.08,-2.65);
 // Heavy sealed door, frame, crossbars, hinges and hydraulic lines.
 solid(3.24,3.25,.4,dark,0,1.625,-6.74);box(2.82,2.94,.16,metal,0,1.49,-6.65);
 for(const x of [-1.5,1.5])box(.16,3.18,.27,edge,x,1.59,-6.62);
 box(3.2,.17,.3,edge,0,3.13,-6.62);box(.025,2.9,.035,black,0,1.5,-6.54);
 for(const x of [-.75,.75]){box(1.12,.1,.1,edge,x,.8,-6.5);box(1.12,.1,.1,edge,x,2.18,-6.5);box(.07,.55,.12,dark,x,1.4,-6.43);}
 for(const x of [-1.43,1.43])for(const y of [.5,1.6,2.7])box(.24,.24,.28,dark,x,y,-6.5);
 function sign(text,w,h,x,y,z,{background='#232e2b',foreground='#d3d6bb',size=45}={}){
  const art=canvas(1024,256,ctx=>{ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);ctx.strokeStyle=foreground;ctx.lineWidth=5;ctx.strokeRect(12,12,1000,232);ctx.fillStyle=foreground;ctx.font=`600 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,130,960);});
  const m=material({color:art?0xffffff:0xb9bba7,map:art?.texture,roughness:.85});return mesh(new THREE.PlaneGeometry(w,h),m,x,y,z);
 }
 sign('BASEMENT ACCESS',2.6,.43,0,2.77,-6.54,{size:62});
 sign('DECONTAMINATION / HOLDING 04',4.5,.54,0,3.34,-6.84,{size:47});
 sign('PERSONNEL INTAKE',2.4,.48,0,2.6,6.94).rotation.y=Math.PI;
 sign('01 / REQUEST CLEARANCE',1.35,.36,-4.5,1.94,-3.35,{size:53});
 const notice=sign('KEEP RESPIRATOR ON',1.6,.44,5.94,2.15,-3.9,{background:'#b29b51',foreground:'#242b26',size:63});notice.rotation.y=-Math.PI/2;
 // The live manifest sits beside the door, facing the room.
 const board=canvas(1024,640,()=>{});const boardMaterial=material({color:board?0xffffff:0x86a796,map:board?.texture,emissive:0x406052,emissiveIntensity:.18,roughness:.9});
 box(2.18,1.55,.12,dark,3.4,2.05,-6.79);mesh(new THREE.PlaneGeometry(2.05,1.4),boardMaterial,3.4,2.05,-6.715);
 const statusMaterials=Array.from({length:4},()=>material({color:0x575c4a,emissive:0x000000}));
 statusMaterials.forEach((m,i)=>mesh(new THREE.SphereGeometry(.065,10,8),m,2.63+i*.5,2.96,-6.65));
 // Exposed service pipes, clamps and ceiling conduits.
 const pipe=(a,b,r=.055,surface=edge)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);const p=mesh(new THREE.CylinderGeometry(r,r,direction.length(),10),surface);p.position.copy(start.add(end).multiplyScalar(.5));p.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return p;};
 for(const x of [-4.7,-4.4,4.95]){pipe([x,3.45,-6.9],[x,3.45,6.9],x===4.95?.085:.055,x===4.95?rust:edge);for(let z=-6;z<7;z+=2)box(.35,.06,.09,dark,x,3.52,z);}
 pipe([4.95,.8,-5.6],[4.95,3.45,-5.6],.085,rust);pipe([4.95,.8,-5.6],[5.94,.8,-5.6],.085,rust);
 for(let z=-5;z<7;z+=2.4)box(11.9,.12,.12,dark,0,3.68,z);
 const fixtures=[];
 for(const z of [-3.7,1.1,5.2]){box(2.65,.12,.55,dark,0,3.57,z);for(const x of [-.9,.9])box(.05,.16,.4,edge,x,3.55,z);const tube=box(2.35,.045,.13,lamp,0,3.48,z);fixtures.push(tube);}
 const ambient=new THREE.HemisphereLight(0xc2d4c9,0x505144,2.1);scene.add(ambient);
 const lights=[[-.5,3.05,-3.7,0xc9e2d2,22],[0,3.1,2,0xd3e0c9,25],[4.7,2.6,-5.5,0xe4b86d,7]].map(([x,y,z,color,intensity])=>{const l=new THREE.PointLight(color,intensity,13,2);l.position.set(x,y,z);scene.add(l);return l;});
 box(.28,.18,.12,amber,1.76,2.87,-6.7);
 let manifestKey='',disposed=false;
 function update(delta,time=0,room={}){
  const members=Array.isArray(room?.members)?room.members:[];
  const key=JSON.stringify([room?.code,room?.name,members.map(m=>[m.name??m.displayName,m.ready??m.isReady,m.slot])]);
  if(key!==manifestKey){manifestKey=key;
   const sorted=[...members].sort((a,b)=>(a.slot??0)-(b.slot??0));
   statusMaterials.forEach((m,i)=>{const member=sorted.find(p=>p.slot===i)??(sorted.some(p=>p.slot!==undefined)?null:sorted[i]);const ready=member&&(member.ready??member.isReady);m.color.setHex(member?(ready?0x8dbc88:0xe1b85b):0x454e47);m.emissive.setHex(member?(ready?0x41652f:0x70501b):0x000000);});
   if(board){const {ctx}=board;ctx.fillStyle='#14221f';ctx.fillRect(0,0,1024,640);ctx.fillStyle='#a5c3ae';ctx.font='bold 42px monospace';ctx.fillText('CLEARANCE MANIFEST',48,65);ctx.font='25px monospace';ctx.fillStyle='#738e7c';ctx.fillText(`HOLDING 04  /  ${String(room?.code??room?.name??'AWAITING PERSONNEL').slice(0,24)}`,48,110);
    for(let i=0;i<4;i++){const member=sorted.find(p=>p.slot===i)??(sorted.some(p=>p.slot!==undefined)?null:sorted[i]);const ready=member&&(member.ready??member.isReady);ctx.fillStyle='#293d34';ctx.fillRect(42,148+i*99,940,2);ctx.fillStyle=member?'#d5dac5':'#61776a';ctx.font='32px monospace';ctx.fillText(`${String(i+1).padStart(2,'0')}  ${String(member?.name??member?.displayName??'VACANT').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,24)}`,48,205+i*99);ctx.font='bold 23px monospace';ctx.fillStyle=ready?'#a5cd87':'#c5aa63';ctx.fillText(member?(ready?'CLEARED':'STANDBY'):'—',790,205+i*99);}
    ctx.fillStyle='#7f9c88';ctx.font='23px monospace';ctx.fillText('SEAL ENGAGED / AWAITING DISPATCH',48,603);board.texture.needsUpdate=true;
   }
  }
  // Slow, shallow ballast variation stays readable and never flashes or blacks out.
  const t=Number.isFinite(time)?time:0;lights[0].intensity=22*(.97+.025*Math.sin(t*1.47)+.015*Math.sin(t*7.13));
 }
 update(0,0,{});
 return {scene,terminalPosition:{x:-4.5,y:1.3,z:-3},doorPosition:{x:0,y:1.5,z:-6.65},
  canMove(x,z){if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>5.75||Math.abs(z)>6.75)return false;return !colliders.some(c=>{const dx=Math.max(Math.abs(x-c.x)-c.halfX,0),dz=Math.max(Math.abs(z-c.z)-c.halfZ,0);return dx*dx+dz*dz<.25*.25;});},
  spawn(slot=0){const i=Number.isInteger(slot)&&slot>=0&&slot<4?slot:0;return {x:[-1.8,-.6,.6,1.8][i],y:1.65,height:0,z:3.5,yaw:0,pitch:0};},update,
  dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.clear();}
 };
}
