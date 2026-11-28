import * as T from 'three';

/**
 * PLACEHOLDER. The next Backrooms level has not been designed yet, so this is deliberately a bare, dim room
 * under one flickering light: just enough to fade into after the vent. Replace `createNextLevelPeek`
 * (keep its shape: `scene`, `start()`, `update(time)` returning a camera pose) once the real level exists.
 */
export const PEEK_SECONDS=6;
export function createNextLevelPeek(){
 const scene=new T.Scene(),resources=[];
 scene.background=new T.Color(0x070706);scene.fog=new T.FogExp2(0x070706,.09);
 const floor=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0x2c2a22,roughness:.95}));floor.rotation.x=-Math.PI/2;scene.add(floor);resources.push(floor.geometry,floor.material);
 const light=new T.PointLight(0xe8dcb0,6,18,1.6);light.position.set(0,2.6,-3);scene.add(light);
 scene.add(new T.HemisphereLight(0x887f66,0x15130e,.35));
 return {
  scene,
  start(){},
  /** Camera pose for peek time t (seconds): a slow, steady drift forward. */
  update(time){light.intensity=6*(.88+.12*Math.sin(time*13)*Math.sin(time*7.3)+(Math.sin(time*41)>.93?-.35:0));return {x:Math.sin(time*.3)*.15,y:1.62,z:-time*.22,yaw:Math.sin(time*.2)*.06,pitch:0,roll:0};},
  dispose(){for(const r of resources)r.dispose?.();}
 };
}
