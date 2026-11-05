import test from 'node:test';
import assert from 'node:assert/strict';
import {isBackroomsPath} from '../src/backrooms-route.js';
test('only the Backrooms path selects Level 0 and the main game stays at root',()=>{
 for(const path of ['/backrooms','/backrooms/'])assert.equal(isBackroomsPath(path),true);
 for(const path of ['/','/backrooms-other','/testhalloween','/backrooms/anything'])assert.equal(isBackroomsPath(path),false);
});
