import * as THREE from 'three';
import { createSecunderabadBuildings } from './secunderabad-buildings';
import { createSecunderabadSurroundings } from './secunderabad-surroundings';

export type SecunderabadView = 'current' | 'future';

/**
 * Best-evidence, explicitly schematic station-platform study.
 *
 * Evidence-backed counts: 10 platforms; 11 tracks is reported by a Ministry-
 * sourced 2024 update. A secondary layout description puts an MMTS/service road
 * between platforms 7 and 8. No station Working Rule drawing was available, so
 * the platform-to-road pairing, straight track group, and omitted throat are not
 * claimed to be an as-built yard plan.
 */
export const SECUNDERABAD_LAYOUT = {
  platformCount: 10,
  trackCount: 11,
  trackGauge: 1.676,
  trackSpacing: 11.4,
  platformEdgeOffset: 1.67,
  platformLength: 640,
  trackLength: 680,
  sleeperSpacing: 0.6024,
  sleeperLength: 2.75,
  ballastDepth: 0.3,
  railHeight: 0.172,
  platformHeightAboveRail: 0.8,
  serviceTrackIndex: 7,
  sitePadWidth: 290,
  sitePadLength: 735,
  platformPairing: 'schematic-island-sequence',
  trackThroats: 'omitted',
} as const;

const TRACK_MIN_Z = -SECUNDERABAD_LAYOUT.trackLength / 2;
const TRACK_MAX_Z = SECUNDERABAD_LAYOUT.trackLength / 2;
const TRACK_SPAN_X = SECUNDERABAD_LAYOUT.trackSpacing * (SECUNDERABAD_LAYOUT.trackCount - 1);
const TRACK_CENTERS = Array.from(
  { length: SECUNDERABAD_LAYOUT.trackCount },
  (_, index) => (index - (SECUNDERABAD_LAYOUT.trackCount - 1) / 2) * SECUNDERABAD_LAYOUT.trackSpacing,
);
const PLATFORM_CENTERS = Array.from(
  { length: SECUNDERABAD_LAYOUT.platformCount },
  (_, index) => ((TRACK_CENTERS[index] ?? 0) + (TRACK_CENTERS[index + 1] ?? 0)) / 2,
);
const PLATFORM_WIDTH = SECUNDERABAD_LAYOUT.trackSpacing - SECUNDERABAD_LAYOUT.platformEdgeOffset * 2;
const STATION_BASE_Y = 2.8;
const SLEEPER_TOP_Y = SECUNDERABAD_LAYOUT.ballastDepth + 0.22;
const RAIL_TOP_Y = SLEEPER_TOP_Y + SECUNDERABAD_LAYOUT.railHeight;
const PLATFORM_TOP_Y = RAIL_TOP_Y + SECUNDERABAD_LAYOUT.platformHeightAboveRail;
export const SECUNDERABAD_RAIL_TOP_Y = STATION_BASE_Y + RAIL_TOP_Y;
export function getSecunderabadTrackCenter(trackIndex: number): number {
  return TRACK_CENTERS[trackIndex] ?? 0;
}
const GAUGE_HALF = SECUNDERABAD_LAYOUT.trackGauge / 2;

type Transform = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  color?: THREE.ColorRepresentation;
};

type Segment = { start: THREE.Vector3; end: THREE.Vector3 };

/** Keep the station site free of procedural scrub and rocks. */
export function isSecunderabadStationSite(x: number, z: number, margin = 0): boolean {
  return Math.abs(x) <= SECUNDERABAD_LAYOUT.sitePadWidth / 2 + margin
    && Math.abs(z) <= SECUNDERABAD_LAYOUT.sitePadLength / 2 + margin;
}

function addBoxInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BoxGeometry,
  material: THREE.Material,
  transforms: readonly Transform[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < transforms.length; index += 1) {
    const transform = transforms[index];
    dummy.position.copy(transform.position);
    dummy.scale.copy(transform.scale);
    dummy.rotation.set(transform.rotationX ?? 0, transform.rotationY ?? 0, transform.rotationZ ?? 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (transform.color !== undefined) mesh.setColorAt(index, new THREE.Color(transform.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function addCylinderInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.CylinderGeometry,
  material: THREE.Material,
  transforms: readonly Transform[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < transforms.length; index += 1) {
    const transform = transforms[index];
    dummy.position.copy(transform.position);
    dummy.scale.copy(transform.scale);
    dummy.rotation.set(transform.rotationX ?? 0, transform.rotationY ?? 0, transform.rotationZ ?? 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (transform.color !== undefined) mesh.setColorAt(index, new THREE.Color(transform.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function addPlaneInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.PlaneGeometry,
  material: THREE.Material,
  transforms: readonly Transform[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const transform = new THREE.Object3D();
  for (let index = 0; index < transforms.length; index += 1) {
    const placement = transforms[index];
    transform.position.copy(placement.position);
    transform.scale.copy(placement.scale);
    transform.rotation.set(0, placement.rotationY ?? 0, 0);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function addBeamInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.CylinderGeometry,
  material: THREE.Material,
  segments: readonly Segment[],
  castShadow = true,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    direction.subVectors(segment.end, segment.start);
    const length = direction.length();
    dummy.position.copy(segment.start).add(segment.end).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(up, direction.normalize());
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function makeNoiseTexture(base: string, seed: number, colorSpace = THREE.SRGBColorSpace): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a procedural station texture.');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  let state = seed >>> 0;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
  const shades = ['rgba(255,255,255,0.10)', 'rgba(20,24,23,0.10)', 'rgba(99,95,84,0.12)'];
  for (let index = 0; index < 2_600; index += 1) {
    const radius = 0.35 + random() * 1.65;
    context.fillStyle = shades[Math.floor(random() * shades.length)];
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function makeSignTexture(platformNumber: number, suffix = ''): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a station platform sign.');
  context.fillStyle = '#153e39';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#e5c776';
  context.lineWidth = 8;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  context.fillStyle = '#fbf4df';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 38px Arial, sans-serif';
  context.fillText('SECUNDERABAD JN', canvas.width / 2, 48);
  context.font = '700 44px Arial, sans-serif';
  context.fillText(`PLATFORM ${platformNumber}${suffix}`, canvas.width / 2, 100);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLightPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the platform lighting falloff texture.');
  const gradient = context.createRadialGradient(64, 128, 4, 64, 128, 126);
  gradient.addColorStop(0, 'rgba(255, 246, 220, 0.52)');
  gradient.addColorStop(0.32, 'rgba(255, 227, 171, 0.3)');
  gradient.addColorStop(0.68, 'rgba(255, 214, 151, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 205, 133, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function makeTrainInformationTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a station information display.');
  context.fillStyle = '#10272a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#ad9362';
  context.lineWidth = 5;
  context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  context.fillStyle = '#f5df9c';
  context.font = '700 25px Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('TRAIN INFORMATION', 18, 30);
  context.fillStyle = '#b6d2c7';
  context.font = '600 17px Arial, sans-serif';
  context.fillText('ARRIVALS', 18, 78);
  context.fillText('DEPARTURES', 183, 78);
  context.fillText('PLATFORM STATUS', 365, 78);
  context.strokeStyle = 'rgba(194,214,193,0.35)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(18, 105);
  context.lineTo(494, 105);
  context.stroke();
  context.fillStyle = '#e4aa55';
  for (const x of [24, 189, 371]) {
    context.fillRect(x, 118, 36, 5);
    context.fillRect(x + 49, 118, 54, 5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeClockFace(): { texture: THREE.CanvasTexture; update: (hour: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the station clock face.');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const update = (rawHour: number): void => {
    const hour = THREE.MathUtils.euclideanModulo(rawHour, 24);
    const hour12 = hour % 12;
    const minuteFraction = hour - Math.floor(hour);
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = '#f1e9d6';
    context.beginPath();
    context.arc(128, 128, 122, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#31514f';
    context.lineWidth = 9;
    context.stroke();
    for (let tick = 0; tick < 60; tick += 1) {
      const angle = tick * Math.PI / 30 - Math.PI / 2;
      const inner = tick % 5 === 0 ? 97 : 108;
      const outer = 115;
      context.strokeStyle = '#294543';
      context.lineWidth = tick % 5 === 0 ? 4 : 1.6;
      context.beginPath();
      context.moveTo(128 + Math.cos(angle) * inner, 128 + Math.sin(angle) * inner);
      context.lineTo(128 + Math.cos(angle) * outer, 128 + Math.sin(angle) * outer);
      context.stroke();
    }
    context.fillStyle = '#263f3e';
    context.font = '600 21px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const marker of [
      { label: '12', angle: -Math.PI / 2 },
      { label: '3', angle: 0 },
      { label: '6', angle: Math.PI / 2 },
      { label: '9', angle: Math.PI },
    ]) {
      context.fillText(marker.label, 128 + Math.cos(marker.angle) * 78, 128 + Math.sin(marker.angle) * 78);
    }
    const minuteAngle = minuteFraction * Math.PI * 2 - Math.PI / 2;
    const hourAngle = ((hour12 + minuteFraction) / 12) * Math.PI * 2 - Math.PI / 2;
    context.lineCap = 'round';
    context.strokeStyle = '#1e3435';
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(128, 128);
    context.lineTo(128 + Math.cos(hourAngle) * 54, 128 + Math.sin(hourAngle) * 54);
    context.stroke();
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(128, 128);
    context.lineTo(128 + Math.cos(minuteAngle) * 82, 128 + Math.sin(minuteAngle) * 82);
    context.stroke();
    context.fillStyle = '#b84f38';
    context.beginPath();
    context.arc(128, 128, 6, 0, Math.PI * 2);
    context.fill();
    texture.needsUpdate = true;
  };
  update(13);
  return { texture, update };
}

function makeRailGroup(ballastMaterial: THREE.Material, sleeperMaterial: THREE.Material, railMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Secunderabad platform-track group — schematic 11-track / 10-platform count';

  const ballastGeometry = new THREE.BoxGeometry(4.8, SECUNDERABAD_LAYOUT.ballastDepth, SECUNDERABAD_LAYOUT.trackLength);
  const ballastMeshes: THREE.Mesh[] = [];
  for (let index = 0; index < TRACK_CENTERS.length; index += 1) {
    const ballast = new THREE.Mesh(ballastGeometry, ballastMaterial);
    ballast.name = index === SECUNDERABAD_LAYOUT.serviceTrackIndex
      ? 'Reported MMTS/service road between Platforms 7 and 8 (schematic position)'
      : `Track-bed ${index + 1}`;
    ballast.position.set(TRACK_CENTERS[index], SECUNDERABAD_LAYOUT.ballastDepth / 2, 0);
    ballast.receiveShadow = true;
    group.add(ballast);
    ballastMeshes.push(ballast);
  }

  const sleeperCount = Math.floor(SECUNDERABAD_LAYOUT.trackLength / SECUNDERABAD_LAYOUT.sleeperSpacing) + 1;
  const sleepers: Transform[] = [];
  for (let trackIndex = 0; trackIndex < TRACK_CENTERS.length; trackIndex += 1) {
    const centerX = TRACK_CENTERS[trackIndex];
    for (let sleeperIndex = 0; sleeperIndex < sleeperCount; sleeperIndex += 1) {
      const z = TRACK_MIN_Z + sleeperIndex * SECUNDERABAD_LAYOUT.sleeperSpacing;
      if (z > TRACK_MAX_Z) break;
      sleepers.push({
        position: new THREE.Vector3(centerX, SECUNDERABAD_LAYOUT.ballastDepth + 0.11, z),
        scale: new THREE.Vector3(1, 1, 1),
        color: trackIndex === SECUNDERABAD_LAYOUT.serviceTrackIndex ? '#777973' : '#777a73',
      });
    }
  }
  const sleeperMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(SECUNDERABAD_LAYOUT.sleeperLength, 0.22, 0.25),
    sleeperMaterial,
    sleepers.length,
  );
  sleeperMesh.name = 'PSC sleepers — 0.602 m illustrative station spacing';
  sleeperMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < sleepers.length; index += 1) {
    const sleeper = sleepers[index];
    dummy.position.copy(sleeper.position);
    dummy.scale.copy(sleeper.scale);
    dummy.updateMatrix();
    sleeperMesh.setMatrixAt(index, dummy.matrix);
    if (sleeper.color) sleeperMesh.setColorAt(index, new THREE.Color(sleeper.color));
  }
  sleeperMesh.instanceMatrix.needsUpdate = true;
  if (sleeperMesh.instanceColor) sleeperMesh.instanceColor.needsUpdate = true;
  sleeperMesh.receiveShadow = true;
  // Thousands of thin sleeper shadows add little at scene scale but are costly
  // in the directional shadow map; ballast still receives the rail/structure shadows.
  sleeperMesh.castShadow = false;
  sleeperMesh.computeBoundingSphere();
  group.add(sleeperMesh);

  const railTransforms: Transform[] = [];
  const railLength = SECUNDERABAD_LAYOUT.trackLength;
  for (let trackIndex = 0; trackIndex < TRACK_CENTERS.length; trackIndex += 1) {
    const centerX = TRACK_CENTERS[trackIndex];
    for (const side of [-1, 1]) {
      railTransforms.push({
        position: new THREE.Vector3(centerX + side * GAUGE_HALF, SLEEPER_TOP_Y + SECUNDERABAD_LAYOUT.railHeight / 2, 0),
        scale: new THREE.Vector3(1, 1, 1),
        color: trackIndex === SECUNDERABAD_LAYOUT.serviceTrackIndex ? '#737c79' : '#858c88',
      });
    }
  }
  const railMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.075, SECUNDERABAD_LAYOUT.railHeight, railLength),
    railMaterial,
    railTransforms.length,
  );
  railMesh.name = 'BG running rails — 11 platform roads; exact pointwork omitted';
  railMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for (let index = 0; index < railTransforms.length; index += 1) {
    const rail = railTransforms[index];
    dummy.position.copy(rail.position);
    dummy.updateMatrix();
    railMesh.setMatrixAt(index, dummy.matrix);
    if (rail.color) railMesh.setColorAt(index, new THREE.Color(rail.color));
  }
  railMesh.instanceMatrix.needsUpdate = true;
  if (railMesh.instanceColor) railMesh.instanceColor.needsUpdate = true;
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  railMesh.computeBoundingSphere();
  group.add(railMesh);

  group.userData.trackCentersMeters = [...TRACK_CENTERS];
  group.userData.trackGaugeMeters = SECUNDERABAD_LAYOUT.trackGauge;
  group.userData.trackCenterSpacingMeters = SECUNDERABAD_LAYOUT.trackSpacing;
  group.userData.serviceTrackIndex = SECUNDERABAD_LAYOUT.serviceTrackIndex;
  group.userData.trackCount = SECUNDERABAD_LAYOUT.trackCount;
  group.userData.platformCount = SECUNDERABAD_LAYOUT.platformCount;
  group.userData.assumptions = ['schematic platform-to-road pairing', 'throats omitted', 'not a working yard diagram'];
  void ballastMeshes;
  return group;
}

function makePlatforms(concrete: THREE.Material, tactile: THREE.Material, yellow: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Ten schematic Secunderabad passenger platforms';
  const platformHeight = PLATFORM_TOP_Y;
  const platformGeometry = new THREE.BoxGeometry(PLATFORM_WIDTH, platformHeight, SECUNDERABAD_LAYOUT.platformLength);
  const stripeGeometry = new THREE.BoxGeometry(0.1, 0.025, SECUNDERABAD_LAYOUT.platformLength - 18);
  const tactileGeometry = new THREE.BoxGeometry(0.36, 0.035, SECUNDERABAD_LAYOUT.platformLength - 18);
  const signMaterials = new Map<string, THREE.Material>();
  const getSignMaterial = (platformNumber: number, suffix: string): THREE.Material => {
    const key = `${platformNumber}${suffix}`;
    let material = signMaterials.get(key);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ map: makeSignTexture(platformNumber, suffix), side: THREE.DoubleSide });
      signMaterials.set(key, material);
    }
    return material;
  };
  const signPostMaterial = new THREE.MeshStandardMaterial({ color: '#8a8d83', roughness: 0.55, metalness: 0.1 });
  const signBoardGeometry = new THREE.BoxGeometry(4.1, 1.28, 0.16);
  const signPostGeometry = new THREE.BoxGeometry(0.12, 3.2, 0.12);
  const benchGeometry = new THREE.BoxGeometry(2.4, 0.13, 0.5);
  const benchLegGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
  const benchMaterial = new THREE.MeshStandardMaterial({ color: '#59615d', roughness: 0.75, metalness: 0.36 });
  const benchLegMaterial = new THREE.MeshStandardMaterial({ color: '#3b403d', roughness: 0.8, metalness: 0.42 });
  const lightPoleMaterial = new THREE.MeshStandardMaterial({ color: '#858b84', roughness: 0.6, metalness: 0.52 });
  const lightHeadGeometry = new THREE.BoxGeometry(0.62, 0.22, 0.42);
  const jointMaterial = new THREE.MeshStandardMaterial({ color: '#85857d', roughness: 0.98, metalness: 0.01 });
  const drainMaterial = new THREE.MeshStandardMaterial({ color: '#545b57', roughness: 0.9, metalness: 0.08 });
  const lightHeadMaterial = new THREE.MeshStandardMaterial({
    color: '#f0e8d5',
    emissive: '#ffd28a',
    emissiveIntensity: 0.08,
    roughness: 0.42,
    metalness: 0.08,
  });
  const displayTexture = makeTrainInformationTexture();
  const displayMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: displayTexture,
    emissive: '#ffb64f',
    emissiveMap: displayTexture,
    emissiveIntensity: 0.16,
    roughness: 0.58,
    metalness: 0.04,
  });
  const clockFace = makeClockFace();
  const clockMaterial = new THREE.MeshBasicMaterial({ map: clockFace.texture, side: THREE.DoubleSide, toneMapped: false });
  const informationHousingMaterial = new THREE.MeshStandardMaterial({ color: '#314440', roughness: 0.56, metalness: 0.24 });
  const amenityCabinetMaterial = new THREE.MeshStandardMaterial({ color: '#818d88', roughness: 0.72, metalness: 0.16 });
  const binMaterial = new THREE.MeshStandardMaterial({ color: '#3d4b45', roughness: 0.82, metalness: 0.02 });
  const binLabelMaterial = new THREE.MeshStandardMaterial({ color: '#4d9468', roughness: 0.72, metalness: 0.02 });
  const supportMaterial = new THREE.MeshStandardMaterial({ color: '#666f6a', roughness: 0.7, metalness: 0.36 });
  const speakerMaterial = new THREE.MeshStandardMaterial({ color: '#d4cdbb', roughness: 0.76, metalness: 0.02 });
  const cameraMaterial = new THREE.MeshStandardMaterial({ color: '#333d3c', roughness: 0.64, metalness: 0.12 });
  const waterPanelMaterial = new THREE.MeshStandardMaterial({ color: '#5e8986', roughness: 0.48, metalness: 0.08 });

  const signPosts: Transform[] = [];
  const benches: Transform[] = [];
  const benchLegs: Transform[] = [];
  const lightPoles: Transform[] = [];
  const lightHeads: Transform[] = [];
  const lightPools: Transform[] = [];
  const expansionJoints: Transform[] = [];
  const platformDrains: Transform[] = [];
  const displayHousings: Transform[] = [];
  const displaySupports: Transform[] = [];
  const displayFaces: Transform[] = [];
  const clockFaces: Transform[] = [];
  const recyclingBins: Transform[] = [];
  const binLids: Transform[] = [];
  const binLabels: Transform[] = [];
  const drinkingWaterCabinets: Transform[] = [];
  const waterPanels: Transform[] = [];
  const waterTaps: Transform[] = [];
  const publicAddressSpeakers: Transform[] = [];
  const publicAddressBrackets: Transform[] = [];
  const cctvCameras: Transform[] = [];
  const cctvBrackets: Transform[] = [];

  for (let platformIndex = 0; platformIndex < SECUNDERABAD_LAYOUT.platformCount; platformIndex += 1) {
    const leftTrack = TRACK_CENTERS[platformIndex];
    const rightTrack = TRACK_CENTERS[platformIndex + 1];
    if (leftTrack === undefined || rightTrack === undefined) continue;
    const platformCenter = (leftTrack + rightTrack) / 2;
    const infoBoardY = platformHeight + 4.0;
    displayHousings.push({
      position: new THREE.Vector3(platformCenter, infoBoardY, 0),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (const side of [-1, 1]) {
      displaySupports.push({
        position: new THREE.Vector3(platformCenter + side * 1.62, platformHeight + 2.08, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
      displayFaces.push({
        position: new THREE.Vector3(platformCenter, infoBoardY, side * 0.094),
        scale: new THREE.Vector3(1, 1, 1),
        rotationY: side < 0 ? Math.PI : 0,
      });
      clockFaces.push({
        position: new THREE.Vector3(platformCenter, platformHeight + 5.02, side * 0.1),
        scale: new THREE.Vector3(1, 1, 1),
        rotationY: side < 0 ? Math.PI : 0,
      });
    }
    for (const z of [-158, 158]) {
      recyclingBins.push({
        position: new THREE.Vector3(platformCenter - 2.42, platformHeight + 0.43, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
      binLids.push({
        position: new THREE.Vector3(platformCenter - 2.42, platformHeight + 0.87, z),
        scale: new THREE.Vector3(1, 1, 1),
        color: '#497c62',
      });
      binLabels.push({
        position: new THREE.Vector3(platformCenter - 2.42, platformHeight + 0.54, z + 0.3),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    for (const z of [-50, 50]) {
      drinkingWaterCabinets.push({
        position: new THREE.Vector3(platformCenter + 2.36, platformHeight + 0.68, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
      waterPanels.push({
        position: new THREE.Vector3(platformCenter + 2.36, platformHeight + 0.83, z + 0.37),
        scale: new THREE.Vector3(1, 1, 1),
      });
      waterTaps.push({
        position: new THREE.Vector3(platformCenter + 2.36, platformHeight + 0.35, z + 0.43),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    for (const side of [-1, 1]) {
      const speakerZ = side * 135;
      publicAddressSpeakers.push({
        position: new THREE.Vector3(platformCenter + side * 0.92, platformHeight + 5.25, speakerZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
      publicAddressBrackets.push({
        position: new THREE.Vector3(platformCenter + side * 0.46, platformHeight + 5.25, speakerZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
      const cameraZ = side * 270;
      cctvCameras.push({
        position: new THREE.Vector3(platformCenter + side * 0.86, platformHeight + 5.2, cameraZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
      cctvBrackets.push({
        position: new THREE.Vector3(platformCenter + side * 0.43, platformHeight + 5.2, cameraZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    const platform = new THREE.Mesh(platformGeometry, concrete);
    platform.name = `Platform ${platformIndex + 1} — schematic island/platform strip`;
    platform.position.set(platformCenter, platformHeight / 2, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    for (let z = -280; z <= 280; z += 40) {
      expansionJoints.push({
        position: new THREE.Vector3(platformCenter, platformHeight + 0.004, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    for (let z = -294; z <= 294; z += 48) {
      platformDrains.push({
        position: new THREE.Vector3(platformCenter + PLATFORM_WIDTH / 2 - 0.42, platformHeight + 0.014, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }

    const edgeLeft = leftTrack + SECUNDERABAD_LAYOUT.platformEdgeOffset + 0.4;
    const edgeRight = rightTrack - SECUNDERABAD_LAYOUT.platformEdgeOffset - 0.4;
    const stripeLeft = new THREE.Mesh(stripeGeometry, yellow);
    stripeLeft.name = `Yellow safety line — Platform ${platformIndex + 1}`;
    stripeLeft.position.set(edgeLeft, platformHeight + 0.02, 0);
    const stripeRight = stripeLeft.clone();
    stripeRight.position.x = edgeRight;
    group.add(stripeLeft, stripeRight);

    const tactileLeft = new THREE.Mesh(tactileGeometry, tactile);
    tactileLeft.position.set(leftTrack + SECUNDERABAD_LAYOUT.platformEdgeOffset + 0.1, platformHeight + 0.01, 0);
    const tactileRight = tactileLeft.clone();
    tactileRight.position.x = rightTrack - SECUNDERABAD_LAYOUT.platformEdgeOffset - 0.1;
    group.add(tactileLeft, tactileRight);

    const signs: Array<{ z: number; suffix: string }> = [
      { z: -242, suffix: '' },
      { z: 242, suffix: '' },
    ];
    if (platformIndex === 5) signs.push({ z: -112, suffix: 'A' }, { z: 112, suffix: 'B' });
    if (platformIndex === 6) signs.push({ z: -112, suffix: 'A' }, { z: 112, suffix: 'B' });
    for (const sign of signs) {
      const board = new THREE.Mesh(signBoardGeometry, getSignMaterial(platformIndex + 1, sign.suffix));
      board.name = `Secunderabad platform ${platformIndex + 1}${sign.suffix} sign (English-only study label)`;
      board.position.set(platformCenter, platformHeight + 3.15, sign.z);
      board.castShadow = true;
      group.add(board);
      for (const side of [-1, 1]) {
        signPosts.push({
          position: new THREE.Vector3(platformCenter + side * 1.45, platformHeight + 1.6, sign.z),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    }

    for (const z of [-210, -90, 90, 210]) {
      const benchX = platformCenter + ((z / 90) % 2 === 0 ? -1.35 : 1.35);
      benches.push({ position: new THREE.Vector3(benchX, platformHeight + 1.05, z), scale: new THREE.Vector3(1, 1, 1) });
      for (const legSide of [-1, 1]) {
        benchLegs.push({ position: new THREE.Vector3(benchX + legSide * 0.8, platformHeight + 0.55, z), scale: new THREE.Vector3(1, 1, 1) });
      }
    }
    for (const z of [-270, -135, 135, 270]) {
      const x = platformCenter;
      lightPoles.push({ position: new THREE.Vector3(x, platformHeight + 2.825, z), scale: new THREE.Vector3(1, 1, 1) });
      lightHeads.push({ position: new THREE.Vector3(x, platformHeight + 5.8, z), scale: new THREE.Vector3(1, 1, 1) });
      lightPools.push({
        position: new THREE.Vector3(x, platformHeight + 0.035, z),
        scale: new THREE.Vector3(1, 1, 1),
        color: '#ffd59a',
      });
    }
  }

  addBoxInstances(group, 'Platform sign posts', signPostGeometry, signPostMaterial, signPosts);
  addBoxInstances(group, 'Station benches', benchGeometry, benchMaterial, benches);
  addBoxInstances(group, 'Station bench supports', benchLegGeometry, benchLegMaterial, benchLegs);
  const jointMesh = addBoxInstances(
    group,
    'Fine concrete platform expansion joints — schematic spacing',
    new THREE.BoxGeometry(PLATFORM_WIDTH - 0.7, 0.014, 0.035),
    jointMaterial,
    expansionJoints,
  );
  jointMesh.castShadow = false;
  jointMesh.receiveShadow = false;
  const drainMesh = addBoxInstances(
    group,
    'Small platform drain grates — illustrative',
    new THREE.BoxGeometry(0.16, 0.018, 0.5),
    drainMaterial,
    platformDrains,
  );
  drainMesh.castShadow = false;
  drainMesh.receiveShadow = false;

  const displaySupportMesh = addBoxInstances(
    group,
    'Electronic train-information board support posts — illustrative',
    new THREE.BoxGeometry(0.12, 4.16, 0.12),
    supportMaterial,
    displaySupports.map((item) => ({ ...item, scale: new THREE.Vector3(1, 1, 1) })),
  );
  displaySupportMesh.castShadow = false;
  displaySupportMesh.receiveShadow = false;
  const displayHousingMesh = addBoxInstances(
    group,
    'Double-sided electronic train-information display housings — schematic',
    new THREE.BoxGeometry(3.6, 0.98, 0.18),
    informationHousingMaterial,
    displayHousings,
  );
  displayHousingMesh.castShadow = false;
  displayHousingMesh.receiveShadow = false;
  addPlaneInstances(
    group,
    'Electronic train-indication screens — placeholder labels, not timetable data',
    new THREE.PlaneGeometry(3.42, 0.78),
    displayMaterial,
    displayFaces,
  );
  addPlaneInstances(
    group,
    'Analog station clocks — each face follows the study-time slider',
    new THREE.PlaneGeometry(0.82, 0.82),
    clockMaterial,
    clockFaces,
  );

  const binBodyMesh = addBoxInstances(
    group,
    'Covered waste bins on platforms — representative placements',
    new THREE.BoxGeometry(0.72, 0.86, 0.56),
    binMaterial,
    recyclingBins,
  );
  binBodyMesh.castShadow = false;
  binBodyMesh.receiveShadow = false;
  const binLidMesh = addBoxInstances(
    group,
    'Waste-bin lids',
    new THREE.BoxGeometry(0.76, 0.1, 0.6),
    binLabelMaterial,
    binLids,
  );
  binLidMesh.castShadow = false;
  binLidMesh.receiveShadow = false;
  const binLabelMesh = addBoxInstances(
    group,
    'Small recycling/cleanliness label panels — generic',
    new THREE.BoxGeometry(0.34, 0.28, 0.035),
    supportMaterial,
    binLabels,
  );
  binLabelMesh.castShadow = false;
  binLabelMesh.receiveShadow = false;
  const waterCabinetMesh = addBoxInstances(
    group,
    'Drinking-water points — illustrative platform amenity cabinets',
    new THREE.BoxGeometry(0.76, 1.36, 0.72),
    amenityCabinetMaterial,
    drinkingWaterCabinets,
  );
  waterCabinetMesh.castShadow = false;
  waterCabinetMesh.receiveShadow = false;
  const waterPanelMesh = addBoxInstances(
    group,
    'Water-point indicator panels',
    new THREE.BoxGeometry(0.42, 0.32, 0.04),
    waterPanelMaterial,
    waterPanels,
  );
  waterPanelMesh.castShadow = false;
  waterPanelMesh.receiveShadow = false;
  const waterTapMesh = addBoxInstances(
    group,
    'Small stainless water-point spouts',
    new THREE.BoxGeometry(0.24, 0.05, 0.24),
    supportMaterial,
    waterTaps,
  );
  waterTapMesh.castShadow = false;
  waterTapMesh.receiveShadow = false;
  const paBracketMesh = addBoxInstances(
    group,
    'Public-address speaker mounting arms — attached to platform light masts',
    new THREE.BoxGeometry(0.92, 0.1, 0.1),
    supportMaterial,
    publicAddressBrackets,
  );
  paBracketMesh.castShadow = false;
  paBracketMesh.receiveShadow = false;
  const paMesh = addBoxInstances(
    group,
    'Platform public-address speaker boxes — schematic',
    new THREE.BoxGeometry(0.55, 0.35, 0.42),
    speakerMaterial,
    publicAddressSpeakers,
  );
  paMesh.castShadow = false;
  paMesh.receiveShadow = false;
  const cctvBracketMesh = addBoxInstances(
    group,
    'CCTV mounting arms — attached to platform light masts',
    new THREE.BoxGeometry(0.86, 0.08, 0.1),
    supportMaterial,
    cctvBrackets,
  );
  cctvBracketMesh.castShadow = false;
  cctvBracketMesh.receiveShadow = false;
  const cctvMesh = addBoxInstances(
    group,
    'Compact platform CCTV housings — illustrative, not a camera-placement plan',
    new THREE.BoxGeometry(0.42, 0.22, 0.34),
    cameraMaterial,
    cctvCameras,
  );
  cctvMesh.castShadow = false;
  cctvMesh.receiveShadow = false;

  addBoxInstances(group, 'Platform lighting masts', new THREE.BoxGeometry(1, 1, 1), lightPoleMaterial, lightPoles.map((item) => ({
    ...item,
    scale: new THREE.Vector3(0.12, 5.65, 0.12),
  })));
  addBoxInstances(group, 'Platform light heads', lightHeadGeometry, lightHeadMaterial, lightHeads).castShadow = false;

  const lightPoolGeometry = new THREE.PlaneGeometry(PLATFORM_WIDTH - 0.45, 82);
  lightPoolGeometry.rotateX(-Math.PI / 2);
  const lightPoolMaterial = new THREE.MeshBasicMaterial({
    map: makeLightPoolTexture(),
    color: '#ffd9a1',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const lightPoolMesh = new THREE.InstancedMesh(lightPoolGeometry, lightPoolMaterial, lightPools.length);
  lightPoolMesh.name = 'Warm platform light pools — artistic, non-photometric night cue';
  lightPoolMesh.castShadow = false;
  lightPoolMesh.receiveShadow = false;
  lightPoolMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const lightPoolTransform = new THREE.Object3D();
  for (let index = 0; index < lightPools.length; index += 1) {
    const pool = lightPools[index];
    lightPoolTransform.position.copy(pool.position);
    lightPoolTransform.scale.copy(pool.scale);
    lightPoolTransform.updateMatrix();
    lightPoolMesh.setMatrixAt(index, lightPoolTransform.matrix);
    if (pool.color) lightPoolMesh.setColorAt(index, new THREE.Color(pool.color));
  }
  lightPoolMesh.instanceMatrix.needsUpdate = true;
  if (lightPoolMesh.instanceColor) lightPoolMesh.instanceColor.needsUpdate = true;
  lightPoolMesh.computeBoundingSphere();
  group.add(lightPoolMesh);
  group.userData.nightPoolMaterial = lightPoolMaterial;
  group.userData.platformLampMaterial = lightHeadMaterial;
  group.userData.nightDisplayMaterial = displayMaterial;
  group.userData.updateStationClock = clockFace.update;
  return group;
}

function makeStationForecourt(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Schematic station forecourt, passenger drop-off lanes and local traffic — not a mapped access plan';
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#414847', roughness: 0.96, metalness: 0.01 });
  const pavingMaterial = new THREE.MeshStandardMaterial({ color: '#b8b3a7', roughness: 0.91, metalness: 0.02 });
  const curbMaterial = new THREE.MeshStandardMaterial({ color: '#777e78', roughness: 0.9, metalness: 0.03 });
  const lineMaterial = new THREE.MeshBasicMaterial({ color: '#e9e5d8', side: THREE.DoubleSide, toneMapped: false });
  const roadCenters = [-137, 137];
  const roadTransforms: Transform[] = [];
  const curbTransforms: Transform[] = [];
  const paving: Transform[] = [];
  const paint: Transform[] = [];
  for (const x of roadCenters) {
    roadTransforms.push({ position: new THREE.Vector3(x, 0.135, 0), scale: new THREE.Vector3(1, 1, 1) });
    curbTransforms.push(
      { position: new THREE.Vector3(x - Math.sign(x) * 5.8, 0.205, 0), scale: new THREE.Vector3(1, 1, 1) },
      { position: new THREE.Vector3(x + Math.sign(x) * 5.8, 0.205, 0), scale: new THREE.Vector3(1, 1, 1) },
    );
    const walkWidth = x < 0 ? 0.8 : 5.0;
    const walkX = x < 0 ? -130.6 : 128;
    paving.push({ position: new THREE.Vector3(walkX, 0.145, 0), scale: new THREE.Vector3(walkWidth, 1, 1) });
    for (let z = -49; z <= 49; z += 16) {
      paint.push({
        position: new THREE.Vector3(x, 0.174, z),
        scale: new THREE.Vector3(0.16, 1, 5.8),
      });
    }
    for (const crossing of [-60, 60]) {
      for (let stripe = 0; stripe < 7; stripe += 1) {
        paint.push({
          position: new THREE.Vector3(x, 0.174, crossing + (stripe - 3) * 0.86),
          scale: new THREE.Vector3(11.3, 1, 0.46),
          color: '#f0ecdf',
        });
      }
    }
  }
  const roadMesh = addBoxInstances(group, 'Two terminal-side pick-up / drop-off lanes — conceptual circulation', new THREE.BoxGeometry(12, 0.055, 140), roadMaterial, roadTransforms);
  roadMesh.castShadow = false;
  roadMesh.receiveShadow = false;
  const curbMesh = addBoxInstances(group, 'Low forecourt lane kerbs', new THREE.BoxGeometry(0.18, 0.2, 140), curbMaterial, curbTransforms);
  curbMesh.castShadow = false;
  curbMesh.receiveShadow = false;
  const pavingMesh = addBoxInstances(group, 'Passenger forecourt footpaths', new THREE.BoxGeometry(1, 0.06, 132), pavingMaterial, paving);
  pavingMesh.castShadow = false;
  pavingMesh.receiveShadow = false;
  const paintMesh = addBoxInstances(group, 'Forecourt lane dashes and zebra crossings', new THREE.BoxGeometry(1, 0.012, 1), lineMaterial, paint);
  paintMesh.castShadow = false;
  paintMesh.receiveShadow = false;

  const autoBody: Transform[] = [];
  const autoCanopy: Transform[] = [];
  const autoRoof: Transform[] = [];
  const autoGlass: Transform[] = [];
  const sedanBody: Transform[] = [];
  const sedanCab: Transform[] = [];
  const sedanRoof: Transform[] = [];
  const sedanGlass: Transform[] = [];
  const vehicleWheels: Transform[] = [];
  const headlamps: Transform[] = [];
  const tailLamps: Transform[] = [];
  const autoMaterials = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.66, metalness: 0.12 });
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: '#e7c45d', roughness: 0.73, metalness: 0.04 });
  const carMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.12 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: '#4b6162', roughness: 0.28, metalness: 0.12 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: '#242a28', roughness: 0.92, metalness: 0.02 });
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#f5e8bf', emissive: '#f7d998', emissiveIntensity: 0.12, roughness: 0.45 });
  const tailMaterial = new THREE.MeshStandardMaterial({ color: '#9b4137', emissive: '#9b4137', emissiveIntensity: 0.08, roughness: 0.52 });
  const rotateLocal = (x: number, z: number, yaw: number): THREE.Vector2 => new THREE.Vector2(
    x * Math.cos(yaw) + z * Math.sin(yaw),
    -x * Math.sin(yaw) + z * Math.cos(yaw),
  );
  for (const side of [-1, 1]) {
    const vehicles = [
      { kind: 'car', offsetX: -2.8, z: -42, yaw: side < 0 ? 0 : Math.PI, color: '#c5c4b8' },
      { kind: 'auto', offsetX: 2.8, z: -14, yaw: side < 0 ? Math.PI : 0, color: '#23805d' },
      { kind: 'auto', offsetX: -2.8, z: 14, yaw: side < 0 ? 0 : Math.PI, color: '#2b7657' },
      { kind: 'car', offsetX: 2.8, z: 42, yaw: side < 0 ? Math.PI : 0, color: '#b9b7aa' },
    ] as const;
    for (const vehicle of vehicles) {
      const x = side * 137 + vehicle.offsetX;
      const z = vehicle.z;
      if (vehicle.kind === 'auto') {
        autoBody.push({ position: new THREE.Vector3(x, 0.72, z), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: vehicle.color });
        autoCanopy.push({ position: new THREE.Vector3(x, 1.28, z + 0.12), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: '#d9b84f' });
        autoRoof.push({ position: new THREE.Vector3(x, 1.68, z + 0.12), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: '#d5b448' });
        const windshield = rotateLocal(0, -0.72, vehicle.yaw);
        autoGlass.push({ position: new THREE.Vector3(x + windshield.x, 1.23, z + windshield.y), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw });
        for (const wheel of [
          { x: -0.62, z: 0.62 },
          { x: 0.62, z: 0.62 },
          { x: 0, z: -0.82 },
        ]) {
          const offset = rotateLocal(wheel.x, wheel.z, vehicle.yaw);
          vehicleWheels.push({
            position: new THREE.Vector3(x + offset.x, 0.43, z + offset.y),
            scale: new THREE.Vector3(1, 1, 1),
            rotationY: vehicle.yaw,
            rotationZ: Math.PI / 2,
          });
        }
      } else {
        sedanBody.push({ position: new THREE.Vector3(x, 0.76, z), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: vehicle.color });
        sedanCab.push({ position: new THREE.Vector3(x, 1.23, z + 0.12), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: vehicle.color });
        sedanRoof.push({ position: new THREE.Vector3(x, 1.62, z + 0.12), scale: new THREE.Vector3(1, 1, 1), rotationY: vehicle.yaw, color: '#aaa99e' });
        for (const glass of [
          { x: 0, z: -0.93, scale: new THREE.Vector3(1.46, 0.46, 0.045) },
          { x: 0, z: 1.17, scale: new THREE.Vector3(1.42, 0.42, 0.045) },
          { x: -0.81, z: 0.1, scale: new THREE.Vector3(0.045, 0.4, 0.88) },
          { x: 0.81, z: 0.1, scale: new THREE.Vector3(0.045, 0.4, 0.88) },
        ]) {
          const offset = rotateLocal(glass.x, glass.z, vehicle.yaw);
          sedanGlass.push({
            position: new THREE.Vector3(x + offset.x, 1.25, z + offset.y),
            scale: glass.scale,
            rotationY: vehicle.yaw,
          });
        }
        for (const wheel of [
          { x: -0.86, z: -1.18 }, { x: 0.86, z: -1.18 },
          { x: -0.86, z: 1.18 }, { x: 0.86, z: 1.18 },
        ]) {
          const offset = rotateLocal(wheel.x, wheel.z, vehicle.yaw);
          vehicleWheels.push({
            position: new THREE.Vector3(x + offset.x, 0.43, z + offset.y),
            scale: new THREE.Vector3(1, 1, 1),
            rotationY: vehicle.yaw,
            rotationZ: Math.PI / 2,
          });
        }
      }
      for (const frontSide of [-1, 1]) {
        const zOffset = vehicle.kind === 'auto' ? -1.1 : -2.0;
        const offset = rotateLocal(frontSide * 0.56, zOffset, vehicle.yaw);
        headlamps.push({
          position: new THREE.Vector3(x + offset.x, 0.84, z + offset.y),
          scale: new THREE.Vector3(0.24, 0.14, 0.08),
          rotationY: vehicle.yaw,
        });
      }
      const rearOffset = rotateLocal(0, vehicle.kind === 'auto' ? 1.1 : 2.0, vehicle.yaw);
      tailLamps.push({
        position: new THREE.Vector3(x + rearOffset.x, 0.82, z + rearOffset.y),
        scale: new THREE.Vector3(0.74, 0.12, 0.07),
        rotationY: vehicle.yaw,
      });
    }
  }

  for (const [name, geometry, material, transforms] of [
    ['Auto-rickshaw lower bodies — simplified local traffic props', new THREE.BoxGeometry(1.45, 0.72, 2.15), autoMaterials, autoBody],
    ['Auto-rickshaw passenger canopies', new THREE.BoxGeometry(1.42, 0.72, 1.42), canopyMaterial, autoCanopy],
    ['Auto-rickshaw roof caps', new THREE.BoxGeometry(1.5, 0.13, 1.5), canopyMaterial, autoRoof],
    ['Auto-rickshaw windscreens', new THREE.BoxGeometry(1.08, 0.43, 0.045), glassMaterial, autoGlass],
    ['Compact car bodies — generic static traffic props', new THREE.BoxGeometry(1.95, 0.74, 4.1), carMaterial, sedanBody],
    ['Compact car cabins', new THREE.BoxGeometry(1.62, 0.74, 2.18), carMaterial, sedanCab],
    ['Compact car roof panels', new THREE.BoxGeometry(1.56, 0.14, 1.75), carMaterial, sedanRoof],
  ] as const) {
    const mesh = addBoxInstances(group, name, geometry, material, transforms);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  }
  const carGlassMesh = addBoxInstances(group, 'Compact car glazing — dark neutral glass', new THREE.BoxGeometry(1, 1, 1), glassMaterial, sedanGlass);
  carGlassMesh.castShadow = false;
  carGlassMesh.receiveShadow = false;
  const wheels = addCylinderInstances(
    group,
    'Station forecourt car and auto-rickshaw wheels',
    new THREE.CylinderGeometry(0.31, 0.31, 0.16, 10),
    tireMaterial,
    vehicleWheels,
  );
  wheels.receiveShadow = false;
  const headlampMesh = addBoxInstances(group, 'Local traffic headlamp blocks', new THREE.BoxGeometry(1, 1, 1), lampMaterial, headlamps);
  headlampMesh.castShadow = false;
  headlampMesh.receiveShadow = false;
  const tailMesh = addBoxInstances(group, 'Local traffic rear lamps', new THREE.BoxGeometry(1, 1, 1), tailMaterial, tailLamps);
  tailMesh.castShadow = false;
  tailMesh.receiveShadow = false;
  group.userData.caveat = 'Approach-lane location, markings and static local-traffic props are a circulation study, not a surveyed pickup/drop-off plan.';
  return group;
}

function makeOheGroup(steel: THREE.Material, wireMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = '25 kV OHE — schematic multi-track portal gantries with contact-wire fittings';
  const rawPortalZs: number[] = [];
  for (let z = TRACK_MIN_Z; z <= TRACK_MAX_Z; z += 60) rawPortalZs.push(z);
  if (rawPortalZs[rawPortalZs.length - 1] !== TRACK_MAX_Z) rawPortalZs.push(TRACK_MAX_Z);
  const portalZs = rawPortalZs.filter((z) => Math.abs(z) > 54);
  const concourseSupportZs = [-54, -18, 18, 54];
  const supportZs = [...new Set([...portalZs, ...concourseSupportZs])].sort((a, b) => a - b);
  const halfWidth = TRACK_SPAN_X / 2 + 12;
  const mastBottom = 0.18;
  const mastTop = 10.05;
  const portalTop = 9.95;
  const portalBottom = 8.45;
  const panelCount = 6;
  const panelXs = Array.from({ length: panelCount + 1 }, (_, index) => -halfWidth + (2 * halfWidth * index) / panelCount);

  const footingMaterial = new THREE.MeshStandardMaterial({ color: '#777d79', roughness: 0.9, metalness: 0.02 });
  const basePlateMaterial = new THREE.MeshStandardMaterial({ color: '#59635f', roughness: 0.5, metalness: 0.65 });
  const porcelainMaterial = new THREE.MeshStandardMaterial({ color: '#e4dfcc', roughness: 0.38, metalness: 0.05 });
  const markingMaterial = new THREE.MeshStandardMaterial({ color: '#263b3b', roughness: 0.78, metalness: 0.06 });
  const mastSegments: Segment[] = [];
  const mastBraces: Segment[] = [];
  const portalChords: Segment[] = [];
  const portalWeb: Segment[] = [];
  const portalDepthBraces: Segment[] = [];
  const dropperSegments: Segment[] = [];
  const contactSupports: Segment[] = [];
  const registrationArms: Segment[] = [];
  const footingTransforms: Transform[] = [];
  const plateTransforms: Transform[] = [];
  const anchorTransforms: Transform[] = [];
  const ladderRungs: Segment[] = [];
  const numberPlates: Transform[] = [];
  const insulatorTransforms: Transform[] = [];
  const clampTransforms: Transform[] = [];
  const cableSegments: Segment[] = [];

  const panelY = (level: number): number => mastBottom + ((mastTop - mastBottom) * level) / 5;
  for (const z of portalZs) {
    for (const side of [-1, 1]) {
      const mastX = side * halfWidth;
      footingTransforms.push({
        position: new THREE.Vector3(mastX, 0.2, z),
        scale: new THREE.Vector3(1.35, 0.4, 1.35),
      });
      plateTransforms.push({
        position: new THREE.Vector3(mastX, 0.48, z),
        scale: new THREE.Vector3(0.92, 0.14, 0.92),
      });
      for (const xSide of [-1, 1]) {
        for (const zSide of [-1, 1]) {
          anchorTransforms.push({
            position: new THREE.Vector3(mastX + xSide * 0.3, 0.59, z + zSide * 0.3),
            scale: new THREE.Vector3(0.14, 0.2, 0.14),
          });
        }
      }

      const mastDepth = 0.88;
      for (const zSide of [-1, 1]) {
        const zOffset = z + zSide * mastDepth / 2;
        for (const xSide of [-1, 1]) {
          const bottomX = mastX + xSide * 0.42;
          const topX = mastX + xSide * 0.27;
          mastSegments.push({
            start: new THREE.Vector3(bottomX, mastBottom, zOffset),
            end: new THREE.Vector3(topX, mastTop, zOffset),
          });
        }
        for (let level = 0; level <= 5; level += 1) {
          const y = panelY(level);
          const taper = THREE.MathUtils.lerp(0.42, 0.27, level / 5);
          mastBraces.push({
            start: new THREE.Vector3(mastX - taper, y, zOffset),
            end: new THREE.Vector3(mastX + taper, y, zOffset),
          });
        }
        for (let bay = 0; bay < 5; bay += 1) {
          const y0 = panelY(bay);
          const y1 = panelY(bay + 1);
          const x0 = THREE.MathUtils.lerp(0.42, 0.27, bay / 5);
          const x1 = THREE.MathUtils.lerp(0.42, 0.27, (bay + 1) / 5);
          const lean = (bay + (zSide > 0 ? 1 : 0)) % 2 === 0 ? 1 : -1;
          mastBraces.push({
            start: new THREE.Vector3(mastX - lean * x0, y0, zOffset),
            end: new THREE.Vector3(mastX + lean * x1, y1, zOffset),
          });
        }
      }
      for (const xSide of [-1, 1]) {
        for (const level of [0, 1, 2, 3, 4, 5]) {
          const y = panelY(level);
          const taper = THREE.MathUtils.lerp(0.42, 0.27, level / 5);
          mastBraces.push({
            start: new THREE.Vector3(mastX + xSide * taper, y, z - mastDepth / 2),
            end: new THREE.Vector3(mastX + xSide * taper, y, z + mastDepth / 2),
          });
        }
        for (let bay = 0; bay < 5; bay += 1) {
          const y0 = panelY(bay);
          const y1 = panelY(bay + 1);
          const x0 = THREE.MathUtils.lerp(0.42, 0.27, bay / 5);
          const x1 = THREE.MathUtils.lerp(0.42, 0.27, (bay + 1) / 5);
          const lean = (bay + (xSide > 0 ? 1 : 0)) % 2 === 0 ? 1 : -1;
          mastBraces.push({
            start: new THREE.Vector3(mastX + xSide * x0, y0, z - lean * mastDepth / 2),
            end: new THREE.Vector3(mastX + xSide * x1, y1, z + lean * mastDepth / 2),
          });
        }
      }

      // A visible but restrained ladder and mast identity plate make each
      // support read as railway equipment rather than a bare vertical stroke.
      const ladderSide = side < 0 ? 1 : -1;
      const ladderX = mastX + ladderSide * 0.44;
      for (let rung = 0; rung < 7; rung += 1) {
        const y = 1.0 + rung * 0.92;
        ladderRungs.push({
          start: new THREE.Vector3(ladderX, y, z - 0.26),
          end: new THREE.Vector3(ladderX, y, z + 0.26),
        });
      }
      numberPlates.push({
        position: new THREE.Vector3(mastX - side * 0.5, 7.4, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
      cableSegments.push({
        start: new THREE.Vector3(mastX - side * 0.46, mastBottom + 0.1, z + 0.48),
        end: new THREE.Vector3(mastX - side * 0.46, 7.35, z + 0.48),
      });
    }

    // Six open triangular panels form a legible multi-track portal truss.
    // The single alternating web avoids the dense lattice of the first pass.
    for (let depthSide of [-1, 1]) {
      const depthZ = z + depthSide * 0.52;
      for (let panel = 0; panel < panelCount; panel += 1) {
        const x0 = panelXs[panel] ?? -halfWidth;
        const x1 = panelXs[panel + 1] ?? halfWidth;
        portalChords.push(
          { start: new THREE.Vector3(x0, portalTop, depthZ), end: new THREE.Vector3(x1, portalTop, depthZ) },
          { start: new THREE.Vector3(x0, portalBottom, depthZ), end: new THREE.Vector3(x1, portalBottom, depthZ) },
        );
        portalWeb.push({
          start: new THREE.Vector3(x0, portalBottom, depthZ),
          end: new THREE.Vector3(x0, portalTop, depthZ),
        });
        const rising = panel % 2 === 0;
        portalWeb.push(rising
          ? { start: new THREE.Vector3(x0, portalBottom, depthZ), end: new THREE.Vector3(x1, portalTop, depthZ) }
          : { start: new THREE.Vector3(x0, portalTop, depthZ), end: new THREE.Vector3(x1, portalBottom, depthZ) });
      }
      portalWeb.push({
        start: new THREE.Vector3(panelXs[panelCount] ?? halfWidth, portalBottom, depthZ),
        end: new THREE.Vector3(panelXs[panelCount] ?? halfWidth, portalTop, depthZ),
      });
    }
    for (const x of panelXs) {
      portalDepthBraces.push(
        { start: new THREE.Vector3(x, portalTop, z - 0.52), end: new THREE.Vector3(x, portalTop, z + 0.52) },
        { start: new THREE.Vector3(x, portalBottom, z - 0.52), end: new THREE.Vector3(x, portalBottom, z + 0.52) },
      );
    }

  }

  addBoxInstances(group, 'Concrete OHE portal foundations', new THREE.BoxGeometry(1, 1, 1), footingMaterial, footingTransforms);
  addBoxInstances(group, 'Galvanized portal mast base plates', new THREE.BoxGeometry(1, 1, 1), basePlateMaterial, plateTransforms);
  const anchorHeads = addBoxInstances(group, 'Portal mast anchor-bolt heads', new THREE.BoxGeometry(1, 1, 1), basePlateMaterial, anchorTransforms);
  anchorHeads.castShadow = false;
  anchorHeads.receiveShadow = false;
  addBeamInstances(group, 'Tapered lattice portal mast chords', new THREE.CylinderGeometry(0.065, 0.085, 1, 6), steel, mastSegments);
  addBeamInstances(group, 'Portal mast lacing and alternating bracing', new THREE.CylinderGeometry(0.036, 0.05, 1, 5), steel, mastBraces);
  addBeamInstances(group, 'Portal truss top and bottom chords', new THREE.CylinderGeometry(0.085, 0.1, 1, 6), steel, portalChords);
  addBeamInstances(group, 'Portal truss verticals and single diagonals', new THREE.CylinderGeometry(0.042, 0.052, 1, 5), steel, portalWeb);
  addBeamInstances(group, 'Portal truss cross-depth ties', new THREE.CylinderGeometry(0.045, 0.052, 1, 5), steel, portalDepthBraces);
  addBeamInstances(group, 'Mast access ladder rungs', new THREE.CylinderGeometry(0.018, 0.018, 1, 5), steel, ladderRungs, false);
  addBeamInstances(group, 'Bonding / earth down-leads on portal legs', new THREE.CylinderGeometry(0.012, 0.012, 1, 5), wireMaterial, cableSegments, false);
  const mastPlates = addBoxInstances(group, 'OHE mast number / warning plates', new THREE.BoxGeometry(0.58, 0.42, 0.06), markingMaterial, numberPlates);
  mastPlates.castShadow = false;
  mastPlates.receiveShadow = false;

  for (const supportZ of supportZs) {
    const supportY = portalZs.includes(supportZ) ? portalBottom - 0.04 : 10.43;
    for (const centerX of TRACK_CENTERS) {
      contactSupports.push({
        start: new THREE.Vector3(centerX, supportY, supportZ),
        end: new THREE.Vector3(centerX, RAIL_TOP_Y + 7.05, supportZ),
      });
      registrationArms.push({
        start: new THREE.Vector3(centerX - 0.42, RAIL_TOP_Y + 5.72, supportZ),
        end: new THREE.Vector3(centerX + 0.42, RAIL_TOP_Y + 5.72, supportZ),
      });
      insulatorTransforms.push({
        position: new THREE.Vector3(centerX, RAIL_TOP_Y + 6.88, supportZ),
        scale: new THREE.Vector3(0.16, 0.38, 0.16),
      });
      clampTransforms.push({
        position: new THREE.Vector3(centerX, RAIL_TOP_Y + 5.7, supportZ),
        scale: new THREE.Vector3(0.24, 0.08, 0.18),
      });
      dropperSegments.push({
        start: new THREE.Vector3(centerX, RAIL_TOP_Y + 5.65, supportZ),
        end: new THREE.Vector3(centerX, RAIL_TOP_Y + 7.05, supportZ),
      });
    }
  }
  addBeamInstances(group, 'Portal / concourse OHE suspension rods', new THREE.CylinderGeometry(0.025, 0.03, 1, 5), steel, contactSupports, false);
  addBeamInstances(group, 'Contact-wire registration arms at support points', new THREE.CylinderGeometry(0.022, 0.026, 1, 5), steel, registrationArms, false);
  const insulators = addBoxInstances(group, 'Porcelain / composite OHE insulator stacks', new THREE.BoxGeometry(1, 1, 1), porcelainMaterial, insulatorTransforms.map((item) => ({
    ...item,
    scale: new THREE.Vector3(0.14, 0.38, 0.14),
  })));
  insulators.castShadow = false;
  insulators.receiveShadow = false;
  const contactClamps = addBoxInstances(group, 'Contact-wire clamps and hanger fittings', new THREE.BoxGeometry(1, 1, 1), basePlateMaterial, clampTransforms.map((item) => ({
    ...item,
    scale: new THREE.Vector3(0.24, 0.08, 0.18),
  })));
  contactClamps.castShadow = false;
  contactClamps.receiveShadow = false;

  for (const centerX of TRACK_CENTERS) {
    for (const wireType of ['contact', 'messenger'] as const) {
      const baseHeight = wireType === 'contact' ? RAIL_TOP_Y + 5.65 : RAIL_TOP_Y + 7.05;
      const sagAmplitude = wireType === 'contact' ? 0.08 : 0.26;
      const points: THREE.Vector3[] = [];
      for (let interval = 0; interval < supportZs.length - 1; interval += 1) {
        const startZ = supportZs[interval] ?? TRACK_MIN_Z;
        const endZ = supportZs[interval + 1] ?? TRACK_MAX_Z;
        const sampleCount = Math.max(8, Math.ceil((endZ - startZ) / 4));
        for (let sample = interval === 0 ? 0 : 1; sample <= sampleCount; sample += 1) {
          const t = sample / sampleCount;
          const z = THREE.MathUtils.lerp(startZ, endZ, t);
          const sag = 4 * t * (1 - t) * sagAmplitude;
          points.push(new THREE.Vector3(centerX, baseHeight - sag, z));
        }
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const wire = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(64, Math.ceil(SECUNDERABAD_LAYOUT.trackLength / 3)), wireType === 'contact' ? 0.012 : 0.01, 5, false),
        wireMaterial,
      );
      wire.name = `${wireType} wire — track ${TRACK_CENTERS.indexOf(centerX) + 1}; 5.65 / 7.05 m above rail reference`;
      // Thin contact/messenger tubes are visually legible but do not cast
      // pixel-scale shadows across the station floor.
      wire.castShadow = false;
      wire.receiveShadow = false;
      wire.frustumCulled = false;
      group.add(wire);
    }

    for (let interval = 0; interval < supportZs.length - 1; interval += 1) {
      const startZ = supportZs[interval] ?? TRACK_MIN_Z;
      const endZ = supportZs[interval + 1] ?? TRACK_MAX_Z;
      for (let z = startZ + 9; z < endZ - 0.5; z += 9) {
        const t = (z - startZ) / (endZ - startZ);
        const contactY = RAIL_TOP_Y + 5.65 - 4 * t * (1 - t) * 0.08;
        const messengerY = RAIL_TOP_Y + 7.05 - 4 * t * (1 - t) * 0.26;
        dropperSegments.push({
          start: new THREE.Vector3(centerX, contactY, z),
          end: new THREE.Vector3(centerX, messengerY, z),
        });
      }
    }
  }
  addBeamInstances(group, 'Regular wire droppers — up to 9 m schematic spacing', new THREE.CylinderGeometry(0.006, 0.006, 1, 4), wireMaterial, dropperSegments, false);

  group.userData.system = '25 kV 50 Hz conventional OHE visual study';
  group.userData.contactWireHeightAboveRailMeters = 5.65;
  group.userData.catenaryHeightAboveRailMeters = 7.05;
  group.userData.supportRhythmMeters = 60;
  group.userData.dropperSpacingMaximumMeters = 9;
  group.userData.assumptions = [
    'multi-track portal supports and 60 m rhythm are illustrative, not a Secunderabad SED',
    'portal web is deliberately sparse for legibility; site mast type/implantation is unverified',
    'central support points are hung from the conceptual concourse frame; no approved OHE/roof integration drawing inspected',
    'contact-wire stagger and sectioning are omitted',
  ];
  return group;
}
function addPlatformSheds(parent: THREE.Group, material: THREE.Material, detailMaterial: THREE.Material, firstZ: number, secondZ: number): void {
  const roofTransforms: Transform[] = [];
  const columnTransforms: Transform[] = [];
  const ribTransforms: Transform[] = [];
  const gutterTransforms: Transform[] = [];
  const roofTrusses: Segment[] = [];
  const roofLength = secondZ - firstZ;
  const roofGeometry = new THREE.BoxGeometry(PLATFORM_WIDTH + 0.6, 0.24, roofLength);
  const columnGeometry = new THREE.BoxGeometry(0.28, 6.6, 0.28);
  const ribGeometry = new THREE.BoxGeometry(1, 1, 1);
  const gutterGeometry = new THREE.BoxGeometry(1, 1, 1);
  const halfWidth = PLATFORM_WIDTH / 2 - 0.7;
  const roofMidZ = (firstZ + secondZ) / 2;
  const trussZs: number[] = [];
  for (let z = firstZ + 18; z <= secondZ - 18; z += 44) trussZs.push(z);

  for (let platformIndex = 0; platformIndex < SECUNDERABAD_LAYOUT.platformCount; platformIndex += 1) {
    const centerX = (TRACK_CENTERS[platformIndex] + TRACK_CENTERS[platformIndex + 1]) / 2;
    roofTransforms.push({
      position: new THREE.Vector3(centerX, 8.1, roofMidZ),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (let z = firstZ; z <= secondZ; z += 32) {
      for (const side of [-1, 1]) {
        columnTransforms.push({
          position: new THREE.Vector3(centerX + side * halfWidth, (PLATFORM_TOP_Y + 8.1) / 2, z),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    }

    // Shallow standing seams and two edge gutters make the long canopy read as
    // sheet roofing instead of a featureless block, while keeping all detail
    // within each platform's clear width.
    for (let seam = 0; seam < 7; seam += 1) {
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, seam / 6);
      ribTransforms.push({
        position: new THREE.Vector3(centerX + x, 8.29, roofMidZ),
        scale: new THREE.Vector3(0.055, 0.06, roofLength),
      });
    }
    for (const side of [-1, 1]) {
      gutterTransforms.push({
        position: new THREE.Vector3(centerX + side * (PLATFORM_WIDTH / 2 + 0.36), 8.1, roofMidZ),
        scale: new THREE.Vector3(0.18, 0.16, roofLength),
      });
    }

    for (const z of trussZs) {
      const left = centerX - halfWidth;
      const right = centerX + halfWidth;
      const apex = centerX;
      const topY = 7.82;
      const apexY = 7.88;
      const tieY = 7.13;
      roofTrusses.push(
        { start: new THREE.Vector3(left, topY, z), end: new THREE.Vector3(apex, apexY, z) },
        { start: new THREE.Vector3(apex, apexY, z), end: new THREE.Vector3(right, topY, z) },
        { start: new THREE.Vector3(left, tieY, z), end: new THREE.Vector3(right, tieY, z) },
        { start: new THREE.Vector3(left, tieY, z), end: new THREE.Vector3(apex, apexY, z) },
        { start: new THREE.Vector3(apex, apexY, z), end: new THREE.Vector3(right, tieY, z) },
        { start: new THREE.Vector3(apex, tieY, z), end: new THREE.Vector3(apex, apexY, z) },
      );
    }
  }

  addBoxInstances(parent, 'Existing platform roof sections — schematic retained bays', roofGeometry, material, roofTransforms);
  addBoxInstances(parent, 'Existing platform canopy columns', columnGeometry, material, columnTransforms);
  const roofSeams = addBoxInstances(parent, 'Fine standing-seam roof ribs — schematic sheet detail', ribGeometry, detailMaterial, ribTransforms);
  roofSeams.castShadow = false;
  roofSeams.receiveShadow = false;
  const gutters = addBoxInstances(parent, 'Platform canopy edge gutters — schematic', gutterGeometry, detailMaterial, gutterTransforms);
  gutters.castShadow = false;
  gutters.receiveShadow = false;
  const roofFrames = addBeamInstances(
    parent,
    'Sparse open steel platform-canopy trusses — kept below roof skin',
    new THREE.CylinderGeometry(0.034, 0.042, 1, 6),
    detailMaterial,
    roofTrusses,
    false,
  );
  roofFrames.receiveShadow = false;
}

function makeLiftSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a lift wayfinding panel.');
  context.fillStyle = '#174f48';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#e5c776';
  context.lineWidth = 6;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = '#fbf4df';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 46px Arial, sans-serif';
  context.fillText('LIFT  ↑', canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addRepresentativeAccessCores(parent: THREE.Group): void {
  const group = new THREE.Group();
  group.name = 'Representative planned lift and escalator nodes — schematic access cutaway';
  const glass = new THREE.MeshStandardMaterial({ color: '#a6c5c4', roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const frame = new THREE.MeshStandardMaterial({ color: '#7b8984', roughness: 0.62, metalness: 0.32 });
  const cabMaterial = new THREE.MeshStandardMaterial({ color: '#839997', roughness: 0.3, metalness: 0.18, transparent: true, opacity: 0.6, depthWrite: false });
  const liftSignMaterial = new THREE.MeshBasicMaterial({ map: makeLiftSignTexture(), side: THREE.DoubleSide });
  const treadMaterial = new THREE.MeshStandardMaterial({ color: '#454e4b', roughness: 0.8, metalness: 0.28 });
  const handrailMaterial = new THREE.MeshStandardMaterial({ color: '#68746f', roughness: 0.48, metalness: 0.44 });
  const shaftGlass: Transform[] = [];
  const shaftFrames: Transform[] = [];
  const elevatorCabs: Transform[] = [];
  const liftDoors: Transform[] = [];
  const liftSigns: Transform[] = [];
  const escalatorBases: Transform[] = [];
  const escalatorSteps: Transform[] = [];
  const escalatorRails: Segment[] = [];
  const lowerLevel = PLATFORM_TOP_Y;
  const upperLevel = 12.0;
  const shaftTop = 16.05;
  const shaftHeight = shaftTop - lowerLevel;
  const coreSites = [
    { platformIndex: 2, z: -22 },
    { platformIndex: 7, z: 22 },
  ];
  for (const site of coreSites) {
    const x = PLATFORM_CENTERS[site.platformIndex] ?? 0;
    const shaftCenterY = (lowerLevel + shaftTop) / 2;
    shaftGlass.push({
      position: new THREE.Vector3(x, shaftCenterY, site.z),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (const xSide of [-1, 1]) {
      for (const zSide of [-1, 1]) {
        shaftFrames.push({
          position: new THREE.Vector3(x + xSide * 1.2, shaftCenterY, site.z + zSide * 1.2),
          scale: new THREE.Vector3(0.12, shaftHeight, 0.12),
        });
      }
    }
    elevatorCabs.push({
      position: new THREE.Vector3(x, 6.1, site.z),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (const levelY of [lowerLevel + 1.1, upperLevel - 0.45]) {
      liftDoors.push({
        position: new THREE.Vector3(x, levelY, site.z + 1.23),
        scale: new THREE.Vector3(1, 1, 1),
      });
      liftSigns.push({
        position: new THREE.Vector3(x, levelY + 1.45, site.z + 1.26),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }

    for (const side of [-1, 1]) {
      const lowerZ = site.z + side * 18;
      const upperZ = site.z + side * 4;
      const rise = upperLevel - (lowerLevel + 0.18);
      const run = Math.abs(upperZ - lowerZ);
      const length = Math.hypot(run, rise);
      const angle = Math.atan2(rise, run);
      const rampRotation = side < 0 ? -angle : angle;
      const escalatorX = x + 2.48;
      const centerZ = (lowerZ + upperZ) / 2;
      const centerY = (lowerLevel + 0.18 + upperLevel) / 2;
      escalatorBases.push({
        position: new THREE.Vector3(escalatorX, centerY, centerZ),
        scale: new THREE.Vector3(1, 1, length),
        rotationX: rampRotation,
      });
      for (let step = 0; step <= 42; step += 1) {
        const t = step / 42;
        escalatorSteps.push({
          position: new THREE.Vector3(escalatorX, lowerLevel + 0.18 + rise * t, lowerZ + (upperZ - lowerZ) * t),
          scale: new THREE.Vector3(1, 1, 1),
          rotationX: rampRotation,
        });
      }
      for (const railSide of [-1, 1]) {
        const yLift = 0.92;
        escalatorRails.push({
          start: new THREE.Vector3(escalatorX + railSide * 0.72, lowerLevel + 0.18 + yLift, lowerZ),
          end: new THREE.Vector3(escalatorX + railSide * 0.72, upperLevel + yLift, upperZ),
        });
      }
    }
  }
  const glassMesh = addBoxInstances(group, 'Transparent lift shaft glazing — representative access core', new THREE.BoxGeometry(2.28, shaftHeight, 2.28), glass, shaftGlass);
  glassMesh.castShadow = false;
  glassMesh.receiveShadow = false;
  const frameMesh = addBoxInstances(group, 'Slim lift-core corner mullions', new THREE.BoxGeometry(1, 1, 1), frame, shaftFrames);
  frameMesh.castShadow = false;
  frameMesh.receiveShadow = false;
  const cabMesh = addBoxInstances(group, 'Glass lift cars inside the schematic shafts', new THREE.BoxGeometry(1.55, 2.0, 1.55), cabMaterial, elevatorCabs);
  cabMesh.castShadow = false;
  cabMesh.receiveShadow = false;
  const doorMesh = addBoxInstances(group, 'Lift landing doors at platform and concourse levels', new THREE.BoxGeometry(1.1, 2.2, 0.055), frame, liftDoors);
  doorMesh.castShadow = false;
  doorMesh.receiveShadow = false;
  const liftSignMesh = addBoxInstances(group, 'Lift wayfinding marker panels', new THREE.BoxGeometry(0.78, 0.32, 0.05), liftSignMaterial, liftSigns);
  liftSignMesh.castShadow = false;
  liftSignMesh.receiveShadow = false;
  const rampMesh = addBoxInstances(group, 'Inclined escalator tread-bed assemblies — schematic', new THREE.BoxGeometry(1.25, 0.32, 1), treadMaterial, escalatorBases);
  rampMesh.castShadow = false;
  rampMesh.receiveShadow = false;
  const stepMesh = addBoxInstances(group, 'Visible escalator step treads — schematic detail', new THREE.BoxGeometry(1.0, 0.075, 0.44), treadMaterial, escalatorSteps);
  stepMesh.castShadow = false;
  stepMesh.receiveShadow = false;
  const rails = addBeamInstances(group, 'Escalator handrails — sparse, kept clear of track/OHE', new THREE.CylinderGeometry(0.045, 0.05, 1, 6), handrailMaterial, escalatorRails, false);
  rails.receiveShadow = false;
  group.userData.caveat = 'Two representative access cores only; lift/escalator counts and locations are not a surveyed or approved architectural layout.';
  parent.add(group);
}

function makeIntermodalWayfindingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a station wayfinding panel.');
  context.fillStyle = '#134c47';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#d9c27d';
  context.lineWidth = 8;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  context.fillStyle = '#fbf5df';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 35px Arial, sans-serif';
  context.fillText('CITY CONNECTIONS', canvas.width / 2, 75);
  context.fillStyle = '#e5d89e';
  context.font = '700 31px Arial, sans-serif';
  context.fillText('METRO  ·  BUS', canvas.width / 2, 169);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addIntermodalWayfinding(parent: THREE.Group): void {
  const group = new THREE.Group();
  group.name = 'Planned city-connection wayfinding — no directional alignment claimed';
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#66736d', roughness: 0.62, metalness: 0.28 });
  const postTransforms: Transform[] = [];
  const signTransforms: Transform[] = [];
  const signMaterial = new THREE.MeshBasicMaterial({ map: makeIntermodalWayfindingTexture(), side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = side * 137;
      const z = zSide * 74;
      postTransforms.push({ position: new THREE.Vector3(x, 2.15, z), scale: new THREE.Vector3(1, 1, 1) });
      signTransforms.push({
        position: new THREE.Vector3(x, 3.85, z),
        scale: new THREE.Vector3(1, 1, 1),
        rotationY: side < 0 ? -Math.PI / 2 : Math.PI / 2,
      });
    }
  }
  const posts = addBoxInstances(group, 'Freestanding city-transfer wayfinding posts — conceptual', new THREE.BoxGeometry(0.18, 4.3, 0.18), postMaterial, postTransforms);
  posts.castShadow = false;
  posts.receiveShadow = false;
  addPlaneInstances(group, 'Metro/bus connection panels — planned-only generic wayfinding', new THREE.PlaneGeometry(2.4, 1.2), signMaterial, signTransforms);
  group.userData.caveat = 'Sign panels indicate reported multimodal integration only; no exit direction or exact location is represented.';
  parent.add(group);
}

function addAirConcourse(parent: THREE.Group, complete: boolean, steel: THREE.Material, deckMaterial: THREE.Material, roofMaterial: THREE.Material): void {
  const group = new THREE.Group();
  group.name = complete
    ? 'Planned two-level air concourse — 108 x 120 m reported footprint, orientation schematic'
    : 'Active redevelopment — open frame at reported air-concourse footprint; work phasing illustrative';
  const length = 108;
  const width = 120;
  const zStart = -length / 2;
  const zEnd = length / 2;
  // Four open portal frames are enough to suggest construction without turning
  // the station into a dense lattice. The chosen column lines are platform
  // centres, never track centres.
  const frameZs = [-54, -18, 18, 54];
  const postTransforms: Transform[] = [];
  const crossSegments: Segment[] = [];
  const supportXs = PLATFORM_CENTERS.filter((_, index) => index === 1 || index === 3 || index === 6 || index === 8);
  const concourseBaseY = PLATFORM_TOP_Y;
  const concourseTopY = 19.2;
  for (const z of frameZs) {
    for (const x of supportXs) {
      postTransforms.push({
        position: new THREE.Vector3(x, (concourseBaseY + concourseTopY) / 2, z),
        scale: new THREE.Vector3(0.3, concourseTopY - concourseBaseY, 0.3),
      });
    }
    crossSegments.push(
      { start: new THREE.Vector3(-width / 2, 10.5, z), end: new THREE.Vector3(width / 2, 10.5, z) },
      { start: new THREE.Vector3(-width / 2, 14.7, z), end: new THREE.Vector3(width / 2, 14.7, z) },
      { start: new THREE.Vector3(-width / 2, 18.5, z), end: new THREE.Vector3(width / 2, 18.5, z) },
    );
  }

  addBoxInstances(group, 'Air-concourse columns — sparse schematic supports on platforms', new THREE.BoxGeometry(1, 1, 1), steel, postTransforms);
  addBeamInstances(group, 'Air-concourse transverse girders — four open frames', new THREE.CylinderGeometry(0.09, 0.11, 1, 6), steel, crossSegments);

  const longitudinalBeams: Segment[] = [];
  for (const height of [10.5, 14.7, 18.5]) {
    for (const x of supportXs) {
      longitudinalBeams.push({ start: new THREE.Vector3(x, height, zStart), end: new THREE.Vector3(x, height, zEnd) });
    }
  }
  addBeamInstances(group, 'Air-concourse longitudinal girders', new THREE.CylinderGeometry(0.11, 0.14, 1, 6), steel, longitudinalBeams);
  group.userData.reportedPlanDimensionsMeters = [108, 120];
  group.userData.orientation = 'schematic; 120 m span placed across track group';

  if (complete) {
    const deckWidth = width - 4;
    const deckLength = length - 4;
    const deck1 = new THREE.Mesh(new THREE.BoxGeometry(deckWidth, 0.55, deckLength), deckMaterial);
    deck1.name = 'Planned lower air-concourse level — translucent visual cutaway';
    deck1.position.set(0, 12.1, 0);
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(deckWidth, 0.55, deckLength), deckMaterial);
    deck2.name = 'Planned upper concourse / roof-plaza level — translucent visual cutaway';
    deck2.position.set(0, 16.2, 0);
    const throughRoof = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_SPAN_X + 24, 0.42, SECUNDERABAD_LAYOUT.platformLength),
      roofMaterial,
    );
    throughRoof.name = 'Planned through-roof over platforms and tracks — length schematic';
    throughRoof.position.set(0, 20.1, 0);
    group.add(deck1, deck2, throughRoof);
    addRepresentativeAccessCores(group);
  }

  parent.add(group);
}

export type SecunderabadYardParts = {
  common: THREE.Group;
  current: THREE.Group;
  future: THREE.Group;
  night: {
    lightGroup: THREE.Group;
    floodLights: THREE.PointLight[];
    poolMaterial: THREE.MeshBasicMaterial;
    lampMaterial: THREE.MeshStandardMaterial;
    windowMaterial: THREE.MeshStandardMaterial;
    displayMaterial: THREE.MeshStandardMaterial;
    streetLampMaterial: THREE.MeshStandardMaterial;
    updateStationClock: (hour: number) => void;
  };
};

export function createSecunderabadYard(groundHeight: (x: number, z: number) => number = () => STATION_BASE_Y): SecunderabadYardParts {
  const common = new THREE.Group();
  common.name = 'Secunderabad Junction — existing platform group (best-evidence schematic)';
  common.position.y = STATION_BASE_Y;
  common.userData.sourceBasis = 'SCR 10-platform profile; 2024 reported 11-track count; secondary service-track lead; BG Schedule of Dimensions';
  common.userData.caveat = 'Not a Station Working Rule diagram; track-to-platform pairing and approach throats are schematic/omitted.';

  const current = new THREE.Group();
  current.name = 'Current — 2026 active redevelopment, construction staging simplified';
  current.position.y = STATION_BASE_Y;
  const future = new THREE.Group();
  future.name = 'Future — planned redevelopment, existing track group carried forward';
  future.position.y = STATION_BASE_Y;

  const asphaltTexture = makeNoiseTexture('#565c59', 14);
  asphaltTexture.repeat.set(5, 30);
  const ballastTexture = makeNoiseTexture('#66645d', 21);
  ballastTexture.repeat.set(3, 180);
  const concreteTexture = makeNoiseTexture('#aaa79c', 31);
  concreteTexture.repeat.set(2, 80);
  const tactileTexture = makeNoiseTexture('#b5b0a2', 48);
  tactileTexture.repeat.set(1, 90);
  const asphalt = new THREE.MeshStandardMaterial({ color: '#ddd9cd', map: asphaltTexture, roughness: 0.92, metalness: 0.01 });
  const ballast = new THREE.MeshStandardMaterial({ color: '#d8d4c9', map: ballastTexture, roughness: 0.98, metalness: 0 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#ffffff', map: concreteTexture, roughness: 0.94, metalness: 0 });
  const tactile = new THREE.MeshStandardMaterial({ color: '#c4bba3', map: tactileTexture, roughness: 0.99, metalness: 0 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#e3c75c', roughness: 0.84, metalness: 0.02 });
  const sleeper = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0 });
  const rail = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.34, metalness: 0.82 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9ba39b', roughness: 0.7, metalness: 0.18 });
  const oldRoof = new THREE.MeshStandardMaterial({ color: '#b8b8ae', roughness: 0.88, metalness: 0.08 });
  const roofDetail = new THREE.MeshStandardMaterial({ color: '#78817d', roughness: 0.68, metalness: 0.36 });
  const concourseSteel = new THREE.MeshStandardMaterial({ color: '#b7b9ae', roughness: 0.72, metalness: 0.16 });
  const deck = new THREE.MeshStandardMaterial({ color: '#d5d1c6', roughness: 0.74, metalness: 0.06, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const roof = new THREE.MeshStandardMaterial({ color: '#e1e1da', roughness: 0.6, metalness: 0.18, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const wire = new THREE.MeshStandardMaterial({ color: '#b1a68f', roughness: 0.62, metalness: 0.18 });

  const siteGround = new THREE.Mesh(
    new THREE.BoxGeometry(SECUNDERABAD_LAYOUT.sitePadWidth, 0.35, SECUNDERABAD_LAYOUT.sitePadLength),
    asphalt,
  );
  siteGround.name = 'Station forecourt and rail-site hardstanding — raised pad removes terrain overlap';
  // Top is 10 cm above the station base; the slab bottom meets the flat terrain cut-out.
  siteGround.position.set(0, -0.075, 0);
  siteGround.receiveShadow = true;
  common.add(siteGround);
  common.add(makeStationForecourt());
  common.add(makeRailGroup(ballast, sleeper, rail));
  const platforms = makePlatforms(concrete, tactile, yellow);
  common.add(platforms);
  common.add(makeOheGroup(steel, wire));
  const surroundings = createSecunderabadSurroundings(
    groundHeight,
    SECUNDERABAD_LAYOUT.sitePadWidth,
    SECUNDERABAD_LAYOUT.sitePadLength,
  );
  common.add(surroundings.group);

  const nightLightGroup = new THREE.Group();
  nightLightGroup.name = 'Station floodlight contribution — non-photometric night study';
  nightLightGroup.visible = false;
  const floodLights: THREE.PointLight[] = [];
  const floodlightAnchors = [
    { platform: 0, z: -220 },
    { platform: 2, z: -110 },
    { platform: 4, z: 0 },
    { platform: 6, z: 110 },
    { platform: 8, z: 220 },
  ];
  for (const anchor of floodlightAnchors) {
    const x = PLATFORM_CENTERS[anchor.platform] ?? 0;
    const light = new THREE.PointLight('#ffd8a7', 0, 190, 2);
    light.name = `Warm station light field — schematic platform ${anchor.platform + 1}`;
    light.position.set(x, 8.8, anchor.z);
    light.castShadow = false;
    floodLights.push(light);
    nightLightGroup.add(light);
  }
  common.add(nightLightGroup);

  addPlatformSheds(current, oldRoof, roofDetail, -315, -190);
  addPlatformSheds(current, oldRoof, roofDetail, 190, 315);
  addAirConcourse(current, false, concourseSteel, deck, roof);
  addAirConcourse(future, true, concourseSteel, deck, roof);
  addIntermodalWayfinding(future);
  const buildings = createSecunderabadBuildings();
  current.add(buildings.current);
  future.add(buildings.future);

  current.userData.timeline = '2026-10 reference; active redevelopment reported, but exact work bays are illustrative.';
  current.userData.trackChanges = 'No future track change claimed.';
  future.userData.timeline = 'Planned post-redevelopment view; not commissioning evidence.';
  future.userData.trackChanges = 'Existing best-evidence 10-platform / 11-track schematic carried forward; no approved yard change verified.';

  return {
    common,
    current,
    future,
    night: {
      lightGroup: nightLightGroup,
      floodLights,
      poolMaterial: platforms.userData.nightPoolMaterial as THREE.MeshBasicMaterial,
      lampMaterial: platforms.userData.platformLampMaterial as THREE.MeshStandardMaterial,
      windowMaterial: buildings.windowMaterial,
      displayMaterial: platforms.userData.nightDisplayMaterial as THREE.MeshStandardMaterial,
      streetLampMaterial: surroundings.streetLampMaterial,
      updateStationClock: platforms.userData.updateStationClock as (hour: number) => void,
    },
  };
}
