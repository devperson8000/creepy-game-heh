import {createHouseServiceExit,HOUSE_EXIT_POSITION} from './house-service-exit.js';
import * as THREE from 'three';
import {worldPoint,groundHeight,randomSource} from './level.js';
import {createHalloweenProps} from './halloween-props.js';
import {createHalloweenDecorationPlan} from './halloween-decoration-plan.js';

export function createHalloweenWorld(scene,run,targets,rayMeshes){
 if(!run.halloween)return null;
 const root=new THREE.Group();root.name='Halloween dressing';scene.add(root);
 const props=createHalloweenProps({aged:true}),plan=createHalloweenDecorationPlan(run.layout,run.seed),placements=[],markers=[],owned=[],q=run.halloween,maze=!!run.layout.halloweenMaze,floor=run.layout.floorHeight??0,rng=randomSource(run.seed^0xCA6D1E);
 const own=resource=>(owned.push(resource),resource),cube=own(new THREE.BoxGeometry(1,1,1)),sphere=own(new THREE.SphereGeometry(1,16,12));
 const material=(color,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness:.94,...extra}));
 const iron=material(0x3d4035,{metalness:.6,roughness:.68}),paper=material(0xb7a27d),wax=material(0x944b2c),darkWax=material(0x382b22),keyGlow=material(0xd5a95a,{metalness:.6,roughness:.4,emissive:0xc8862b,emissiveIntensity:.16});
 function box(parent,w,h,d,x,y,z,surface=iron){const m=new THREE.Mesh(cube,surface);m.scale.set(w,h,d);m.position.set(x,y,z);m.userData.halloweenDetail=true;parent.add(m);return m;}
 function ball(parent,x,y,z,sx,sy,sz,surface){const m=new THREE.Mesh(sphere,surface);m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.userData.halloweenDetail=true;parent.add(m);return m;}
 const constructors={pumpkin:props.pumpkin,candles:props.candleCluster,web:props.web,bunting:props.bunting,bats:props.bats,'string-lights':props.stringLights,lantern:props.lantern};
 function place(model,anchor){
  model.position.set(anchor.x,floor+anchor.y,anchor.z);model.rotation.y=anchor.yaw??0;if(anchor.scale!==undefined)model.scale.multiplyScalar(anchor.scale);root.add(model);placements.push({...anchor,root:model});
  if(model.lightPoint)markers.push({root:model,at:model.lightPoint.clone(),strength:anchor.kind==='string-lights'?1.25:1.8});return model;
 }
 for(const a of [...plan.rooms,...plan.walls]){
  if(a.kind==='pumpkin'&&q.rooms.includes(a.roomIndex))continue;
  place(constructors[a.kind](a.options),a);
 }
 function roomAnchor(index,x,y,z,kind){const room=run.layout.rooms[index],p=worldPoint(room),n=room.normal??{x:0,z:1},yaw=Math.atan2(n.x,n.z);return {kind,roomIndex:index,surface:'room',x:p.x+Math.cos(yaw)*x+Math.sin(yaw)*z,y,z:p.z-Math.sin(yaw)*x+Math.cos(yaw)*z,yaw};}
 function tag(id,model,hit,room){model.traverse(m=>{if(m.isMesh){m.userData.interactId=id;rayMeshes.push(m);}});targets.set(id,{id,type:'halloween',mesh:hit,room});}
 // Party remnants stay beside the cabinets, outside their approach and drawer travel.
 const first=roomAnchor(q.rooms[0],maze?-.84:-2.7,maze?.57:.85,maze?-.83:.25,'pumpkin'),pumpkin=place(props.pumpkin({scale:maze?.67:1.2,carved:false}),first);
 const pedestal=new THREE.Group();root.add(pedestal);pedestal.position.set(first.x,floor,first.z);pedestal.rotation.y=first.yaw;box(pedestal,.42,first.y,.34,0,first.y/2,0,iron);box(pedestal,.46,.035,.38,0,first.y,0,iron);
 const firstSeal=ball(pumpkin,0,.27,.273,.055,.055,.012,wax);tag('halloween:seal-0',pumpkin,firstSeal,q.rooms[0]);
 const second=roomAnchor(q.rooms[1],maze?-.84:-2.6,0,maze?-.83:.25,'skeleton'),skeleton=place(props.skeleton({scale:maze?1:1.5}),second);skeleton.seal.material=wax;tag('halloween:seal-1',skeleton,skeleton.seal,q.rooms[1]);
 const entry=worldPoint(run.layout.entrance),note=new THREE.Group();note.name='Folded party invitation';note.position.set(maze?entry.x-.87:-3.35,floor+(maze?1.2:.6),maze?entry.z+2.6:-17.85);note.rotation.y=maze?Math.PI/2:0;root.add(note);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#b7a27d';ctx.fillRect(0,0,512,320);ctx.strokeStyle='#716447';ctx.strokeRect(15,15,482,290);ctx.fillStyle='#362b21';ctx.textAlign='center';ctx.font='32px Georgia';ctx.fillText("YOU'RE INVITED",256,110);ctx.font='23px monospace';ctx.fillText('OCTOBER 31',256,170);ctx.fillText('THE PARTY MOVED BELOW',256,215);
 const map=own(new THREE.CanvasTexture(canvas));map.colorSpace=THREE.SRGBColorSpace;const sheet=box(note,.32,.2,.009,0,0,0,material(0xffffff,{map}));sheet.rotation.z=.07;ball(note,.09,-.06,.009,.022,.022,.007,wax);tag('halloween:invitation',note,sheet);
 place(props.pumpkin({scale:.62}),{kind:'pumpkin',surface:'landing',x:maze?entry.x-.75:-3.35,y:0,z:maze?entry.z+3.2:-17.9,yaw:maze?Math.PI/2:0});
 const lantern=place(props.lantern({scale:.8}),{kind:'lantern',surface:'landing',x:maze?entry.x-.83:-3.4,y:maze?.62:.2,z:maze?entry.z+5.1:-18.4,yaw:maze?Math.PI/2:0});lantern.seal.material=wax;tag('halloween:seal-2',lantern,lantern.seal);
 const exit=createHouseServiceExit();exit.root.position.set(HOUSE_EXIT_POSITION.x,HOUSE_EXIT_POSITION.y,HOUSE_EXIT_POSITION.z);root.add(exit.root);exit.root.traverse(m=>{if(m.isMesh)rayMeshes.push(m);});targets.set('house-exit',{id:'house-exit',type:'escape',mesh:exit.leaf,position:{x:HOUSE_EXIT_POSITION.x,z:HOUSE_EXIT_POSITION.z,height:HOUSE_EXIT_POSITION.y}});
 // A matching black pumpkin chest has a real hinge, falling chains and a lifted key.
 const chest=place(props.pumpkin({scale:2.1,black:true,carved:false,openable:true}),{kind:'chest',surface:'lobby',x:1.75,y:3.57-floor,z:-28.4,yaw:0});tag('halloween:chest',chest,chest.body);
 const key=new THREE.Group();key.name='Halloween key';key.position.set(0,.36,.05);chest.add(key);
 const ring=new THREE.Mesh(own(new THREE.TorusGeometry(.047,.011,8,22)),keyGlow);key.add(ring);box(key,.019,.12,.019,0,-.1,0,keyGlow);box(key,.056,.019,.019,.018,-.145,0,keyGlow);
 const chains=[],linkGeometry=own(new THREE.TorusGeometry(.026,.007,6,14));
 for(const side of [-1,1]){
  const chain=new THREE.Group();chain.name='Pumpkin chest chain';chain.position.set(side*.135,.425,.205);chest.add(chain);
  const curve=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>{const y=.425-i/12*.325,z=.27*Math.sqrt(Math.max(.04,1-(.135/.29)**2-((y-.255)/.235)**2))+.035;return new THREE.Vector3(0,y-.425,z-.205);}));
  for(let i=0;i<11;i++){const link=new THREE.Mesh(linkGeometry,iron);link.userData.halloweenDetail=true;link.position.copy(curve.getPointAt(i/10));link.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangentAt(i/10).normalize());link.rotateY(i%2?Math.PI/2:0);chain.add(link);}chains.push({root:chain,side});
 }
 const panel=new THREE.Group();panel.position.set(-4.95,4.85,-31.65);root.add(panel);const plate=box(panel,.58,.72,.08,0,0,0),icon=props.pumpkin({scale:.32,black:true,carved:true});icon.position.set(0,-.1,.055);panel.add(icon);box(panel,.025,.09,.02,0,.15,.055,keyGlow);tag('halloween:b2-panel',panel,plate);
 for(const x of [-6.6,.9]){const garland=props.stringLights({width:2.6,count:12,sag:.08});garland.position.set(x,7.3,-32.78);root.add(garland);}
 const leafShape=new THREE.Shape();leafShape.moveTo(0,.09);for(const [x,y]of [[.025,.035],[.055,.045],[.038,.015],[.07,0],[.035,-.012],[.025,-.06],[0,-.025],[-.025,-.06],[-.035,-.012],[-.07,0],[-.038,.015],[-.055,.045],[-.025,.035]])leafShape.lineTo(x,y);leafShape.closePath();
 const leafGeo=own(new THREE.ShapeGeometry(leafShape)),leafMaterial=material(0x8f5429,{side:THREE.DoubleSide}),leaves=new THREE.InstancedMesh(leafGeo,leafMaterial,run.layout.rooms.length*12),dummy=new THREE.Object3D(),color=new THREE.Color();let leaf=0;
 for(let i=0;i<run.layout.rooms.length;i++)for(let n=0;n<12;n++){const a=roomAnchor(i,(maze?-.9:-2.6)+(rng()-.5)*(maze?.32:1),.012,(maze?-.5:2.1)+(rng()-.5)*(maze?.48:1),'leaves');dummy.position.set(a.x,floor+a.y,a.z);dummy.rotation.set(-Math.PI/2,0,rng()*6.28);dummy.scale.setScalar(.65+rng()*.5);dummy.updateMatrix();leaves.setMatrixAt(leaf,dummy.matrix);color.setHSL(.055+rng()*.035,.35,.18+rng()*.09);leaves.setColorAt(leaf++,color);}leaves.userData.halloweenDetail=true;root.add(leaves);
 const lights=Array.from({length:3},()=>{const light=new THREE.PointLight(0xffa25c,0,3.8,2);light.userData.halloweenLight=true;root.add(light);return light;});root.updateMatrixWorld(true);
 for(const marker of markers)marker.at=marker.root.localToWorld(marker.at);
 for(const target of targets.values())if(target.type==='halloween'){const p=target.mesh.getWorldPosition(new THREE.Vector3());target.position={x:p.x,z:p.z,height:groundHeight(p,run.layout)};}
 const seals=[['halloween:seal-0',1],['halloween:seal-1',2],['halloween:seal-2',3]];for(const [id]of seals)targets.get(id).mesh.material=own(wax.clone());
 let revealAge=10,lastTime=null,wasKey=q.key,disposed=false;
 const ease=x=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t);};
 function update(time,{player,visibility=1,reducedMotion=false}={}){
  if(disposed)return;exit.update(run);const dt=Math.max(0,Math.min(.2,lastTime===null?1/60:time-lastTime));lastTime=time;props.update(time,{reducedMotion});const progress=run.halloween;
  if(progress.key&&!wasKey)revealAge=0;wasKey=progress.key;revealAge+=dt;
  const opening=progress.key?ease((revealAge-.12)/.85):0;chest.lid.rotation.x=-1.16*opening;
  for(const chain of chains){chain.root.rotation.z=chain.side*opening*1.3;chain.root.rotation.x=opening*1.25;chain.root.position.y=.425-opening*.33;}
  key.visible=progress.key&&revealAge<4.2;key.position.y=.36+.38*ease((revealAge-.25)/1.2);key.rotation.y=reducedMotion?0:Math.min(revealAge,4.2)*.5;
  for(const [id,required]of seals){const seal=targets.get(id).mesh,found=progress.stage>required;seal.material.color.copy((found?darkWax:wax).color);seal.material.emissive.setHex(!found&&progress.stage===required?0x71300d:0);seal.material.emissiveIntensity=reducedMotion?.2:.18+Math.sin(time*1.8)*.035;}
  const eye=player?new THREE.Vector3(player.x,(player.height??groundHeight(player,run.layout))+1.4,player.z):null,near=eye?markers.map(m=>({...m,d:m.at.distanceTo(eye)})).filter(m=>m.d<7).sort((a,b)=>a.d-b.d).slice(0,3):[];
  lights.forEach((light,i)=>{const m=near[i],target=m?m.strength*(1-ease((m.d-3.8)/3.2))*Math.max(.05,visibility):0;light.intensity+=(target-light.intensity)*(1-Math.exp(-dt*10));if(m)light.position.copy(m.at);});
 }
 return {root,placements,update,dispose(){if(disposed)return;disposed=true;exit.dispose();props.dispose();owned.forEach(o=>o.dispose());root.removeFromParent();}};
}
