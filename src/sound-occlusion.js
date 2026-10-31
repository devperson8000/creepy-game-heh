import * as THREE from 'three';
/** At most six wall rays/second; silent callers perform no raycasting. */
export function createSoundOcclusion(meshes){const ray=new THREE.Raycaster(),from=new THREE.Vector3(),to=new THREE.Vector3();let last=-Infinity,blocked=false;
 function visible(mesh){if(mesh.userData.actor||mesh.userData.interactionProxy)return false;for(let p=mesh;p;p=p.parent)if(!p.visible)return false;return true;}
 return {sample(listener,source,{active=true,time=performance.now()/1000}={}){if(!active){last=-Infinity;return false;}if(time-last<1/6)return blocked;last=time;from.set(listener.x,listener.y??0,listener.z);to.set(source.x,source.y??0,source.z);const length=from.distanceTo(to);if(!Number.isFinite(length)||length<.25)return blocked=false;ray.set(from,to.sub(from).normalize());ray.near=.08;ray.far=length-.12;blocked=ray.intersectObjects(meshes.filter(visible),false).length>0;return blocked;}};
}
