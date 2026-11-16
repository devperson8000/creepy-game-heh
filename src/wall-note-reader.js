import * as THREE from 'three';
import { WALL_INSCRIPTION_REVERSED } from './secret-entry.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function createWallNoteReader({ root, camera, onOpen = () => {}, onClose = () => {} }) {
  const panel = document.createElement('section');
  panel.className = 'wall-note-reader';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Writing found beside the stairs');
  panel.innerHTML =
    '<div class="wall-note-card">' +
      '<div class="wall-note-meta"><span>FOUND ON THE STAIRWELL</span><span>LEVEL 0 / MARKING 01</span></div>' +
      '<div class="wall-note-rule"></div>' +
      '<pre class="wall-note-copy"></pre>' +
      '<div class="wall-note-footer"><span>THE INK IS STILL DARK</span><button type="button" data-close>BACK</button></div>' +
    '</div>';
  panel.querySelector('.wall-note-copy').textContent = WALL_INSCRIPTION_REVERSED;
  root.append(panel);

  let movement = null;
  let disposed = false;
  const closeButton = panel.querySelector('[data-close]');

  function open(mesh) {
    if (disposed || movement) return false;
    camera.updateMatrixWorld(true);
    const focus = mesh.getWorldPosition(new THREE.Vector3());
    const fromPosition = camera.position.clone();
    const fromQuaternion = camera.quaternion.clone();
    const fromFov = camera.fov;
    const targetPosition = focus.clone().add(new THREE.Vector3(0.72, 0.045, 0.02));
    const guide = new THREE.PerspectiveCamera(38, camera.aspect, camera.near, camera.far);
    guide.position.copy(targetPosition);
    guide.lookAt(focus);
    movement = {
      mode: 'open',
      elapsed: 0,
      duration: 0.72,
      fromPosition,
      fromQuaternion,
      fromFov,
      toPosition: targetPosition,
      toQuaternion: guide.quaternion.clone(),
      toFov: 38
    };
    panel.hidden = false;
    panel.classList.remove('is-visible');
    onOpen();
    return true;
  }

  function close() {
    if (!movement || movement.mode !== 'open' || movement.elapsed < movement.duration) return false;
    movement = {
      mode: 'close',
      elapsed: 0,
      duration: 0.48,
      fromPosition: camera.position.clone(),
      fromQuaternion: camera.quaternion.clone(),
      fromFov: camera.fov,
      toPosition: movement.fromPosition,
      toQuaternion: movement.fromQuaternion,
      toFov: movement.fromFov
    };
    panel.classList.remove('is-visible');
    return true;
  }

  function update(delta) {
    if (!movement) return false;
    movement.elapsed += Math.max(0, Math.min(0.1, delta));
    const progress = clamp(movement.elapsed / movement.duration);
    const blend = ease(progress);
    camera.position.lerpVectors(movement.fromPosition, movement.toPosition, blend);
    camera.quaternion.slerpQuaternions(movement.fromQuaternion, movement.toQuaternion, blend);
    camera.fov = THREE.MathUtils.lerp(movement.fromFov, movement.toFov, blend);
    camera.updateProjectionMatrix();

    if (movement.mode === 'open' && progress >= 1) {
      movement.mode = 'reading';
      panel.classList.add('is-visible');
      closeButton.focus({ preventScroll: true });
    } else if (movement.mode === 'close' && progress >= 1) {
      panel.hidden = true;
      movement = null;
      onClose();
    }
    return true;
  }

  closeButton.addEventListener('click', close);

  function onKeyDown(event) {
    if (!movement || movement.mode !== 'reading') return;
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  return {
    open,
    close,
    update,
    get active() { return !!movement; },
    get reading() { return movement?.mode === 'reading'; },
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('keydown', onKeyDown);
      closeButton.removeEventListener('click', close);
      panel.remove();
    }
  };
}
