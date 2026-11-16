import * as T from 'three';
import { createSecretRoomWorld } from './secretroom-world.js';
import { createBackroomsPost } from './backrooms-post.js';
import { createRoomAmbience } from './room-ambience.js';
import { moveInWorld } from './level.js';
import { createVhsBody, stepVhsBody, wakeVhsBody } from './secretroom-physics.js';
import { reducedMotion } from './preferences.js';
import { createTvSetupGame, paintTvCanvas } from './secretroom-tv.js';
import './secretroom.css';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const v3 = (x, y, z) => new T.Vector3(x, y, z);

export function startSecretRoom(container) {
  document.title = 'MONOCHROME — The Secret Room';
  document.body.classList.add('secretroom-page');
  container.setAttribute('aria-label', 'A small enclosed Backrooms room containing an old television and VHS cassette');

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Secret room game view');
  container.append(renderer.domElement);

  const world = createSecretRoomWorld();
  const post = createBackroomsPost(renderer);
  const camera = new T.PerspectiveCamera(68, 1, 0.06, 60);
  camera.rotation.order = 'YXZ';
  const player = { x: 0, y: 0, z: 2.55, speed: 0, sprint: false, crouch: false };
  let yaw = 0;
  let pitch = -0.16;
  let time = 0;
  let distanceTravelled = 0;
  let previous = performance.now();
  let paused = true;
  let started = false;
  let muted = false;
  let disposed = false;
  let drag = null;
  let hold = 0;
  let holdId = null;
  let latched = false;
  let held = false;
  let inserted=false,insertion=null,vhsEnabled=true;
  let powerCableConnected=false,tvPowered=false,setupComplete=false;
  let plugAnimation=null,switchAnimation=null,tvCameraLocked=false,cameraTween=null,tvReturnPose=null;
  let tvMode='off',tvElapsed=0,tvGame=null,tvErrorTime=0,tvCanvas=null,tvTexture=null;
  let teaserPlayback=null,teaserReadyPromise=null,teaserLoadError=null,playbackElapsed=0;
  const tvStaticAudio=new Audio('/audio/halloween/sfx/monitor-static.mp3');
  tvStaticAudio.preload='auto';tvStaticAudio.loop=true;tvStaticAudio.volume=.16;
  const keys = new Set();
  const listeners = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ambience = createRoomAmbience();
  const tapeModel = world.createVhsModel();
  tapeModel.position.set(0.86, 0.115, 1.02);
  tapeModel.rotation.set(0.045, 0.28, 0.16);
  world.scene.add(tapeModel);
  const body = createVhsBody(
    { x: tapeModel.position.x, y: tapeModel.position.y, z: tapeModel.position.z },
    { x: tapeModel.quaternion.x, y: tapeModel.quaternion.y, z: tapeModel.quaternion.z, w: tapeModel.quaternion.w }
  );
  const playerVelocity = new T.Vector3();
  const worldDirection = new T.Vector3();
  const targetDirection = new T.Vector3();
  const handPosition = new T.Vector3(0.31, -0.23, -0.58);
  const tempPosition = new T.Vector3();
  const tempQuaternion = new T.Quaternion();
  const clockText = value => {
    const total = Math.floor(value);
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
      String(total % 60).padStart(2, '0');
  };

  const root = document.createElement('div');
  root.className = 'sr-ui';
  root.innerHTML =
    '<div class="sr-top">' +
      '<div class="sr-record"><span class="sr-dot"></span><strong>REC</strong><span>ARCHIVE / 001</span></div>' +
      '<div class="sr-status"><span>LEVEL 0 — UNIDENTIFIED INTERIOR</span><strong data-tape-state>TAPE: ON FLOOR</strong><em data-tv-state>TV: UNPLUGGED</em></div>' +
      '<div class="sr-tools">' +
        '<button data-action="sound" aria-pressed="true">Sound on</button>' +
        '<button data-action="vhs" aria-pressed="true">VHS on</button>' +
        '<button data-action="pause">Pause</button>' +
      '</div>' +
    '</div>' +
    '<div class="sr-crosshair" aria-hidden="true"></div>' +
    '<div class="sr-bottom">' +
      '<div class="sr-clock">JUL. 04 1991<br><span data-clock>00:00</span> <i>SP</i></div>' +
      '<div class="sr-help">WASD MOVE · SHIFT WALK/RUN · MOUSE LOOK<br>F HOLD TO INTERACT · G DROP · RIGHT CLICK THROW</div>' +
      '<div class="sr-camera-label">CAM 01 / INTERNAL FEED</div>' +
    '</div>' +
    '<div class="sr-interaction" hidden>' +
      '<span data-prompt></span><div class="sr-progress"><i></i></div>' +
    '</div>' +
    '<div class="sr-toast" role="status" aria-live="polite"></div>' +
    '<div class="sr-tv-touch" hidden aria-label="TV arrow controls">' +
      '<button data-tv-key="ArrowUp">↑</button><button data-tv-key="ArrowLeft">←</button>' +
      '<button data-tv-key="ArrowDown">↓</button><button data-tv-key="ArrowRight">→</button>' +
    '</div>' +
    '<div class="sr-touch" aria-label="Touch controls">' +
      '<div class="sr-pad">' +
        '<button data-key="KeyW">↑</button>' +
        '<button data-key="KeyA">←</button>' +
        '<button data-key="KeyS">↓</button>' +
        '<button data-key="KeyD">→</button>' +
      '</div>' +
      '<div class="sr-touch-actions">' +
        '<button data-key="ShiftLeft">Run</button>' +
        '<button data-key="KeyF">Hold F</button>' +
        '<button data-action="drop">Drop</button>' +
        '<button data-action="throw">Throw</button>' +
      '</div>' +
    '</div>' +
    '<div class="sr-center">' +
      '<section class="sr-panel" role="dialog" aria-modal="false" aria-labelledby="sr-title">' +
        '<div class="sr-eyebrow">FOUND FOOTAGE / ROOM 001</div>' +
        '<h1 id="sr-title">The Secret Room<span>LEVEL 0 — CLOSED INTERIOR</span></h1>' +
        '<p>The lights are still humming. An old television sits on a small table. A single cassette has been left nearby. Pick it up, examine the player, and decide where it belongs.</p>' +
        '<button class="sr-start" data-action="start">Enter the room <span>↗</span></button>' +
        '<footer><span>HEADPHONES RECOMMENDED</span><span>F · INTERACT &nbsp; G · DROP</span></footer>' +
      '</section>' +
    '</div>';
  document.body.append(root);

  const el = selector => root.querySelector(selector);
  const on = (target, event, callback, options) => {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  };
  const announce = message => {
    el('.sr-toast').textContent = message;
  };

  const setTvLabel = value => { const node=el('[data-tv-state]'); if(node)node.textContent=value; };
  function ensureTvCanvas(){
    if(tvTexture)return;tvCanvas=document.createElement('canvas');tvCanvas.width=1024;tvCanvas.height=732;
    tvTexture=new T.CanvasTexture(tvCanvas);tvTexture.colorSpace=T.SRGBColorSpace;tvTexture.minFilter=T.LinearFilter;tvTexture.magFilter=T.LinearFilter;
    world.setTvTexture(tvTexture);
  }
  function drawTvScreen(){if(!tvCanvas)return;paintTvCanvas(tvCanvas,tvMode,tvElapsed,tvGame,tvErrorTime);tvTexture.needsUpdate=true;}
  function prepareTeaserFilm(){
    if(teaserReadyPromise)return teaserReadyPromise;
    teaserReadyPromise=import('./teaser-playback.js').then(async module=>{const film=module.createTeaserPlayback();teaserPlayback=film;await film.scene.ready;return film;})
      .catch(error=>{teaserLoadError=error;console.error('Monochrome II TV footage could not be prepared:',error);return null;});
    return teaserReadyPromise;
  }
  function cameraMoveTo(position,quaternion,fov,duration,onComplete){
    cameraTween={fromPosition:camera.position.clone(),toPosition:position.clone(),fromQuaternion:camera.quaternion.clone(),toQuaternion:quaternion.clone(),fromFov:camera.fov,toFov:fov,elapsed:0,duration,onComplete};
  }
  function focusCameraOnTv(done){
    if(!tvReturnPose)tvReturnPose={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
    tvCameraLocked=true;keys.clear();document.exitPointerLock?.();root.classList.add('sr-tv-focus');
    world.tv.screen.updateWorldMatrix(true,false);
    const screen=world.tv.screen.getWorldPosition(new T.Vector3());
    const normal=world.tv.screen.getWorldDirection(new T.Vector3()).normalize();
    const distance=.52;
    const halfViewHeight=Math.max(.326/2,.456/(2*camera.aspect));
    const fov=2*Math.atan(halfViewHeight/distance)*180/Math.PI;
    const position=screen.clone().addScaledVector(normal,distance);
    const guide=new T.PerspectiveCamera(fov,camera.aspect,.06,60);guide.position.copy(position);guide.lookAt(screen);
    cameraMoveTo(position,guide.quaternion,fov,1.18,done);
  }
  function returnCameraFromTv(done){
    if(!tvReturnPose){tvCameraLocked=false;root.classList.remove('sr-tv-focus');done?.();return;}
    const pose=tvReturnPose;
    cameraMoveTo(pose.position,pose.quaternion,pose.fov,.92,()=>{tvReturnPose=null;tvCameraLocked=false;root.classList.remove('sr-tv-focus');done?.();});
  }
  function beginTvBoot(){
    ensureTvCanvas();tvMode='off';tvElapsed=0;drawTvScreen();world.power.setTvPowerState('booting');setTvLabel('TV: BOOTING');void prepareTeaserFilm();
    focusCameraOnTv(()=>{tvMode='booting';tvElapsed=0;drawTvScreen();});
  }
  function beginVhsPlayback(){
    ensureTvCanvas();
    focusCameraOnTv(()=>{tvMode='static';tvElapsed=0;drawTvScreen();world.power.setTvPowerState('playing');
      if(!muted){tvStaticAudio.currentTime=0;tvStaticAudio.play().catch(()=>{});}void prepareTeaserFilm();});
  }
  function handleTvArrow(key){
    if(tvMode!=='minigame'||!tvGame)return;const result=tvGame.input(key);
    if(result.type==='mistake')tvErrorTime=.42;
    else if(result.type==='stage-complete'||result.type==='complete'){tvMode='successFlash';tvElapsed=0;}
    drawTvScreen();
  }
  function updateTvSequence(delta){
    if(['off','ready','finished','returning'].includes(tvMode))return;
    tvElapsed+=delta;
    if(tvMode==='booting'){
      if(tvElapsed>=3.8){tvMode='minigame';tvElapsed=0;tvGame=createTvSetupGame();tvErrorTime=0;setTvLabel('TV: SETUP REQUIRED');el('.sr-tv-touch').hidden=false;}
      drawTvScreen();return;
    }
    if(tvMode==='minigame'){tvErrorTime=Math.max(0,tvErrorTime-delta);drawTvScreen();return;}
    if(tvMode==='successFlash'&&tvElapsed>=.14){
      tvElapsed=0;
      if(tvGame?.complete){tvMode='readyBlack';setupComplete=true;setTvLabel('TV: READY FOR VHS');world.power.setTvPowerState('ready');el('.sr-tv-touch').hidden=true;}
      else tvMode='minigame';
      drawTvScreen();return;
    }
    if(tvMode==='readyBlack'&&tvElapsed>=.95){
      tvElapsed=0;tvMode='returning';returnCameraFromTv(()=>{tvMode='ready';drawTvScreen();announce('TV setup complete. The black screen and green pilot light mean it is ready for the VHS cassette.');setTvLabel('TV: READY FOR VHS');});return;
    }
    if(tvMode==='static'&&tvElapsed>=1.5&&teaserPlayback){
      tvStaticAudio.pause();tvStaticAudio.currentTime=0;tvMode='teaser';playbackElapsed=0;
      world.setTvTexture(teaserPlayback.scene.target.texture);teaserPlayback.audio.resume();world.power.setTvPowerState('playing');return;
    }
    if(tvMode==='static'&&tvElapsed>=1.5&&teaserLoadError){tvStaticAudio.pause();tvMode='mediaError';drawTvScreen();return;}
    if(tvMode==='static'||tvMode==='mediaError')drawTvScreen();
  }


  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    post.resize(width, height);
  }
  on(window, 'resize', resize);
  resize();

  function capturePointer() {
    if (!matchMedia('(pointer:fine)').matches) return;
    try {
      const result = renderer.domElement.requestPointerLock?.();
      result?.catch?.(() => {});
    } catch {}
  }

  function setPause(value) {
    paused = !!value;
    keys.clear();
    drag = null;
    el('.sr-center').hidden = !paused;
    el('[data-action="pause"]').textContent = paused ? 'Resume' : 'Pause';
    if (paused) {
      document.exitPointerLock?.();
      ambience.pause();
      tvStaticAudio.pause();
      teaserPlayback?.audio.pause();
      if (started) {
        el('#sr-title').innerHTML = 'Still here.<span>ROOM 001 — PAUSED</span>';
        el('.sr-panel p').textContent = 'The fluorescent lights continue to hum. The cassette and television are exactly where you left them.';
        el('[data-action="start"]').textContent = 'Return to the room';
      }
    } else {
      started = true;
      el('.sr-panel').blur?.();
      renderer.domElement.focus();
      void ambience.resume();
      if (tvMode === 'static' && !muted) tvStaticAudio.play().catch(() => {});
      if (tvMode === 'teaser') { teaserPlayback?.audio.resume(); teaserPlayback?.audio.update(playbackElapsed, { muted, volume: muted ? 0 : 0.86 }); }
      capturePointer();
    }
  }

  function cameraDirection() {
    camera.getWorldDirection(worldDirection);
    return worldDirection.normalize();
  }

  function pointTarget(position, maxDistance, minFacing) {
    targetDirection.copy(position).sub(camera.position);
    const distance = targetDirection.length();
    if (distance > maxDistance || distance < 0.001) return false;
    targetDirection.multiplyScalar(1 / distance);
    return cameraDirection().dot(targetDirection) >= minFacing;
  }

  function currentTarget(){
    if(insertion||tvCameraLocked||cameraTween||plugAnimation||switchAnimation)return null;
    if(!powerCableConnected&&pointTarget(world.power.plug.position,2.1,.48))return{id:'plug',label:'Connect the television power cable',duration:.7};
    if(powerCableConnected&&!tvPowered&&pointTarget(world.power.switchTarget,1.7,.55))return{id:'power',label:'Turn on the television power',duration:.42};
    if(held){
      if(!pointTarget(world.tv.slot.position,1.35,.68))return null;
      return setupComplete?{id:'slot',label:'Slide VHS into the television',duration:.48}:{id:'slot-locked',label:'TV setup is not complete yet',duration:.55};
    }
    if(!inserted&&pointTarget(tapeModel.position,2.05,.58))return{id:'pickup',label:'Pick up VHS cassette',duration:.42};
    if(inserted&&['finished','mediaError'].includes(tvMode)&&pointTarget(world.tv.slot.position,1.35,.68))return{id:'eject',label:'Eject the VHS cassette',duration:.48};
    return null;
  }

  function attachToHand() {
    camera.updateMatrixWorld(true);
    camera.add(tapeModel);
    tapeModel.position.copy(handPosition);
    tapeModel.rotation.set(-0.17, 0.18, -0.2);
    tapeModel.scale.setScalar(1);
    held = true;
    inserted = false;
    body.sleeping = true;
    body.velocity = { x: 0, y: 0, z: 0 };
    body.angularVelocity = { x: 0, y: 0, z: 0 };
    updateTapeState();
  }

  function beginPickup() {
    attachToHand();
    announce('VHS cassette picked up. Face the television slot and hold F to insert it.');
  }

  function releaseFromCamera() {
    camera.updateMatrixWorld(true);
    tapeModel.getWorldPosition(tempPosition);
    tapeModel.getWorldQuaternion(tempQuaternion);
    camera.remove(tapeModel);
    world.scene.add(tapeModel);
    tapeModel.position.copy(tempPosition);
    tapeModel.quaternion.copy(tempQuaternion);
  }

  function startInsertion(mode) {
    camera.updateMatrixWorld(true);
    const from = new T.Vector3();
    const fromQuaternion = new T.Quaternion();
    if (held) {
      tapeModel.getWorldPosition(from);
      tapeModel.getWorldQuaternion(fromQuaternion);
      camera.remove(tapeModel);
      world.scene.add(tapeModel);
      tapeModel.position.copy(from);
      tapeModel.quaternion.copy(fromQuaternion);
    } else {
      from.copy(tapeModel.position);
      fromQuaternion.copy(tapeModel.quaternion);
    }
    const to = mode === 'insert'
      ? world.tv.slot.position.clone().add(v3(0, 0, -0.045))
      : camera.localToWorld(handPosition.clone());
    const toQuaternion = mode === 'insert'
      ? new T.Quaternion()
      : camera.getWorldQuaternion(new T.Quaternion());
    insertion = {
      mode,
      progress: 0,
      from,
      fromQuaternion,
      to,
      toQuaternion
    };
    held = false;
    body.sleeping = true;
    body.velocity = { x: 0, y: 0, z: 0 };
    body.angularVelocity = { x: 0, y: 0, z: 0 };
    updateTapeState();
  }

  function finishInsertion() {
    if (!insertion) return;
    if (insertion.mode === 'insert') {
      tapeModel.position.copy(insertion.to);
      tapeModel.quaternion.copy(insertion.toQuaternion);
      inserted = true;
      held = false;
      announce('Cassette seated. The TV is reading the tape.');
      beginVhsPlayback();
    } else {
      inserted = false;
      tvMode = 'ready';
      world.setTvTexture(tvTexture);
      drawTvScreen();
      attachToHand();
      announce('VHS cassette ejected.');
    }
    insertion = null;
    updateTapeState();
  }

  function updateInsertion(delta) {
    if (!insertion) return;
    insertion.progress = Math.min(1, insertion.progress + delta / 0.38);
    const linear = insertion.progress;
    const eased = linear * linear * (3 - 2 * linear);
    tapeModel.position.lerpVectors(insertion.from, insertion.to, eased);
    tapeModel.quaternion.copy(insertion.fromQuaternion).slerp(insertion.toQuaternion, eased);
    if (linear >= 1) finishInsertion();
  }

  function dropTape(throwing) {
    if (!held || insertion) return;
    releaseFromCamera();
    held = false;
    inserted = false;
    cameraDirection();
    const direction = worldDirection.clone();
    body.position = { x: tapeModel.position.x, y: tapeModel.position.y, z: tapeModel.position.z };
    body.quaternion = {
      x: tapeModel.quaternion.x,
      y: tapeModel.quaternion.y,
      z: tapeModel.quaternion.z,
      w: tapeModel.quaternion.w
    };
    if (throwing) {
      body.linearDamping = 0.018;
      body.angularDamping = 0.045;
      body.velocity = {
        x: direction.x * 5.3 + playerVelocity.x * 0.35,
        y: direction.y * 5.3 + 1.1,
        z: direction.z * 5.3 + playerVelocity.z * 0.35
      };
      body.angularVelocity = {
        x: 3.7 + direction.z * 3,
        y: 7.2 + direction.x * 2.5,
        z: -4.2 + direction.x * 2
      };
      announce('VHS thrown.');
    } else {
      body.velocity = {
        x: playerVelocity.x * 0.12 + direction.x * 0.055,
        y: -0.12,
        z: playerVelocity.z * 0.12 + direction.z * 0.055
      };
      body.angularVelocity = { x: 0.075, y: 0.12, z: -0.055 };
      body.linearDamping = 0.3;
      body.angularDamping = 1.35;
      announce('VHS dropped.');
    }
    wakeVhsBody(body);
    updateTapeState();
  }

  function updateTapeState() {
    const state = inserted ? 'INSERTED' : held ? 'CARRIED' : body.sleeping ? 'ON FLOOR' : 'MOVING';
    el('[data-tape-state]').textContent = 'TAPE: ' + state;
  }

  function interact(target) {
    if (!target) return;
    if (target.id === 'pickup') beginPickup();
    else if (target.id === 'plug') { plugAnimation = { elapsed: 0, duration: 0.62 }; announce('Connecting the TV mains plug to the wall outlet...'); }
    else if (target.id === 'power') { switchAnimation = { elapsed: 0, duration: 0.24 }; announce('Power switch engaged. The CRT is starting up...'); }
    else if (target.id === 'slot-locked') announce('The television must be powered on and its setup sequence completed first.');
    else if (target.id === 'slot') startInsertion('insert');
    else if (target.id === 'eject') startInsertion('eject');
    hold = 0;
    holdId = null;
    latched = true;
  }

  function setLook(dx, dy) {
    if (paused) return;
    yaw -= dx * 0.0021;
    pitch = T.MathUtils.clamp(pitch - dy * 0.0021, -1.25, 0.88);
  }

  on(el('[data-action="start"]'), 'click', () => setPause(false));
  on(el('[data-action="pause"]'), 'click', () => setPause(!paused));
  on(el('[data-action="sound"]'), 'click', () => {
    muted = !muted;
    ambience.setMuted(muted);
    tvStaticAudio.muted = muted;
    if (tvMode === 'static' && !muted) tvStaticAudio.play().catch(() => {});
    teaserPlayback?.audio.update(playbackElapsed, { muted, volume: muted ? 0 : 0.86 });
    el('[data-action="sound"]').textContent = muted ? 'Sound off' : 'Sound on';
    el('[data-action="sound"]').setAttribute('aria-pressed', String(!muted));
    if (!muted && !paused) void ambience.resume();
  });
  on(el('[data-action="vhs"]'), 'click', () => {
    vhsEnabled = !vhsEnabled;
    el('[data-action="vhs"]').textContent = vhsEnabled ? 'VHS on' : 'VHS off';
    el('[data-action="vhs"]').setAttribute('aria-pressed', String(vhsEnabled));
  });
  on(el('[data-action="drop"]'), 'click', () => dropTape(false));
  on(el('[data-action="throw"]'), 'click', () => dropTape(true));

  on(document, 'keydown', event => {
    if (!paused && tvMode === 'minigame' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault(); if (!event.repeat) handleTvArrow(event.code); return;
    }
    if (event.target.closest?.('input,textarea,select,button,a')) return;
    if (event.code === 'Escape' && !event.repeat) {
      event.preventDefault();
      if (started) setPause(!paused);
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyF'].includes(event.code)) {
      event.preventDefault();
      if (!paused) keys.add(event.code);
    }
    if (event.code === 'KeyG' && !event.repeat && !paused) dropTape(false);
  });
  on(document, 'keyup', event => keys.delete(event.code));
  on(window, 'blur', () => {
    keys.clear();
    if (started && !paused && !disposed) setPause(true);
  });
  on(document, 'visibilitychange', () => {
    if (document.hidden && started) setPause(true);
  });
  on(document, 'mousemove', event => {
    if (document.pointerLockElement === renderer.domElement) setLook(event.movementX, event.movementY);
  });
  on(document, 'pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) drag = null;
  });
  on(renderer.domElement, 'pointerdown', event => {
    if (paused) return;
    if (event.button === 0 && event.pointerType === 'mouse' && document.pointerLockElement !== renderer.domElement) {
      capturePointer();
    }
    if (event.pointerType !== 'mouse' && document.pointerLockElement !== renderer.domElement) {
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    }
  });
  on(renderer.domElement, 'pointermove', event => {
    if (drag?.id === event.pointerId && document.pointerLockElement !== renderer.domElement) {
      setLook(event.clientX - drag.x, event.clientY - drag.y);
      drag.x = event.clientX;
      drag.y = event.clientY;
    }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    on(renderer.domElement, name, () => { drag = null; });
  }
  on(renderer.domElement, 'contextmenu', event => {
    event.preventDefault();
    if (!paused) dropTape(true);
  });
  for (const button of root.querySelectorAll('[data-tv-key]')) { const key = button.dataset.tvKey; on(button, 'click', () => handleTvArrow(key)); }
  for (const button of root.querySelectorAll('[data-key]')) {
    const key = button.dataset.key;
    on(button, 'pointerdown', event => {
      event.preventDefault();
      if (paused) return;
      keys.add(key);
      button.setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      on(button, name, () => keys.delete(key));
    }
  }

  function updateCameraAndPower(delta){
    if(cameraTween){
      cameraTween.elapsed+=delta;const t=clamp(cameraTween.elapsed/cameraTween.duration,0,1),e=t*t*(3-2*t);
      camera.position.lerpVectors(cameraTween.fromPosition,cameraTween.toPosition,e);
      camera.quaternion.slerpQuaternions(cameraTween.fromQuaternion,cameraTween.toQuaternion,e);
      camera.fov=T.MathUtils.lerp(cameraTween.fromFov,cameraTween.toFov,e);camera.updateProjectionMatrix();
      if(t>=1){const done=cameraTween.onComplete;cameraTween=null;done?.();}
    }
    if(plugAnimation){
      plugAnimation.elapsed+=delta;const t=clamp(plugAnimation.elapsed/plugAnimation.duration,0,1);
      world.power.setPlugProgress(t);
      if(t>=1){plugAnimation=null;powerCableConnected=true;setTvLabel('TV: POWER CONNECTED');announce('The plug is seated in the outlet. The TV power switch is ready.');}
    }
    if(switchAnimation){
      switchAnimation.elapsed+=delta;const t=clamp(switchAnimation.elapsed/switchAnimation.duration,0,1);
      world.power.setSwitchOn(true,t);
      if(t>=1){switchAnimation=null;tvPowered=true;world.power.setTvPowerState('booting');beginTvBoot();}
    }
  }

  function updatePlayer(delta) {
    if (tvCameraLocked || cameraTween) return;
    const input = {
      forward: Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')),
      right: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    };
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = sprinting ? 3.45 : 2.15;
    const beforeX = player.x;
    const beforeZ = player.z;
    for (let remaining = delta; remaining > 0; remaining -= 0.02) {
      const step = Math.min(0.02, remaining);
      const next = moveInWorld(player, input, yaw, step, (x, z) => world.canMove(x, z), speed);
      player.x = next.x;
      player.z = next.z;
    }
    const moved = Math.hypot(player.x - beforeX, player.z - beforeZ);
    distanceTravelled += moved;
    player.speed = delta > 0 ? moved / delta : 0;
    player.sprint = sprinting && moved > 0;
    playerVelocity.set(delta ? (player.x - beforeX) / delta : 0, 0, delta ? (player.z - beforeZ) / delta : 0);
    player.y = 0;
    camera.position.set(player.x, 1.68 + (reduced.matches ? 0 : Math.sin(distanceTravelled * 7) * 0.012), player.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function updateInteraction(delta) {
    const target = currentTarget();
    el('.sr-interaction').hidden = !target;
    el('[data-prompt]').textContent = target ? 'Hold F · ' + target.label : '';
    if (!keys.has('KeyF')) {
      hold = 0;
      holdId = null;
      latched = false;
    } else if (target && !latched) {
      if (holdId !== target.id) {
        hold = 0;
        holdId = target.id;
      }
      hold += delta / target.duration;
      if (hold >= 1) interact(target);
    } else if (!target) {
      hold = 0;
      holdId = null;
    }
    el('.sr-progress i').style.width = String(Math.min(1, hold) * 100) + '%';
  }

  function updatePhysics(delta) {
    if (held || inserted || insertion) return;
    stepVhsBody(body, delta, world.obstacles);
    tapeModel.position.set(body.position.x, body.position.y, body.position.z);
    tapeModel.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    updateTapeState();
  }

  function frame() {
    const now = performance.now();
    const delta = Math.min(0.08, Math.max(0, (now - previous) / 1000));
    previous = now;
    if (!paused && !disposed) {
      time += delta;
      updateCameraAndPower(delta);
      if (!tvCameraLocked && !cameraTween) { updatePlayer(delta); updateInteraction(delta); }
      updateInsertion(delta);
      updateTvSequence(delta);
      if (tvMode === 'teaser' && teaserPlayback) {
        playbackElapsed += delta;
        teaserPlayback.scene.render(renderer, playbackElapsed, { quality: 'high', reducedMotion: reduced.matches, muted });
        teaserPlayback.audio.update(playbackElapsed, { muted, volume: muted ? 0 : 0.86 });
        if (playbackElapsed >= 40) {
          teaserPlayback.audio.pause(); tvMode = 'finished'; world.setTvTexture(tvTexture); drawTvScreen();
          world.power.setTvPowerState('ready');
          returnCameraFromTv(() => { announce('The Monochrome II recording has reached its end.'); setTvLabel('TV: PLAYBACK COMPLETE'); });
        }
      }
      updatePhysics(delta);
      world.update(time, delta, player);
      ambience.update({ delta, sprinting: player.sprint, hidden: false, threat: 0, huntElapsed: 0 });
      el('[data-clock]').textContent = clockText(time);
    }
    post.render(world.scene, camera, time, { vhs: vhsEnabled, reduced: reduced.matches });
  }
  renderer.setAnimationLoop(frame);

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    document.exitPointerLock?.();
    for (const remove of listeners) remove();
    ambience.dispose();
    tvStaticAudio.pause();
    teaserPlayback?.audio.dispose();
    teaserPlayback?.scene.dispose();
    tvTexture?.dispose();
    post.dispose();
    world.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    root.remove();
    document.body.classList.remove('secretroom-page');
  }
  on(window, 'pagehide', dispose, { once: true });
  el('[data-action="start"]').focus();

  return {
    world,
    camera,
    renderer,
    player,
    tape: tapeModel,
    tv: world.tv,
    get held() { return held; },
    get inserted() { return inserted; },
    setTvTexture: texture => world.setTvTexture(texture),
    setTvVideo: video => world.setTvVideo(video),
    ejectVhs: () => { if (inserted && !insertion) startInsertion('eject'); },
    dispose
  };
}
