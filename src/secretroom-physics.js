const EPS = 1e-8;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a, value) => ({ x: a.x * value, y: a.y * value, z: a.z * value });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
const length = value => Math.sqrt(dot(value, value));
const normalize = value => {
  const magnitude = length(value);
  return magnitude > EPS ? scale(value, 1 / magnitude) : { x: 0, y: 1, z: 0 };
};

function rotateByQuaternion(q, v) {
  const qv = { x: q.x, y: q.y, z: q.z };
  const t = scale(cross(qv, v), 2);
  return add(v, add(scale(t, q.w), cross(qv, t)));
}

function inverseRotateByQuaternion(q, v) {
  return rotateByQuaternion({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v);
}

function normalizeQuaternion(q) {
  const magnitude = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  q.x /= magnitude;
  q.y /= magnitude;
  q.z /= magnitude;
  q.w /= magnitude;
  return q;
}

function bodyAxes(q) {
  return [
    rotateByQuaternion(q, { x: 1, y: 0, z: 0 }),
    rotateByQuaternion(q, { x: 0, y: 1, z: 0 }),
    rotateByQuaternion(q, { x: 0, y: 0, z: 1 })
  ];
}

function supportRadius(body, axis, axes) {
  const half = body.halfExtents;
  return Math.abs(dot(axes[0], axis)) * half.x +
    Math.abs(dot(axes[1], axis)) * half.y +
    Math.abs(dot(axes[2], axis)) * half.z;
}

function obstacleBounds(obstacle) {
  if (obstacle.min && obstacle.max) {
    return {
      center: scale(add(obstacle.min, obstacle.max), 0.5),
      half: scale(sub(obstacle.max, obstacle.min), 0.5)
    };
  }
  return { center: obstacle.center, half: obstacle.halfExtents };
}

function obbAabbContact(body, obstacle) {
  const bounds = obstacleBounds(obstacle);
  const axesA = bodyAxes(body.quaternion);
  const axesB = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 }
  ];
  const axes = [...axesA, ...axesB];
  for (const a of axesA) for (const b of axesB) axes.push(cross(a, b));

  const separation = sub(body.position, bounds.center);
  let minimum = Infinity;
  let normal = null;
  for (const rawAxis of axes) {
    const axisLength = length(rawAxis);
    if (axisLength < 1e-7) continue;
    const axis = scale(rawAxis, 1 / axisLength);
    const radiusA = supportRadius(body, axis, axesA);
    const radiusB = Math.abs(axis.x) * bounds.half.x +
      Math.abs(axis.y) * bounds.half.y +
      Math.abs(axis.z) * bounds.half.z;
    const signedDistance = dot(separation, axis);
    const overlap = radiusA + radiusB - Math.abs(signedDistance);
    if (overlap <= 0) return null;
    if (overlap < minimum) {
      minimum = overlap;
      normal = signedDistance >= 0 ? axis : scale(axis, -1);
    }
  }
  if (!normal || !Number.isFinite(minimum)) return null;
  return { normal, penetration: minimum, bounds };
}

function applyInverseInertia(body, worldTorque) {
  const local = inverseRotateByQuaternion(body.quaternion, worldTorque);
  const h = body.halfExtents;
  const mass = body.mass;
  const ix = Math.max(EPS, mass / 3 * (h.y * h.y + h.z * h.z));
  const iy = Math.max(EPS, mass / 3 * (h.x * h.x + h.z * h.z));
  const iz = Math.max(EPS, mass / 3 * (h.x * h.x + h.y * h.y));
  return rotateByQuaternion(body.quaternion, {
    x: local.x / ix,
    y: local.y / iy,
    z: local.z / iz
  });
}

function applyImpulse(body, impulse, arm) {
  body.velocity = add(body.velocity, scale(impulse, 1 / body.mass));
  const torque = cross(arm, impulse);
  body.angularVelocity = add(body.angularVelocity, applyInverseInertia(body, torque));
}

