import * as THREE from 'three';
/** Small neutral data maps add tactile detail without changing the authored palette. */
export function createHalloweenSurfaces({aged=false}={}){
 const surfaces=new Map();let disposed=false;
 function get(kind){
  if(surfaces.has(kind))return surfaces.get(kind);if(disposed)throw new Error('Surface bank disposed');
  const size=128,bump=new Uint8Array(size*size*4),rough=new Uint8Array(bump.length);let seed=kind.split('').reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261)^(aged?0x31ad:0);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const noise=random()-.5,grain=kind==='wood'?Math.sin(x*.64+Math.sin(y*.08)*1.8)*.28:kind==='cloth'?((x%4<2?1:-1)+(y%4<2?1:-1))*.13:kind==='iron'?Math.sin(x*1.7)*.12:Math.sin(x*.23)*Math.sin(y*.19)*.14;
   const pit=aged&&random()<.035?-.35:0,value=Math.max(.08,Math.min(.92,.5+noise*.36+grain+pit)),r=Math.max(.55,Math.min(1,.86+noise*.18+(aged?.06:0)-Math.abs(grain)*.1));const i=(y*size+x)*4;
   bump[i]=bump[i+1]=bump[i+2]=Math.round(value*255);rough[i]=rough[i+1]=rough[i+2]=Math.round(r*255);bump[i+3]=rough[i+3]=255;
  }
  const map=data=>{const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;};
  const surface={bumpMap:map(bump),roughnessMap:map(rough),bumpScale:kind==='wood'?.0018:kind==='stone'?.003:kind==='cloth'?.00035:kind==='wax'?.0007:kind==='iron'?.00065:.0012};surfaces.set(kind,surface);return surface;
 }
 return {get,dispose(){if(disposed)return;disposed=true;for(const surface of surfaces.values()){surface.bumpMap.dispose();surface.roughnessMap.dispose();}}};
}
