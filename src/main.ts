import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
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
const focusToggle = byId<HTMLButtonElement>('focus-toggle');
const exploreButton = byId<HTMLButtonElement>('explore-button');
const resetButton = byId<HTMLButtonElement>('reset-view');

const modulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

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
  return 2.8 + (plateau - 0.5) * 10.5 + (rolling - 0.5) * 3.1 + (grain - 0.5) * 0.48;
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
    const x = (random() - 0.5) * 310;
    const z = (random() - 0.5) * 300;
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
    const x = (random() - 0.5) * 430;
    const z = (random() - 0.5) * 390;
    const size = 0.42 + random() ** 2 * (z > 90 ? 3.8 : 2.65);
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
    const x = (random() - 0.5) * 340;
    const z = (random() - 0.5) * 310;
    const scale = 0.28 + random() * (z > 70 ? 1.4 : 0.82);
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

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 5_000);
  camera.position.set(0, 13, 53);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3.8, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = true;
  controls.panSpeed = 0.48;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 16;
  controls.maxDistance = 106;
  controls.minPolarAngle = 0.34;
  controls.maxPolarAngle = 1.52;
  controls.update();

  const hemisphere = new THREE.HemisphereLight('#dce8ef', '#9d7952', 1.25);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight('#ffe2b2', 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1_024, 1_024);
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);

  scene.fog = new THREE.Fog('#c7b18f', 150, 590);

  const terrainSize = 620;
  const terrainSegments = window.innerWidth < 700 ? 112 : 164;
  const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrainPositions = terrainGeometry.attributes.position;
  const terrainColors: number[] = [];
  const tint = new THREE.Color();
  for (let i = 0; i < terrainPositions.count; i += 1) {
    const x = terrainPositions.getX(i);
    const z = terrainPositions.getZ(i);
    const elevation = terrainHeight(x, z);
    terrainPositions.setY(i, elevation);
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
  terrain.name = 'Procedural Deccan plateau ground';
  terrain.receiveShadow = true;
  scene.add(terrain);

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
  const fogColor = new THREE.Color();
  const dayFog = new THREE.Color('#c8b48f');
  const duskFog = new THREE.Color('#9a7772');
  const nightFog = new THREE.Color('#26394a');
  const warmSun = new THREE.Color('#f2a56e');
  const daylightSun = new THREE.Color('#fff1d1');
  const sunDirection = new THREE.Vector3();

  function setTimeOfDay(rawHour: number): void {
    const hour = THREE.MathUtils.clamp(rawHour, 13, 20);
    const phase = (hour - 6) / 12;
    const elevationDegrees = 63 * Math.sin(phase * Math.PI);
    const azimuthDegrees = 184 + (hour - 13) * 15;
    const phi = THREE.MathUtils.degToRad(90 - elevationDegrees);
    const theta = THREE.MathUtils.degToRad(azimuthDegrees);
    sunDirection.setFromSphericalCoords(1, phi, theta).normalize();

    skyUniforms['sunPosition'].value.copy(sunDirection);
    skyUniforms['turbidity'].value = 3.2 + (1 - smoothstep(-4, 48, elevationDegrees)) * 3.8;
    sun.position.copy(sunDirection).multiplyScalar(150);
    const daylight = smoothstep(-5, 23, elevationDegrees);
    sun.intensity = 0.12 + daylight * 2.65;
    sun.color.copy(warmSun).lerp(daylightSun, smoothstep(6, 48, elevationDegrees));
    hemisphere.intensity = 0.22 + daylight * 1.06;
    clouds.material.color.copy(warmSun).lerp(new THREE.Color('#fff9f0'), daylight);
    clouds.material.opacity = 0.18 + daylight * 0.28;

    if (elevationDegrees > 22) fogColor.copy(dayFog);
    else if (elevationDegrees > -2) fogColor.copy(duskFog).lerp(dayFog, smoothstep(-2, 22, elevationDegrees));
    else fogColor.copy(nightFog).lerp(duskFog, smoothstep(-30, -2, elevationDegrees));
    (scene.fog as THREE.Fog).color.copy(fogColor);

    const hours = Math.floor(hour);
    const minutes = Math.round((hour - hours) * 60);
    timeReadout.textContent = `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    if (hour < 17.2) sceneCaption.textContent = `${timeReadout.textContent} · HIGH AFTERNOON LIGHT STUDY`;
    else if (hour < 18.6) sceneCaption.textContent = `${timeReadout.textContent} · WARMING EVENING LIGHT`;
    else sceneCaption.textContent = `${timeReadout.textContent} · DUSK LIGHT STUDY`;
  }

  setTimeOfDay(Number(timeSlider.value));
  timeSlider.addEventListener('input', () => setTimeOfDay(Number(timeSlider.value)));

  function resetCamera(): void {
    camera.position.copy(initialCamera);
    controls.target.copy(initialTarget);
    controls.update();
  }
  resetButton.addEventListener('click', resetCamera);

  function toggleFocus(): void {
    const focused = app.classList.toggle('is-focused');
    focusToggle.setAttribute('aria-pressed', String(focused));
    focusToggle.innerHTML = focused ? 'SHOW FIELD NOTES <span aria-hidden="true">↙</span>' : 'FOCUS VIEW <span aria-hidden="true">↗</span>';
  }
  focusToggle.addEventListener('click', toggleFocus);
  exploreButton.addEventListener('click', toggleFocus);

  function resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const pixelRatioLimit = width < 700 ? mobilePixelRatio : desktopPixelRatio;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize, { passive: true });

  const clock = new THREE.Clock();
  function animate(): void {
    const delta = Math.min(clock.getDelta(), 0.05);
    // Damping gives the camera a small amount of momentum without an always-running scene animation.
    if (delta > 0) controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }
  animate();

  window.setTimeout(() => loadingScreen.classList.add('is-hidden'), 360);
}

boot();
