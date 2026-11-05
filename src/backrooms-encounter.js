import {BACKROOMS_BACTERIA_SLOT} from './backrooms-entity-slot.js';
import {createNavigator} from './navigation.js';
import {canWalkLevelZero} from './backrooms-layout.js';
/** Empty encounter seam: world visibility remains available, without loading or simulating an entity. */
export function createBackroomsEncounter(world){
 const nav=createNavigator((x,z)=>canWalkLevelZero(world.map,x,z,.35),{...world.map.bounds,spacing:.5});
 const state={position:{...BACKROOMS_BACTERIA_SLOT.spawn},yaw:0,speed:0,travel:0,walk:0,elapsed:0,active:false,caught:false,mode:'unassigned'};
 const simulation={state,clear:nav.clear,noise:()=>false};
 return {slot:BACKROOMS_BACTERIA_SLOT,ready:Promise.resolve(),simulation,actor:null,entityState:null,update:()=>({caught:false,scare:false,ready:true}),replicate:()=>({caught:false,scare:false,ready:true}),movement:()=>{},distract:()=>false,unlock:()=>{},reset:()=>{},dispose:()=>{}};
}
