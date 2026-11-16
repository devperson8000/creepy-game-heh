import * as T from 'three';
import { loadPlayerAvatarAsset, createPlayerAvatar } from './player-avatar.js';
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

export function startSecretRoom(container,{autostart=false,embedded=null}={}) {
  if(!embedded)document.title = 'MONOCHROME — The Secret Room';
  document.body.classList.add('secretroom-page');
  if(!embedded)container.setAttribute('aria-label', 'A small enclosed Backrooms room containing an old television and VHS cassette');

  const renderer = embedded?.renderer ?? new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  if(!embedded){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    container.append(renderer.domElement);
  }
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', embedded ? 'Main game view — Secret Room' : 'Secret room game view');
  const world = createSecretRoomWorld(embedded ? {
    parent: embedded.scene,
    position: embedded.position,
    rotationY: embedded.rotationY
  } : {});
  const renderScene = embedded?.scene ?? world.scene;
  const roomRoot = world.root ?? world.scene;
  const post = createBackroomsPost(renderer);
  const camera = embedded?.camera ?? new T.PerspectiveCamera(68, 1, 0.06, 60);
  camera.rotation.order = 'YXZ';
  const originalSceneBackground = embedded?.scene?.background ?? null;
  const originalSceneFog = embedded?.scene?.fog ?? null;
  const originalRendererExposure = renderer.toneMappingExposure;
  let sceneActivated = false;
  const player = { x: 0, y: 0, z: 2.55, speed: 0, sprint: false, crouch: false };
  let hazmatViewmodel=null,hazmatViewmodelError=null;
  const hazmatGripPosition=new T.Vector3(),hazmatGripQuaternion=new T.Quaternion();
  const hazmatDesiredGrip=new T.Vector3(),hazmatLocalOffset=new T.Vector3();
  let hazmatViewmodelBase=null;
  let yaw = 0;
  let pitch = -0.16;
  let reachLean = 0;
  let time = 0;
  let distanceTravelled = 0;
  let previous = performance.now();
  let paused = !autostart;
  let started = !!autostart;
  let muted = false;
  let disposed = false;
  let drag = null;
  let hold = 0;
  let holdId = null;
  let latched = false;
  let held = false;
  let inserted=false,insertion=null,vhsEnabled=true;
  let powerCableHeld=false,powerCableConnected=false,tvPowered=false,setupComplete=false;
  let cablePickupAnimation=null;
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
  roomRoot.add(tapeModel);
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
  const roomWorldQuaternion = () => {
    roomRoot.updateMatrixWorld(true);
    return roomRoot.getWorldQuaternion(new T.Quaternion());
  };
  const worldPointToRoom = value => {
    roomRoot.updateMatrixWorld(true);
    return roomRoot.worldToLocal(value.clone());
  };
  const roomPointToWorld = value => {
    roomRoot.updateMatrixWorld(true);
    return roomRoot.localToWorld(value.clone());
  };
  const worldQuaternionToRoom = value => roomWorldQuaternion().invert().multiply(value.clone());
  const roomQuaternionToWorld = value => roomWorldQuaternion().multiply(value.clone());
  const worldDirectionToRoom = value => value.clone().applyQuaternion(roomWorldQuaternion().invert()).normalize();
  const hazmatViewmodelReady=loadPlayerAvatarAsset().then(asset=>{
    if(disposed)return null;
    let avatar=null;
    try{
      avatar=createPlayerAvatar(asset,{id:'secretroom-first-person',name:'',slot:0});
      const isolated=avatar.enableFirstPersonViewmodel();
      if(!isolated.triangleCount)throw new Error('No right-arm triangles were found in the survivor model.');
      camera.add(avatar.root);
      avatar.root.visible=false;
      avatar.update({x:.1,height:-1.45,z:-.48,yaw:0,pitch:0,torch:false,moving:false},1/60);
      camera.updateMatrixWorld(true);
      avatar.getGripWorldTransform(hazmatGripPosition,hazmatGripQuaternion);
      hazmatDesiredGrip.copy(camera.localToWorld(v3(.5,-.34,-.78)));
      hazmatLocalOffset.subVectors(hazmatDesiredGrip,hazmatGripPosition);
      camera.getWorldQuaternion(tempQuaternion).invert();
      hazmatLocalOffset.applyQuaternion(tempQuaternion);
      avatar.root.position.add(hazmatLocalOffset);
      hazmatViewmodelBase=avatar.root.position.clone();
      avatar.root.visible=false;
      hazmatViewmodel=avatar;
      return avatar;
    }catch(error){
      avatar?.dispose();
      throw error;
    }
  }).catch(error=>{
    hazmatViewmodelError=error;
    console.error('The actual hazmat first-person arm could not load:',error);
    announce('The hazmat character arm could not be loaded. Reload the room to try again.');
    return null;
  });
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
        '<p>The lights are still humming. An old television sits on a small table, with its unplugged power lead coiled beside it. A VHS cassette waits nearby. Restore the TV before playing the tape.</p>' +
        '<button class="sr-start" data-action="start">Enter the room <span>↗</span></button>' +
        '<footer><span>HEADPHONES RECOMMENDED</span><span>F · INTERACT &nbsp; G · DROP</span></footer>' +
      '</section>' +
    '</div>';
  document.body.append(root);
  if(embedded)root.hidden = true;

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
    teaserReadyPromise=import('./monochrome2-intro.js').then(async module=>{
      const film=module.createMonochrome2TvFilm(renderer);
      teaserPlayback=film;
      await film.ready;
      return film;
    }).catch(error=>{
      teaserLoadError=error;
      teaserPlayback?.dispose();teaserPlayback=null;
      console.error('Monochrome 2 Backrooms footage could not be prepared:',error);
      return null;
    });
    return teaserReadyPromise;
  }
  function cameraMoveTo(position,quaternion,fov,duration,onComplete){
    cameraTween={fromPosition:camera.position.clone(),toPosition:position.clone(),fromQuaternion:camera.quaternion.clone(),toQuaternion:quaternion.clone(),fromFov:camera.fov,toFov:fov,elapsed:0,duration,onComplete};
  }
  function focusCameraOnTv(done){
    if(!tvReturnPose)tvReturnPose={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
    tvCameraLocked=true;keys.clear();document.exitPointerLock?.();root.classList.add('sr-tv-focus');
    world.tv.screen.updateWorldMatrix(true,false);
    const screen=worldPointToRoom(world.tv.screen.getWorldPosition(new T.Vector3()));
    const normal=worldDirectionToRoom(world.tv.screen.getWorldDirection(new T.Vector3()));
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
      if(tvElapsed>=8.4){tvMode='minigame';tvElapsed=0;tvGame=createTvSetupGame();tvErrorTime=0;setTvLabel('TV: SETUP REQUIRED');el('.sr-tv-touch').hidden=false;}
      drawTvScreen();return;
    }
    if(tvMode==='minigame'){tvErrorTime=Math.max(0,tvErrorTime-delta);drawTvScreen();return;}
    if(tvMode==='successFlash'&&tvElapsed>=(tvGame?.complete?1.2:.58)){
      tvElapsed=0;
      if(tvGame?.complete){tvMode='readyBlack';setupComplete=true;setTvLabel('TV: READY FOR VHS');world.power.setTvPowerState('ready');el('.sr-tv-touch').hidden=true;}
      else tvMode='minigame';
      drawTvScreen();return;
    }
    if(tvMode==='readyBlack'&&tvElapsed>=1.25){
      tvElapsed=0;tvMode='returning';returnCameraFromTv(()=>{tvMode='ready';drawTvScreen();announce('TV setup complete. The black screen and green pilot light mean it is ready for the VHS cassette.');setTvLabel('TV: READY FOR VHS');});return;
    }
    if(tvMode==='static'&&tvElapsed>=1.5&&teaserPlayback){
      tvStaticAudio.pause();tvStaticAudio.currentTime=0;tvMode='teaser';playbackElapsed=0;
      world.setTvTexture(teaserPlayback.texture);
      teaserPlayback.setMuted(muted);teaserPlayback.play();
      world.power.setTvPowerState('playing');return;
    }
    if(tvMode==='static'&&tvElapsed>=1.5&&teaserLoadError){tvStaticAudio.pause();tvMode='mediaError';drawTvScreen();return;}
    if(tvMode==='static'||tvMode==='mediaError')drawTvScreen();
  }


  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    if(!embedded)renderer.setSize(width, height);
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
      teaserPlayback?.pause();
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
      if (tvMode === 'teaser') { teaserPlayback?.resume(); teaserPlayback?.setMuted(muted); }
      capturePointer();
    }
  }

  function cameraDirection() {
    camera.getWorldDirection(worldDirection);
    return worldDirectionToRoom(worldDirection);
  }

  function pointTarget(position, maxDistance, minFacing) {
    targetDirection.copy(position).sub(camera.position);
    const distance = targetDirection.length();
    if (distance > maxDistance || distance < 0.001) return false;
    targetDirection.multiplyScalar(1 / distance);
    return cameraDirection().dot(targetDirection) >= minFacing;
  }

  function currentTarget(){
    if(insertion||tvCameraLocked||cameraTween||plugAnimation||switchAnimation||cablePickupAnimation)return null;
    if(!powerCableHeld&&!powerCableConnected&&hazmatViewmodel&&pointTarget(world.power.pickupTarget,2.1,.48))return{id:'cable-pickup',label:'Pick up the TV power cable',duration:.52};
    if(powerCableHeld&&!powerCableConnected&&pointTarget(world.power.outletTarget,1.75,.48))return{id:'plug',label:'Plug the TV power cable into the outlet',duration:.72};
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
    roomRoot.add(tapeModel);
    tapeModel.position.copy(worldPointToRoom(tempPosition));
    tapeModel.quaternion.copy(worldQuaternionToRoom(tempQuaternion));
  }

  function startInsertion(mode) {
    camera.updateMatrixWorld(true);
    const from = new T.Vector3();
    const fromQuaternion = new T.Quaternion();
    if (held) {
      tapeModel.getWorldPosition(from);
      tapeModel.getWorldQuaternion(fromQuaternion);
      camera.remove(tapeModel);
      roomRoot.add(tapeModel);
      tapeModel.position.copy(worldPointToRoom(from));
      tapeModel.quaternion.copy(worldQuaternionToRoom(fromQuaternion));
    } else {
      from.copy(tapeModel.position);
      fromQuaternion.copy(tapeModel.quaternion);
    }
    const to = mode === 'insert'
      ? world.tv.slot.position.clone().add(v3(0, 0, -0.045))
      : worldPointToRoom(camera.localToWorld(handPosition.clone()));
    const toQuaternion = mode === 'insert'
      ? new T.Quaternion()
      : worldQuaternionToRoom(camera.getWorldQuaternion(new T.Quaternion()));
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
    else if (target.id === 'cable-pickup') {
      powerCableHeld=true;
      cablePickupAnimation={elapsed:0,duration:.52,from:world.power.plug.position.clone(),fromQuaternion:world.power.plug.quaternion.clone()};
      world.power.beginCableHold();
      announce('Gathering the TV power lead. Carry the plug to the wall outlet on the right.');
    }
    else if (target.id === 'plug') {
      plugAnimation={elapsed:0,duration:.78,from:world.power.plug.position.clone(),fromQuaternion:world.power.plug.quaternion.clone()};
      announce('Aligning the prongs and pressing the plug fully into the wall outlet...');
    }
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
    teaserPlayback?.setMuted(muted);
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

  function updateCarriedPowerCable(delta=0){
    if(!hazmatViewmodel||disposed)return;
    const active=powerCableHeld||Boolean(cablePickupAnimation)||Boolean(plugAnimation);
    hazmatViewmodel.root.visible=active;
    if(!active)return;
    camera.updateMatrixWorld(true);
    hazmatViewmodel.update({
      x:hazmatViewmodelBase.x,height:hazmatViewmodelBase.y,z:hazmatViewmodelBase.z,
      yaw:0,pitch:clamp(pitch,-1.1,1.1),torch:false,moving:false
    },delta);
    if(plugAnimation){
      hazmatViewmodel.setGripWorldTransform(roomPointToWorld(world.power.plug.position),roomQuaternionToWorld(world.power.plug.quaternion));
      return;
    }
    if(!powerCableHeld||powerCableConnected)return;
    hazmatViewmodel.getGripWorldTransform(hazmatGripPosition,hazmatGripQuaternion);
    let position=worldPointToRoom(hazmatGripPosition),quaternion=worldQuaternionToRoom(hazmatGripQuaternion);
    if(cablePickupAnimation){
      cablePickupAnimation.elapsed+=delta;
      const p=clamp(cablePickupAnimation.elapsed/cablePickupAnimation.duration,0,1),e=p*p*(3-2*p);
      position=tempPosition.lerpVectors(cablePickupAnimation.from,position,e);
      quaternion=tempQuaternion.copy(cablePickupAnimation.fromQuaternion).slerp(quaternion,e);
      if(p>=1)cablePickupAnimation=null;
    }
    world.power.setHeldPose(position,quaternion);
    hazmatViewmodel.setGripWorldTransform(roomPointToWorld(position),roomQuaternionToWorld(quaternion));
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
      world.power.setPlugInsertion(plugAnimation.from,plugAnimation.fromQuaternion,t);
      if(t>=1){
        plugAnimation=null;powerCableHeld=false;powerCableConnected=true;
        world.power.setCablePlugged();
        setTvLabel('TV: POWER CONNECTED');
        announce('The plug is fully seated in the outlet. The TV power switch is ready.');
      }
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
    const reachTarget = plugAnimation || cablePickupAnimation ? 1 : 0;
    reachLean += (reachTarget - reachLean) * (1 - Math.exp(-delta * 8.5));
    const stepBob = reduced.matches ? 0 : Math.sin(distanceTravelled * 7) * 0.012;
    // Ease the player's view down toward the outlet so the real rigged arm
    // can reach it naturally, then return smoothly to normal eye height.
    camera.position.set(player.x, 1.68 - reachLean * 0.52 + stepBob, player.z);
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

  function update(delta) {
    const step = Math.min(0.08, Math.max(0, delta));
    if (!paused && !disposed) {
      time += step;
      updateCameraAndPower(step);
      if (!tvCameraLocked && !cameraTween) {
        updatePlayer(step);
        updateCarriedPowerCable(step);
        updateInteraction(step);
      }
      updateInsertion(step);
      updateTvSequence(step);
      if (tvMode === 'teaser' && teaserPlayback) {
        playbackElapsed += step;
        teaserPlayback.render(playbackElapsed);
        if (playbackElapsed >= teaserPlayback.duration) {
          teaserPlayback.pause(); tvMode = 'finished'; world.setTvTexture(tvTexture); drawTvScreen();
          world.power.setTvPowerState('ready');
          returnCameraFromTv(() => { announce('The Monochrome 2 Backrooms recording has reached its end.'); setTvLabel('TV: PLAYBACK COMPLETE'); });
        }
      }
      updatePhysics(step);
      world.update(time, step, player);
      ambience.update({ delta: step, sprinting: player.sprint, hidden: false, threat: 0, huntElapsed: 0 });
      el('[data-clock]').textContent = clockText(time);
    }
  }
  function render() {
    post.render(renderScene, camera, time, { vhs: vhsEnabled, reduced: reduced.matches });
  }
  function frame() {
    const now = performance.now();
    const delta = Math.min(0.08, Math.max(0, (now - previous) / 1000));
    previous = now;
    update(delta);
    render();
  }
  if(!embedded)renderer.setAnimationLoop(frame);

  function activate() {
    if(!embedded||disposed)return false;
    if(camera.parent!==roomRoot)roomRoot.add(camera);
    camera.position.set(player.x,1.68,player.z);
    camera.rotation.set(pitch,yaw,0,'YXZ');
    camera.fov=68;
    camera.updateProjectionMatrix();
    renderScene.background=world.scene.background;
    renderScene.fog=world.scene.fog;
    renderer.toneMappingExposure=1.12;
    sceneActivated=true;
    root.hidden=false;
    setPause(false);
    embedded.onActivate?.();
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if(!embedded)renderer.setAnimationLoop(null);
    document.exitPointerLock?.();
    for (const remove of listeners) remove();
    ambience.dispose();
    hazmatViewmodel?.dispose();
    tvStaticAudio.pause();
    teaserPlayback?.dispose();
    tvTexture?.dispose();
    post.dispose();
    if(camera.parent===roomRoot)camera.removeFromParent();
    world.dispose();
    if(!embedded){
      renderer.dispose();
      renderer.domElement.remove();
    }
    root.remove();
    document.body.classList.remove('secretroom-page');
  }
  on(window, 'pagehide', dispose, { once: true });
  if(autostart&&!embedded){
    setPause(false);
    const reveal=document.createElement('div');
    reveal.className='sr-entry-reveal';
    reveal.setAttribute('aria-hidden','true');
    document.body.append(reveal);
    window.setTimeout(()=>reveal.remove(),1250);
    renderer.domElement.focus({preventScroll:true});
  }else if(!embedded){
    el('[data-action="start"]').focus();
  }

  return {
    world,
    camera,
    renderer,
    player,
    tape: tapeModel,
    tv: world.tv,
    get held() { return held; },
    get inserted() { return inserted; },
    activate,
    update,
    render,
    setTvTexture: texture => world.setTvTexture(texture),
    setTvVideo: video => world.setTvVideo(video),
    ejectVhs: () => { if (inserted && !insertion) startInsertion('eject'); },
    dispose
  };
}
