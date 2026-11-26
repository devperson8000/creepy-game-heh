import * as THREE from 'three';
import { createJumpscare, JUMPSCARE_MOUTH_URL, JUMPSCARE_DURATION } from './jumpscare.js';
import { JUMPSCARE_SOUND_URL } from './monster-audio.js';
import './sunnychen.css';

export const SUNNY_CHEN_MESSAGE_DELAY_MS = 5000;
export const SUNNY_CHEN_MESSAGE = 'hello sunny chen, this is for you, from the game dev mitch (aka. daddy mitch).';

/**
 * A standalone message page that turns into the game's regular capture jumpscare.
 * The jumpscare scene is prepared before the timer so the transition is immediate.
 */
export function startSunnyChen() {
  const body = document.body;
  body.classList.add('sunnychen-page');

  const messageScreen = document.createElement('main');
  messageScreen.className = 'sunnychen-message-screen';
  messageScreen.setAttribute('aria-label', 'A message for Sunny Chen');
  const message = document.createElement('p');
  message.className = 'sunnychen-message';
  message.textContent = SUNNY_CHEN_MESSAGE;
  messageScreen.append(message);
  body.append(messageScreen);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const mouthTexture = new THREE.TextureLoader().load(JUMPSCARE_MOUTH_URL);
  const jumpscare = createJumpscare({ mouthTexture });
  const canvas = renderer.domElement;
  canvas.className = 'sunnychen-scare-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const border = document.createElement('div');
  border.id = 'jumpscare-border';
  border.setAttribute('aria-hidden', 'true');

  // Use the exact capture sound file used by the regular game jumpscare.
  const scareAudio = new Audio(JUMPSCARE_SOUND_URL);
  scareAudio.preload = 'auto';
  scareAudio.volume = 1;

  let disposed = false;
  let started = false;
  let timer = null;
  let previousFrame = 0;

  function resize() {
    if (disposed) return;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    jumpscare.resize(width / height);
  }

  function beginJumpscare() {
    if (disposed || started) return;
    started = true;
    messageScreen.remove();
    body.classList.add('sunnychen-scare-active');
    body.append(canvas, border);
    resize();

    // No warning, fade, countdown, or transition before the first scare frame.
    jumpscare.start();
    previousFrame = performance.now();
    renderer.render(jumpscare.scene, jumpscare.camera);

    try {
      const playback = scareAudio.play();
      playback?.catch(() => {
        // Some browsers block audio autoplay on direct visits; the visual scare still runs.
      });
    } catch {
      // The visual jumpscare does not depend on audio playback.
    }

    renderer.setAnimationLoop(() => {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.2, Math.max(0, (now - previousFrame) / 1000));
      previousFrame = now;
      jumpscare.update(delta);
      renderer.render(jumpscare.scene, jumpscare.camera);
      border.style.opacity = String(jumpscare.borderOpacity);
      border.style.setProperty('--scare-impact', String(jumpscare.impactOpacity));
      border.style.setProperty('--scare-glitch', `${(jumpscare.glitch * 6).toFixed(2)}px`);

      if (!jumpscare.active) renderer.setAnimationLoop(null);
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (timer !== null) window.clearTimeout(timer);
    window.removeEventListener('resize', resize);
    renderer.setAnimationLoop(null);
    scareAudio.pause();
    scareAudio.removeAttribute('src');
    renderer.dispose();
    jumpscare.dispose();
    mouthTexture.dispose();
    messageScreen.remove();
    canvas.remove();
    border.remove();
    body.classList.remove('sunnychen-page', 'sunnychen-scare-active');
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', dispose, { once: true });
  resize();
  timer = window.setTimeout(beginJumpscare, SUNNY_CHEN_MESSAGE_DELAY_MS);

  return { dispose, get started() { return started; }, get duration() { return JUMPSCARE_DURATION; } };
}
