import test from 'node:test';
import assert from 'node:assert/strict';
import { isSecretRoomPath } from '../src/secretroom-route.js';

test('only the secret room route selects the VHS room', () => {
  for (const path of ['/secretroom', '/secretroom/']) {
    assert.equal(isSecretRoomPath(path), true);
  }
  for (const path of ['/', '/backrooms', '/monochrome2', '/secretroom-extra']) {
    assert.equal(isSecretRoomPath(path), false);
  }
});
