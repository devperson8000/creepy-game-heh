import {createTeaserMonster} from './teaser-monsters.js';
import {createNeedleLiveGait} from './needlelimbs-gait.js';
/** CC0 textured Sonask, scaled to this ceiling and given a continuous world-planted gait. */
export function createBackroomsStalkerActor(asset){
 const actor=createTeaserMonster(asset,'sonask');actor.root.name='backrooms-stalker';actor.root.scale.setScalar(2.62/3.15);actor.sample(0);actor.root.updateMatrixWorld(true);
 const base=actor.model.position.clone(),gait=createNeedleLiveGait(actor.model,{legNames:{L:['Bone_L001','Bone_L002','Bone_L004'],R:['Bone_R001','Bone_R002','Bone_R004']}});
 let phase=0,lastTravel=0;
 function sample(state,time){
  actor.model.position.copy(base);actor.sample(time,{position:[state.position.x,0,state.position.z],yaw:state.yaw,progress:0});
  phase+=Math.max(0,state.travel-lastTravel)*(3-Math.min(1.4,state.speed*.14));lastTravel=state.travel;const blend=state.walk;
  for(const [side,sign]of [['L',1],['R',-1]]){const arm=actor.bones.get(('Bone.002_'+side).replace(/[._\s]/g,'').toLowerCase())?.bone;if(arm)arm.rotation.x+=Math.sin(phase+sign*Math.PI/2)*.27*blend;}
  const chest=actor.bones.get('bone002')?.bone;if(chest){chest.rotation.x+=Math.min(.14,state.speed*.016);chest.rotation.z+=Math.sin(phase)*.025*blend;}
  for(let i=0;i<=6;i++){const tail=actor.bones.get(i?'tail'+String(i).padStart(3,'0'):'tail')?.bone;if(tail)tail.rotation.z+=Math.sin(time*1.4-i*.5)*(.04+.04*blend);}
  const jaw=actor.bones.get('jaw')?.bone;if(jaw)jaw.rotation.x+=(state.mode==='investigate'?.1:0)+Math.sin(time*2)*.02;
  actor.root.updateMatrixWorld(true);gait.sample({time,position:[state.position.x,0,state.position.z],yaw:state.yaw,speed:state.speed,walk:blend});actor.root.updateMatrixWorld(true);
 }
 return {...actor,sample,gait};
}
