import * as T from 'three';
export function createBackroomsObjectives(world,round){
 const root=new T.Group();root.name='backrooms-objectives';world.scene.add(root);const resources=new Set(),views=new Map();
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.8,...extra});resources.add(m);return m;};const steel=mat(0x3d423a,{metalness:.6}),paper=mat(0xb7b18b),fuseMat=mat(0xaaa269,{metalness:.7}),green=mat(0x315533,{emissive:0x509555,emissiveIntensity:.9});
 function box(w,h,d,x,y,z,m,parent=root){const g=new T.BoxGeometry(w,h,d);resources.add(g);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function label(text,w,h,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#20352a';ctx.fillRect(0,0,512,128);ctx.fillStyle='#e9e9cc';ctx.font='bold 43px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64,490);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;resources.add(t);const m=new T.MeshStandardMaterial({map:t,emissive:0x677655,emissiveMap:t,emissiveIntensity:.25,roughness:1});resources.add(m);const mesh=box(w,h,.025,x,y,z,m);mesh.rotation.y=rotation;return mesh;}
 for(const f of round.fuses){const g=new T.Group();g.position.set(f.x,0,f.z);root.add(g);box(.65,.72,.45,0,.36,0,steel,g);box(.68,.035,.49,0,.74,0,paper,g);const holder=new T.Group();g.add(holder);const geometry=new T.CylinderGeometry(.045,.045,.23,12);resources.add(geometry);const body=new T.Mesh(geometry,fuseMat);body.rotation.z=Math.PI/2;body.position.set(0,.8,0);holder.add(body);box(.12,.02,.15,0,.78,0,green,g);label('POWER FUSE',.58,.13,f.x,.55,f.z+.24);views.set(f.id,holder);}
 box(.12,2.5,1.65,-29.78,1.25,25,steel);box(.14,.09,.3,-29.67,1.12,25,paper);label('EMERGENCY EXIT',1.65,.25,-29.66,2.65,25,Math.PI/2);const lamp=new T.PointLight(0x8bbf8e,3.5,5);lamp.position.set(-29,2.5,25);root.add(lamp);
 function update(time){for(const f of round.fuses){const v=views.get(f.id);v.visible=!f.taken;}}
 function dispose(){root.removeFromParent();for(const r of resources)r.dispose();}
 return {root,update,dispose};
}
