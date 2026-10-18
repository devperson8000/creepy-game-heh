import test from 'node:test';import assert from 'node:assert/strict';import {objectiveFor} from '../src/game-ui.js';
const run=()=>({boardsOpen:true,banked:new Set(),carried:new Set(),clueRead:false,codeAccepted:false,exitOpen:false});
test('the objective counts keys held across the whole co-op team',()=>{const r=run();r.teamKeyCount=4;assert.match(objectiveFor(r),/Return/);r.teamKeyCount=2;assert.match(objectiveFor(r),/Search/);});
test('the objective distinguishes finding the code, entering a known code, and entering an already open elevator',()=>{const r=run();r.banked=new Set([1,2,3,4]);assert.match(objectiveFor(r),/Find/);r.clueRead=true;assert.match(objectiveFor(r),/Enter/);r.codeAccepted=true;assert.match(objectiveFor(r),/Open/);r.exitOpen=true;assert.match(objectiveFor(r),/Step/);});
test('a blocked entrance remains the first objective',()=>{const r=run();r.boardsOpen=false;r.teamKeyCount=4;assert.match(objectiveFor(r),/boarded/);});
