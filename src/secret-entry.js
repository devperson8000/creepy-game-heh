export const WALL_INSCRIPTION = 'go down the stairs, and when you reach the bottom, turn right to find "it".';
export const WALL_INSCRIPTION_REVERSED = [...WALL_INSCRIPTION].reverse().join('');

export const SECRET_ENTRY = Object.freeze({
  wallX: -3.425,
  wallZ: -2.6,
  minX: -3.27,
  maxX: -3.08,
  minZ: -3.32,
  maxZ: -1.88,
  minHeight: -6.55,
  yaw: Math.PI / 2,
  yawTolerance: 0.34,
  forwardThreshold: 0.82,
  maxSideInput: 0.18,
  holdSeconds: 0.82
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function advanceSecretEntryCharge(elapsed, sample, delta) {
  const position = sample?.position ?? {};
  const aligned = sample?.enabled !== false &&
    sample?.paused !== true &&
    sample?.alive !== false &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.z) &&
    Number.isFinite(position.height) &&
    position.x >= SECRET_ENTRY.minX &&
    position.x <= SECRET_ENTRY.maxX &&
    position.z >= SECRET_ENTRY.minZ &&
    position.z <= SECRET_ENTRY.maxZ &&
    position.height <= SECRET_ENTRY.minHeight &&
    angleDistance(sample.yaw ?? 0, SECRET_ENTRY.yaw) <= SECRET_ENTRY.yawTolerance &&
    (sample.forward ?? 0) >= SECRET_ENTRY.forwardThreshold &&
    Math.abs(sample.right ?? 0) <= SECRET_ENTRY.maxSideInput;

  const next = aligned
    ? Math.min(SECRET_ENTRY.holdSeconds, Math.max(0, elapsed) + clamp(Number.isFinite(delta) ? delta : 0, 0, 0.1))
    : 0;
  return {
    elapsed: next,
    progress: next / SECRET_ENTRY.holdSeconds,
    aligned,
    triggered: next >= SECRET_ENTRY.holdSeconds
  };
}
