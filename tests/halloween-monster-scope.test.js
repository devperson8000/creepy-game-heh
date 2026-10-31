import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for(const file of ['game.js','coop-game.js','menu-hallway.js'])test(`${file} keeps sequel monster factories out of Monochrome 1 gameplay`,()=>{
 const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
 assert.equal(/attachMechanicalHead|createRebuiltMonochrome|createNeedlelimbsActor/.test(source),false,'gameplay must not construct sequel monsters');
 assert.equal(/metallic\s*:\s*(?:true|!!run\.halloween)/.test(source),false,'Halloween must not activate sequel jumpscare cosmetics');
});
