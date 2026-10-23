import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { startGuestSession, type GuestSessionTracker } from './guest-progress';
import { createSecunderabadYard, isSecunderabadStationSite, SECUNDERABAD_LAYOUT, type SecunderabadView } from './secunderabad-yard';
import { createVandeBharat20102, VANDE_BHARAT_20102 } from './vande-bharat-20102';
import './style.css';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing page element: #${id}`);
  return element as T;
};

const app = byId<HTMLDivElement>('app');
const canvas = byId<HTMLCanvasElement>('scene');
const loadingScreen = byId<HTMLDivElement>('loading-screen');
const fallback = byId<HTMLDivElement>('fallback-message');
const timeSlider = byId<HTMLInputElement>('time-slider');
const timeReadout = byId<HTMLElement>('time-readout');
const sceneCaption = byId<HTMLElement>('scene-caption-text');
const stationStateTitle = byId<HTMLElement>('station-state-title');
const stationStateDetail = byId<HTMLElement>('station-state-detail');
const stationViewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-station-view]'));
const cameraViewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-camera-view]'));
const focusToggle = byId<HTMLButtonElement>('focus-toggle');
const playNowButton = byId<HTMLButtonElement>('play-now-button');
const guestStatus = byId<HTMLDivElement>('guest-status');
const guestStatusLabel = byId<HTMLElement>('guest-status-label');
const resetButton = byId<HTMLButtonElement>('reset-view');
const drivePanel = byId<HTMLElement>('drive-panel');
const trainSpeedValue = byId<HTMLElement>('train-speed-value');
const driveStatus = byId<HTMLElement>('drive-status');
const throttleControl = byId<HTMLInputElement>('throttle-control');
const brakeControl = byId<HTMLInputElement>('brake-control');
const throttleOutput = byId<HTMLOutputElement>('throttle-output');
const brakeOutput = byId<HTMLOutputElement>('brake-output');
const resetTrainButton = byId<HTMLButtonElement>('reset-train');

const modulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const STATION_PAD_HALF_WIDTH = SECUNDERABAD_LAYOUT.sitePadWidth / 2;
const STATION_PAD_HALF_LENGTH = SECUNDERABAD_LAYOUT.sitePadLength / 2;

/** Fast deterministic lattice noise. Periods make generated texture tiles seamless. */
function latticeHash(x: number, y: number, seed = 1, periodX = 0, periodY = 0): number {
  const ix = periodX > 0 ? modulo(x, periodX) : x;
  const iy = periodY > 0 ? modulo(y, periodY) : y;
  let hash = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed = 1, periodX = 0, periodY = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = latticeHash(x0, y0, seed, periodX, periodY);
  const b = latticeHash(x0 + 1, y0, seed, periodX, periodY);
  const c = latticeHash(x0, y0 + 1, seed, periodX, periodY);
  const d = latticeHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  const top = THREE.MathUtils.lerp(a, b, sx);
  const bottom = THREE.MathUtils.lerp(c, d, sx);
  return THREE.MathUtils.lerp(top, bottom, sy);
}

function fractalNoise(x: number, y: number, octaves = 5, seed = 11): number {
  let total = 0;
  let amplitude = 0.56;
  let normalization = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    normalization += amplitude;
    amplitude *= 0.49;
    frequency *= 2.03;
  }
  return total / normalization;
}

function periodicFbm(u: number, v: number, seed = 83): number {
  let total = 0;
  let amplitude = 0.58;
  let normalization = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    const frequency = 3 * 2 ** octave;
    total += valueNoise(u * frequency, v * frequency, seed + octave * 23, frequency, frequency) * amplitude;
    normalization += amplitude;
    amplitude *= 0.48;
  }
  return total / normalization;
}

function terrainHeight(x: number, z: number): number {
  const plateau = fractalNoise(x * 0.0032 + 41, z * 0.0032 - 19, 5, 22);
  const rolling = fractalNoise(x * 0.012 + 8, z * 0.012 + 28, 4, 39);
  const grain = fractalNoise(x * 0.055 - 17, z * 0.055 + 12, 3, 61);
  const natural = 2.8 + (plateau - 0.5) * 10.5 + (rolling - 0.5) * 3.1 + (grain - 0.5) * 0.48;
  const stationFootprint = (1 - smoothstep(STATION_PAD_HALF_WIDTH, STATION_PAD_HALF_WIDTH + 35, Math.abs(x)))
    * (1 - smoothstep(STATION_PAD_HALF_LENGTH, STATION_PAD_HALF_LENGTH + 38, Math.abs(z)));
  // Keep the terrain safely below the raised station hardstanding; the prior
  // 2 cm separation was within the depth-buffer precision at the station camera.
  return THREE.MathUtils.lerp(natural, 2.5, stationFootprint);
}

