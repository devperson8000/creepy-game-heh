import test from 'node:test';
import assert from 'node:assert/strict';
import { isSunnyChenPath } from '../src/sunnychen-route.js';

test('only the Sunny Chen path selects the special message page', () => {
  assert.equal(isSunnyChenPath('/sunnychen'), true);
  assert.equal(isSunnyChenPath('/sunnychen/'), true);
  for (const path of ['/', '/backrooms', '/secretroom', '/sunnychen-extra']) {
    assert.equal(isSunnyChenPath(path), false);
  }
});
