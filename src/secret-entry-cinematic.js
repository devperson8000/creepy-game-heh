import * as THREE from 'three';
import { loadPlayerAvatarAsset, createPlayerAvatar } from './player-avatar.js';
import { SECRET_ENTRY } from './secret-entry.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function createFallbackSurvivor(scene, position, yaw) {
  const root = new THREE.Group();
  root.name = 'cutscene-hazmat-survivor-fallback';
  root.position.set(position.x, position.height, position.z);
  root.rotation.y = yaw + Math.PI;
  const suit = new THREE.MeshStandardMaterial({ color: 0xbab9a9, roughness: 0.98 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.94 });
  const add = (geometry, material, parent, at) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  add(new THREE.CapsuleGeometry(0.28, 0.72, 5, 12), suit, root, [0, 1.18, 0]);
  add(new THREE.SphereGeometry(0.27, 24, 16), suit, root, [0, 2.02, 0]);
  const visor = add(new THREE.SphereGeometry(0.205, 20, 12), dark, root, [0, 2.02, -0.19]);
  visor.scale.set(1, 0.48, 0.22);
  add(new THREE.CylinderGeometry(0.29, 0.27, 0.055, 20), dark, root, [0, 1.82, 0]);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 1.57, 0);
  root.add(rightArm);
  const upper = add(new THREE.CapsuleGeometry(0.09, 0.43, 4, 10), suit, rightArm, [0, -0.25, 0]);
  upper.rotation.z = -0.08;
  const glove = add(new THREE.SphereGeometry(0.105, 16, 12), dark, rightArm, [0, -0.53, -0.02]);
  for (let i = 0; i < 4; i++) add(new THREE.CapsuleGeometry(0.018, 0.065, 2, 6), dark, rightArm, [-0.045 + i * 0.03, -0.59, -0.045]);
  const leftArm = add(new THREE.CapsuleGeometry(0.085, 0.56, 4, 10), suit, root, [-0.32, 1.28, 0]);
  leftArm.rotation.z = 0.12;
  scene.add(root);
  return {
    root,
    update(nextPosition, handProgress) {
      root.position.set(nextPosition.x, nextPosition.height, nextPosition.z);
      rightArm.rotation.z = -0.08 - handProgress * 1.05;
      rightArm.rotation.x = -handProgress * 0.3;
      glove.position.y = mix(-0.53, -0.48, handProgress);
    },
    dispose() {
      root.removeFromParent();
      root.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      });
    }
  };
}

export function createSecretEntryCinematic({ scene, camera, position, yaw, roomRoot, seal = null, onComplete = () => {} }) {
  if (!roomRoot) throw new Error('The in-world Secret Room root is required for the noclip transition.');
  roomRoot.updateMatrixWorld(true);
  const start = { x: position.x, z: position.z, height: position.height };
  const end = roomRoot.localToWorld(new THREE.Vector3(0, 0, 2.55));
  const finish = { x: end.x, z: end.z, height: end.y };
  const finalCameraPosition = roomRoot.localToWorld(new THREE.Vector3(0, 1.68, 2.55));
  const finalCameraQuaternion = roomRoot.getWorldQuaternion(new THREE.Quaternion())
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0, 0, 'YXZ')));

  let elapsed = 0;
  let disposed = false;
  let finished = false;
  let avatar = null;
  const fallback = createFallbackSurvivor(scene, start, yaw);
  const loading = loadPlayerAvatarAsset().then(asset => {
    if (disposed) return;
    avatar = createPlayerAvatar(asset, { id: 'secret-entry', name: 'You', slot: 0 });
    scene.add(avatar.root);
    fallback.root.visible = false;
  }).catch(() => {});

  const initialPosition = camera.position.clone();
  const initialQuaternion = camera.quaternion.clone();
  const initialFov = camera.fov;
  const sideGuide = new THREE.PerspectiveCamera(54, camera.aspect, camera.near, camera.far);
  const sidePosition = new THREE.Vector3();
  const sideLook = new THREE.Vector3();
  const sideQuaternion = new THREE.Quaternion();

  function sampleAvatar(t) {
    const walk = ease((t - 2.02) / 2.3);
    const actor = {
      x: mix(start.x, finish.x, walk),
      z: mix(start.z, finish.z, walk),
      height: mix(start.height, finish.height, walk)
    };
    const reach = ease((t - 0.55) / 0.78);
    const release = ease((t - 3.62) / 0.55);
    const handProgress = reach * (1 - release);
    const handTarget = handProgress > 0.025
      ? [SECRET_ENTRY.wallX - 0.22, start.height + 1.43, start.z - 0.015]
      : null;
    if (avatar) {
      avatar.sampleCinematic({
        clip: t > 1.98 ? 'Walk' : 'Idle',
        time: Math.max(0, t - 2.0),
        position: [actor.x, actor.height, actor.z],
        yaw,
        handTarget,
        progress: handProgress,
        torsoLean: 0.12 * handProgress + 0.07 * walk,
        headTurn: t > 3.45 ? -0.18 : -0.08
      });
    } else {
      fallback.update(actor, handProgress);
      fallback.root.visible = true;
    }
    return actor;
  }

  function sampleSideCamera(actor) {
    sidePosition.set(actor.x + 0.38, actor.height + 1.48, actor.z + 1.95);
    sideLook.set(actor.x - 0.22, actor.height + 1.17, actor.z - 0.03);
    sideGuide.position.copy(sidePosition);
    sideGuide.lookAt(sideLook);
    sideGuide.updateMatrixWorld(true);
    sideQuaternion.copy(sideGuide.quaternion);
  }

  function update(delta) {
    if (disposed || finished) return true;
    elapsed += Math.max(0, Math.min(0.1, delta));
    const t = elapsed;
    const actor = sampleAvatar(t);
    // Keep the maze wall opaque until the survivor's body has crossed it.
    // The camera then follows through the same opening into the hidden room.
    if (seal) seal.visible = actor.x > SECRET_ENTRY.wallX - 0.04;
    sampleSideCamera(actor);

    const sideBlend = ease(t / 0.72);
    const settleBlend = ease((t - 4.34) / 1.02);
    if (t < 0.72) {
      camera.position.lerpVectors(initialPosition, sidePosition, sideBlend);
      camera.quaternion.slerpQuaternions(initialQuaternion, sideQuaternion, sideBlend);
      camera.fov = mix(initialFov, 54, sideBlend);
    } else if (settleBlend > 0) {
      camera.position.lerpVectors(sidePosition, finalCameraPosition, settleBlend);
      camera.quaternion.slerpQuaternions(sideQuaternion, finalCameraQuaternion, settleBlend);
      camera.fov = mix(54, 68, settleBlend);
    } else {
      camera.position.copy(sidePosition);
      camera.quaternion.copy(sideQuaternion);
      camera.fov = 54;
    }
    camera.updateProjectionMatrix();

    if (t >= 5.38) {
      finished = true;
      onComplete();
      return true;
    }
    return false;
  }

  return {
    update,
    get elapsed() { return elapsed; },
    get finished() { return finished; },
    async ready() { await loading; },
    dispose() {
      if (disposed) return;
      disposed = true;
      avatar?.dispose();
      fallback.dispose();
    }
  };
}