function makeGroundMaps(anisotropy: number): { color: THREE.CanvasTexture; height: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  const heightCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  heightCanvas.width = heightCanvas.height = size;
  roughnessCanvas.width = roughnessCanvas.height = size;

  const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
  const heightContext = heightCanvas.getContext('2d', { willReadFrequently: true });
  const roughnessContext = roughnessCanvas.getContext('2d', { willReadFrequently: true });
  if (!colorContext || !heightContext || !roughnessContext) throw new Error('Could not create procedural terrain textures.');

  const colorImage = colorContext.createImageData(size, size);
  const heightImage = heightContext.createImageData(size, size);
  const roughnessImage = roughnessContext.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const broad = periodicFbm(u, v, 74);
      const medium = valueNoise(u * 36, v * 36, 118, 36, 36);
      const grain = latticeHash(x, y, 205, size, size);
      const rockMask = smoothstep(0.58, 0.78, broad * 0.74 + medium * 0.26);
      const dusty = THREE.MathUtils.clamp(0.76 + broad * 0.25 + medium * 0.12 + (grain - 0.5) * 0.12, 0.62, 1.12);
      const soil = [145, 91, 51];
      const granite = [139, 128, 112];
      const index = (y * size + x) * 4;

      colorImage.data[index] = Math.round(THREE.MathUtils.lerp(soil[0], granite[0], rockMask) * dusty);
      colorImage.data[index + 1] = Math.round(THREE.MathUtils.lerp(soil[1], granite[1], rockMask) * dusty);
      colorImage.data[index + 2] = Math.round(THREE.MathUtils.lerp(soil[2], granite[2], rockMask) * dusty);
      colorImage.data[index + 3] = 255;

      const relief = Math.round(96 + broad * 58 + medium * 60 + grain * 25);
      heightImage.data[index] = relief;
      heightImage.data[index + 1] = relief;
      heightImage.data[index + 2] = relief;
      heightImage.data[index + 3] = 255;

      const roughness = Math.round(205 + medium * 34 + grain * 16);
      roughnessImage.data[index] = roughness;
      roughnessImage.data[index + 1] = roughness;
      roughnessImage.data[index + 2] = roughness;
      roughnessImage.data[index + 3] = 255;
    }
  }

  colorContext.putImageData(colorImage, 0, 0);
  heightContext.putImageData(heightImage, 0, 0);
  roughnessContext.putImageData(roughnessImage, 0, 0);

  const color = new THREE.CanvasTexture(colorCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(3.2, 3.2);
  color.anisotropy = anisotropy;
  color.generateMipmaps = true;
  color.minFilter = THREE.LinearMipmapLinearFilter;

  const height = new THREE.CanvasTexture(heightCanvas);
  height.colorSpace = THREE.NoColorSpace;
  height.wrapS = height.wrapT = THREE.RepeatWrapping;
  height.repeat.copy(color.repeat);
  height.anisotropy = anisotropy;
  height.minFilter = THREE.LinearMipmapLinearFilter;

  const roughness = new THREE.CanvasTexture(roughnessCanvas);
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.copy(color.repeat);
  roughness.anisotropy = anisotropy;
  roughness.minFilter = THREE.LinearMipmapLinearFilter;

  return { color, height, roughness };
}

