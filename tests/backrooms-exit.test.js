import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const backrooms=readFileSync(new URL('../src/backrooms.js',import.meta.url),'utf8');
const intro=readFileSync(new URL('../src/monochrome2-intro.js',import.meta.url),'utf8');

test('Backrooms exit is always in the HUD and disposes the scene before returning to the main game',()=>{
 assert.match(backrooms,/data-action="exit"/);
 assert.match(backrooms,/aria-label="Exit Backrooms and return to the Monochrome game"/);
 assert.match(backrooms,/on\(el\('\[data-action="exit"\]'\),'click',\(\)=>\{dispose\(\);window\.location\.assign\('\/'\);\}\)/);
});

test('all cinematic survivors opt into the relaxed source glove and Riley uses the dedicated voice profile',()=>{
 assert.equal((intro.match(/handPose:'relaxed'/g)??[]).length,3);
 assert.match(intro,/selectMonochrome2Voices/);
 assert.match(intro,/monochrome2SpeechSettings\(cue\)/);
});
