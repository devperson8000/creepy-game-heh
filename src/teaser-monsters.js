import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const paths={sonask:'/models/teaser/sonask.glb',crawler:'/models/teaser/crawler.glb',maw:'/models/teaser/maw.glb'};
let cached;
export function loadTeaserMonsters(){
 cached??=Promise.all(Object.entries(paths).map(async([id,url])=>[id,await new GLTFLoader().loadAsync(url)])).then(Object.fromEntries).catch(error=>{cached=undefined;throw error;});return cached;
}
export function createTeaserMonster(asset,id){
 const key=name=>name.replace(/[._\s]/g,'').toLowerCase();
 const root=new THREE.Group(),model=clone(asset.scene),geometries=new Set(),materials=new Set(),textures=new Map(),bones=new Map();root.name=`teaser-${id}`;root.add(model);
 model.traverse(o=>{
  if(o.isBone)bones.set(key(o.name),{bone:o,quaternion:o.quaternion.clone()});
  if(!o.isMesh)return;
  o.geometry=o.geometry.clone();geometries.add(o.geometry);o.frustumCulled=false;
  function copy(m){const c=m.clone();c.roughness=Math.max(.8,c.roughness??.9);c.metalness=0;materials.add(c);if(id!=='maw'){c.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat hideLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));diffuseColor.rgb=vec3(0.1+hideLuma*0.55);');};c.customProgramCacheKey=()=> 'teaser-desaturated-hide';}for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(c[key]){const original=c[key];if(!textures.has(original)){const texture=original.clone();texture.needsUpdate=true;textures.set(original,texture);}c[key]=textures.get(original);}return c;}
  o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
 });
 model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y,scale=(id==='sonask'?3.15:id==='crawler'?1.7:2.5)/height;
 model.scale.multiplyScalar(scale);model.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);
 const start=new THREE.Vector3(),end=new THREE.Vector3(),direction=new THREE.Vector3(),world=new THREE.Quaternion(),parent=new THREE.Quaternion(),turn=new THREE.Quaternion();
 function aim(name,childName,desired){
  const bone=bones.get(key(name))?.bone,child=bones.get(key(childName))?.bone;if(!bone||!child)return;root.updateMatrixWorld(true);bone.getWorldPosition(start);child.getWorldPosition(end);direction.subVectors(end,start).normalize();const next=new THREE.Vector3(...desired).normalize().transformDirection(root.matrixWorld);turn.setFromUnitVectors(direction,next);bone.getWorldQuaternion(world).premultiply(turn);bone.parent.getWorldQuaternion(parent).invert();bone.quaternion.copy(parent.multiply(world));
 }
 function sample(time,{position=[0,0,0],yaw=0,lean=0,pitch=0,progress=0}={}){
  root.position.fromArray(position);root.rotation.order='YXZ';root.rotation.set(pitch,yaw,lean);for(const saved of bones.values())saved.bone.quaternion.copy(saved.quaternion);root.updateMatrixWorld(true);
  if(id==='sonask'){
   for(const [side,sign] of [['L',1],['R',-1]]){aim(`Bone.002_${side}`,`Bone.002_${side}.001`,[sign*.18,-.95,.18]);aim(`Bone.002_${side}.001`,`Bone.002_${side}.002`,[sign*.1,-.9,.35]);}
   const head=bones.get(key('HEAD'))?.bone;if(head){head.rotation.y+=-.12+progress*.24;head.rotation.z+=-.1;}
   const jaw=bones.get(key('jaw'))?.bone;if(jaw)jaw.rotation.x+=.16;
  }else if(id==='crawler'){
   for(const [side,sign] of [['Left',1],['Right',-1]]){aim(`${side} arm`,`${side} elbow`,[sign*.6,-.65,.4]);aim(`${side} elbow`,`${side} wrist`,[sign*.3,-.85,.4]);const leg=bones.get(key(`${side} leg`))?.bone,knee=bones.get(key(`${side} knee`))?.bone;if(leg)leg.rotation.x+=Math.sin(progress*Math.PI*4+sign)*.55;if(knee)knee.rotation.x-=.55+Math.sin(progress*Math.PI*4+sign)*.3;}
   const head=bones.get(key('Head'))?.bone;if(head){head.rotation.z+=.15;head.rotation.x+=1.1;}
  }
  root.updateMatrixWorld(true);
 }
 function dispose(){root.removeFromParent();model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 return {root,model,bones,sample,dispose,id};
}
