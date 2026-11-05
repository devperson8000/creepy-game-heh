import * as T from 'three';
import {createBackroomsPlayer} from './backrooms-player.js';
import {BACKROOMS_PLAYER_MODEL} from './backrooms-player-config.js';
export function createBackroomsTeam(scene,localId){
 const actors=new Map();const resources=new Set();
 function marker(p){
  if(BACKROOMS_PLAYER_MODEL){const a=createBackroomsPlayer(scene,{url:BACKROOMS_PLAYER_MODEL});return {...a,pose:new T.Vector3(p.x,p.y,p.z),custom:true};}
  // Neutral tracking figures until the exact user-supplied hazmat is available.
  const root=new T.Group();root.name='remote-wanderer';scene.add(root);const gray=new T.MeshStandardMaterial({color:0x77776d,roughness:.9}),black=new T.MeshStandardMaterial({color:0x151b19,roughness:.3});resources.add(gray);resources.add(black);
  function capsule(r,h,x,y,z,m=gray){const g=new T.CapsuleGeometry(r,h,6,10);resources.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);return o;}
  capsule(.22,.45,0,1.1,0);capsule(.16,.1,0,1.63,0);capsule(.135,.025,0,1.64,-.095,black);
  const legs=[capsule(.085,.55,-.12,.4,0),capsule(.085,.55,.12,.4,0)],arms=[capsule(.065,.48,-.3,1.03,0),capsule(.065,.48,.3,1.03,0)];
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#111a13bb';ctx.fillRect(0,0,512,96);ctx.fillStyle='#e8e7d1';ctx.font='32px monospace';ctx.textAlign='center';ctx.fillText(p.name,256,61,490);const tex=new T.CanvasTexture(c),mat=new T.SpriteMaterial({map:tex,depthWrite:false});resources.add(tex);resources.add(mat);const tag=new T.Sprite(mat);tag.position.y=2.02;tag.scale.set(1.35,.25,1);root.add(tag);
  return {root,pose:new T.Vector3(p.x,p.y,p.z),legs,arms,phase:0,dispose(){root.removeFromParent();}};
 }
 function update(players,dt){const ids=new Set();for(const p of Object.values(players)){if(p.id===localId)continue;ids.add(p.id);let a=actors.get(p.id);if(!a){a=marker(p);actors.set(p.id,a);}const target=new T.Vector3(p.x,p.y,p.z);if(a.pose.distanceTo(target)>3)a.pose.copy(target);else a.pose.lerp(target,1-Math.exp(-14*dt));
  if(a.custom)a.update({...p,x:a.pose.x,y:a.pose.y,z:a.pose.z},dt,{yaw:p.yaw,thirdPerson:true});
  else{a.root.position.copy(a.pose);a.root.rotation.y=p.yaw;a.phase+=dt*(p.speed??0)*3;const swing=Math.sin(a.phase)*Math.min(.6,(p.speed??0)*.08);a.legs.forEach((l,i)=>l.rotation.x=swing*(i?1:-1));a.arms.forEach((l,i)=>l.rotation.x=swing*(i?-1:1));}
 }for(const [id,a]of actors)if(!ids.has(id)){a.dispose();actors.delete(id);}}
 return {actors,update,dispose(){for(const a of actors.values())a.dispose();actors.clear();for(const r of resources)r.dispose();}};
}
