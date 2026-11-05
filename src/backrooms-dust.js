import {canWalkLevelZero} from './backrooms-layout.js';
/** Stable world coordinates: the camera never participates in placement or drift. */
export function createDustField(map,count=800){
 const points=[];let seed=17091;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let tries=0;points.length<count*3&&tries<count*30;tries++){
  const x=map.bounds.minX+random()*(map.bounds.maxX-map.bounds.minX),z=map.bounds.minZ+random()*(map.bounds.maxZ-map.bounds.minZ);
  if(canWalkLevelZero(map,x,z,.45))points.push(x,.3+random()*(map.height-.6),z);
 }return new Float32Array(points);
}
export function sampleDustField(base,time,output){
 for(let i=0;i<base.length;i+=3){const phase=i*1.618;output[i]=base[i]+Math.sin(time*.09+phase)*.06;output[i+1]=base[i+1]+Math.sin(time*.07+phase)*.06;output[i+2]=base[i+2]+Math.cos(time*.08+phase)*.06;}return output;
}
