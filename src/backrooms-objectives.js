import * as T from 'three';
export function createBackroomsObjectives(world,round){
 const root=new T.Group();root.name='backrooms-objectives';world.scene.add(root);const resources=new Set(),views=new Map();
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.8,...extra});resources.add(m);return m;};
 const steel=mat(0x36382f,{metalness:.55}),wood=mat(0x796039),paper=mat(0xb7b18b),gold=mat(0xb7a15c,{metalness:.8,roughness:.3}),wall=mat(0xa89b55),dark=mat(0x302d20);
 function box(w,h,d,x,y,z,m,parent=root){const g=new T.BoxGeometry(w,h,d);resources.add(g);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function label(text,w,h,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#292a21';ctx.fillRect(0,0,512,128);ctx.fillStyle='#d5cbb0';ctx.font='bold 43px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64,490);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;resources.add(t);const m=mat(0xffffff,{map:t});const mesh=box(w,h,.025,x,y,z,m);mesh.rotation.y=rotation;return mesh;}
 for(const p of round.parts){const g=new T.Group();g.position.set(p.x,.07,p.z);g.rotation.y=p.x*.7;root.add(g);box(.1,.09,1.1,0,0,0,wood,g);box(.45,.07,.08,.15,.04,.15,wood,g);views.set(p.id,g);}
 const ladder=new T.Group();ladder.position.set(round.ladder.x,0,round.ladder.z);root.add(ladder);
 for(const x of [-.3,.3])box(.09,2.55,.12,x,1.27,0,wood,ladder);
 const rungs=[];for(let y=.25;y<2.5;y+=.28)rungs.push(box(.62,.065,.1,0,y,.01,wood,ladder));
 box(1.2,.65,.16,round.ladder.x,2.48,-19.1,dark);box(1.3,.06,.5,round.ladder.x,2.14,-19,paper);
 const key=new T.Group();key.position.set(round.key.x,2.22,round.key.z);root.add(key);
 const ring=new T.TorusGeometry(.06,.015,8,20);resources.add(ring);key.add(new T.Mesh(ring,gold));box(.025,.16,.025,0,-.1,0,gold,key);box(.055,.018,.025,.02,-.16,0,gold,key);
 const door=box(.14,2.55,1.65,42,1.27,-16,wood);const handle=box(.18,.12,.08,41.9,1.15,-15.4,gold);
 // A physically separate pit chamber: upper landing, beams, lower recovery floor, and stairs.
 box(26,.15,12,55,-4.1,-16,dark);
 box(4,.15,12,44,-.08,-16,paper);box(8,.15,9,64,-.08,-17.5,paper);box(2,.15,3,67,-.08,-11.5,paper);
 box(14,.2,.72,53,-.1,-16,steel);
 for(const x of [49,56])box(.6,.2,12,x,-.1,-16,steel);
 for(const z of [-22,-10])box(26,6.8,.2,55,-.6,z,wall);
 box(.2,6.8,12,68,-.6,-16,wall);box(26,.1,12,55,2.85,-16,paper);
 // Cut the far landing visually around the staircase opening.
 // Its steps rise from the lower floor along the north edge.
 for(let i=0;i<18;i++){const top=-4+(i+1)*4/18;box(1/3,.22,2.6,60+(i+.5)/3,top-.11,-11.6,steel);}
 label('→  →  →',3,.55,53,-2.55,-10.13,Math.PI);label('STAIRS →',2,.45,58,-2.5,-10.13,Math.PI);
 const torch=new T.Group();torch.position.set(round.flashlight.x,.12,round.flashlight.z);root.add(torch);box(.12,.12,.4,0,0,0,steel,torch);box(.18,.18,.09,0,0,-.22,paper,torch);
 const vent=box(.16,1.2,1.5,67.8,1.4,-16,dark);
 for(let y=.9;y<2;y+=.12)box(.2,.035,1.4,67.65,y,-16,steel);
 label('EXIT',1.2,.3,67.57,2.3,-16,Math.PI/2);
 for(const x of [44,63]){const light=new T.PointLight(0xffe2a0,12,14,1.5);light.position.set(x,2.5,-16);root.add(light);box(1.2,.03,.55,x,2.76,-16,mat(0xffeed0,{emissive:0xffe1a0,emissiveIntensity:1.5}));}
 const lower=new T.PointLight(0xc0a16e,9,20,1.3);lower.position.set(56,-2,-14);root.add(lower);
 function update(){for(const p of round.parts)views.get(p.id).visible=!p.taken;rungs.forEach((r,i)=>r.visible=round.repaired||i<2||i>6);key.visible=!round.hasKey;torch.visible=!round.hasTorch;door.visible=handle.visible=!round.doorOpen;vent.userData.exit=true;}
 function dispose(){root.removeFromParent();for(const r of resources)r.dispose();}
 update();return {root,update,dispose};
}