function makeCloudTexture(): THREE.CanvasTexture {
  const width = 768;
  const height = 384;
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = width;
  canvasTexture.height = height;
  const context = canvasTexture.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create the procedural cloud texture.');

  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const cloudBand = smoothstep(0.28, 0.36, v) * (1 - smoothstep(0.49, 0.58, v));
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const cloudShape = periodicFbm(u, v, 344) * 0.68 + periodicFbm(u + 0.23, v + 0.17, 591) * 0.32;
      const puffy = smoothstep(0.57, 0.75, cloudShape);
      const alpha = Math.round(cloudBand * puffy * 148);
      const index = (y * width + x) * 4;
      image.data[index] = 255;
      image.data[index + 1] = 247;
      image.data[index + 2] = 233;
      image.data[index + 3] = alpha;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function makeMoonTexture(): THREE.CanvasTexture {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = canvasTexture.height = 128;
  const context = canvasTexture.getContext('2d');
  if (!context) throw new Error('Could not create the moon study texture.');
  context.clearRect(0, 0, 128, 128);
  const glow = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  glow.addColorStop(0, '#fffdf5');
  glow.addColorStop(0.78, '#e3e7e8');
  glow.addColorStop(0.94, '#c4d0db');
  glow.addColorStop(1, 'rgba(196, 208, 219, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(64, 64, 62, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(98, 117, 133, 0.2)';
  context.beginPath();
  context.arc(43, 47, 7, 0, Math.PI * 2);
  context.arc(78, 68, 10, 0, Math.PI * 2);
  context.arc(54, 87, 5, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRockGeometry(seed: number): THREE.IcosahedronGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const distortion = 1 + Math.sin(x * 13.7 + y * 8.1 + z * 4.2 + seed) * 0.075 + Math.cos(y * 17.2 - z * 7.8 + seed * 0.7) * 0.045;
    positions.setXYZ(i, x * distortion, y * distortion, z * distortion);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeGrassField(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  let seed = 92741;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const grassColors = [
    new THREE.Color('#8e774c'),
    new THREE.Color('#a18b5a'),
    new THREE.Color('#68704c'),
    new THREE.Color('#777044'),
    new THREE.Color('#b49a61'),
  ];

  const addBlade = (x: number, y: number, z: number, width: number, height: number, angle: number, baseColor: THREE.Color): void => {
    const sideX = Math.cos(angle) * width * 0.5;
    const sideZ = Math.sin(angle) * width * 0.5;
    const bend = (random() - 0.5) * height * 0.35;
    const tipX = x + Math.cos(angle + 1.2) * height * 0.17 + bend;
    const tipZ = z + Math.sin(angle + 1.2) * height * 0.17;
    const tipY = y + height;
    const tipColor = baseColor.clone().lerp(new THREE.Color('#c7ad70'), 0.26);
    const bladePositions = [
      x - sideX, y, z - sideZ,
      x + sideX, y, z + sideZ,
      tipX, tipY, tipZ,
    ];
    positions.push(...bladePositions);
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const mix = vertex === 2 ? tipColor : baseColor;
      colors.push(mix.r, mix.g, mix.b);
    }
  };

  const bladeCount = window.innerWidth < 700 ? 2_400 : 5_400;
  for (let i = 0; i < bladeCount; i += 1) {
    const x = (random() - 0.5) * 540;
    const z = (random() - 0.5) * 820;
    if (isSecunderabadStationSite(x, z, 0.8)) continue;
    const patch = fractalNoise(x * 0.026 + 6, z * 0.026 - 12, 3, 81);
    if (random() > smoothstep(0.32, 0.72, patch) * 0.86) continue;

    const y = terrainHeight(x, z) + 0.015;
    const width = 0.025 + random() * 0.07;
    const height = 0.12 + random() * 0.32;
    const color = grassColors[Math.floor(random() * grassColors.length)];
    const angle = random() * Math.PI * 2;
    addBlade(x, y, z, width, height, angle, color);
    if (random() > 0.35) addBlade(x, y, z, width * 0.78, height * (0.62 + random() * 0.3), angle + Math.PI / 2, color.clone().multiplyScalar(0.88));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addRockField(scene: THREE.Scene, material: THREE.MeshStandardMaterial, seed: number): void {
  const geometry = makeRockGeometry(seed);
  const count = window.innerWidth < 700 ? 78 : 146;
  const rocks = new THREE.InstancedMesh(geometry, material, count);
  rocks.name = 'Deccan granite outcrops';
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const transform = new THREE.Object3D();
  let randomState = seed * 997;
  const random = (): number => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };

  const graniteTones = [
    new THREE.Color('#9b8a79'),
    new THREE.Color('#77776f'),
    new THREE.Color('#ad8a78'),
    new THREE.Color('#918e84'),
  ];

  for (let i = 0; i < count; i += 1) {
    const x = (random() - 0.5) * 860;
    const z = (random() - 0.5) * 1_020;
    const size = 0.42 + random() ** 2 * (z > 90 ? 3.8 : 2.65);
    if (isSecunderabadStationSite(x, z, size + 1.5)) continue;
    const sx = size * (0.72 + random() * 0.66);
    const sy = size * (0.36 + random() * 0.45);
    const sz = size * (0.7 + random() * 0.7);
    const y = terrainHeight(x, z);

    transform.position.set(x, y + sy * 0.18, z);
    transform.rotation.set((random() - 0.5) * 0.22, random() * Math.PI * 2, (random() - 0.5) * 0.2);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
    rocks.setColorAt(i, graniteTones[Math.floor(random() * graniteTones.length)].clone().multiplyScalar(0.83 + random() * 0.24));
  }
  rocks.computeBoundingSphere();
  scene.add(rocks);
}

function addScrub(scene: THREE.Scene): void {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: '#68704d',
    roughness: 1,
    flatShading: true,
  });
  const count = window.innerWidth < 700 ? 48 : 88;
  const scrub = new THREE.InstancedMesh(geometry, material, count);
  scrub.name = 'Sparse plateau scrub';
  scrub.castShadow = true;
  scrub.receiveShadow = true;

  const transform = new THREE.Object3D();
  let state = 72341;
  const random = (): number => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 4294967296;
  };
  const shades = [new THREE.Color('#64734d'), new THREE.Color('#77764c'), new THREE.Color('#858057'), new THREE.Color('#59694d')];

  for (let i = 0; i < count; i += 1) {
    const x = (random() - 0.5) * 680;
    const z = (random() - 0.5) * 920;
    const scale = 0.28 + random() * (z > 70 ? 1.4 : 0.82);
    if (isSecunderabadStationSite(x, z, scale + 0.7)) continue;
    transform.position.set(x, terrainHeight(x, z) + scale * 0.22, z);
    transform.rotation.set(random() * 0.25, random() * Math.PI * 2, random() * 0.25);
    transform.scale.set(scale * (0.75 + random() * 0.55), scale * (0.5 + random() * 0.4), scale * (0.8 + random() * 0.5));
    transform.updateMatrix();
    scrub.setMatrixAt(i, transform.matrix);
    scrub.setColorAt(i, shades[Math.floor(random() * shades.length)].clone().multiplyScalar(0.84 + random() * 0.3));
  }
  scrub.computeBoundingSphere();
  scene.add(scrub);
}

function createCabViewOverlay(): THREE.Group {
  const cab = new THREE.Group();
  cab.name = 'Vande Bharat driver-cab camera surround — schematic interior overlay';
  cab.userData.caveat = 'Generic control desk and windscreen frame; no 20102 cab drawing or interior reference was inspected.';
  const frameMaterial = new THREE.MeshBasicMaterial({ color: '#283536' });
  const consoleMaterial = new THREE.MeshBasicMaterial({ color: '#252f31' });
  const trimMaterial = new THREE.MeshBasicMaterial({ color: '#aaa78f' });
  const displayMaterial = new THREE.MeshBasicMaterial({ color: '#77b7ac' });
  const glassMaterial = new THREE.MeshBasicMaterial({
    color: '#9bb1b5',
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 1.78), glassMaterial);
  glass.name = 'Cab windscreen — translucent study';
  glass.position.set(0, 0.58, -2.35);
  glass.renderOrder = 3;
  cab.add(glass);

  const framePieces = [
    { position: [-1.72, 0.58, -2.3], size: [0.14, 1.92, 0.16] },
    { position: [1.72, 0.58, -2.3], size: [0.14, 1.92, 0.16] },
    { position: [0, 1.53, -2.3], size: [3.55, 0.14, 0.16] },
    { position: [0, -0.34, -2.3], size: [3.55, 0.18, 0.2] },
    { position: [0, 0.58, -2.28], size: [0.07, 1.75, 0.13] },
  ];
  for (const piece of framePieces) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...piece.size as [number, number, number]), frameMaterial);
    mesh.position.set(...piece.position as [number, number, number]);
    mesh.name = 'Cab window structural frame';
    cab.add(mesh);
  }

  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.5, 0.82), consoleMaterial);
  dashboard.name = 'Driver control desk — schematic';
  dashboard.position.set(0, -0.82, -1.48);
  cab.add(dashboard);
  const instrumentShelf = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 0.52), trimMaterial);
  instrumentShelf.name = 'Instrument panel trim';
  instrumentShelf.position.set(0, -0.55, -1.78);
  cab.add(instrumentShelf);

  for (const x of [-0.68, 0.68]) {
    const display = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.05), displayMaterial);
    display.name = 'Cab display — generic illuminated panel';
    display.position.set(x, -0.42, -1.88);
    cab.add(display);
  }
  const deskEdge = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.11, 0.88), trimMaterial);
  deskEdge.name = 'Driver desk edge';
  deskEdge.position.set(0, -1.09, -1.46);
  cab.add(deskEdge);

  const makeCabLever = (label: string, x: number, color: string): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.name = `Cab ${label.toLowerCase()} lever pivot`;
    pivot.position.set(x, -0.53, -1.53);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.08, 0.26), frameMaterial);
    base.position.y = -0.02;
    pivot.add(base);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.38, 8), trimMaterial);
    shaft.position.y = 0.21;
    pivot.add(shaft);
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), new THREE.MeshBasicMaterial({ color }));
    grip.name = `${label} control grip`;
    grip.position.y = 0.42;
    pivot.add(grip);
    cab.add(pivot);
    return pivot;
  };
  const throttleLever = makeCabLever('Throttle', -1.22, '#d6a354');
  const brakeLever = makeCabLever('Brake', 1.22, '#bd705b');
  cab.userData.throttleLever = throttleLever;
  cab.userData.brakeLever = brakeLever;
  return cab;
}

