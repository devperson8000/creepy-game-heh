import * as THREE from 'three';
import {worldPoint,groundHeight,randomSource} from './level.js';

export function createHalloweenWorld(scene,run,targets,rayMeshes){
 if(!run.halloween)return null;
 const root=new THREE.Group();root.name='Halloween dressing';scene.add(root);
 const rng=randomSource(run.seed^0xCA6D1E),q=run.halloween;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.94,...extra});
 const orange=mat(0x9c4215),dark=mat(0x100e0c),wax=mat(0xd3b18a),bone=mat(0xafa28a),iron=mat(0x3e3430,{metalness:.45}),paper=mat(0xc6b389);
 const glow=mat(0xd76915,{emissive:0xff780d,emissiveIntensity:1.5}),flames=[];
 const sphere=new THREE.SphereGeometry(1,20,14),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10);
 function mesh(geo,material,scale,position,parent=root){const m=new THREE.Mesh(geo,material);m.scale.set(...scale);m.position.set(...position);parent.add(m);return m;}
 function box(w,h,d,x,y,z,material=dark,parent=root){return mesh(cube,material,[w,h,d],[x,y,z],parent);}
 function ball(x,y,z,sx,sy,sz,material,parent=root){return mesh(sphere,material,[sx,sy,sz],[x,y,z],parent);}
 function tag(id,group,hit,{room}={}){
  const position=new THREE.Vector3();hit.getWorldPosition(position);
  group.traverse(m=>{if(m.isMesh){m.userData.interactId=id;rayMeshes.push(m);}});
  targets.set(id,{id,type:'halloween',mesh:hit,position:{x:position.x,z:position.z,height:groundHeight(position)},room});
 }
 function pumpkin(x,y,z,size=.42,{face=true,black=false}={}){
  const g=new THREE.Group();g.position.set(x,y,z);root.add(g);
  ball(0,size*.72,0,size,size*.72,size*.88,black?dark:orange,g);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(Math.cos(a)*size*.18,size*.7,Math.sin(a)*size*.18,size*.84,size*.68,size*.75,black?dark:orange,g);}
  const stem=mesh(cylinder,mat(0x3e4424),[size*.085,size*.35,size*.085],[0,size*1.5,0],g);stem.rotation.z=.25;
  if(face){
   for(const x of [-.28,.28]){const eye=new THREE.Shape();eye.moveTo(-.12,0);eye.lineTo(.12,0);eye.lineTo(0,.22);eye.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(eye),glow);m.scale.setScalar(size);m.position.set(x*size,size*.78,size*.867);g.add(m);}
   const mouth=box(size*.62,size*.08,.012,0,size*.48,size*.868,glow,g);mouth.rotation.z=.06;
  }
  return g;
 }
 function candle(x,y,z,h=.3,parent=root){
  mesh(cylinder,wax,[.065,h,.065],[x,y+h/2,z],parent);
  const flame=ball(x,y+h+.06,z,.028,.065,.028,glow,parent);flames.push(flame);
  for(let i=0;i<3;i++)mesh(cylinder,wax,[.012,h*.24,.012],[x+Math.cos(i*2)*.06,y+h*.85,z+Math.sin(i*2)*.06],parent);
 }
 function web(x,y,z,flip=1){
  const lines=[];
  for(let i=0;i<=6;i++){const angle=i/6*Math.PI/2;lines.push(0,0,0,Math.cos(angle)*1.25*flip,-Math.sin(angle)*1.25,0);}
  for(let r=.25;r<=1.25;r+=.25)for(let i=0;i<6;i++){const a=i/6*Math.PI/2,b=(i+1)/6*Math.PI/2;lines.push(Math.cos(a)*r*flip,-Math.sin(a)*r,0,Math.cos(b)*r*flip,-Math.sin(b)*r,0);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  const m=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xc8bfa8,transparent:true,opacity:.26}));m.position.set(x,y,z);root.add(m);
 }
 function skeleton(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);root.add(g);
  box(.045,2.5,.045,0,1.25,-.12,iron,g);box(.8,.06,.35,0,.03,0,iron,g);
  ball(0,1.9,0,.17,.21,.16,bone,g);
  for(const x of [-.065,.065])ball(x,1.95,.137,.045,.055,.025,dark,g);
  box(.1,.035,.03,0,1.79,.15,dark,g);
  box(.075,.78,.07,0,1.3,0,bone,g);
  for(let i=0;i<5;i++)box(.42-i*.035,.035,.11,0,1.6-i*.1,.015,bone,g);
  for(const side of [-1,1]){
   const arm=box(.055,.65,.055,side*.29,1.35,0,bone,g);arm.rotation.z=side*.2;
   const leg=box(.07,.8,.07,side*.12,.5,0,bone,g);leg.rotation.z=side*.06;
  }
  const envelope=box(.25,.17,.025,.32,1.05,.08,paper,g);envelope.rotation.z=-.22;return {group:g,envelope};
 }
 const leafGeo=new THREE.PlaneGeometry(.13,.07),leaves=new THREE.InstancedMesh(leafGeo,mat(0x6f3719,{side:THREE.DoubleSide}),run.layout.rooms.length*14),matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();let leafIndex=0;
 run.layout.rooms.forEach((room,index)=>{
  const p=worldPoint(room);
  pumpkin(p.x-2.9,.02,p.z+2.55,.4);pumpkin(p.x-2.35,.02,p.z+2.8,.26);
  candle(p.x-2.85,.02,p.z+1.7,.24);candle(p.x-3.03,.02,p.z+1.52,.34);
  web(p.x-3.7,4.05,p.z+3.7);web(p.x+3.7,4.05,p.z-3.7,-1);
  for(let i=0;i<14;i++){
   dummy.position.set(p.x-2.8+rng()*1.4,.012,p.z+1.7+rng()*1.4);dummy.rotation.set(-Math.PI/2,0,rng()*Math.PI*2);dummy.updateMatrix();matrix.copy(dummy.matrix);leaves.setMatrixAt(leafIndex++,matrix);
  }
  if(index===q.rooms[0]){
   const g=pumpkin(p.x-2.7,.85,p.z+.25,.35,{face:false});box(.8,.08,.65,p.x-2.7,.82,p.z+.25,iron);
   box(.07,.82,.07,p.x-3,.41,p.z+.25,iron);box(.07,.82,.07,p.x-2.4,.41,p.z+.25,iron);
   const seal=ball(0,.35,.3,.07,.07,.02,glow,g);tag('halloween:seal-0',g,seal,{room:index});
  }
  if(index===q.rooms[1]){const display=skeleton(p.x-2.6,p.z+.25);tag('halloween:seal-1',display.group,display.envelope,{room:index});}
 });
 root.add(leaves);
 // These props sit beside existing routes, never inside drawer/closet clearance.
 const note=new THREE.Group();note.position.set(-3.35,.6,-17.85);root.add(note);
 const sheet=box(.32,.2,.025,0,0,0,paper,note);sheet.rotation.z=.1;
 const seal=ball(0,-.04,.025,.04,.04,.012,glow,note);tag('halloween:invitation',note,sheet);
 pumpkin(-3.35,.02,-17.9,.24);
 const lantern=new THREE.Group();lantern.position.set(-3.4,.2,-18.4);root.add(lantern);
 box(.2,.27,.17,0,.17,0,iron,lantern);box(.12,.17,.18,0,.18,.012,dark,lantern);mesh(cylinder,iron,[.14,.05,.14],[0,.34,0],lantern);
 tag('halloween:seal-2',lantern,lantern.children[0]);
 const chest=pumpkin(1.75,3.66,-28.4,.62,{black:true});
 const lid=new THREE.Group();lid.position.set(0,.85,-.35);chest.add(lid);ball(0,.1,.35,.54,.12,.48,orange,lid);
 const key=new THREE.Group();key.position.set(0,.87,.28);chest.add(key);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.095,.025,10,20),glow);key.add(ring);box(.04,.24,.04,0,-.19,0,glow,key);box(.12,.04,.04,.045,-.27,0,glow,key);
 const chains=[];for(const x of [-.32,.32])chains.push(box(.055,.85,.055,x,.53,.54,iron,chest));
 tag('halloween:chest',chest,chest.children[0]);
 const panel=new THREE.Group();panel.position.set(-4.95,4.85,-31.65);root.add(panel);
 const plate=box(.58,.72,.08,0,0,0,iron,panel);const icon=pumpkin(0,0,0,.12,{black:true});root.remove(icon);panel.add(icon);icon.position.set(0,-.08,.07);
 box(.025,.09,.02,0,.15,.06,glow,panel);tag('halloween:b2-panel',panel,plate);
 const pulse=new THREE.PointLight(0xf07826,.7,2.5,2);pulse.position.set(1.75,4.6,-28.4);root.add(pulse);
 let revealAge=10,lastTime=0,wasKey=run.halloween.key;
 function update(time){
  const progress=run.halloween;if(progress.key&&!wasKey)revealAge=0;wasKey=progress.key;revealAge+=Math.max(0,time-lastTime);lastTime=time;key.visible=progress.key&&revealAge<3.5;lid.rotation.x=progress.key?-1.05*Math.min(1,revealAge*1.5):0;for(const chain of chains)chain.visible=!progress.key;
  key.rotation.y=time*.35;key.position.y=.87+Math.min(.45,revealAge*.3)+Math.sin(time*2)*.025;
  for(let i=0;i<flames.length;i++)flames[i].scale.y=.055+Math.sin(time*6+i)*.006;
  pulse.intensity=progress.key?.35:.7;
  for(const [id,required] of [['halloween:seal-0',1],['halloween:seal-1',2],['halloween:seal-2',3]]){
   const target=targets.get(id);target.mesh.material=progress.stage>required?dark:paper;
  }
 }
 return {root,update};
}
