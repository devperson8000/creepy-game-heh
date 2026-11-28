import * as T from 'three';
import {createBackroomsPlayer} from './backrooms-player.js';
import {BACKROOMS_PLAYER_MODEL} from './backrooms-player-config.js';
import {downedPose,bleedRemaining,rescuerLean} from './monochrome2-downed-pose.js';
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
 // The hazmat suit has no downed clip, so a downed teammate is laid down as one body: slammed flat on their back by
 // Monochrome, curled on their side by the Bacteria. The fall is quick, the get-up after a revive slow and unsteady.
 function lieDown(a,p,dt){
  const goal=p.downed?1:0,from=a.down??0,rate=goal>from?11:3.2,next=from+(goal-from)*(1-Math.exp(-rate*Math.max(0,dt)));a.down=Math.abs(goal-next)<.003?goal:next;
  if(p.downed&&p.downedBy)a.by=p.downedBy;
  const pose=downedPose(a.by??p.downedBy,a.down);a.root.rotation.order='YXZ';a.root.rotation.x=pose.rx;a.root.rotation.z=pose.rz-(p.balance?.angle??0)*.22*(1-a.down);a.root.scale.y=(a.custom||p.downed||a.down>0?1:(p.crouch?.67:1))*pose.sy;a.root.position.y+=pose.dy;
 }
 // A ring on the floor around a downed teammate: it empties as they bleed out, so friends can see how long is left.
 function ring(a,p,dt,time){
  if(!a.ring){const geo=new T.RingGeometry(.62,.72,48,1,0,Math.PI*2),mat=new T.MeshBasicMaterial({color:0xe0482c,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false});resources.add(geo);resources.add(mat);a.ring=new T.Mesh(geo,mat);a.ring.rotation.x=-Math.PI/2;scene.add(a.ring);a.ringFraction=-1;}
  const show=!!p.downed&&!p.lost,frac=bleedRemaining(p);a.ring.visible=show;if(!show)return;
  a.ring.position.set(a.pose.x,a.pose.y+.03,a.pose.z);
  if(Math.abs(frac-a.ringFraction)>.01){a.ring.geometry.dispose();resources.delete(a.ring.geometry);a.ring.geometry=new T.RingGeometry(.62,.72,48,1,Math.PI/2,Math.max(.01,frac*Math.PI*2));resources.add(a.ring.geometry);a.ringFraction=frac;}
  a.ring.material.opacity=.55+.25*Math.sin(time*5)*(frac<.3?1.6:1);
 }
 let clock=0;
 function update(players,dt){clock+=dt;const ids=new Set(),all=Object.values(players);for(const p of Object.values(players)){if(p.id===localId)continue;ids.add(p.id);let a=actors.get(p.id);if(!a){a=marker(p);actors.set(p.id,a);}const target=new T.Vector3(p.x,p.y,p.z);if(a.pose.distanceTo(target)>3)a.pose.copy(target);else a.pose.lerp(target,1-Math.exp(-14*dt));
  const helped=all.map(v=>v.id!==p.id?rescuerLean(p,v):null).find(Boolean);
  if(a.custom){a.update({...p,x:a.pose.x,y:a.pose.y,z:a.pose.z},dt,{yaw:p.yaw,thirdPerson:true});lieDown(a,p,dt);if(helped&&!p.downed){a.root.rotation.order='YXZ';a.root.rotation.x=-helped.lean;}}
  else{a.root.position.copy(a.pose);a.root.rotation.y=p.yaw;a.root.rotation.z=-(p.balance?.angle??0)*.22;a.root.scale.y=p.crouch?.67:1;a.root.rotation.x=0;lieDown(a,p,dt);if(helped&&!p.downed){a.root.rotation.x=-helped.lean;}a.phase+=dt*(p.speed??0)*3;const swing=Math.sin(a.phase)*Math.min(.6,(p.speed??0)*.08);a.legs.forEach((l,i)=>l.rotation.x=swing*(i?1:-1));a.arms.forEach((l,i)=>l.rotation.x=swing*(i?-1:1));}
 ring(a,p,dt,clock);
 }for(const [id,a]of actors)if(!ids.has(id)){a.ring?.removeFromParent();a.dispose();actors.delete(id);}}
 return {actors,update,dispose(){for(const a of actors.values()){a.ring?.removeFromParent();a.dispose();}actors.clear();for(const r of resources)r.dispose();}};
}
