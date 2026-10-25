import * as THREE from 'three';
const smooth=t=>{const p=THREE.MathUtils.clamp(t,0,1);return p*p*(3-2*p);};
export const NEEDLE_STRIDE=.95;
// Absolute path-distance choreography: contact feet stay in world space, even on replay/seek.
export function needleFootstep(travel,side){
 const d=Math.max(0,travel),cycle=Math.floor((d+1e-8)/NEEDLE_STRIDE),phase=(d-cycle*NEEDLE_STRIDE)/NEEDLE_STRIDE;
 const swing=THREE.MathUtils.clamp((phase-(side==='left'?0:.5))*2,0,1);
 return {advance:(cycle+smooth(swing))*NEEDLE_STRIDE,lift:Math.sin(swing*Math.PI)**2*.13,planted:swing<=0||swing>=1};
}
const point=bone=>bone.getWorldPosition(new THREE.Vector3());
function aim(bone,child,target){
 const origin=point(bone),from=point(child).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
 const rotation=new THREE.Quaternion().setFromUnitVectors(from,to),world=bone.getWorldQuaternion(new THREE.Quaternion());
 const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 bone.quaternion.copy(parent.multiply(rotation.multiply(world)));bone.updateWorldMatrix(false,true);
}
export function createNeedleGait(model){
 model.updateWorldMatrix(true,true);
 model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 const legs=['L','R'].map(side=>{
  const hip=model.getObjectByName('thigh'+side),knee=model.getObjectByName('shin'+side),foot=model.getObjectByName('foot'+side);
  if(!hip||!knee||!foot)return null;
  const a=point(hip),b=point(knee),c=point(foot);
  let sole=Infinity;
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const index=mesh.skeleton.bones.indexOf(foot),g=mesh.geometry;
   for(let v=0;v<g.attributes.position.count;v++)for(let k=0;k<4;k++)if(g.attributes.skinIndex.getComponent(v,k)===index&&g.attributes.skinWeight.getComponent(v,k)>.9){sole=Math.min(sole,mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).y);break;}
  });
  const axis=c.clone().sub(a).normalize();
  const pole=b.clone().sub(a).addScaledVector(axis,-b.clone().sub(a).dot(axis)).normalize();
  return {hip,knee,foot,rest:new THREE.Vector3(c.x,Number.isFinite(sole)?c.y-sole:c.y,c.z),rotation:foot.getWorldQuaternion(new THREE.Quaternion()),upper:a.distanceTo(b),lower:b.distanceTo(c),pole,side:side==='L'?'left':'right'};
 }).filter(Boolean);
 function sample({travel,walk,position,yaw}){
  if(!legs.length)return;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),side=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  // Crouched pelvis gives the planted trailing leg enough reach; weight passes over the support foot.
  const phase=travel/NEEDLE_STRIDE*Math.PI*2;
  model.position.y-=.28+.015*walk*Math.sin(phase)**2;
  model.position.x+=.025*walk*Math.sin(phase);
  model.updateWorldMatrix(true,true);
  const origin=new THREE.Vector3(...position).addScaledVector(forward,-travel);
  for(const leg of legs){
   const step=needleFootstep(travel,leg.side),target=origin.clone().addScaledVector(side,leg.rest.x).addScaledVector(forward,leg.rest.z+step.advance);
   target.y=position[1]+leg.rest.y+step.lift;
   const hip=point(leg.hip),dir=target.clone().sub(hip),length=dir.length();dir.normalize();
   const d=THREE.MathUtils.clamp(length,.001,leg.upper+leg.lower-.0001);
   const along=(leg.upper**2-leg.lower**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,leg.upper**2-along*along));
   const pole=leg.pole.clone().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
   const bend=hip.clone().addScaledVector(dir,along).addScaledVector(pole,height);
   aim(leg.hip,leg.knee,bend);aim(leg.knee,leg.foot,target);
   const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw).multiply(leg.rotation);
   leg.foot.quaternion.copy(leg.foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));leg.foot.updateWorldMatrix(false,true);
  }
 }
 return {legs,sample};
}
