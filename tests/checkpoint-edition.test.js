import test from 'node:test';import assert from 'node:assert/strict';
import {createCoopState,serializeCoopState} from '../src/coop-state.js';import * as recovery from '../src/coop-recovery.js';import {createWorld} from '../src/world.js';
const members=[{id:'host',slot:0},{id:'guest',slot:1}];
function withCanvas(fn){const previous=globalThis.document,ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:()=>({width:100})},{get:(o,k)=>o[k]??(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};try{return fn();}finally{globalThis.document=previous;}}
for(const [name,maze,rows]of [['legacy storage',false,1],['legacy single row',true,1],['current three rows',true,3]])test(`restoring ${name} preserves its layout, drawers and playable world`,()=>{
 assert.equal(typeof recovery.createCoopRound,'function');const source=createCoopState(42,members,{halloween:true,maze,drawerRows:rows});const expectedSize=source.run.layout.size,expectedDrawers=source.run.drawers.length;
 if(!maze)delete source.run.halloween.maze;if(rows===1)delete source.run.halloween.drawerRows;source.run.banked.add(source.run.drawers.find(d=>d.key).id);
 const checkpoint={state:serializeCoopState(source)},state=recovery.createCoopRound({seed:42,players:members,ownerId:'host',ownerEpoch:2,checkpoint},{localId:'host'});
 assert.equal(state.run.layout.size,expectedSize);assert.equal(state.run.drawers.length,expectedDrawers);assert.equal(state.run.halloween.maze,maze);assert.equal(state.run.halloween.drawerRows,rows);assert.equal(state.run.banked.size,1);
 withCanvas(()=>{const world=createWorld(state.run);assert.equal([...world.targets.values()].filter(t=>t.type==='drawer').length,expectedDrawers);assert.doesNotThrow(()=>world.update(.016,0,state.players.get('host'),0,0,{active:false,position:{x:0,z:0,height:0}}));world.halloween?.dispose();});
});
test('plain and seasonal maze signage describe the exit available in that edition',()=>withCanvas(()=>{
 const labels=[];globalThis.document.createElement=()=>({getContext:()=>new Proxy({fillText:value=>labels.push(value),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})})});
 const plain=createWorld(createCoopState(42,members,{mapUpdate:true}).run);assert.ok(labels.includes('EXIT'));assert.ok(!labels.includes('B2 SERVICE LIFT'));assert.ok(!labels.includes('HOUSE SERVICE'));plain.halloween?.dispose();labels.length=0;
 const seasonal=createWorld(createCoopState(42,members,{halloween:true}).run);assert.ok(labels.includes('B2 SERVICE LIFT'));assert.ok(labels.includes('HOUSE SERVICE'));seasonal.halloween?.dispose();
}));
