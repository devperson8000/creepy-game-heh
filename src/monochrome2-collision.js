import {monochrome2ShopDoorOpen} from './monochrome2-intro-timeline.js';

// Shared shelf anchors keep visible props and the collision audit in sync.
export const MONOCHROME2_SHELVES=Object.freeze([
 Object.freeze({x:-3.45,z:-24.2}),
 Object.freeze({x:-3.45,z:-29.2}),
 Object.freeze({x:3.4,z:-24.3}),
 Object.freeze({x:3.4,z:-28.8})
]);

export const MONOCHROME2_ACTOR_RADIUS_X=.38;
export const MONOCHROME2_ACTOR_RADIUS_Z=.32;

const solids=[
 // Shop side walls and the solid pieces of the storefront.
 {id:'shop-west-wall',minX:-4.56,maxX:-4.34,minZ:-36.1,maxZ:-19.9,minY:0,maxY:4.9},
 {id:'shop-east-wall',minX:4.34,maxX:4.56,minZ:-36.1,maxZ:-19.9,minY:0,maxY:4.9},
 {id:'shop-front-west-pier',minX:-4.5,maxX:-3.25,minZ:-20.18,maxZ:-19.92,minY:0,maxY:4.8},
 {id:'shop-front-east-pier',minX:3.25,maxX:4.5,minZ:-20.18,maxZ:-19.92,minY:0,maxY:4.8},
 {id:'shop-front-west-glass',minX:-3.25,maxX:-1.7,minZ:-20.14,maxZ:-19.96,minY:.34,maxY:3.54},
 {id:'shop-front-east-glass',minX:1.7,maxX:3.25,minZ:-20.14,maxZ:-19.96,minY:.34,maxY:3.54},
 // The rear wall has a deliberate opening aligned to the stairwell.
 {id:'shop-rear-west-wall',minX:-4.56,maxX:1,minZ:-36.14,maxZ:-35.86,minY:0,maxY:4.9},
 {id:'shop-rear-east-wall',minX:3.84,maxX:4.56,minZ:-36.14,maxZ:-35.86,minY:0,maxY:4.9},
 // The upper rear lintel sits above the opening, not in the walkable area.
 {id:'shop-rear-lintel',minX:1,maxX:3.84,minZ:-36.14,maxZ:-35.86,minY:3.85,maxY:4.9},
 // Four display racks, including their projecting shelves and products.
 ...MONOCHROME2_SHELVES.map((shelf,index)=>({
  id:'shop-shelf-'+index,
  minX:shelf.x-.83,maxX:shelf.x+.83,
  minZ:shelf.z-.14,maxZ:shelf.z+.58,
  minY:0,maxY:2.45
 })),
 // The low checkout/counter at the rear of the shop.
 {id:'shop-counter',minX:-2.38,maxX:-.22,minZ:-33.98,maxZ:-33.02,minY:0,maxY:1.12},
 // Stairwell side rails. The character must stay between them on every tread.
 {id:'stair-west-rail',minX:1.06,maxX:1.24,minZ:-40.05,maxZ:-28.9,minY:-2.7,maxY:2.4},
 {id:'stair-east-rail',minX:3.60,maxX:3.78,minZ:-40.05,maxZ:-28.9,minY:-2.7,maxY:2.4}
];

function overlapsEllipse(pose,solid){
 const nearestX=Math.max(solid.minX,Math.min(solid.maxX,pose.x));
 const nearestZ=Math.max(solid.minZ,Math.min(solid.maxZ,pose.z));
 const dx=(pose.x-nearestX)/MONOCHROME2_ACTOR_RADIUS_X;
 const dz=(pose.z-nearestZ)/MONOCHROME2_ACTOR_RADIUS_Z;
 const vertical=pose.y<solid.maxY&&pose.y+1.88>solid.minY;
 return vertical&&dx*dx+dz*dz<1;
}

/**
 * Audits every survivor's body footprint against the authored shop/stair geometry.
 * The only permitted solid crossing is the lead survivor passing through the
 * marked noclip wall after the wall-contact beat has finished.
 */
export function monochrome2CollisionViolations(poses,time){
 const violations=[];
 if(!Array.isArray(poses)||poses.length!==3)return [{actor:-1,solid:'actor-count',time}];
 for(let index=0;index<poses.length;index++){
  const pose=poses[index];
  for(const solid of solids){
   if(overlapsEllipse(pose,solid))violations.push({actor:index,solid:solid.id,time});
  }
  // The double doors are a real barrier until the synchronized entrance cue opens them.
  const inDoorway=Math.abs(pose.x)<1.7-MONOCHROME2_ACTOR_RADIUS_X&&Math.abs(pose.z+20.065)<MONOCHROME2_ACTOR_RADIUS_Z;
  if(inDoorway&&monochrome2ShopDoorOpen(time)<.95){
   violations.push({actor:index,solid:'closed-shop-door',time});
  }
  // No survivor may cross the stair-end wall except the lead during the authored noclip.
  if(pose.z< -40.18-MONOCHROME2_ACTOR_RADIUS_Z&&!(index===0&&time>=49.05)){
   violations.push({actor:index,solid:'noclip-wall-without-permission',time});
  }
  // The lead touches this wall for the reach/lean animation, but cannot cross it early.
  if(index===0&&time<49.05&&pose.z< -40.18+.02){
   violations.push({actor:index,solid:'premature-noclip-wall-crossing',time});
  }
 }
 for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++){
  const dx=(poses[a].x-poses[b].x)/(MONOCHROME2_ACTOR_RADIUS_X*2);
  const dz=(poses[a].z-poses[b].z)/(MONOCHROME2_ACTOR_RADIUS_Z*2);
  if(dx*dx+dz*dz<1)violations.push({actor:a,other:b,solid:'survivor-overlap',time});
 }
 return violations;
}
