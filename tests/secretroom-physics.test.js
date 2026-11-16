import test from 'node:test';
import assert from 'node:assert/strict';
import { createVhsBody, stepVhsBody, wakeVhsBody } from '../src/secretroom-physics.js';

const floor = {
  center: { x: 0, y: -0.055, z: 0 },
  halfExtents: { x: 3.4, y: 0.055, z: 3.4 },
  friction: 0.82,
  restitution: 0.12
};

test('a dropped cassette accelerates under gravity and settles on the carpet', () => {
  const body = createVhsBody({ x: 0, y: 1.1, z: 0 });
  stepVhsBody(body, 0.12, [floor]);
  assert.ok(body.position.y < 1.1);
  for (let i = 0; i < 600; i++) stepVhsBody(body, 1 / 60, [floor]);
  assert.ok(Math.abs(body.position.y - 0.013) < 0.025);
  assert.ok(Math.abs(body.velocity.y) < 0.06);
});

test('a thrown cassette collides with a wall and cannot leave the room', () => {
  const body = createVhsBody({ x: 2.7, y: 1, z: 0 });
  body.velocity.x = 5.5;
  const wall = {
    center: { x: 3.34, y: 1.7, z: 0 },
    halfExtents: { x: 0.08, y: 1.7, z: 3.4 },
    friction: 0.48,
    restitution: 0.18
  };
  for (let i = 0; i < 90; i++) stepVhsBody(body, 1 / 60, [floor, wall]);
  assert.ok(body.position.x < 3.2);
  assert.ok(body.velocity.x < 0.2);
});

test('wake restores motion after a deliberate pickup and release', () => {
  const body = createVhsBody({ x: 0, y: 0.013, z: 0 });
  body.sleeping = true;
  wakeVhsBody(body);
  body.velocity.x = 2.5;
  stepVhsBody(body, 0.1, [floor]);
  assert.ok(body.position.x > 0);
  assert.equal(body.sleeping, false);
});
