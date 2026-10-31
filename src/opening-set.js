import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createHalloweenProps} from './halloween-props.js';
import {createHalloweenSurfaces} from './halloween-surfaces.js';

/** Original, locally authored street/house/passage: no remote assets during startup. */
export function createOpeningSet(scene){
 const street=new THREE.Group(),house=new THREE.Group(),passage=new THREE.Group();scene.add(street,house,passage);
 const decorations=createHalloweenProps(),surfaces=createHalloweenSurfaces();
 const textures=[],materials=[],geometries=[];
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,...extra});materials.push(m);return m;};
 function texture(draw,w=512,h=512){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;textures.push(map);return map;}
 let seed=31;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const woodMap=texture((c,w,h)=>{c.fillStyle='#5f4935';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){const y=i*64;c.fillStyle=i%2?'#70533c':'#604832';c.fillRect(0,y,w,63);for(let j=0;j<95;j++){c.strokeStyle=`rgba(18,12,8,${random()*.15})`;c.beginPath();const x=random()*w;c.moveTo(x,y+random()*62);c.lineTo(x+80+random()*200,y+random()*62);c.stroke();}c.fillStyle='#32271d';c.fillRect((i%3)*170,y,2,64);}},512,512);woodMap.repeat.set(3,4);
 const paperMap=texture((c,w,h)=>{c.fillStyle='#727362';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){c.fillStyle='#555d502e';c.fillRect(x,0,13,h);for(let y=0;y<h;y+=80){c.strokeStyle='#aaab8a54';c.beginPath();c.ellipse(x+32,y+35,13,26,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x+32,y+9);c.lineTo(x+19,y+35);c.lineTo(x+32,y+61);c.lineTo(x+45,y+35);c.closePath();c.stroke();}}for(let i=0;i<6000;i++){c.fillStyle=`rgba(0,0,0,${random()*.09})`;c.fillRect(random()*w,random()*h,1,3);}});paperMap.repeat.set(2,1);
 const brickMap=texture((c,w,h)=>{c.fillStyle='#151718';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=64)for(let x=-128;x<w;x+=128){const offset=(y/64%2)*64;c.fillStyle=`rgb(${45+random()*12},${45+random()*10},${43+random()*10})`;c.fillRect(x+offset+3,y+3,122,58);for(let j=0;j<100;j++){c.fillStyle=random()>.5?'#91908018':'#00000030';c.fillRect(x+offset+random()*124,y+random()*60,3,2);}}});brickMap.repeat.set(2,6);
 const sidingMap=texture((c,w,h)=>{c.fillStyle='#85847b';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=48){c.fillStyle='#3b403b';c.fillRect(0,y,w,3);c.fillStyle='#b9b8a0';c.fillRect(0,y+4,w,2);}});
 const roofMap=texture((c,w,h)=>{c.fillStyle='#292d2c';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=-64;x<w;x+=64){c.fillStyle=random()>.5?'#343935':'#252a28';c.fillRect(x+(y%64?32:0),y,61,29);}});roofMap.repeat.set(3,3);
 const floor=material(0xffffff,{map:woodMap,...surfaces.get('wood')}),paper=material(0xffffff,{map:paperMap,...surfaces.get('paper')}),brick=material(0xffffff,{map:brickMap}),siding=material(0xffffff,{map:sidingMap}),roof=material(0xffffff,{map:roofMap});
 const trim=material(0xcec7ac),dark=material(0x151c1b),wood=material(0x34271e),metal=material(0x333a39,{metalness:.65,roughness:.47,...surfaces.get('iron')}),orange=material(0xb6490c),black=material(0x080b09),cloth=material(0x9c8e73,surfaces.get('cloth')),red=material(0x842720),skinny=material(0x31291f);
 const glow=material(0xffaf4b,{emissive:0xff8619,emissiveIntensity:1.8}),windowGlow=material(0xffc789,{emissive:0xffab53,emissiveIntensity:.45});
 const roundedCube=new RoundedBoxGeometry(1,1,1,3,.09);geometries.push(roundedCube);
 const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,20,14);geometries.push(cube,sphere);
 function box(group,w,h,d,x,y,z,m=wood){const mesh=new THREE.Mesh(cube,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);return mesh;}
 function softBox(group,w,h,d,x,y,z,m){const mesh=box(group,w,h,d,x,y,z,m);mesh.geometry=roundedCube;return mesh;}
 function brickSurface(u,v){const map=brickMap.clone();map.repeat.set(u,v);textures.push(map);return material(0xffffff,{map,...surfaces.get('stone')});}
 const alleyBrick=brickSurface(13.3,4.5),shaftBrick=brickSurface(5.5,50),endBrick=brickSurface(3.1,54),ceilingBrick=brickSurface(3.1,14);
 function ball(group,x,y,z,sx,sy,sz,m){const mesh=new THREE.Mesh(sphere,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;}
 function rod(group,a,b,r,m=metal){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mesh=new THREE.Mesh(cube,m);mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.scale.set(r,A.distanceTo(B),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());group.add(mesh);return mesh;}
 function sign(group,text,w,h,x,y,z,{background='#292b23',color='#d4c6a2',size=38}={}){const map=texture((c,W,H)=>{c.fillStyle=background;c.fillRect(0,0,W,H);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`${size}px Georgia`;text.split('\n').forEach((line,i,lines)=>c.fillText(line,W/2,H/2+(i-(lines.length-1)/2)*size*1.2));},512,256);return box(group,w,h,.025,x,y,z,material(0xffffff,{map}));}
 function window(group,x,y,z,w=1.7,h=1.9){box(group,w+.18,h+.18,.16,x,y,z,trim);box(group,w,h,.18,x,y,z+.02,windowGlow);box(group,.055,h,.21,x,y,z+.04,wood);box(group,w,.055,.21,x,y,z+.04,wood);for(const side of [-1,1])box(group,.24,h,.23,x+side*(w/2-.12),y,z+.04,cloth);box(group,w+.25,.07,.32,x,y-h/2,z+.05,trim);}
 function decorate(parent,model,x,y,z){model.position.set(x,y,z);parent.add(model);return model;}
 function pumpkin(parent,x,y,z,s=1){return decorate(parent,decorations.pumpkin({scale:s}),x,y,z);}
 function web(parent,x,y,z,s=1){return decorate(parent,decorations.web({size:s}),x,y,z);}
 // A recognizable residential street, with neighboring homes and bare garden trees.
 box(street,80,.15,19,0,-.21,25,material(0x272b2e));box(street,80,.12,2.4,0,-.09,14.3,material(0x7c7e76));box(street,30,.1,16,0,-.13,5.4,material(0x26362a));box(street,2.6,.11,14,0,-.02,7,material(0x6d7067));
 for(const x of [-17,17]){box(street,9,4.4,8,x,2,-1,siding);box(street,10,.3,9,x,4.4,-1,roof);window(street,x-2,2.1,3.1);window(street,x+2,2.1,3.1);}
 for(const x of [-8.7,8.7]){rod(street,[x,0,7],[x+.4,5.5,7.3],.19,skinny);for(let i=0;i<7;i++){const y=2.5+i*.38,dx=(i%2?1:-1)*(1.1+random());rod(street,[x+.2,y,7.2],[x+dx,y+1.3,7+(random()-.5)*2],.07,skinny);rod(street,[x+dx*.6,y+.8,7],[x+dx*1.3,y+1.6,7.4],.035,skinny);}}
 for(const side of [-1,1]){for(let i=0;i<8;i++)box(street,.09,.95,.08,side*6.8,.45,2+i,trim);box(street,.1,.08,8,side*6.8,.7,5.5,trim);box(street,.1,.08,8,side*6.8,.3,5.5,trim);}
 // Front facade has a real door opening, a pitched shingled roof and warm windows.
 for(const x of [-3.45,3.45])box(street,5.1,3.6,.2,x,1.8,0,siding);
 box(street,12,1.1,.2,0,3.25,0,siding);box(street,12.5,.12,.5,0,3.8,.1,trim);
 for(const side of [-1,1]){const r=box(street,7.05,.18,11.8,side*3.1,5.18,-4.5,roof);r.rotation.z=-side*.416;window(street,side*3.35,1.95,.16,1.9,2);}
 const gableShape=new THREE.Shape();gableShape.moveTo(-6.25,3.8);gableShape.lineTo(0,6.65);gableShape.lineTo(6.25,3.8);gableShape.closePath();const gg=new THREE.ShapeGeometry(gableShape);geometries.push(gg);const gable=new THREE.Mesh(gg,siding);gable.position.z=-.05;street.add(gable);window(street,0,4.65,.02,.85,1);
 box(street,2.9,.13,2.5,0,-.04,1.1,trim);box(street,2.9,.09,.38,0,-.08,2.45,trim);
 for(const x of [-1.6,1.6]){box(street,.12,3.25,.12,x,1.6,.75,trim);box(street,.4,.42,.3,x,2.65,.75,dark);ball(street,x,2.66,.93,.11,.16,.04,glow);}
 box(street,3.5,.16,2.2,0,3.3,.7,roof);
 const doorPivot=new THREE.Group();doorPivot.position.set(-.82,0,0);street.add(doorPivot);box(doorPivot,1.62,2.8,.12,.81,1.4,0,material(0x283a32));for(const y of [.63,1.7])box(doorPivot,1.28,.85,.025,.81,y,.08,material(0x32483b));ball(doorPivot,1.43,1.2,.13,.045,.045,.045,material(0xb69c58,{metalness:.7}));
 decorate(doorPivot,decorations.wreath(),.81,2.05,.12);sign(doorPivot,'WELCOME',.44,.17,.81,2.02,.19,{background:'#271d13',color:'#d7b27a',size:54});
 for(const x of [-.95,.95])box(street,.13,2.95,.24,x,1.47,0,trim);box(street,2,.13,.24,0,2.95,0,trim);
 sign(street,'HALLOWEEN\nPARTY',1.35,.7,2.1,1.18,.25,{background:'#b27d39',color:'#251b16',size:48});
 for(const [x,z,s] of [[-1.1,1.5,1.1],[1.35,1.4,.8],[-1.45,3.9,.7],[1.6,5.6,.8],[-1.7,8.5,.85]])pumpkin(street,x,0,z,s);
 decorate(street,decorations.stringLights({width:11.44,count:23,sag:.27}),.02,3.22,.27);
 decorate(street,decorations.lantern({scale:.85}),-1.3,.02,.4);
 web(street,-1.48,3.16,.88,.8);
 // Empty party: tableware, abandoned chair, bunting, couch, rug, framed pictures.
 const houseFloor=box(house,12,.14,9,0,-.08,-4.5,floor);box(house,12,.12,9,0,3.4,-4.5,material(0x898773));
 for(const x of [-6,6]){box(house,.18,3.4,9,x,1.65,-4.5,paper);box(house,.22,.16,9,x, .08,-4.5,trim);}
 const wall=box(house,12,3.4,.18,0,1.65,-9,paper);wall.name='the-wall';box(house,12,.17,.22,0,.08,-8.88,trim);box(house,12,.1,.22,0,3.25,-8.88,trim);
 box(house,2.4,.02,3.3,.3,.02,-3.4,material(0x4d342b));
 for(const x of [-.95,.95])box(house,.035,.025,3.1,x,.04,-3.4,material(0x9c8b69));
 softBox(house,1.7,.5,3,-4.6,.42,-4.6,material(0x3e4b3c));softBox(house,.28,.85,3,-5.32,.85,-4.6,material(0x3e4b3c));for(const z of [-5.95,-3.25])softBox(house,1.6,.4,.22,-4.6,.73,z,material(0x3e4b3c));for(const z of [-5.25,-4.57,-3.9])softBox(house,1.38,.17,.65,-4.5,.72,z,material(0x55604b));
 box(house,1.8,.12,1.5,-2.8,.58,-4.6,wood);for(const x of [-3.5,-2.1])for(const z of [-5.1,-4.1])box(house,.065,.55,.065,x,.27,z,wood);
 box(house,1.65,.13,3.4,4.2,.95,-5.3,wood);for(const x of [3.5,4.9])for(const z of [-6.7,-3.9])box(house,.09,.95,.09,x,.45,z,wood);box(house,1.72,.035,3.45,4.2,1.035,-5.3,cloth);
 const cupGeometry=new THREE.CylinderGeometry(.055,.035,.13,12);geometries.push(cupGeometry);for(let i=0;i<9;i++){const cup=new THREE.Mesh(cupGeometry,red);cup.position.set(3.7+random()*.9,1.12,-3.9-random()*2.7);house.add(cup);}for(let i=0;i<5;i++){const g=new THREE.CylinderGeometry(.15,.15,.02,20);geometries.push(g);const plate=new THREE.Mesh(g,trim);plate.position.set(i%2?4.5:3.9,1.07,-4.1-i*.55);house.add(plate);}pumpkin(house,4.2,1.07,-5.4,.8);
 const chair=new THREE.Group();chair.position.set(2.95,.08,-4);chair.rotation.z=.3;chair.rotation.y=-.45;house.add(chair);box(chair,.65,.08,.65,0,.48,0,wood);box(chair,.65,.65,.07,0,.83,.29,wood);for(const x of [-.26,.26])for(const z of [-.26,.26])box(chair,.05,.5,.05,x,.21,z,wood);
 for(const x of [-3.4,3.4]){box(house,1.15,1.6,.1,x,2,-8.82,wood);box(house,.99,1.42,.11,x,2,-8.75,material(0x242b24));sign(house,x<0?'HOME\nSWEET HOME':'OCTOBER\n31',.76,.8,x,2,-8.67,{background:'#242b24',color:'#9c987b',size:42});}
 sign(house,'HAPPY HALLOWEEN',3.5,.48,1.8,2.8,-8.7,{background:'#342921',color:'#ce9246',size:42});
 decorate(house,decorations.bunting({width:11.7,count:24}),0,2.92,-2);
 decorate(house,decorations.candleCluster({scale:.85}),-2.4,.65,-4.6);pumpkin(house,-3.05,.65,-4.6,.8);
 decorate(house,decorations.bats(),-5.86,2.58,-5.4).rotation.y=Math.PI/2;decorate(house,decorations.bats(),5.86,2.58,-6).rotation.y=-Math.PI/2;
 web(house,-5.88,3.25,-8.72,1.3);web(house,3.1,3.25,-8.72,.8);
 for(let i=0;i<32;i++){const scrap=box(house,.035,.004,.08,-1+random()*6,.025,-1-random()*6,i%2?orange:trim);scrap.rotation.y=random()*6.2;}
 // One lonely ceiling pendant. Its warm spill dies before the wall is crossed.
 rod(house,[0,3.38,-4],[0,2.65,-4],.025,black);const shadeGeo=new THREE.ConeGeometry(.38,.23,24,1,true);geometries.push(shadeGeo);const lamp=new THREE.Mesh(shadeGeo,metal);lamp.position.set(0,2.65,-4);house.add(lamp);ball(house,0,2.55,-4,.09,.09,.09,glow);
 const streetLights=new THREE.Group();street.add(streetLights);streetLights.add(new THREE.HemisphereLight(0x9cbbd1,0x24231b,.65));const moon=new THREE.DirectionalLight(0x9fb5cb,1.25);moon.position.set(-5,12,10);streetLights.add(moon);
 for(const x of [-1.6,1.6]){const light=new THREE.PointLight(0xffa34a,23,8,2);light.position.set(x,2.7,1.1);streetLights.add(light);}
 const houseLights=new THREE.Group();house.add(houseLights);const ambient=new THREE.AmbientLight(0xb1a88c,.22);houseLights.add(ambient);const pendant=new THREE.PointLight(0xffc68b,55,11,2);pendant.position.set(0,2.45,-4);houseLights.add(pendant);const tableLight=new THREE.PointLight(0xff8c2a,4,3,2);tableLight.position.set(4.2,1.6,-5.4);houseLights.add(tableLight);
 // Unpowered, black beyond the wall. Only the camera's real flashlight lights this set.
 box(passage,3.8,.22,8.7,0,-.15,-13.3,material(0x333a35));
 for(const x of [-1.95,1.95]){box(passage,.22,5.4,17,x,2,-17.5,alleyBrick);box(passage,.22,60,7.1,x,-30,-21.2,shaftBrick);rod(passage,[x*.92,.2,-10],[x*.92,.2,-24],.055,metal);rod(passage,[x*.9,3.6,-10],[x*.9,3.6,-24],.08,metal);}
 box(passage,4,.2,17,0,4.6,-17.5,ceilingBrick);box(passage,4,65,.22,0,-27,-24.8,endBrick);
 // The shaft is genuinely open: no floor spans z=-17.65..-24.8.
 box(passage,3.8,.15,.16,0,-.02,-17.64,metal);for(const x of [-1.78,1.78])box(passage,.1,.1,7.1,x,-.02,-21.2,metal);
 sign(passage,'SERVICE ACCESS\nKEEP CLEAR',.65,.35,1.8,1.5,-15.8,{background:'#343c32',color:'#c4c3a0',size:38}).rotation.y=-Math.PI/2;
 for(let i=0;i<15;i++){const scrap=box(passage,.05,.02,.3,(random()-.5)*3.1,-.02,-10-random()*7,wood);scrap.rotation.y=random()*6;}
 return {street,house,passage,wall,houseFloor,doorPivot,chair,pendant,houseLights,streetLights,update(time,{reducedMotion=false}={}){decorations.update(time,{reducedMotion});street.visible=time<13.5;house.visible=time<31.6;passage.visible=time>28;doorPivot.rotation.y=1.48*(Math.max(0,Math.min(1,(time-7.6)/3.3))**2*(3-2*Math.max(0,Math.min(1,(time-7.6)/3.3))));houseLights.visible=time<30.2;pendant.intensity=55*(1-.75*Math.max(0,Math.min(1,(time-17)/10)));},dispose(){decorations.dispose();surfaces.dispose();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
