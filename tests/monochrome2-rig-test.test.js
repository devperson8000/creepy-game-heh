import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gate=source('../src/monochrome2-test-gate.js');
const play=source('../src/monochrome2-play.js');
const backrooms=source('../src/backrooms.js');

test('the passworded test route alone enables the rig test tools',()=>{
 assert.match(gate,/startMonochrome2Play\(\{alreadyReleased:true,rigTest:true\}\)/);
 assert.match(play,/rigTest=false/);
 assert.match(play,/variant:'monochrome2',rigTest/);
 assert.match(backrooms,/rigTestEnabled=m2&&rigTest&&!client&&!session/);
});

test('Player 2 uses a second clone of the existing hazmat rig',()=>{
 assert.match(backrooms,/testSurvivor=createBackroomsPlayer\(world\.scene,\{url:BACKROOMS_PLAYER_MODEL/);
 assert.match(backrooms,/testSurvivor\?\.update\(testPlayer/);
 assert.match(backrooms,/testSurvivor\?\.dispose\(\)/);
});

test('the test control button switches the existing single-player movement between both actors',()=>{
 assert.match(backrooms,/player=testPlayer/);
 assert.match(backrooms,/player=primaryPlayer/);
 assert.match(backrooms,/data-action="spawn-rig-player"/);
 assert.match(backrooms,/data-action="switch-rig-control"/);
});