function resolveContact(body, obstacle, contact) {
  const normal = contact.normal;
  const axes = bodyAxes(body.quaternion);
  const arm = scale(normal, -supportRadius(body, normal, axes));
  const pointVelocity = add(body.velocity, cross(body.angularVelocity, arm));
  const normalSpeed = dot(pointVelocity, normal);

  const correction = Math.max(0, contact.penetration - 0.00035) * 0.82;
  body.position = add(body.position, scale(normal, correction));

  if (normalSpeed >= 0) return;
  const inverseMass = 1 / body.mass;
  const normalArm = cross(arm, normal);
  const normalDenominator = inverseMass +
    dot(normal, cross(applyInverseInertia(body, normalArm), arm));
  const restitution = Math.abs(normalSpeed) > 0.9 ? (obstacle.restitution ?? 0.16) : 0.025;
  const normalImpulse = -(1 + restitution) * normalSpeed / Math.max(EPS, normalDenominator);
  const impulseN = scale(normal, normalImpulse);
  applyImpulse(body, impulseN, arm);

  const refreshedVelocity = add(body.velocity, cross(body.angularVelocity, arm));
  const tangentVelocity = sub(refreshedVelocity, scale(normal, dot(refreshedVelocity, normal)));
  const tangentSpeed = length(tangentVelocity);
  if (tangentSpeed < 1e-5) return;
  const tangent = scale(tangentVelocity, 1 / tangentSpeed);
  const tangentArm = cross(arm, tangent);
  const tangentDenominator = inverseMass +
    dot(tangent, cross(applyInverseInertia(body, tangentArm), arm));
  const frictionImpulse = clamp(
    -dot(refreshedVelocity, tangent) / Math.max(EPS, tangentDenominator),
    -normalImpulse * (obstacle.friction ?? 0.62),
    normalImpulse * (obstacle.friction ?? 0.62)
  );
  applyImpulse(body, scale(tangent, frictionImpulse), arm);
}

function integrateRotation(body, dt) {
  const q = body.quaternion;
  const w = body.angularVelocity;
  const dx = 0.5 * (w.x * q.w + w.y * q.z - w.z * q.y);
  const dy = 0.5 * (-w.x * q.z + w.y * q.w + w.z * q.x);
  const dz = 0.5 * (w.x * q.y - w.y * q.x + w.z * q.w);
  const dw = -0.5 * (w.x * q.x + w.y * q.y + w.z * q.z);
  q.x += dx * dt;
  q.y += dy * dt;
  q.z += dz * dt;
  q.w += dw * dt;
  normalizeQuaternion(q);
}

export function createVhsBody(position = { x: 0, y: 0.2, z: 0 }, quaternion = null) {
  return {
    position: { ...position },
    quaternion: quaternion ? { ...quaternion } : { x: 0, y: 0, z: 0, w: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    halfExtents: { x: 0.094, y: 0.013, z: 0.052 },
    mass: 0.19,
    sleeping: false,
    sleepTime: 0,
    contacted: false
  };
}

export function wakeVhsBody(body) {
  body.sleeping = false;
  body.sleepTime = 0;
}

export function stepVhsBody(body, delta, obstacles) {
  if (body.sleeping || !Number.isFinite(delta) || delta <= 0) return body;
  const remainingTime = Math.min(0.1, delta);
  const fixedStep = 1 / 240;
  let remaining = remainingTime;

  while (remaining > 1e-7) {
    const dt = Math.min(fixedStep, remaining);
    remaining -= dt;
    body.contacted = false;
    body.velocity.y -= 9.81 * dt;
    body.velocity = scale(body.velocity, Math.exp(-0.018 * dt));
    body.angularVelocity = scale(body.angularVelocity, Math.exp(-0.045 * dt));
    body.position = add(body.position, scale(body.velocity, dt));
    integrateRotation(body, dt);

    for (let pass = 0; pass < 4; pass++) {
      let corrected = false;
      for (const obstacle of obstacles) {
        const contact = obbAabbContact(body, obstacle);
        if (!contact) continue;
        body.contacted = true;
        resolveContact(body, obstacle, contact);
        corrected = true;
      }
      if (!corrected) break;
    }

    const speed = length(body.velocity);
    const spin = length(body.angularVelocity);
    if (body.contacted && speed < 0.045 && spin < 0.075) {
      body.sleepTime += dt;
      if (body.sleepTime > 0.85) {
        body.velocity = { x: 0, y: 0, z: 0 };
        body.angularVelocity = { x: 0, y: 0, z: 0 };
        body.sleeping = true;
      }
    } else {
      body.sleepTime = 0;
    }
  }
  return body;
}
