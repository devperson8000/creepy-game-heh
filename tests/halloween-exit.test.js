import test from 'node:test';import assert from 'node:assert/strict';import {createRun} from '../src/game-state.js';import {createWorld} from '../src/world.js';import {createCoopState,coopInteract,markEscaped} from '../src/coop-state.js';import {createCoopSimulation} from '../src/coop-simulation.js';
function world(run){const old=globalThis.document,ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){}};globalThis.document={createElement:()=>({getContext:()=>ctx})};try{return createWorld(run);}finally{globalThis.document=old;}}
test('house exit is mounted in the hub and validated by real objectives and proximity',()=>{
 const state=createCoopState(42,[{id:'p',slot:0}],{halloween:true}),w=world(state.run),target=w.targets.get('house-exit');assert.ok(target);assert.equal(target.type,'escape');
 w.scene.updateMatrixWorld(true);const at=target.mesh.getWorldPosition(w.scene.position.clone());target.position={x:at.x,z:at.z,height:3.6};const p=state.players.get('p');Object.assign(p,{x:at.x,z:at.z+1.1,height:3.6});const action={type:'escape',targetId:'house-exit'};
 assert.equal(coopInteract(state,'p',action,{targets:w.targets}).ok,false);state.run.banked=new Set([0,1,2,3]);state.run.codeAccepted=true;
 assert.equal(coopInteract(state,'p',action,{targets:w.targets}).ok,true);p.x=100;assert.equal(coopInteract(state,'p',action,{targets:w.targets}).ok,false);
 p.z=-34;assert.equal(markEscaped(state,'p'),false,'the old cab cannot bypass the house escape');
});
test('trusted exit interaction starts the actual host house finale, while objectives alone keep B2 available',()=>{
 const state=createCoopState(42,[{id:'p',slot:0}],{halloween:true}),w=world(state.run),sim=createCoopSimulation(state,w,{now:()=>100});state.run.banked=new Set([0,1,2,3]);state.run.codeAccepted=true;
 const t=w.targets.get('house-exit');assert.ok(t);const pos=t.mesh.getWorldPosition(w.scene.position.clone());t.position={x:pos.x,z:pos.z,height:3.6};Object.assign(state.players.get('p'),{x:pos.x,z:pos.z+1,height:3.6});sim.advance(.1);assert.equal(state.run.phase,'playing');assert.ok(sim.interact('p',{targetId:'house-exit'}).ok);assert.equal(state.run.phase,'finale');assert.equal(state.run.finale.variant,'house');
});
