import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRun} from '../src/game-state.js';
import {advanceHalloween} from '../src/halloween-state.js';
const module=await import('../src/halloween-test-scenarios.js').catch(()=>({}));
function game(){const run=createRun(42,{halloween:true});return {run,player:{x:-2.6,z:-31,height:3.6},camera:{position:new Vector3()},input:{setView(){},clear(){}},ui:{hideScreen(){},toast(){}},world:{targets:new Map(['invitation','seal-0','seal-1','seal-2','chest'].map(id=>['halloween:'+id,{position:{x:1,z:-28,height:3.6},mesh:{getWorldPosition:()=>new Vector3(1,4,-28)}}]))}};}
test('key animation test grants only the Halloween Key without searching or completing the escape',()=>{
 assert.equal(typeof module.setupHalloweenTest,'function','scenario shortcuts must be implemented');const g=game();module.setupHalloweenTest(g,'key');assert.equal(g.run.halloween.key,true);assert.equal(g.run.halloween.stage,5);assert.equal(g.run.banked.size,0);assert.equal(g.run.codeAccepted,false);
});
test('B2 and return tests run the actual visit transitions with pre-granted quest access',()=>{
 assert.equal(typeof module.setupHalloweenTest,'function');const g=game(),test=module.setupHalloweenTest(g,'b2');assert.equal(g.run.phase,'halloween');assert.equal(g.run.halloween.visit.stage,'unlock');advanceHalloween(g.run,[g.player],Date.now()/1000+3);advanceHalloween(g.run,[g.player],Date.now()/1000+9);test.tick();advanceHalloween(g.run,[g.player],Date.now()/1000+9);assert.equal(g.run.halloween.visit.stage,'conversation');
 const returned=game();module.setupHalloweenTest(returned,'return');assert.equal(returned.run.halloween.visit.stage,'return');advanceHalloween(returned.run,[returned.player],Date.now()/1000+5);assert.equal(returned.run.phase,'playing');assert.equal(returned.player.height,3.6);
});
test('quest item shortcuts preserve normal keys and reject unsupported commands',()=>{
 assert.equal(typeof module.setupHalloweenTest,'function');const g=game(),test=module.setupHalloweenTest(g,'quest');assert.equal(test.command('quest:seal-1'),true);assert.equal(g.run.halloween.stage,2);assert.equal(g.run.halloween.key,false);assert.equal(test.command('unknown'),false);assert.equal(g.run.drawers.some(d=>d.taken),false);
});
test('full testing preserves the normal quest while decoration inspection can cycle rooms safely',()=>{
 const full=game();module.setupHalloweenTest(full,'full');assert.equal(full.run.boardsOpen,false);assert.equal(full.run.halloween.stage,0);
 const map=game(),test=module.setupHalloweenTest(map,'map'),first={...map.player};assert.equal(test.command('room-next'),true);assert.ok(Math.hypot(map.player.x-first.x,map.player.z-first.z)>1);map.run.huntElapsed=89;test.tick();assert.equal(map.run.huntElapsed,0);assert.equal(map.run.halloween.key,false);
});
