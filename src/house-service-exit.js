import * as THREE from 'three';
export const HOUSE_EXIT_POSITION={x:1.4,y:3.6,z:-32.82};
/** One door model is shared by the actual hub and the first cinematic frame. */
export function createHouseServiceExit(){
 const root=new THREE.Group();root.name='house-service-exit';const owned=[],cube=new THREE.BoxGeometry(1,1,1);owned.push(cube);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});owned.push(m);return m;};
 const steel=mat(0x303b36,{metalness:.5}),dark=mat(0x101b15),paint=mat(0x939783),brass=mat(0x85734f,{metalness:.7});
 function box(parent,w,h,d,x,y,z,m){const a=new THREE.Mesh(cube,m);a.scale.set(w,h,d);a.position.set(x,y,z);a.userData.interactId='house-exit';parent.add(a);return a;}
 for(const x of [-.84,.84])box(root,.13,2.94,.22,x,1.44,0,dark);box(root,1.82,.13,.22,0,2.91,0,dark);
 const hinge=new THREE.Group();hinge.position.x=-.75;root.add(hinge);const leaf=box(hinge,1.5,2.7,.12,.75,1.35,0,steel);
 for(const y of [.35,2.35])box(hinge,.07,.16,.12,.025,y,.08,brass);
 box(hinge,1.2,.05,.055,.75,1.12,.092,paint);box(hinge,.18,.035,.12,1.28,1.2,.12,brass);
 const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#20291f';ctx.fillRect(0,0,768,256);ctx.textAlign='center';ctx.fillStyle='#c0baa0';ctx.font='52px monospace';ctx.fillText('HOUSE',384,100);ctx.fillText('SERVICE ACCESS',384,180);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;owned.push(map);
 box(hinge,1.2,.43,.018,.75,2.03,.075,mat(0xffffff,{map}));
 const leds=Array.from({length:4},(_,i)=>box(hinge,.065,.065,.025,.42+i*.22,1.56,.085,mat(0x324333,{emissive:0x202e20,emissiveIntensity:.1})));
 let disposed=false;return {root,hinge,leaf,setOpen:value=>{hinge.rotation.y=-THREE.MathUtils.clamp(value,0,1)*1.48;},update(run){leds.forEach((led,i)=>{const on=run.banked.size>i;led.material.color.setHex(on?0x9fbe82:0x324333);led.material.emissiveIntensity=on?.5:.05;});},dispose(){if(disposed)return;disposed=true;owned.forEach(o=>o.dispose());root.removeFromParent();}};
}
