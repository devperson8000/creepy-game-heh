import * as T from 'three';

/**
 * Procedural arm and hand pose for the hazmat suit (public/models/backrooms/hazmat.glb).
 *
 * The baked clips leave the arms flared out in an A-pose and the gloves splayed open. This rig runs
 * AFTER the AnimationMixer each frame and layers two things on top of whatever the clip wrote:
 *
 *   1. Arm tuck: the elbows and wrists are eased in toward the torso (a swing of the upper arm and
 *      forearm, so bone lengths, twist and the clip's swing and bend are all kept).
 *   2. Hands: fingers are driven toward a relaxed open hand when standing and a real fist when
 *      running. Fingers are closed in the hand's own bone space, so it works at any clip time.
 *
 * Nothing here is baked into the GLB, so the clips stay untouched. Tune the numbers below.
 */
export const HAZMAT_POSE_TUNING=Object.freeze({
 /** 0 = open relaxed hand, 1 = clenched fist, per gait. Blends smoothly between them. Only sprinting clenches. */
 fist:Object.freeze({idle:0,crouch:0,crouchwalk:.12,walk:0,run:1}),
 /** Arm profile per gait: 0 = standing arms, 1 = running arms. */
 runArms:Object.freeze({idle:0,crouch:0,crouchwalk:0,walk:1,run:1}),
 /** Seconds-based easing rates (higher = snappier). */
 rate:Object.freeze({fistIn:15,fistOut:11,arms:9}),
 /** Lateral (side-to-side) arm limits in metres from the body centreline, per profile. */
 arms:Object.freeze({
  idle:Object.freeze({elbow:.28,wrist:.32,keep:.2}),
  /** Wrist target eases from `back` to `front` as the hand swings forward past z=`from`..`to`. */
  run:Object.freeze({elbow:.285,wristBack:.32,wristFront:.23,from:.1,to:.42,keep:.2})
 }),
 /** Fist: target flexion per joint in degrees [proximal, middle, distal]. */
 fingerFist:Object.freeze({index:[78,102,64],middle:[84,104,64],ring:[88,104,62],pinky:[90,102,58]}),
 /** Relaxed open hand: a soft cascade of curl, a little more toward the little finger. */
 fingerRelax:Object.freeze({index:[16,20,10],middle:[22,26,12],ring:[28,30,14],pinky:[34,32,14]}),
 /** Thumb flexion [carpometacarpal, knuckle, tip] in degrees. */
 thumbFist:[28,44,34],
 /** Direction (authored T-pose, left hand) the thumb folds toward: along and across the palm (tuned by eye on the fist). */
 thumbAcross:[.5,0,-.5],
 thumbRelax:[8,12,8],
 /** How strongly the clip's finger fan is closed up (0 = leave it, 1 = parallel fingers). */
 splay:Object.freeze({relax:.65,fist:.95}),
 /** Share of the clip's own finger pose kept when relaxed (the rest is the relaxed hand above). */
 relaxBlend:.6
});

