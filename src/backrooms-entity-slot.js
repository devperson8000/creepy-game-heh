import {PITFALLS} from './backrooms-pitfalls.js';
// No invisible substitute: entity simulation remains disabled until a better model is integrated.
export const BACKROOMS_BACTERIA_SLOT=Object.freeze({id:'bacteria',modelUrl:null,status:'awaiting-model',height:2.6,spawn:Object.freeze({...PITFALLS.lowerSpawn}),layer:'lower',navigation:'backrooms-round.canMoveRound',doorState:'altDoorOpen'});
