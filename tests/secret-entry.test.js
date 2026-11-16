import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSecretEntryCharge, SECRET_ENTRY, WALL_INSCRIPTION, WALL_INSCRIPTION_REVERSED } from '../src/secret-entry.js';

const sample = overrides => ({
  position: { x: -3.19, z: -2.6, height: -7.2 },
  yaw: Math.PI / 2,
  forward: 1,
  right: 0,
  paused: false,
  alive: true,
  ...overrides
});

test('the stair inscription is exactly the requested sentence in reverse character order', () => {
  assert.equal([...WALL_INSCRIPTION].reverse().join(''), WALL_INSCRIPTION_REVERSED);
  assert.match(WALL_INSCRIPTION_REVERSED, /^\."ti"/);
});

test('the secret wall requires a deliberate forward push while facing the right-hand wall at the bottom', () => {
  let state = 0;
  for (let i = 0; i < 8; i++) {
    const next = advanceSecretEntryCharge(state, sample(), 0.1);
    state = next.elapsed;
    assert.equal(next.triggered, false, 'the 0.82 second hold is not yet complete');
  }
  const final = advanceSecretEntryCharge(state, sample(), 0.1);
  assert.equal(final.triggered, true);
  assert.equal(final.progress, 1);
  assert.equal(SECRET_ENTRY.holdSeconds, 0.82);
});

test('walking near the wall, looking elsewhere, side-stepping or being paused never opens it', () => {
  const rejected = [
    sample({ yaw: Math.PI }),
    sample({ forward: 0, right: 1 }),
    sample({ position: { x: -2.7, z: -2.6, height: -7.2 } }),
    sample({ position: { x: -3.19, z: -2.6, height: 3.6 } }),
    sample({ paused: true }),
    sample({ alive: false })
  ];
  for (const input of rejected) {
    const result = advanceSecretEntryCharge(0.8, input, 0.1);
    assert.equal(result.elapsed, 0);
    assert.equal(result.triggered, false);
  }
});

test('releasing movement or changing direction resets the wall-contact hold', () => {
  const partial = advanceSecretEntryCharge(0.5, sample(), 0.1);
  assert.ok(partial.elapsed > 0);
  const released = advanceSecretEntryCharge(partial.elapsed, sample({ forward: 0 }), 0.1);
  assert.equal(released.elapsed, 0);
  assert.equal(released.progress, 0);
});
