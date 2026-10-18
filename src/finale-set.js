import * as THREE from 'three';
const clamp=(v,a=0,b=1)=>THREE.MathUtils.clamp(v,a,b);
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
export function createFinaleSet({quality='auto'}={}){
 const root=new THREE.Group();root.name='finale-set';const owned=new Set(),surfaces=new Set();
 const material=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.12,...options});surfaces.add(m);return m;};
 const concrete=material(0x232825),dark=material(0x0b1010),trim=material(0x454f4b,{metalness:.65,roughness:.3}),light=material(0xa8b8a8,{emissive:0x6c8b73,emissiveIntensity:1.2}),amber=material(0xd3ab65,{emissive:0x8f6133,emissiveIntensity:1.4});
 const box=(parent,name,w,h,d,x,y,z,surface=concrete)=>{
  const geometry=new THREE.BoxGeometry(w,h,d);owned.add(geometry);
  const mesh=new THREE.Mesh(geometry,surface);mesh.name=name;mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=quality!=='low';parent.add(mesh);return mesh;
 };
 box(root,'corridor-floor',7,.25,48,0,-.15,20,concrete);
 box(root,'corridor-left',.3,4.5,46,-3.4,2,20,dark);box(root,'corridor-right',.3,4.5,46,3.4,2,20,dark);
 box(root,'corridor-ceiling',7,.25,46,0,4.5,20,dark);
 for(let z=4;z<43;z+=6){
  box(root,'fluorescent-housing',.3,.09,2,0,4.33,z,trim);
  box(root,'fluorescent-tube',.15,.07,1.7,0,4.26,z,light);
  box(root,'grime-floor-line',6,.025,.05,0,.002,z,trim);
 }
 // Shallow steps lead from the basement into the elevator lobby.
 for(let i=0;i<6;i++)box(root,'stairs',5.7,.19,1.15,0,-.12+i*.045,5-i*.85,concrete);
 const shaft=new THREE.Group();shaft.name='fixed-shaft';root.add(shaft);
 box(shaft,'shaft-left',.4,18,5,-2.25,7,-2.5,dark);box(shaft,'shaft-right',.4,18,5,2.25,7,-2.5,dark);
 box(shaft,'shaft-back',4.8,18,.4,0,7,-5.6,dark);
 const shaftFrame=box(shaft,'shaft-crossbeam',4.6,.45,.6,0,6,0,trim);
 const shaftLights=[];
 for(let y=1.5;y<18;y+=3){const lamp=box(shaft,'passing-light',.18,.6,.12,2.01,y,-.4,light);shaftLights.push(lamp);}
 const cab=new THREE.Group();cab.name='moving-elevator';root.add(cab);
 box(cab,'cab-floor',4,.22,4.8,0,-.12,-2.5,trim);
 box(cab,'cab-back',4,3.4,.2,0,1.7,-4.8,concrete);
 box(cab,'cab-left',.18,3.4,4.6,-2,1.7,-2.5,trim);
 box(cab,'cab-right',.18,3.4,4.6,2,1.7,-2.5,trim);
 box(cab,'cab-ceiling',4,.2,4.8,0,3.5,-2.5,concrete);
 const left=box(cab,'door-left',1.94,3.36,.14,-.97,1.68,0,trim);
 const right=box(cab,'door-right',1.94,3.36,.14,.97,1.68,0,trim);
 const doors={left,right};
 const button=box(cab,'close-door-button',.12,.12,.06,1.82,1.42,-1.25,amber);
 box(cab,'button-panel',.32,.8,.1,1.83,1.5,-1.3,dark);
 const floorIndicator=box(cab,'floor-indicator',.5,.23,.05,0,3.07,-.07,amber);
 const indicatorLights=[...Array(3)].map((_,i)=>box(cab,'floor-indicator-step',.08,.04,.05,-.13+i*.13,3.07,-.025,i===0?amber:dark));
 const exit=new THREE.Group();exit.name='daylight-exit';root.add(exit);
 box(exit,'open-daylight-floor',7,.25,19,0,-.15,-13,concrete);
 box(exit,'exit-left',.6,5,8,-3.7,2.3,-10,concrete);box(exit,'exit-right',.6,5,8,3.7,2.3,-10,concrete);
 const doorway=box(exit,'pale-exit-glow',6,4,.06,0,2,-22,material(0xdde7db,{emissive:0xcbdccc,emissiveIntensity:2}));
 const sky=new THREE.HemisphereLight(0xd9e7eb,0x242925,2.4);sky.position.set(0,7,-13);exit.add(sky);
 const cabLight=new THREE.PointLight(0xc6d3c9,35,8);cabLight.position.set(0,2.9,-2.7);cab.add(cabLight);
 const basementLight=new THREE.PointLight(0x8bbaa8,65,40);basementLight.position.set(0,4,15);root.add(basementLight);
 let disposed=false;
 function sample(time){
  if(disposed)return;
  const t=clamp(time,0,52),rise=t<30?0:5*smooth((t-30)/5);
  cab.position.y=rise;shaftFrame.visible=t>=27&&t<=41;
  const gap=t<19?1:t<23?1-.72*smooth((t-19)/4):t<30?.28:t<44?.08:.08+.92*smooth((t-44)/2);
  left.position.x=-.97-gap;right.position.x=.97+gap;
  button.material.emissiveIntensity=t>=20&&t<23?3:1.4;
  indicatorLights.forEach((lamp,i)=>{lamp.material.emissiveIntensity=t>=30+1.5*i?1.7:.08;});
  exit.visible=t>=44;doorway.visible=exit.visible;
  cab.visible=t<44;shaft.visible=t<44;
 }
 function dispose(){
  if(disposed)return;disposed=true;root.removeFromParent();
  for(const g of owned)g.dispose();for(const m of surfaces)m.dispose();
 }
 sample(0);
 return {root,cab,doors,button,shaftFrame,shaftLights,floorIndicator,exit,sample,dispose};
}