function boot(): void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
  } catch (error) {
    console.error('WebGL renderer could not be created.', error);
    fallback.hidden = false;
    loadingScreen.classList.add('is-hidden');
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Static shadow maps are refreshed only when the sun, build state, or train moves.
  renderer.shadowMap.autoUpdate = false;
  const desktopPixelRatio = 1.65;
  const mobilePixelRatio = 1.25;
  const maxPixelRatio = window.innerWidth < 700 ? mobilePixelRatio : desktopPixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const sky = new Sky();
  sky.name = 'Physical sky';
  sky.scale.setScalar(3_500);
  sky.renderOrder = 0;
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 3.5;
  skyUniforms['rayleigh'].value = 2.15;
  skyUniforms['mieCoefficient'].value = 0.0045;
  skyUniforms['mieDirectionalG'].value = 0.82;

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(3_420, 48, 24),
    new THREE.MeshBasicMaterial({
      map: makeCloudTexture(),
      color: '#fff5e8',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false,
    }),
  );
  clouds.name = 'Soft procedural high clouds';
  clouds.renderOrder = 1;
  scene.add(clouds);

  const starPositions: number[] = [];
  const starColors: number[] = [];
  let starSeed = 31_407;
  const starRandom = (): number => {
    starSeed = (Math.imul(starSeed, 1_664_525) + 1_013_904_223) >>> 0;
    return starSeed / 4_294_967_296;
  };
  for (let index = 0; index < 300; index += 1) {
    const azimuth = starRandom() * Math.PI * 2;
    const vertical = 0.08 + starRandom() * 0.92;
    const horizontal = Math.sqrt(1 - vertical * vertical);
    const radius = 2_100;
    starPositions.push(Math.cos(azimuth) * horizontal * radius, vertical * radius, Math.sin(azimuth) * horizontal * radius);
    const temperature = starRandom();
    starColors.push(0.7 + temperature * 0.3, 0.78 + temperature * 0.2, 0.9 + temperature * 0.1);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: '#ffffff',
    size: 2.1,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'Faint Deccan night-sky star field';
  stars.frustumCulled = false;
  stars.renderOrder = 3;
  stars.visible = false;
  scene.add(stars);

  const moonMaterial = new THREE.SpriteMaterial({
    map: makeMoonTexture(),
    color: '#e4edf7',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.name = 'Moon — illustrative night-sky cue';
  moon.scale.set(22, 22, 1);
  moon.renderOrder = 3;
  moon.visible = false;
  scene.add(moon);
  const moonlight = new THREE.DirectionalLight('#aec9e8', 0);
  moonlight.name = 'Cool moonlight fill — artistic, not photometric';
  moonlight.castShadow = false;
  scene.add(moonlight);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 5_000);
  camera.position.set(174, 165, 420);
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 13, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = true;
  controls.panSpeed = 0.48;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 24;
  controls.maxDistance = 1_200;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.52;
  controls.update();

  const hemisphere = new THREE.HemisphereLight('#dce8ef', '#9d7952', 1.25);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight('#ffe2b2', 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2_048, 2_048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 720;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2;
  scene.add(sun);

  // The larger urban horizon falls away gradually so roads and Metro massing
  // do not stop at the previous terrain edge. Fog is visual depth, not a
  // performance shortcut or a claim about local atmospheric measurements.
  scene.fog = new THREE.Fog('#c7b18f', 520, 1_750);

  const terrainSize = 3_600;
  const terrainSegments = window.innerWidth < 700 ? 220 : 320;
  const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrainPositions = terrainGeometry.attributes.position;
  const terrainColors: number[] = [];
  const tint = new THREE.Color();
  for (let i = 0; i < terrainPositions.count; i += 1) {
    const x = terrainPositions.getX(i);
    const z = terrainPositions.getZ(i);
    terrainPositions.setY(i, terrainHeight(x, z));
    const variation = 0.83 + fractalNoise(x * 0.02, z * 0.02, 3, 311) * 0.28;
    const stone = smoothstep(0.66, 0.84, fractalNoise(x * 0.013 - 4, z * 0.013 + 7, 4, 261)) * 0.16;
    tint.setRGB(variation, variation * (1 - stone * 0.08), variation * (1 - stone * 0.15));
    terrainColors.push(tint.r, tint.g, tint.b);
  }
  terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
  terrainGeometry.computeVertexNormals();
  terrainGeometry.computeBoundingSphere();

  const maps = makeGroundMaps(renderer.capabilities.getMaxAnisotropy());
  const terrainMaterial = new THREE.MeshStandardMaterial({
    map: maps.color,
    bumpMap: maps.height,
    bumpScale: 0.085,
    roughnessMap: maps.roughness,
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.name = 'Deccan plateau context outside the schematic station boundary';
  terrain.receiveShadow = true;
  scene.add(terrain);

  const yard = createSecunderabadYard(terrainHeight);
  yard.future.visible = false;
  scene.add(yard.common, yard.current, yard.future);
  let activeStationView: SecunderabadView = 'current';

  const train = createVandeBharat20102();
  scene.add(train);
  const cabOverlay = createCabViewOverlay();
  cabOverlay.visible = false;
  camera.add(cabOverlay);
  const throttleLever = cabOverlay.userData.throttleLever as THREE.Group;
  const brakeLever = cabOverlay.userData.brakeLever as THREE.Group;
  const trainStartPositionZ = train.position.z;
  const trainHalfLength = VANDE_BHARAT_20102.coachCount * VANDE_BHARAT_20102.coachLengthMeters / 2;
  const maxTrainCenterZ = SECUNDERABAD_LAYOUT.trackLength / 2 - trainHalfLength;
  const maxSpeedMetersPerSecond = 60 / 3.6;
  const driving = { throttle: 0, brake: 0, speedMetersPerSecond: 0, atTrackEnd: false };
  let emergencyBrakeHeld = false;
  let brakeBeforeEmergency = 0;
  type CameraView = 'station' | 'exterior' | 'cab';
  let activeCameraView: CameraView = 'station';

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: '#aaa092',
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
  });
  addRockField(scene, rockMaterial, 391);
  addScrub(scene);

  const grassGeometry = makeGrassField();
  const grassMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const grass = new THREE.Mesh(grassGeometry, grassMaterial);
  grass.name = 'Merged dry-grass and scrub field';
  grass.frustumCulled = true;
  scene.add(grass);

  const initialCamera = camera.position.clone();
  const initialTarget = controls.target.clone();
  function setCameraView(view: CameraView): void {
    activeCameraView = view;
    train.visible = view !== 'cab';
    cabOverlay.visible = view === 'cab';
    drivePanel.hidden = view === 'station';
    app.classList.toggle('has-drive-controls', view !== 'station');
    controls.enabled = true;

    if (view === 'station') {
      camera.position.copy(initialCamera);
      controls.target.copy(initialTarget);
    } else if (view === 'exterior') {
      camera.position.set(train.position.x + 195, train.position.y + 83, train.position.z + 128);
      controls.target.set(train.position.x, train.position.y + 2.3, train.position.z);
    } else {
      const cabPositionZ = train.position.z + VANDE_BHARAT_20102.coachLengthMeters * 3.5 + 7.1;
      camera.position.set(train.position.x, train.position.y + 2.72, cabPositionZ);
      controls.target.set(train.position.x, train.position.y + 2.72, cabPositionZ + 64);
    }
    controls.update();
    if (view === 'cab') controls.enabled = false;

    for (const button of cameraViewButtons) {
      const selected = button.dataset.cameraView === view;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    }
    setTimeOfDay(Number(timeSlider.value));
    updateDriveReadout();
  }

  function updateDriveReadout(): void {
    const speedKmh = Math.round(driving.speedMetersPerSecond * 3.6);
    const status = driving.atTrackEnd
      ? 'END OF TRACK'
      : speedKmh > 0
        ? driving.brake > 0 ? 'BRAKING' : driving.throttle > 0 ? 'POWER ON' : 'COASTING'
        : driving.brake > 0 ? 'BRAKE SET' : driving.throttle > 0 ? 'READY' : 'STOPPED';
    if (trainSpeedValue.textContent !== String(speedKmh)) trainSpeedValue.textContent = String(speedKmh);
    if (driveStatus.textContent !== status) driveStatus.textContent = status;
    train.userData.speedKmh = speedKmh;
    train.userData.throttlePercent = driving.throttle;
    train.userData.brakePercent = driving.brake;
  }

  function setThrottle(value: number): void {
    const stepped = driving.atTrackEnd ? 0 : Math.round(THREE.MathUtils.clamp(value, 0, 100) / 5) * 5;
    driving.throttle = stepped;
    throttleControl.value = String(stepped);
    throttleOutput.textContent = `${stepped}%`;
    throttleControl.setAttribute('aria-valuetext', `${stepped}% power`);
    throttleLever.rotation.z = THREE.MathUtils.lerp(-0.32, 0.32, stepped / 100);
    updateDriveReadout();
    requestRender();
  }

  function setBrake(value: number): void {
    const stepped = Math.round(THREE.MathUtils.clamp(value, 0, 100) / 5) * 5;
    driving.brake = stepped;
    brakeControl.value = String(stepped);
    brakeOutput.textContent = `${stepped}%`;
    brakeControl.setAttribute('aria-valuetext', `${stepped}% brake`);
    brakeLever.rotation.z = THREE.MathUtils.lerp(-0.32, 0.32, stepped / 100);
    updateDriveReadout();
    requestRender();
  }

  function resetDrivingState(): void {
    driving.atTrackEnd = false;
    driving.speedMetersPerSecond = 0;
    train.position.z = trainStartPositionZ;
    sun.shadow.needsUpdate = true;
    requestRender();
    setThrottle(0);
    setBrake(0);
    if (activeCameraView !== 'station') setCameraView(activeCameraView);
    else updateDriveReadout();
  }

  const fogColor = new THREE.Color();
  const dayFog = new THREE.Color('#c8b48f');
  const duskFog = new THREE.Color('#9a7772');
  const nightFog = new THREE.Color('#26394a');
  const warmSun = new THREE.Color('#f2a56e');
  const daylightSun = new THREE.Color('#ffdda8');
  const dayHemisphereSky = new THREE.Color('#dce8ef');
  const nightHemisphereSky = new THREE.Color('#687d98');
  const dayHemisphereGround = new THREE.Color('#9d7952');
  const nightHemisphereGround = new THREE.Color('#393e4b');
  const cloudWhite = new THREE.Color('#fff9f0');
  const sunDirection = new THREE.Vector3();
  let nightFactor = 0;
  let framePending = false;
  let renderTimeout: number | undefined;
  let lastFrameTimestamp = 0;
  let renderFrame: (timestamp: number) => void = () => undefined;

  function requestRender(delayMs = 0): void {
    if (document.visibilityState === 'hidden') return;
    if (framePending) {
      if (delayMs > 0 || renderTimeout === undefined) return;
      window.clearTimeout(renderTimeout);
      renderTimeout = undefined;
      framePending = false;
    }
    framePending = true;
    const scheduleFrame = (): void => {
      renderTimeout = undefined;
      window.requestAnimationFrame((timestamp) => renderFrame(timestamp));
    };
    if (delayMs > 0) renderTimeout = window.setTimeout(scheduleFrame, delayMs);
    else scheduleFrame();
  }

  controls.addEventListener('change', () => requestRender());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastFrameTimestamp = 0;
      requestRender();
    }
  });

  function setTimeOfDay(rawHour: number): void {
    const hour = THREE.MathUtils.clamp(rawHour, 13, 20);
    const phase = (hour - 6) / 12;
    const elevationDegrees = 63 * Math.sin(phase * Math.PI);
    const azimuthDegrees = 315 + (hour - 13) * 10;
    const phi = THREE.MathUtils.degToRad(90 - elevationDegrees);
    const theta = THREE.MathUtils.degToRad(azimuthDegrees);
    sunDirection.setFromSphericalCoords(1, phi, theta).normalize();

    skyUniforms['sunPosition'].value.copy(sunDirection);
    skyUniforms['turbidity'].value = 3.2 + (1 - smoothstep(-4, 48, elevationDegrees)) * 3.8;
    sun.position.copy(sunDirection).multiplyScalar(150);
    const daylight = smoothstep(-5, 23, elevationDegrees);
    nightFactor = smoothstep(17.7, 19.35, hour);
    sun.intensity = 0.045 + daylight * 2.75;
    sun.color.copy(warmSun).lerp(daylightSun, smoothstep(6, 48, elevationDegrees));
    hemisphere.intensity = 0.3 + daylight * 0.92;
    hemisphere.color.copy(nightHemisphereSky).lerp(dayHemisphereSky, 1 - nightFactor);
    hemisphere.groundColor.copy(nightHemisphereGround).lerp(dayHemisphereGround, 1 - nightFactor);
    clouds.material.color.copy(warmSun).lerp(cloudWhite, daylight);
    clouds.material.opacity = 0.05 + daylight * 0.31;

    moonlight.position.copy(sunDirection).negate().multiplyScalar(150);
    moonlight.intensity = nightFactor * 0.16;
    moonlight.visible = nightFactor > 0.02;
    stars.visible = nightFactor > 0.02;
    starMaterial.opacity = nightFactor * 0.88;
    moon.visible = nightFactor > 0.06;
    moonMaterial.opacity = nightFactor * 0.94;
    yard.night.lightGroup.visible = nightFactor > 0.02;
    for (const light of yard.night.floodLights) light.intensity = nightFactor * 6_000;
    yard.night.poolMaterial.opacity = nightFactor * 0.58;
    yard.night.lampMaterial.emissiveIntensity = 0.08 + nightFactor * 2.2;
    yard.night.windowMaterial.emissiveIntensity = nightFactor * 0.68;
    yard.night.displayMaterial.emissiveIntensity = 0.12 + nightFactor * 0.82;
    yard.night.streetLampMaterial.emissiveIntensity = nightFactor * 1.15;
    yard.night.updateStationClock(hour);
    sun.shadow.needsUpdate = true;

    if (elevationDegrees > 22) fogColor.copy(dayFog);
    else if (elevationDegrees > -2) fogColor.copy(duskFog).lerp(dayFog, smoothstep(-2, 22, elevationDegrees));
    else fogColor.copy(nightFog).lerp(duskFog, smoothstep(-30, -2, elevationDegrees));
    (scene.fog as THREE.Fog).color.copy(fogColor);

    const hours = Math.floor(hour);
    const minutes = Math.round((hour - hours) * 60);
    timeReadout.textContent = `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const lightPhase = hour < 17.2 ? 'HIGH AFTERNOON' : hour < 18.6 ? 'EVENING LIGHT' : hour < 19.35 ? 'DUSK LIGHT' : 'NIGHT STUDY';
    const stateCaption = activeStationView === 'current'
      ? 'CURRENT · WORKS ILLUSTRATIVE'
      : 'PLANNED · NO VERIFIED YARD CHANGE';
    const cameraCaption = activeCameraView === 'cab' ? 'CAB · DRIVE STUDY' : activeCameraView === 'exterior' ? '20102 · EXTERIOR' : 'STATION VIEW';
    sceneCaption.textContent = `${stateCaption} · ${cameraCaption} · ${lightPhase} · ${timeReadout.textContent}`;
    requestRender();
  }

  function setStationView(view: SecunderabadView): void {
    activeStationView = view;
    yard.current.visible = view === 'current';
    yard.future.visible = view === 'future';
    for (const button of stationViewButtons) {
      const selected = button.dataset.stationView === view;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    }
    if (view === 'current') {
      stationStateTitle.textContent = 'CURRENT · REDEVELOPMENT WORKS REPORTED';
      stationStateDetail.textContent = 'Reported scope includes G+3 north/south terminal buildings and a two-level concourse. Metro skywalk construction is reported, but its route is not drawn without a verified plan. Platform amenities, forecourt access, building footprints, partial cladding and cardinal placement are illustrative. The 10-platform / 11-road sequence, 11.4 m spacing and 640 m extent are assumptions; OHE supports are not a station drawing.';
    } else {
      stationStateTitle.textContent = 'PLANNED · POST-REDEVELOPMENT STUDY';
      stationStateDetail.textContent = 'Conceptual G+3 terminals, air-concourse links and through-roof are massing only; representative lift/escalator cores and generic Metro/Bus panels are illustrative, not exact placements. Reported skywalk work is not drawn without an inspectable alignment. The same schematic track group is carried forward as “no verified yard change.” The drive study has no route, signals or station stops.';
    }
    setTimeOfDay(Number(timeSlider.value));
  }

  setTimeOfDay(Number(timeSlider.value));
  timeSlider.addEventListener('input', () => setTimeOfDay(Number(timeSlider.value)));
  for (const button of stationViewButtons) {
    button.addEventListener('click', () => {
      const view = button.dataset.stationView;
      if (view === 'current' || view === 'future') setStationView(view);
    });
  }
  setStationView('current');
  setCameraView('station');

  function resetCamera(): void {
    setCameraView('station');
  }
  resetButton.addEventListener('click', resetCamera);
  for (const button of cameraViewButtons) {
    button.addEventListener('click', () => {
      const view = button.dataset.cameraView;
      if (view === 'station' || view === 'exterior' || view === 'cab') setCameraView(view);
    });
  }

  throttleControl.addEventListener('input', () => setThrottle(Number(throttleControl.value)));
  brakeControl.addEventListener('input', () => setBrake(Number(brakeControl.value)));
  resetTrainButton.addEventListener('click', resetDrivingState);
  setThrottle(0);
  setBrake(0);

  function releaseEmergencyBrake(): void {
    if (!emergencyBrakeHeld) return;
    emergencyBrakeHeld = false;
    setBrake(brakeBeforeEmergency);
  }

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (activeCameraView === 'station') return;
    const target = event.target;
    const isRangeInput = target instanceof HTMLInputElement && target.type === 'range';
    const isInteractive = target instanceof HTMLElement
      && (target.isContentEditable
        || target instanceof HTMLButtonElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLInputElement && !isRangeInput));
    if (isInteractive || (isRangeInput && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat && !emergencyBrakeHeld) {
        emergencyBrakeHeld = true;
        brakeBeforeEmergency = driving.brake;
        setBrake(100);
      }
      return;
    }
    if (event.repeat) return;

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        event.preventDefault();
        setThrottle(driving.throttle + 10);
        break;
      case 's':
      case 'arrowdown':
        event.preventDefault();
        setThrottle(driving.throttle - 10);
        break;
      case '[':
        event.preventDefault();
        setBrake(driving.brake - 10);
        break;
      case ']':
        event.preventDefault();
        setBrake(driving.brake + 10);
        break;
      default:
        break;
    }
  });
  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.code === 'Space') releaseEmergencyBrake();
  });
  window.addEventListener('blur', releaseEmergencyBrake);
  document.addEventListener('visibilitychange', () => {
    lastFrameTimestamp = 0;
    if (document.visibilityState === 'hidden') releaseEmergencyBrake();
    else requestRender();
  });

  let guestSession: GuestSessionTracker | null = null;

  function toggleFocus(): void {
    const focused = app.classList.toggle('is-focused');
    focusToggle.setAttribute('aria-pressed', String(focused));
    focusToggle.innerHTML = focused
      ? 'SHOW FIELD NOTES <span aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M12 4 4 12M11 12H4V5" /></svg></span>'
      : 'FOCUS VIEW <span aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 12 12 4M5 4h7v7" /></svg></span>';
  }

  function startGuestPlay(): void {
    if (!guestSession) {
      try {
        guestSession = startGuestSession();
        guestStatusLabel.textContent = guestSession.persistent
          ? 'GUEST · SAVED IN THIS BROWSER'
          : 'GUEST · THIS VISIT ONLY';
      } catch (error) {
        console.warn('Guest progress could not be started; continuing for this visit only.', error);
        guestStatusLabel.textContent = 'GUEST · THIS VISIT ONLY';
      }
      guestStatus.hidden = false;
    }

    if (!app.classList.contains('is-focused')) toggleFocus();
    setCameraView('exterior');
  }

  focusToggle.addEventListener('click', toggleFocus);
  playNowButton.addEventListener('click', startGuestPlay);

  function resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const pixelRatioLimit = width < 700 ? mobilePixelRatio : desktopPixelRatio;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
    renderer.setSize(width, height, false);
    requestRender();
  }
  window.addEventListener('resize', resize, { passive: true });

  const previousCameraPosition = new THREE.Vector3();
  const previousControlTarget = new THREE.Vector3();
  renderFrame = (timestamp: number): void => {
    framePending = false;
    if (document.visibilityState === 'hidden') {
      lastFrameTimestamp = 0;
      return;
    }

    const frameDelta = lastFrameTimestamp === 0 ? 0 : Math.max(0, (timestamp - lastFrameTimestamp) / 1_000);
    const delta = Math.min(frameDelta, 0.05);
    lastFrameTimestamp = timestamp;
    const ambientTrafficActive = yard.updateAmbientTraffic(Math.min(frameDelta, 0.2));
    previousCameraPosition.copy(camera.position);
    previousControlTarget.copy(controls.target);

    if (delta > 0) {
      const previousSpeed = driving.speedMetersPerSecond;
      const traction = (driving.throttle / 100) * 0.55;
      const braking = (driving.brake / 100) * (1.65 + previousSpeed * 0.03);
      const rollingResistance = previousSpeed > 0 ? 0.025 + previousSpeed * 0.003 : 0;
      const acceleration = traction - braking - rollingResistance;
      driving.speedMetersPerSecond = THREE.MathUtils.clamp(
        previousSpeed + acceleration * delta,
        0,
        maxSpeedMetersPerSecond,
      );

      const distance = (previousSpeed + driving.speedMetersPerSecond) * 0.5 * delta;
      const remaining = Math.max(0, maxTrainCenterZ - train.position.z);
      const travelled = Math.min(distance, remaining);
      train.position.z += travelled;
      if (travelled > 0) sun.shadow.needsUpdate = true;
      if (remaining <= distance && !driving.atTrackEnd) {
        driving.atTrackEnd = true;
        driving.speedMetersPerSecond = 0;
        setThrottle(0);
      }
      if (travelled > 0 && activeCameraView !== 'station') {
        camera.position.z += travelled;
        controls.target.z += travelled;
      }
      updateDriveReadout();
    }

    controls.update();
    const controlsStillSettling = camera.position.distanceToSquared(previousCameraPosition) > 1e-10
      || controls.target.distanceToSquared(previousControlTarget) > 1e-10;
    stars.position.copy(camera.position);
    moon.position.copy(camera.position).addScaledVector(sunDirection, -1_800);
    renderer.render(scene, camera);
    if (!loadingScreen.classList.contains('is-hidden')) loadingScreen.classList.add('is-hidden');

    if (controlsStillSettling || driving.throttle > 0 || driving.speedMetersPerSecond > 0.0001) requestRender();
    else if (ambientTrafficActive) requestRender(85);
  };
  requestRender();
}

boot();
