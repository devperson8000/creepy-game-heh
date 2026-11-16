import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROOM = Object.freeze({ half: 3.36, height: 3.42 });
const v3 = (x, y, z) => new T.Vector3(x, y, z);

export function createSecretRoomWorld() {
  const scene = new T.Scene();
  scene.background = new T.Color(0x8b8363);
  scene.fog = new T.FogExp2(0xa39b79, 0.008);
  const resources = new Set();
  const obstacles = [];
  let seed = 190991;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function texture(draw, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    const result = new T.CanvasTexture(canvas);
    result.colorSpace = T.SRGBColorSpace;
    result.wrapS = result.wrapT = T.RepeatWrapping;
    result.anisotropy = 8;
    resources.add(result);
    return result;
  }
  const wallpaper = texture((ctx, size) => {
    ctx.fillStyle = '#c4b780';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 45000; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#fff6b609' : '#48391b0d';
      ctx.fillRect(rand() * size, rand() * size, 1, 1 + rand() * 3);
    }
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#8f835049';
    for (let x = 0; x < size; x += 32) {
      for (const dx of [10, 22]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, 0);
        ctx.lineTo(x + dx, size);
        ctx.stroke();
      }
      for (let y = -48; y < size; y += 48) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 30);
        ctx.lineTo(x + 16, y + 16);
        ctx.lineTo(x + 22, y + 30);
        ctx.moveTo(x + 12, y + 32);
        ctx.lineTo(x + 16, y + 23);
        ctx.lineTo(x + 20, y + 32);
        ctx.stroke();
      }
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#47381a20');
    gradient.addColorStop(0.5, '#fff9cf05');
    gradient.addColorStop(1, '#35281355');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#65542b35';
    ctx.fillRect(0, 0, 2, size);
  });
  const carpet = texture((ctx, size) => {
    ctx.fillStyle = '#aa9c74';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 110000; i++) {
      const value = rand();
      ctx.fillStyle = value > 0.65 ? '#d0bd8155' : value > 0.3 ? '#51472744' : '#a0956044';
      ctx.fillRect(rand() * size, rand() * size, 0.5 + rand() * 1.3, 1 + rand() * 2);
    }
    for (let i = 0; i < 13; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const radius = 15 + rand() * 90;
      const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
      stain.addColorStop(0, '#392f2018');
      stain.addColorStop(1, '#392f2000');
      ctx.fillStyle = stain;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });
  const ceiling = texture((ctx, size) => {
    ctx.fillStyle = '#d2ccad';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = rand() > 0.4 ? '#4e482a35' : '#fff9df77';
      ctx.fillRect(rand() * size, rand() * size, 0.7 + rand() * 1.8, 0.7 + rand() * 1.5);
    }
    ctx.fillStyle = '#615b4244';
    ctx.fillRect(0, 0, size, 3);
    ctx.fillRect(0, 0, 3, size);
    ctx.fillStyle = '#fff2ca66';
    ctx.fillRect(3, 3, size, 2);
  });
  const lightmap = texture((ctx, size) => {
    ctx.fillStyle = '#e9ecd3';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = y % 8 ? '#afbda755' : '#fffbe977';
      ctx.fillRect(0, y, size, 1);
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#54634955');
    gradient.addColorStop(0.18, '#ffffff00');
    gradient.addColorStop(0.8, '#ffffff00');
    gradient.addColorStop(1, '#54634955');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
  const wallMaterial = makeMaterial({ map: wallpaper, bumpMap: wallpaper, bumpScale: 0.008 });
  const trimMaterial = makeMaterial({ color: 0x72623c, roughness: 0.92 });
  const railMaterial = makeMaterial({ color: 0xaaa58c, metalness: 0.1, roughness: 0.8 });
  const carpetMap = carpet.clone();
  carpetMap.repeat.set(3.3, 3.3);
  resources.add(carpetMap);
  const carpetMaterial = makeMaterial({ map: carpetMap, bumpMap: carpetMap, bumpScale: 0.018 });
  const ceilingMap = ceiling.clone();
  ceilingMap.repeat.set(3.3, 3.3);
  resources.add(ceilingMap);
  const ceilingMaterial = makeMaterial({ map: ceilingMap, bumpMap: ceilingMap, bumpScale: 0.012 });
  const cube = new T.BoxGeometry(1, 1, 1);
  resources.add(cube);
  function makeMaterial(options) {
    const material = new T.MeshStandardMaterial({ roughness: 1, ...options });
    resources.add(material);
    return material;
  }
  function box(w, h, d, x, y, z, material, parent = scene, cast = true) {
    const mesh = new T.Mesh(cube, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function rounded(w, h, d, x, y, z, radius, material, parent = scene, segments = 6) {
    const geometry = new RoundedBoxGeometry(w, h, d, segments, radius);
    resources.add(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addObstacle(center, halfExtents, options = {}) {
    const obstacle = {
      center: { x: center.x, y: center.y, z: center.z },
      halfExtents: { x: halfExtents.x, y: halfExtents.y, z: halfExtents.z },
      friction: options.friction ?? 0.62,
      restitution: options.restitution ?? 0.14
    };
    obstacles.push(obstacle);
    return obstacle;
  }

  // The shell follows the same wall, carpet and acoustic-ceiling construction
  // used by createBackroomsWorld; only the room footprint is reduced.
  const half = ROOM.half;
  const roomSpan = half * 2;
  box(roomSpan, 0.1, roomSpan, 0, -0.055, 0, carpetMaterial);
  box(roomSpan, 0.08, roomSpan, 0, ROOM.height + 0.04, 0, ceilingMaterial);
  const walls = [
    { x: 0, z: -half, w: roomSpan, d: 0.18 },
    { x: 0, z: half, w: roomSpan, d: 0.18 },
    { x: -half, z: 0, w: 0.18, d: roomSpan },
    { x: half, z: 0, w: 0.18, d: roomSpan }
  ];
  for (const wall of walls) {
    const geometry = new T.BoxGeometry(wall.w, ROOM.height, wall.d);
    const uv = geometry.attributes.uv;
    for (let face = 0; face < 6; face++) {
      const span = face < 2 ? wall.d : wall.w;
      for (let i = 0; i < 4; i++) {
        const index = face * 4 + i;
        uv.setXY(index, uv.getX(index) * span / 2.4, uv.getY(index));
      }
    }
    resources.add(geometry);
    const mesh = new T.Mesh(geometry, wallMaterial);
    mesh.position.set(wall.x, ROOM.height / 2, wall.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    box(wall.w + 0.026, 0.095, wall.d + 0.026, wall.x, 0.048, wall.z, trimMaterial);
    box(wall.w + 0.018, 0.035, wall.d + 0.018, wall.x, ROOM.height - 0.018, wall.z, railMaterial);
    addObstacle(
      { x: wall.x, y: ROOM.height / 2, z: wall.z },
      { x: wall.w / 2, y: ROOM.height / 2, z: wall.d / 2 },
      { friction: 0.48, restitution: 0.17 }
    );
  }
  addObstacle({ x: 0, y: -0.055, z: 0 }, { x: half, y: 0.055, z: half }, { friction: 0.84, restitution: 0.12 });
  addObstacle({ x: 0, y: ROOM.height + 0.04, z: 0 }, { x: half, y: 0.04, z: half }, { friction: 0.5, restitution: 0.1 });

  // The T-grid and its fluorescent diffuser keep the original Level 0 scale.
  for (let x = -3; x <= 3; x += 1.2) box(0.018, 0.018, roomSpan, x, ROOM.height - 0.016, 0, railMaterial, scene, false);
  for (let z = -3; z <= 3; z += 1.2) box(roomSpan, 0.018, 0.018, 0, ROOM.height - 0.016, z, railMaterial, scene, false);
  const housing = makeMaterial({ color: 0x827e66 });
  const diffuser = makeMaterial({
    map: lightmap,
    color: 0xcdd6b6,
    emissive: 0xe5edc5,
    emissiveMap: lightmap,
    emissiveIntensity: 1.9,
    roughness: 0.92
  });
  const fixtureGroup = new T.Group();
  scene.add(fixtureGroup);
  box(1.18, 0.055, 0.62, 0, ROOM.height - 0.065, -0.08, housing, fixtureGroup);
  for (const offset of [-0.2, 0, 0.2]) {
    box(1.08, 0.035, 0.065, 0, ROOM.height - 0.105, offset - 0.08, diffuser, fixtureGroup, false);
  }
  const ambient = new T.HemisphereLight(0xf0e5b3, 0x6e5934, 1.25);
  scene.add(ambient);
  const ceilingLight = new T.PointLight(0xffedb5, 17, 11, 1.5);
  ceilingLight.position.set(0, ROOM.height - 0.25, -0.08);
  ceilingLight.castShadow = true;
  ceilingLight.shadow.mapSize.set(1024, 1024);
  ceilingLight.shadow.bias = -0.0003;
  scene.add(ceilingLight);
  const softFill = new T.PointLight(0xffeac0, 2.4, 4.5, 1.8);
  softFill.position.set(0, 1.9, 2.1);
  scene.add(softFill);

  // Aged timber: subtle irregular grain, rubbed edges and hand-worn finish.
  const woodTexture = texture((ctx, size) => {
    ctx.fillStyle = '#51402c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1800; i++) {
      const y = rand() * size;
      const x = rand() * size;
      const width = 20 + rand() * 260;
      ctx.strokeStyle = rand() > 0.5 ? 'rgba(204,165,111,.10)' : 'rgba(12,9,7,.16)';
      ctx.lineWidth = 0.5 + rand() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + width * 0.25, y - 3, x + width * 0.7, y + 4, x + width, y + (rand() - 0.5) * 5);
      ctx.stroke();
    }
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#e4c18a12' : '#0d0a0718';
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1);
    }
    const wear = ctx.createLinearGradient(0, 0, 0, size);
    wear.addColorStop(0, '#d6b17a22');
    wear.addColorStop(0.1, '#ffffff00');
    wear.addColorStop(0.92, '#00000000');
    wear.addColorStop(1, '#1a120c55');
    ctx.fillStyle = wear;
    ctx.fillRect(0, 0, size, size);
  });
  const woodTextureFine = woodTexture.clone();
  woodTextureFine.repeat.set(1.5, 1);
  resources.add(woodTextureFine);
  const wood = makeMaterial({ map: woodTextureFine, bumpMap: woodTexture, bumpScale: 0.014, roughness: 0.88 });
  const wornWood = makeMaterial({ map: woodTexture, bumpMap: woodTexture, bumpScale: 0.022, color: 0xb7a080, roughness: 0.92 });
  const darkWood = makeMaterial({ color: 0x271e16, roughness: 0.98 });
  const iron = makeMaterial({ color: 0x4f4d47, metalness: 0.62, roughness: 0.48 });
  const brass = makeMaterial({ color: 0x89714a, metalness: 0.72, roughness: 0.36 });

  // Compact, slightly uneven old table; the CRT is deliberately its only load.
  const tableZ = -0.42;
  const table = new T.Group();
  table.position.set(0, 0, tableZ);
  scene.add(table);
  rounded(1.02, 0.075, 0.79, 0, 0.72, 0, 0.035, wood, table);
  rounded(0.96, 0.018, 0.73, 0, 0.759, 0, 0.012, wornWood, table);
  for (const x of [-0.425, 0.425]) {
    for (const z of [-0.315, 0.315]) {
      rounded(0.066, 0.69, 0.066, x, 0.365, z, 0.012, wood, table);
      rounded(0.078, 0.055, 0.078, x, 0.055, z, 0.012, darkWood, table);
      addObstacle(
        { x, y: 0.365, z: tableZ + z },
        { x: 0.033, y: 0.345, z: 0.033 },
        { friction: 0.76, restitution: 0.08 }
      );
    }
  }
  rounded(0.84, 0.13, 0.045, 0, 0.625, 0.33, 0.012, darkWood, table);
  rounded(0.84, 0.13, 0.045, 0, 0.625, -0.33, 0.012, wood, table);
  rounded(0.045, 0.13, 0.57, -0.435, 0.625, 0, 0.012, wood, table);
  rounded(0.045, 0.13, 0.57, 0.435, 0.625, 0, 0.012, wood, table);
  rounded(0.54, 0.24, 0.025, 0, 0.53, 0.365, 0.018, wornWood, table);
  rounded(0.17, 0.025, 0.035, 0, 0.535, 0.391, 0.012, brass, table);
  const drawerSlot = rounded(0.64, 0.014, 0.01, 0, 0.655, 0.373, 0.004, darkWood, table);
  drawerSlot.castShadow = false;
  for (const x of [-0.35, 0.35]) {
    const nail = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.005, 12), brass);
    nail.rotation.x = Math.PI / 2;
    nail.position.set(x, 0.763, 0.27);
    table.add(nail);
    resources.add(nail.geometry);
  }
  addObstacle(
    { x: 0, y: 0.72, z: tableZ },
    { x: 0.51, y: 0.0375, z: 0.395 },
    { friction: 0.78, restitution: 0.1 }
  );
  addObstacle({ x: 0, y: 0.625, z: tableZ + 0.33 }, { x: 0.42, y: 0.065, z: 0.0225 }, { friction: 0.74, restitution: 0.08 });
  addObstacle({ x: 0, y: 0.625, z: tableZ - 0.33 }, { x: 0.42, y: 0.065, z: 0.0225 }, { friction: 0.74, restitution: 0.08 });
  addObstacle({ x: -0.435, y: 0.625, z: tableZ }, { x: 0.0225, y: 0.065, z: 0.285 }, { friction: 0.74, restitution: 0.08 });
  addObstacle({ x: 0.435, y: 0.625, z: tableZ }, { x: 0.0225, y: 0.065, z: 0.285 }, { friction: 0.74, restitution: 0.08 });
  addObstacle({ x: 0, y: 0.53, z: tableZ + 0.365 }, { x: 0.27, y: 0.12, z: 0.0125 }, { friction: 0.72, restitution: 0.08 });

  // Vintage television shell with deep bezel, curved glass, controls, vents and an actual cassette slot.
  const tv = new T.Group();
  const tvZ = tableZ - 0.015;
  const tvY = 1.065;
  tv.position.set(0, tvY, tvZ);
  scene.add(tv);
  const tvPlastic = makeMaterial({ color: 0x777365, roughness: 0.56, metalness: 0.06 });
  const tvPlasticLight = makeMaterial({ color: 0x928c77, roughness: 0.76 });
  const bezelMaterial = makeMaterial({ color: 0x252724, roughness: 0.4, metalness: 0.18 });
  const screenMaterial = new T.MeshPhysicalMaterial({
    color: 0x10140f,
    roughness: 0.16,
    metalness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.09,
    emissive: 0x020503,
    emissiveIntensity: 0.3
  });
  resources.add(screenMaterial);
  const glassMaterial = new T.MeshPhysicalMaterial({
    color: 0x1d241d,
    roughness: 0.1,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.44,
    depthWrite: false
  });
  resources.add(glassMaterial);
  rounded(0.67, 0.535, 0.51, 0, 0, 0, 0.062, tvPlastic, tv);
  rounded(0.53, 0.405, 0.048, -0.025, 0.014, 0.268, 0.038, bezelMaterial, tv);
  // Convex phosphor face and a separate optical glass skin reproduce the
  // shallow curvature of a small late-1980s CRT instead of a flat LCD panel.
  const screenGeometry = new T.PlaneGeometry(0.456, 0.326, 32, 24);
  const screenPositions = screenGeometry.attributes.position;
  for (let i = 0; i < screenPositions.count; i++) {
    const x = screenPositions.getX(i) / 0.228;
    const y = screenPositions.getY(i) / 0.163;
    screenPositions.setZ(i, 0.018 * Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y));
  }
  screenGeometry.computeVertexNormals();
  resources.add(screenGeometry);
  const screen = new T.Mesh(screenGeometry, screenMaterial);
  screen.position.set(-0.025, 0.021, 0.303);
  screen.name = 'future-vhs-playback-screen';
  screen.userData.playbackSurface = true;
  tv.add(screen);
  const glassGeometry = screenGeometry.clone();
  const glassPositions = glassGeometry.attributes.position;
  for (let i = 0; i < glassPositions.count; i++) glassPositions.setZ(i, glassPositions.getZ(i) + 0.011);
  glassGeometry.computeVertexNormals();
  resources.add(glassGeometry);
  const glass = new T.Mesh(glassGeometry, glassMaterial);
  glass.position.set(-0.025, 0.021, 0.316);
  tv.add(glass);
  rounded(0.69, 0.045, 0.49, 0, -0.267, 0.01, 0.018, tvPlasticLight, tv);
  for (const x of [-0.245, 0.195]) {
    rounded(0.07, 0.025, 0.06, x, -0.285, 0.02, 0.012, darkWood, tv);
  }
  // Speaker perforations have individually recessed dark centres.
  const speaker = makeMaterial({ color: 0x171a17, roughness: 0.9 });
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const hole = new T.Mesh(new T.CylinderGeometry(0.0065, 0.0065, 0.006, 10), speaker);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(-0.218 + col * 0.029, -0.045 + row * 0.031, 0.296);
      tv.add(hole);
      resources.add(hole.geometry);
    }
  }
  // Tuning and volume controls with ridged rims and aged metal centres.
  for (const [x, y, radius] of [[0.22, -0.08, 0.032], [0.22, -0.17, 0.024]]) {
    const rim = new T.Mesh(new T.CylinderGeometry(radius + 0.008, radius + 0.008, 0.016, 24), brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, y, 0.29);
    tv.add(rim);
    resources.add(rim.geometry);
    const dial = new T.Mesh(new T.CylinderGeometry(radius, radius, 0.018, 24), tvPlasticLight);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(x, y, 0.303);
    tv.add(dial);
    resources.add(dial.geometry);
    const pointer = box(0.004, 0.018, 0.005, x, y, 0.315, darkWood, tv, false);
    pointer.rotation.z = -0.5;
  }
  for (let i = 0; i < 9; i++) {
    rounded(0.018, 0.006, 0.1, -0.245 + i * 0.055, 0.235, -0.02, 0.003, darkWood, tv);
  }
  rounded(0.16, 0.048, 0.012, -0.025, -0.232, 0.268, 0.006, tvPlasticLight, tv);
  const ledMaterial = new T.MeshStandardMaterial({ color: 0x66765a, emissive: 0x26351a, emissiveIntensity: 0.25 });
  resources.add(ledMaterial);
  const powerLed = new T.Mesh(new T.SphereGeometry(0.008, 12, 8), ledMaterial);
  powerLed.position.set(0.27, -0.22, 0.276);
  tv.add(powerLed);
  resources.add(powerLed.geometry);
  const tvFeetMaterial = makeMaterial({ color: 0x292922, roughness: 0.95 });
  for (const x of [-0.22, 0.22]) {
    rounded(0.1, 0.035, 0.1, x, -0.292, -0.16, 0.016, tvFeetMaterial, tv);
  }
  const slotY = tvY - 0.218;
  const slotFrontZ = tvZ + 0.282;
  rounded(0.244, 0.043, 0.025, 0, -0.218, 0.279, 0.009, brass, tv);
  rounded(0.226, 0.031, 0.018, 0, -0.218, 0.295, 0.005, darkWood, tv);
  rounded(0.198, 0.019, 0.009, 0, -0.218, 0.304, 0.003, bezelMaterial, tv);
  const slotShadow = new T.Mesh(new T.PlaneGeometry(0.19, 0.012), new T.MeshBasicMaterial({ color: 0x050605 }));
  slotShadow.position.set(0, -0.218, 0.31);
  tv.add(slotShadow);
  resources.add(slotShadow.geometry, slotShadow.material);
  const slot = {
    position: v3(0, slotY, slotFrontZ + 0.035),
    faceZ: slotFrontZ + 0.035,
    width: 0.21,
    height: 0.034,
    group: tv
  };
  addObstacle(
    { x: 0, y: tvY, z: tvZ },
    { x: 0.335, y: 0.2675, z: 0.255 },
    { friction: 0.55, restitution: 0.12 }
  );

  function makeVhsLabel() {
    return texture((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#d7c7a2';
      ctx.fillRect(12, 12, size - 24, size - 24);
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(54,39,24,.06)' : 'rgba(255,250,225,.13)';
        ctx.fillRect(12 + rand() * (size - 24), 12 + rand() * (size - 24), 1 + rand() * 3, 1);
      }
      ctx.clearRect(size * 0.2, size * 0.47, size * 0.18, size * 0.31);
      ctx.clearRect(size * 0.62, size * 0.47, size * 0.18, size * 0.31);
      ctx.strokeStyle = '#665944';
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, size - 24, size - 24);
      ctx.fillStyle = '#34342c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 37px monospace';
      ctx.fillText('TAPE 001', 38, 68);
      ctx.font = '25px monospace';
      ctx.fillText('ARCHIVE / LEVEL 0', 38, 110);
      ctx.fillText('DO NOT ERASE', 38, size - 55);
      ctx.strokeStyle = '#8c3428';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(38, 142);
      ctx.lineTo(size - 38, 142);
      ctx.stroke();
    }, 512);
  }

  function createVhsModel() {
    const cassette = new T.Group();
    cassette.name = 'physical-vhs-cassette';
    const shell = makeMaterial({ color: 0x242725, roughness: 0.64, metalness: 0.08 });
    const shellTop = makeMaterial({ color: 0x333632, roughness: 0.58 });
    const groove = makeMaterial({ color: 0x121512, roughness: 0.92 });
    const reel = makeMaterial({ color: 0xaaa995, roughness: 0.52, metalness: 0.28 });
    const tape = makeMaterial({ color: 0x4e3526, roughness: 0.8 });
    rounded(0.188, 0.026, 0.104, 0, 0, 0, 0.006, shell, cassette);
    rounded(0.181, 0.006, 0.098, 0, 0.014, 0, 0.004, shellTop, cassette);
    rounded(0.177, 0.003, 0.095, 0, -0.014, 0, 0.003, groove, cassette);
    const labelTexture = makeVhsLabel();
    const labelMaterial = new T.MeshStandardMaterial({
      map: labelTexture,
      transparent: true,
      roughness: 0.96,
      side: T.DoubleSide
    });
    resources.add(labelMaterial);
    const label = new T.Mesh(new T.PlaneGeometry(0.157, 0.079), labelMaterial);
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, 0.0174, 0);
    cassette.add(label);
    resources.add(label.geometry);
    const window = rounded(0.116, 0.0025, 0.039, 0, 0.0172, 0.001, 0.006, groove, cassette);
    window.castShadow = false;
    for (const x of [-0.043, 0.043]) {
      const spindle = new T.Mesh(new T.CylinderGeometry(0.0255, 0.0255, 0.005, 28), reel);
      spindle.position.set(x, 0.017, 0.001);
      cassette.add(spindle);
      resources.add(spindle.geometry);
      const inner = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 0.006, 18), groove);
      inner.position.set(x, 0.018, 0.001);
      cassette.add(inner);
      resources.add(inner.geometry);
      const hub = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.007, 12), tape);
      hub.position.set(x, 0.019, 0.001);
      cassette.add(hub);
      resources.add(hub.geometry);
      const ring = new T.Mesh(new T.TorusGeometry(0.018, 0.0018, 5, 28), shellTop);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.0205, 0.001);
      cassette.add(ring);
      resources.add(ring.geometry);
    }
    const screws = makeMaterial({ color: 0x8c8a7b, metalness: 0.72, roughness: 0.42 });
    for (const x of [-0.081, 0.081]) {
      for (const z of [-0.039, 0.039]) {
        const screw = new T.Mesh(new T.CylinderGeometry(0.0032, 0.0032, 0.0025, 12), screws);
        screw.position.set(x, 0.0175, z);
        cassette.add(screw);
        resources.add(screw.geometry);
      }
    }
    for (let i = 0; i < 7; i++) {
      rounded(0.004, 0.002, 0.052, -0.088 + i * 0.007, -0.003, 0, 0.001, groove, cassette);
    }
    return cassette;
  }

  // A soft layer of floating dust catches the practical ceiling light.
  const dustPositions = [];
  for (let i = 0; i < 260; i++) {
    dustPositions.push(
      (rand() - 0.5) * 5.8,
      0.18 + rand() * 3.0,
      (rand() - 0.5) * 5.8
    );
  }
  const dustGeometry = new T.BufferGeometry();
  dustGeometry.setAttribute('position', new T.Float32BufferAttribute(dustPositions, 3));
  const dustMaterial = new T.PointsMaterial({
    color: 0xd2c393,
    size: 0.018,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    sizeAttenuation: true
  });
  const dust = new T.Points(dustGeometry, dustMaterial);
  scene.add(dust);
  resources.add(dustGeometry, dustMaterial);

  const tvApi = {
    group: tv,
    screen,
    screenMaterial,
    slot,
    get videoReady() { return !!screenMaterial.map; }
  };
  function canMove(x, z) {
    const radius = 0.245;
    if (x < -half + radius || x > half - radius || z < -half + radius || z > half - radius) return false;
    // Keep the player outside the table's footprint while allowing a close approach at its front.
    if (Math.abs(x) < 0.56 + radius && Math.abs(z - tableZ) < 0.44 + radius) return false;
    return true;
  }
  function update(time, delta, player) {
    const flicker = 1 - 0.018 * Math.sin(time * 97) - 0.012 * Math.sin(time * 131);
    ceilingLight.intensity = 17 * flicker;
    ambient.intensity = 1.25 * (1 - 0.02 * Math.sin(time * 0.7));
    softFill.position.set(player.x * 0.2, 1.9, player.z + 0.35);
    dust.position.y = Math.sin(time * 0.16) * 0.055;
    dustMaterial.opacity = 0.14 + 0.025 * Math.sin(time * 0.8);
  }
  function setTvTexture(textureValue) {
    screenMaterial.map = textureValue;
    screenMaterial.color.set(0xffffff);
    screenMaterial.emissive.set(0x0c100c);
    screenMaterial.emissiveIntensity = 0.42;
    screenMaterial.needsUpdate = true;
  }
  function setTvVideo(video) {
    const videoTexture = new T.VideoTexture(video);
    videoTexture.colorSpace = T.SRGBColorSpace;
    videoTexture.minFilter = T.LinearFilter;
    videoTexture.magFilter = T.LinearFilter;
    resources.add(videoTexture);
    setTvTexture(videoTexture);
    return videoTexture;
  }
  function dispose() {
    for (const resource of resources) resource.dispose();
    scene.clear();
  }
  return {
    scene,
    obstacles,
    tv: tvApi,
    table,
    room: ROOM,
    createVhsModel,
    canMove,
    update,
    setTvTexture,
    setTvVideo,
    dispose
  };
}
