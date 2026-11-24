/**
 * Import spaces for the two Level 0 models still to come. Drop the file in
 * public/models/backrooms/ (see the README there), then flip its `ready` flag to true.
 * While `ready` is false nothing is requested, so there is no 404 and no invisible stand-in.
 */
export const BACKROOMS_MODEL_DIR='/models/backrooms/';
export const BACKROOMS_MODEL_SPACES=Object.freeze({
 /** Replacement suit for every player (first-person head hidden, teammates see it). */
 hazmat:Object.freeze({file:'hazmat.glb',ready:true,height:1.8}),
 /** The bacteria: Level 0's main monster. Reserved; not simulated until its AI exists. */
 bacteria:Object.freeze({file:'bacteria.glb',ready:false,height:2.6})
});
export const backroomsModelUrl=id=>{const s=BACKROOMS_MODEL_SPACES[id];return s?.ready?BACKROOMS_MODEL_DIR+s.file:null;};
