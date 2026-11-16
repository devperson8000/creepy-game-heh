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
  const seam = new THREE.MeshStandardMaterial({ color: 0x73766b, roughness: 0.98 });
  const add = (geometry, material, parent, at, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  add(new THREE.CapsuleGeometry(0.28, 0.72, 5, 12), suit, root, [0, 1.18, 0]);
  add(new THREE.SphereGeometry(0.27, 24, 16), suit, root, [0, 2.02, 0]);
  add(new THREE.SphereGeometry(0.205, 20, 12), dark, root, [0, 2.02, -0.19], [1, 0.48, 0.22]);
  add(new THREE.CylinderGeometry(0.29, 0.27, 0.055, 20), seam, root, [0, 1.82, 0]);
  for (const side of [-1, 1]) {
    const leg = add(new THREE.CapsuleGeometry(0.105, 0.52, 4, 10), suit, root, [side * 0.145, 0.48, 0]);
    leg.rotation.z = side * -0.035;
    add(new THREE.BoxGeometry(0.22, 0.13, 0.34), dark, root, [side * 0.15, 0.12, -0.035]);
  }
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 1.57, 0);
  root.add(rightArm);
  const upper = add(new THREE.CapsuleGeometry(0.09, 0.43, 4, 10), suit, rightArm, [0, -0.25, 0]);
  const glove = add(new THREE.SphereGeometry(0.105, 16, 12), dark, rightArm, [0, -0.53, -0.02]);
  upper.rotation.z = -0.08;
  for (let i = 0; i < 4; i++) {
    add(new THREE.CapsuleGeometry(0.018, 0.065, 2, 6), dark, rightArm, [-0.045 + i * 0.03, -0.59, -0.045]);
  }
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
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
    }
  };
}

export function createSecretEntryCinematic({ scene, camera, position, yaw, onComplete = () => {} }) {
  const start = { x: position.x, z: position.z, height: position.height };
  const wallX = SECRET_ENTRY.wallX;
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

  const portal = new THREE.Group();
  portal.position.set(wallX + 0.012, start.height + 1.22, start.z);
  portal.rotation.y = Math.PI / 2;
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x040705, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const voidMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 64), voidMaterial);
  voidMesh.scale.set(0.08, 0.08, 1);
  portal.add(voidMesh);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x98a287, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.022, 8, 64), ringMaterial);
  ring.scale.set(0.08, 0.08, 1);
  portal.add(ring);
  scene.add(portal);

  const sidePosition = new THREE.Vector3(start.x + 2.05, start.height + 1.42, start.z + 0.9);
  const sideGuide = new THREE.PerspectiveCamera(45, camera.aspect, camera.near, camera.far);
  sideGuide.position.copy(sidePosition);
  sideGuide.lookAt(start.x - 0.05, start.height + 1.15, start.z);
  const initialPosition = camera.position.clone();
  const initialQuaternion = camera.quaternion.clone();
  const initialFov = camera.fov;
  const followPosition = new THREE.Vector3(start.x - 0.72, start.height + 1.65, start.z);
  const followGuide = new THREE.PerspectiveCamera(66, camera.aspect, camera.near, camera.far);
  followGuide.position.copy(followPosition);
  followGuide.lookAt(start.x - 4.85, start.height + 1.52, start.z);

  const fade = document.createElement('div');
  fade.className = 'secret-entry-fade';
  fade.setAttribute('aria-hidden', 'true');
  fade.style.opacity = '0';
  document.body.append(fade);

  function sampleAvatar(t, handProgress, walkProgress) {
    const walk = ease(walkProgress);
    const nextPosition = {
      x: start.x - walk * 1.4,
      z: start.z,
      height: start.height
    };
    const handX = mix(start.x - 0.16, wallX - 0.23, ease((t - 1.04) / 0.72));
    const handY = start.height + 1.42 + Math.sin(handProgress * Math.PI) * 0.07;
    const handTarget = [handX, handY, start.z - 0.015];
    if (avatar) {
      avatar.sampleCinematic({
        clip: t > 1.92 ? 'Walk' : 'Idle',
        time: t,
        position: [nextPosition.x, nextPosition.height, nextPosition.z],
        yaw,
        handTarget: t > 0.58 ? handTarget : null,
        progress: t > 0.58 ? 1 : 0,
        torsoLean: t > 1.45 ? 0.16 * handProgress : 0,
        headTurn: -0.1
      });
    } else {
      fallback.update(nextPosition, handProgress);
      fallback.root.visible = true;
    }
  }

  function update(delta) {
    if (disposed || finished) return true;
    elapsed += Math.max(0, Math.min(0.1, delta));
    const t = elapsed;
    const sideBlend = ease(t / 0.62);
    const portalBlend = ease((t - 1.2) / 0.55);
    const walkBlend = ease((t - 1.9) / 0.88);
    const followBlend = ease((t - 2.45) / 0.62);
    const handProgress = ease((t - 0.62) / 1.05);

    if (t < 2.45) {
      camera.position.lerpVectors(initialPosition, sidePosition, sideBlend);
      camera.quaternion.slerpQuaternions(initialQuaternion, sideGuide.quaternion, sideBlend);
      camera.fov = mix(initialFov, 45, sideBlend);
    } else {
      camera.position.lerpVectors(sidePosition, followPosition, followBlend);
      camera.quaternion.slerpQuaternions(sideGuide.quaternion, followGuide.quaternion, followBlend);
      camera.fov = mix(45, 66, followBlend);
    }
    camera.updateProjectionMatrix();

    sampleAvatar(t, handProgress, walkBlend);
    portal.visible = t > 1.12;
    voidMaterial.opacity = 0.98 * portalBlend;
    ringMaterial.opacity = 0.4 * portalBlend * (1 - ease((t - 2.62) / 0.55));
    const portalSize = mix(0.08, 0.92, portalBlend);
    voidMesh.scale.set(portalSize * 0.8, portalSize * 1.22, 1);
    ring.scale.set(portalSize, portalSize * 1.42, 1);
    ring.rotation.z = Math.sin(t * 2.2) * 0.035;
    fade.style.opacity = String(ease((t - 2.78) / 0.62));

    if (t >= 3.42) {
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
      portal.removeFromParent();
      portal.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      fade.remove();
    }
  };
}
