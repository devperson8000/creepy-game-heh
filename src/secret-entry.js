export const WALL_INSCRIPTION = 'go down the stairs, and when you reach the bottom, turn right to find "it".';
export const WALL_INSCRIPTION_REVERSED = [...WALL_INSCRIPTION].reverse().join('');

export const SECRET_ROOM_PLACEMENT = Object.freeze({
  centerX: -6.96,
  floorY: -7.2,
  centerZ: -2.6,
  yaw: Math.PI / 2,
  half: 3.36,
  height: 3.42,
  entryZ: 2.55
});
export const SECRET_ROOM_BOUNDS = Object.freeze({
  minX: SECRET_ROOM_PLACEMENT.centerX - SECRET_ROOM_PLACEMENT.half,
  maxX: SECRET_ROOM_PLACEMENT.centerX + SECRET_ROOM_PLACEMENT.half,
  minZ: SECRET_ROOM_PLACEMENT.centerZ - SECRET_ROOM_PLACEMENT.half,
  maxZ: SECRET_ROOM_PLACEMENT.centerZ + SECRET_ROOM_PLACEMENT.half
});
export const SECRET_ROOM_LAYOUT = Object.freeze({
  interiorMinCellX: 4,
  interiorMaxCellX: 6,
  minCellZ: 6,
  maxCellZ: 8,
  wallCells: Object.freeze(['6,6', '6,7', '6,8'])
});
export function secretRoomToWorld(point = {}) {
  const x = Number.isFinite(point.x) ? point.x : 0;
  const y = Number.isFinite(point.y) ? point.y : 0;
  const z = Number.isFinite(point.z) ? point.z : 0;
  const c = Math.cos(SECRET_ROOM_PLACEMENT.yaw);
  const s = Math.sin(SECRET_ROOM_PLACEMENT.yaw);
  return {
    x: SECRET_ROOM_PLACEMENT.centerX + x * c + z * s,
    y: SECRET_ROOM_PLACEMENT.floorY + y,
    z: SECRET_ROOM_PLACEMENT.centerZ - x * s + z * c
  };
}

export const SECRET_ENTRY = Object.freeze({
  wallX: SECRET_ROOM_PLACEMENT.centerX + SECRET_ROOM_PLACEMENT.half,
  wallZ: SECRET_ROOM_PLACEMENT.centerZ,
  // This covers the reachable right-hand edge of the stair corridor, not a
  // tiny point the player can accidentally pass without noticing.
  minX: -3.34,
  maxX: -2.8,
  minZ: -6.0,
  maxZ: -1.2,
  minHeight: -5.5,
  yaw: Math.PI / 2,
  yawTolerance: 0.3,
  forwardThreshold: 0.96,
  maxSideInput: 0.18,
  holdSeconds: 0.82
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function advanceSecretEntryCharge(elapsed, sample, delta) {
  const position = sample?.position ?? {};
  const active = sample?.enabled !== false &&
    sample?.paused !== true &&
    sample?.alive !== false &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.z) &&
    Number.isFinite(position.height);
  const nearby = active &&
    position.x >= SECRET_ENTRY.minX &&
    position.x <= SECRET_ENTRY.maxX &&
    position.z >= SECRET_ENTRY.minZ &&
    position.z <= SECRET_ENTRY.maxZ &&
    position.height <= SECRET_ENTRY.minHeight;
  const aligned = nearby &&
    angleDistance(sample.yaw ?? 0, SECRET_ENTRY.yaw) <= SECRET_ENTRY.yawTolerance &&
    (sample.forward ?? 0) >= SECRET_ENTRY.forwardThreshold &&
    Math.abs(sample.right ?? 0) <= SECRET_ENTRY.maxSideInput;

  const next = aligned
    ? Math.min(SECRET_ENTRY.holdSeconds, Math.max(0, elapsed) + clamp(Number.isFinite(delta) ? delta : 0, 0, 0.1))
    : 0;
  return {
    elapsed: next,
    progress: next / SECRET_ENTRY.holdSeconds,
    nearby,
    aligned,
    triggered: next >= SECRET_ENTRY.holdSeconds
  };
}
