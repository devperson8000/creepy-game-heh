import {PITFALLS} from './backrooms-pitfalls.js';
import {backroomsModelUrl,BACKROOMS_MODEL_SPACES} from './backrooms-models.js';
// No invisible substitute: entity simulation remains disabled until a better model is integrated.
export const BACKROOMS_BACTERIA_SLOT=Object.freeze({id:'bacteria',modelUrl:backroomsModelUrl('bacteria'),status:'awaiting-model',height:BACKROOMS_MODEL_SPACES.bacteria.height,spawn:Object.freeze({...PITFALLS.lowerSpawn}),layer:'lower',navigation:'backrooms-round.canMoveRound',doorState:'altDoorOpen'});