const FINGERS=['index','middle','ring','pinky'];
const norm=name=>name.replace(/^mixamorig/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const clamp01=v=>Math.min(1,Math.max(0,v));
const smooth=(a,b,v)=>{const t=clamp01((v-a)/(b-a));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const rad=d=>d*Math.PI/180;
const ease=(rate,dt)=>1-Math.exp(-rate*dt);

/**
 * @param {T.Object3D} root   the actor group (its local frame is the character frame: +X is the left hand side)
 * @param {T.Object3D} model  the cloned suit, still in its authored rest pose at this point
 * @returns {null|{update(delta:number,gait:string):void,state:object}} null if the skeleton is not the expected one
 */
export function createHazmatPoseRig(root,model,tuning=HAZMAT_POSE_TUNING){
 const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(norm(o.name),o);});
 const sides=['left','right'].map(side=>{
  const upper=bones.get(side+'arm'),fore=bones.get(side+'forearm'),hand=bones.get(side+'hand');
  if(!upper||!fore||!hand)return null;
  const chain=name=>[1,2,3].map(i=>bones.get(`${side}hand${name}${i}`));
  const fingers=Object.fromEntries(FINGERS.map(f=>[f,chain(f)])),thumb=chain('thumb'),tips=Object.fromEntries([...FINGERS,'thumb'].map(f=>[f,bones.get(`${side}hand${f}4`)]));
  if(FINGERS.some(f=>fingers[f].some(b=>!b))||thumb.some(b=>!b))return null;
  return {side,sign:side==='left'?1:-1,upper,fore,hand,fingers,thumb,tips};
 });
 if(sides.some(s=>!s))return null;

 model.updateWorldMatrix(true,true);
 const modelInverse=model.getWorldQuaternion(new T.Quaternion()).invert();
 const restQuat=bone=>bone.getWorldQuaternion(new T.Quaternion()).premultiply(modelInverse);
 const restPos=bone=>model.worldToLocal(bone.getWorldPosition(new T.Vector3()));
 const PALM=new T.Vector3(0,-1,0); // the authored T-pose has the palms facing the floor

 // Per finger joint: the bone-local axis that curls it toward the palm, and its rest flexion (zero).
 for(const s of sides){
  s.rest=new Map();
  s.palmLocal=PALM.clone().applyQuaternion(restQuat(s.hand).invert());
  const curlAxis=(joint,from,to)=>{
   const f=restPos(to).sub(restPos(from)).normalize(),p=PALM.clone().addScaledVector(f,-PALM.dot(f)).normalize();
   return new T.Vector3().crossVectors(f,p).normalize().applyQuaternion(restQuat(joint).invert());
  };
  s.curl=new Map();
  for(const f of FINGERS)s.fingers[f].forEach((joint,i)=>{
   const next=i<2?s.fingers[f][i+1]:s.tips[f];
   s.curl.set(joint,curlAxis(joint,joint,next));s.rest.set(joint,joint.quaternion.clone());
  });
  // Thumb: it flexes across the palm, towards the little-finger side and down, not straight down.
  const across=new T.Vector3(...tuning.thumbAcross).normalize();
  s.thumb.forEach((joint,i)=>{
   const next=i<2?s.thumb[i+1]:s.tips.thumb,f=restPos(next).sub(restPos(joint)).normalize(),p=across.clone().addScaledVector(f,-across.dot(f)).normalize();
   s.curl.set(joint,new T.Vector3().crossVectors(f,p).normalize().applyQuaternion(restQuat(joint).invert()));
   s.rest.set(joint,joint.quaternion.clone());
  });
 }

 const state={fist:null,run:null};
 const A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3(),Q1=new T.Quaternion(),Q2=new T.Quaternion(),Q3=new T.Quaternion();

 /** Rotate `bone` (no twist) so the line bone->child points at the world point `goal`. */
 function swing(bone,child,goal){
  bone.getWorldPosition(A);child.getWorldPosition(B);B.sub(A).normalize();C.subVectors(goal,A);if(C.lengthSq()<1e-10)return;C.normalize();
  Q1.setFromUnitVectors(B,C);bone.getWorldQuaternion(Q2);Q2.premultiply(Q1);
  bone.parent.getWorldQuaternion(Q3).invert();bone.quaternion.copy(Q3).multiply(Q2);bone.updateWorldMatrix(false,true);
 }
 /** Ease |x| toward `limit`; only what sticks out past it is pulled (a fraction `keep` of the excess stays). */
 const pull=(x,sign,limit,keep)=>{const m=x*sign;return sign*(m>limit?limit+(m-limit)*keep:m);};

 function tuckArms(run){
  const idle=tuning.arms.idle,go=tuning.arms.run,keep=lerp(idle.keep,go.keep,run),elbowLimit=lerp(idle.elbow,go.elbow,run);
  const point=bone=>root.worldToLocal(bone.getWorldPosition(new T.Vector3()));
  for(const s of sides){
   // Elbow first (swings the whole arm), then the wrist (swings the forearm), each only on the lateral axis.
   root.updateWorldMatrix(true,true);
   const E=point(s.fore),goalE=new T.Vector3(pull(E.x,s.sign,elbowLimit,keep),E.y,E.z);
   if(goalE.distanceToSquared(E)>1e-10)swing(s.upper,s.fore,root.localToWorld(goalE));
   root.updateWorldMatrix(true,true);
   const W=point(s.hand),wristRun=lerp(go.wristBack,go.wristFront,smooth(go.from,go.to,W.z)),wristLimit=lerp(idle.wrist,wristRun,run);
   const goalW=new T.Vector3(pull(W.x,s.sign,wristLimit,keep),W.y,W.z);
   if(goalW.distanceToSquared(W)>1e-10)swing(s.fore,s.hand,root.localToWorld(goalW));
  }
  root.updateWorldMatrix(true,true);
 }

 /** Flexion (radians, about the stored curl axis) of a joint relative to its authored rest. */
 const flexion=(joint,axis,rest)=>{Q1.copy(rest).invert().multiply(joint.quaternion);if(Q1.w<0){Q1.x*=-1;Q1.y*=-1;Q1.z*=-1;Q1.w*=-1;}return 2*Math.atan2(Q1.x*axis.x+Q1.y*axis.y+Q1.z*axis.z,Q1.w);};
 const driveJoint=(s,joint,degrees,weight)=>{
  const axis=s.curl.get(joint),current=flexion(joint,axis,s.rest.get(joint)),goal=lerp(current,rad(degrees),weight);
  joint.quaternion.multiply(Q2.setFromAxisAngle(axis,goal-current));
 };
 const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));

 function poseHands(fist){
  const weight=lerp(tuning.relaxBlend,1,fist),closing=lerp(tuning.splay.relax,tuning.splay.fist,fist);
  for(const s of sides){
   // 1) Close the fan of the fingers: swing each finger's base toward the middle finger within the palm plane.
   s.hand.updateWorldMatrix(true,false);
   const palm=s.palmLocal.clone().applyQuaternion(s.hand.getWorldQuaternion(new T.Quaternion())).normalize();
   const dirOf=f=>{const a=s.fingers[f][0].getWorldPosition(new T.Vector3()),b=s.fingers[f][1].getWorldPosition(new T.Vector3());return b.sub(a);};
   const flat=v=>v.addScaledVector(palm,-v.dot(palm)).normalize();
   const middle=flat(dirOf('middle'));
   for(const f of ['index','ring','pinky']){
    const base=s.fingers[f][0],dir=flat(dirOf(f)),angle=Math.atan2(new T.Vector3().crossVectors(dir,middle).dot(palm),dir.dot(middle));
    Q1.setFromAxisAngle(palm,angle*closing);base.parent.getWorldQuaternion(Q2).invert();
    base.getWorldQuaternion(Q3);Q3.premultiply(Q1);base.quaternion.copy(Q2).multiply(Q3);base.updateWorldMatrix(false,true);
   }
   // 2) Curl each joint toward the target hand.
   for(const f of FINGERS){
    const target=mix(tuning.fingerRelax[f],tuning.fingerFist[f],fist);
    s.fingers[f].forEach((joint,i)=>driveJoint(s,joint,target[i],weight));
   }
   const thumbTarget=mix(tuning.thumbRelax,tuning.thumbFist,fist);
   s.thumb.forEach((joint,i)=>driveJoint(s,joint,thumbTarget[i],weight));
  }
 }

 function update(delta,gait='idle'){
  const goalFist=tuning.fist[gait]??0,goalRun=tuning.runArms[gait]??0;
  if(state.fist===null){state.fist=goalFist;state.run=goalRun;}
  else if(delta>0){
   state.fist+=(goalFist-state.fist)*ease(goalFist>state.fist?tuning.rate.fistIn:tuning.rate.fistOut,delta);
   state.run+=(goalRun-state.run)*ease(tuning.rate.arms,delta);
  }
  tuckArms(state.run);
  poseHands(state.fist);
 }
 return {update,state};
}
