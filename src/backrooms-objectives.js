import * as T from 'three';
import {createPitfallView} from './backrooms-pitfall-view.js';
const ease=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function createBackroomsObjectives(world,round){
 const root=new T.Group();root.name='backrooms-objectives';world.scene.add(root);const resources=new Set(),views=new Map();
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.85,...extra});resources.add(m);return m;};
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#856440';ctx.fillRect(0,0,128,512);
 let seed=191;for(let i=0;i<260;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%128;ctx.strokeStyle=i%2?'#39271330':'#ddba7728';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-3,160,x+5,300,x,512);ctx.stroke();}
 const grain=new T.CanvasTexture(canvas);grain.colorSpace=T.SRGBColorSpace;resources.add(grain);
 const steel=mat(0x737568,{metalness:.35}),wood=mat(0xc1a779,{map:grain,bumpMap:grain,bumpScale:.003}),paper=mat(0xc6bea0),gold=mat(0xc7b574,{metalness:.7,roughness:.3}),wall=world.surfaces?.wall??mat(0xb6a96e),dark=mat(0x211e16);
 function box(w,h,d,x,y,z,m,parent=root){const g=new T.BoxGeometry(w,h,d);resources.add(g);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function carpet(w,d,x,z){if(!world.surfaces?.carpetTexture)return box(w,.15,d,x,-.08,z,paper);const t=world.surfaces.carpetTexture.clone();t.repeat.set(w/2,d/2);resources.add(t);return box(w,.15,d,x,-.08,z,mat(0xffffff,{map:t,bumpMap:t,bumpScale:.01}));}
 function paperWall(w,h,d,x,y,z,surface=wall){const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv;resources.add(g);for(let face=0;face<6;face++)for(let i=0;i<4;i++){const n=face*4+i;uv.setXY(n,uv.getX(n)*(face<2?d:w)/2.4,uv.getY(n)*h/2.8);}const m=new T.Mesh(g,surface);m.position.set(x,y,z);root.add(m);}
 function label(text,w,h,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#29281e';cx.fillRect(0,0,512,128);cx.fillStyle='#d9d0ae';cx.font='bold 43px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,256,64,490);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;resources.add(t);const m=mat(0xffffff,{map:t}),mesh=box(w,h,.025,x,y,z,m);mesh.rotation.y=rotation;return mesh;}
 function section(parent){for(const x of [-.28,.28])box(.075,.64,.095,x,0,0,wood,parent);for(const y of [-.18,.15])box(.57,.06,.1,0,y,.015,wood,parent);}
 for(const p of round.parts){const g=new T.Group(),piece=new T.Group();g.position.set(p.x,.075,p.z);g.rotation.y=p.x*.43;piece.rotation.x=Math.PI/2;section(piece);g.add(piece);root.add(g);
  const cage=new T.BoxGeometry(.7,.12,.72),outlineGeo=new T.EdgesGeometry(cage);cage.dispose();resources.add(outlineGeo);const outlineMat=new T.LineBasicMaterial({color:0xe2d8a7,transparent:true,opacity:.55});resources.add(outlineMat);const outline=new T.LineSegments(outlineGeo,outlineMat);g.add(outline);outline.visible=false;views.set(p.id,{group:g,outline});}
 // The reference ladder leans into a small hollow box high on the wallpapered wall.
 const ladder=new T.Group();ladder.position.set(round.ladder.x,0,round.ladder.z);ladder.rotation.x=-.28;root.add(ladder);
 const stubs=new T.Group();ladder.add(stubs);for(const x of [-.28,.28])box(.075,.35,.095,x,.175,0,wood,stubs);
 const sections=[];for(let i=0;i<4;i++){const g=new T.Group();g.userData.amount=0;section(g);ladder.add(g);sections.push(g);}
 const x=round.ladder.x,z=-19.8;
 box(1.05,.62,.06,x,2.46,z,dark);box(.07,.66,.58,x-.54,2.46,z+.24,wall);box(.07,.66,.58,x+.54,2.46,z+.24,wall);box(1.15,.06,.58,x,2.16,z+.24,wall);box(1.15,.05,.58,x,2.78,z+.24,wall);
 const key=new T.Group();key.position.set(round.key.x,2.23,round.key.z);key.rotation.x=-Math.PI/2;root.add(key);const ring=new T.TorusGeometry(.045,.009,8,20);resources.add(ring);key.add(new T.Mesh(ring,gold));box(.015,.13,.018,0,-.09,0,gold,key);box(.04,.018,.02,.012,-.14,0,gold,key);
 const doorPivot=new T.Group();doorPivot.position.set(42,0,-16.82);root.add(doorPivot);box(.12,2.5,1.64,0,1.25,.82,wood,doorPivot);box(.16,.12,.07,-.08,1.1,1.45,gold,doorPivot);let doorAngle=0;
 const pit=createPitfallView(world,round,{root,resources,mat,box,carpet,paperWall,label,wall,wood,paper,steel,dark});
 function update(time,dt=.016,{targetId=null,progress=0}={}){for(const p of round.parts){const v=views.get(p.id);v.group.visible=!p.taken;v.outline.visible=targetId===p.id;}
  const built=round.installed??0;stubs.visible=built===0;sections.forEach((s,i)=>{const target=built>i?1:0;s.userData.amount=ease(s.userData.amount,target,9,dt);const a=s.userData.amount;s.visible=a>.005;if(s.visible){s.position.set((1-a)*-.3,i*.64+.32+(1-a)*.12,(1-a)*.5);s.rotation.z=(1-a)*-.18;}});
  key.visible=!round.hasKey;pit.update(dt);doorAngle=ease(doorAngle,round.doorOpen?-Math.PI/2:0,5,dt);doorPivot.rotation.y=doorAngle;
  if(targetId==='ladder'&&!round.repaired&&progress>0&&built<4){const s=sections[built];s.visible=true;s.position.set(-.3*(1-progress),built*.64+.32,.5*(1-progress));s.rotation.z=-.18*(1-progress);}
 }
 function dispose(){root.removeFromParent();for(const r of resources)r.dispose();}
 update(0);return {root,update,dispose,sections,views};
}
