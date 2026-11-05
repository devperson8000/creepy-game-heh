import test from 'node:test';import assert from 'node:assert/strict';
import {BACKROOMS_SPEED,createBackroomsRound,roundTarget,interactRound} from '../src/backrooms-round.js';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
test('three reachable fuses unlock a physical exit and the player can win',()=>{
 const map=createLevelZero(),r=createBackroomsRound();assert.equal(r.phase,'playing');assert.equal(r.fuses.length,3);
 for(const item of [...r.fuses,r.exit])assert.ok(canWalkLevelZero(map,item.x,item.z));
 assert.equal(interactRound(r,'exit'),false);for(const f of r.fuses){assert.equal(roundTarget(r,f,0).id,f.id);assert.equal(interactRound(r,f.id),true);assert.equal(interactRound(r,f.id),false);}
 assert.equal(interactRound(r,'exit'),true);assert.equal(r.phase,'won');assert.equal(interactRound(r,'exit'),false);
});
test('new speeds substantially exceed the exploration version and retain a sprint escape margin against Needlelimbs',()=>{assert.ok(BACKROOMS_SPEED.walk>=5);assert.ok(BACKROOMS_SPEED.sprint>=9);assert.ok(BACKROOMS_SPEED.needleHunt>=8);assert.ok(BACKROOMS_SPEED.stalkerHunt>BACKROOMS_SPEED.sprint);assert.ok(BACKROOMS_SPEED.sprint>BACKROOMS_SPEED.needleHunt);});
