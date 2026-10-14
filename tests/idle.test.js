import test from 'node:test';
import assert from 'node:assert/strict';
import { idlePose } from '../src/idle.js';
test('body sways and head looks in both directions over time', () => {
 const poses = Array.from({length: 600}, (_, i) => idlePose(i / 10));
 assert.ok(poses.some(p => p.sway > 0.01));
 assert.ok(poses.some(p => p.sway < -0.01));
 assert.ok(poses.some(p => p.yaw > 0.2));
 assert.ok(poses.some(p => p.yaw < -0.2));
});
test('idle stays finite and restrained through a long session', () => {
 for (let t = 0; t < 86400; t += 113) {
  const p = idlePose(t);
  for (const n of Object.values(p)) assert.ok(Number.isFinite(n));
  assert.ok(Math.abs(p.sway) <= 0.035);
  assert.ok(Math.abs(p.yaw) <= 0.5);
  assert.ok(Math.abs(p.pitch) <= 0.12);
  assert.ok(Math.abs(p.arm) <= 0.04);
 }
});
