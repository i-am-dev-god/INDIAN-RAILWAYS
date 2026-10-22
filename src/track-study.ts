import * as THREE from 'three';

export const TRACK_STUDY = {
  startZ: -270,
  endZ: 270,
  centerSpacing: 4.265,
  gauge: 1.676,
  railHeadWidth: 0.072,
  railHeight: 0.172,
  sleeperLength: 2.75,
  sleeperThickness: 0.21,
  sleeperWidth: 0.25,
  sleeperDensityPerKm: 1_660,
  ballastDepth: 0.3,
  oheSpan: 60,
  oheContactHeight: 5.6,
  oheCatenarySupportHeight: 6.95,
  oheDropperSpacing: 8,
} as const;

export type TerrainSampler = (x: number, z: number) => number;
export type TrackGradeSampler = (z: number) => number;

const TRACK_CENTERS = [-TRACK_STUDY.centerSpacing / 2, TRACK_STUDY.centerSpacing / 2];
const TRACK_LENGTH = TRACK_STUDY.endZ - TRACK_STUDY.startZ;
const SLEEPER_SPACING = 1_000 / TRACK_STUDY.sleeperDensityPerKm;
const RAIL_CENTER_SPACING = TRACK_STUDY.gauge + TRACK_STUDY.railHeadWidth;
const RAIL_CENTER_OFFSET = RAIL_CENTER_SPACING / 2;
const RAIL_TOP_ABOVE_GRADE = TRACK_STUDY.ballastDepth
  + TRACK_STUDY.sleeperThickness
  + 0.025
  + TRACK_STUDY.railHeight;
const RIGHT_OF_WAY_HALF_WIDTH = 5.15;

/** Smooths the existing terrain profile into a gentle railway formation grade. */
export function makeTrackGrade(terrainHeight: TerrainSampler): TrackGradeSampler {
  const sampleStep = 5;
  const sampleCount = Math.ceil(TRACK_LENGTH / sampleStep) + 1;
  const rawSamples = Array.from({ length: sampleCount }, (_, index) => {
    const z = Math.min(TRACK_STUDY.startZ + index * sampleStep, TRACK_STUDY.endZ);
    return terrainHeight(0, z);
  });

  const radius = 4;
  const sigma = 2.25;
  const smoothedSamples = rawSamples.map((_, index) => {
    let weightedHeight = 0;
    let totalWeight = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sampleIndex = Math.min(rawSamples.length - 1, Math.max(0, index + offset));
      const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
      weightedHeight += rawSamples[sampleIndex] * weight;
      totalWeight += weight;
    }
    return weightedHeight / totalWeight;
  });

  return (rawZ: number): number => {
    const z = THREE.MathUtils.clamp(rawZ, TRACK_STUDY.startZ, TRACK_STUDY.endZ);
    const position = (z - TRACK_STUDY.startZ) / sampleStep;
    const firstIndex = Math.min(Math.floor(position), smoothedSamples.length - 1);
    const secondIndex = Math.min(firstIndex + 1, smoothedSamples.length - 1);
    return THREE.MathUtils.lerp(smoothedSamples[firstIndex], smoothedSamples[secondIndex], position - firstIndex);
  };
}

/** Blend a flat, engineered strip into the organic ground without a sharp terrain seam. */
export function applyTrackFormationToTerrain(
  x: number,
  z: number,
  naturalHeight: number,
  gradeAt: TrackGradeSampler,
): number {
  if (z < TRACK_STUDY.startZ || z > TRACK_STUDY.endZ) return naturalHeight;
  const naturalGroundWeight = THREE.MathUtils.smoothstep(Math.abs(x), 6, 14);
  return THREE.MathUtils.lerp(gradeAt(z), naturalHeight, naturalGroundWeight);
}

/** Corridor mask used to keep rocks, scrub, and grass out of the track/OHE right-of-way. */
export function isTrackRightOfWay(x: number, z: number, extraClearance = 0): boolean {
  return z >= TRACK_STUDY.startZ - 8
    && z <= TRACK_STUDY.endZ + 8
    && Math.abs(x) <= RIGHT_OF_WAY_HALF_WIDTH + extraClearance;
}

function makeBallastTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the procedural ballast texture.');

  let state = 741_203;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };

  const base = context.createImageData(size, size);
  for (let index = 0; index < base.data.length; index += 4) {
    const value = 93 + Math.round(random() * 41);
    base.data[index] = value;
    base.data[index + 1] = value + Math.round(random() * 4);
    base.data[index + 2] = value - Math.round(random() * 3);
    base.data[index + 3] = 255;
  }
  context.putImageData(base, 0, 0);

  const stones = ['#555a56', '#676a64', '#77776f', '#858176', '#625f58', '#979186'];
  for (let stone = 0; stone < 4_800; stone += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 0.7 + random() * 2.2;
    const sides = 4 + Math.floor(random() * 4);
    context.beginPath();
    for (let point = 0; point < sides; point += 1) {
      const angle = (point / sides) * Math.PI * 2;
      const pointRadius = radius * (0.68 + random() * 0.48);
      const px = x + Math.cos(angle) * pointRadius;
      const py = y + Math.sin(angle) * pointRadius;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = stones[Math.floor(random() * stones.length)];
    context.globalAlpha = 0.3 + random() * 0.48;
    context.fill();
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function makeBallastGeometry(gradeAt: TrackGradeSampler): THREE.BufferGeometry {
  const crossSection = [
    { x: -4.8, height: 0 },
    { x: -3.7, height: TRACK_STUDY.ballastDepth },
    { x: 3.7, height: TRACK_STUDY.ballastDepth },
    { x: 4.8, height: 0 },
  ];
  const segments = Math.ceil(TRACK_LENGTH / 2.5);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= segments; row += 1) {
    const z = THREE.MathUtils.lerp(TRACK_STUDY.startZ, TRACK_STUDY.endZ, row / segments);
    const grade = gradeAt(z);
    for (const point of crossSection) {
      positions.push(point.x, grade + point.height, z);
      uvs.push((point.x + 4.8) * 1.1, (z - TRACK_STUDY.startZ) * 0.9);
    }
  }

  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < crossSection.length - 1; column += 1) {
      const a = row * crossSection.length + column;
      const b = a + 1;
      const d = (row + 1) * crossSection.length + column;
      const c = d + 1;
      // Winding is upward-facing in Three.js world coordinates.
      indices.push(a, c, b, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

const RAIL_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-0.075, 0], [0.075, 0], [0.075, 0.016], [0.052, 0.025],
  [0.026, 0.031], [0.0085, 0.042], [0.0085, 0.119], [0.019, 0.128],
  [0.028, 0.138], [0.034, 0.15], [0.036, 0.161], [0.036, TRACK_STUDY.railHeight],
  [-0.036, TRACK_STUDY.railHeight], [-0.036, 0.161], [-0.034, 0.15],
  [-0.028, 0.138], [-0.019, 0.128], [-0.0085, 0.119], [-0.0085, 0.042],
  [-0.026, 0.031], [-0.052, 0.025], [-0.075, 0.016],
];

function makeRailGeometry(gradeAt: TrackGradeSampler): THREE.BufferGeometry {
  const longitudinalSegments = Math.ceil(TRACK_LENGTH / 2);
  const samplesPerRail = longitudinalSegments + 1;
  const positions: number[] = [];
  const indices: number[] = [];
  let railNumber = 0;

  for (const trackCenter of TRACK_CENTERS) {
    for (const side of [-1, 1]) {
      const railCenterX = trackCenter + side * RAIL_CENTER_OFFSET;
      const vertexBase = railNumber * samplesPerRail * RAIL_PROFILE.length;
      for (let sample = 0; sample <= longitudinalSegments; sample += 1) {
        const z = THREE.MathUtils.lerp(TRACK_STUDY.startZ, TRACK_STUDY.endZ, sample / longitudinalSegments);
        const railBaseY = gradeAt(z) + TRACK_STUDY.ballastDepth + TRACK_STUDY.sleeperThickness + 0.025;
        for (const [offsetX, offsetY] of RAIL_PROFILE) {
          positions.push(railCenterX + offsetX, railBaseY + offsetY, z);
        }
      }

      for (let sample = 0; sample < longitudinalSegments; sample += 1) {
        for (let profileIndex = 0; profileIndex < RAIL_PROFILE.length; profileIndex += 1) {
          const nextProfileIndex = (profileIndex + 1) % RAIL_PROFILE.length;
          const first = vertexBase + sample * RAIL_PROFILE.length + profileIndex;
          const nextProfile = vertexBase + sample * RAIL_PROFILE.length + nextProfileIndex;
          const nextSampleProfile = vertexBase + (sample + 1) * RAIL_PROFILE.length + nextProfileIndex;
          const nextSample = vertexBase + (sample + 1) * RAIL_PROFILE.length + profileIndex;
          indices.push(first, nextProfile, nextSampleProfile, first, nextSampleProfile, nextSample);
        }
      }
      railNumber += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

interface BoxTransform {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationY?: number;
}

function makeBoxInstances(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transforms: readonly BoxTransform[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const object = new THREE.Object3D();
  for (let index = 0; index < transforms.length; index += 1) {
    const transform = transforms[index];
    object.position.copy(transform.position);
    object.scale.copy(transform.scale);
    object.rotation.set(0, transform.rotationY ?? 0, 0);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

interface BeamSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

function makeBeamInstances(
  name: string,
  geometry: THREE.CylinderGeometry,
  material: THREE.Material,
  segments: readonly BeamSegment[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const object = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    direction.subVectors(segment.end, segment.start);
    const length = direction.length();
    object.position.copy(segment.start).add(segment.end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(up, direction.normalize());
    object.scale.set(1, length, 1);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function makeSupportZs(): number[] {
  const supportZs: number[] = [];
  for (let z = TRACK_STUDY.startZ; z <= TRACK_STUDY.endZ; z += TRACK_STUDY.oheSpan) {
    supportZs.push(z);
  }
  if (supportZs[supportZs.length - 1] !== TRACK_STUDY.endZ) supportZs.push(TRACK_STUDY.endZ);
  return supportZs;
}

function makeWirePoints(
  trackCenter: number,
  supportZs: readonly number[],
  gradeAt: TrackGradeSampler,
  wire: 'contact' | 'catenary',
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const samplesPerSpan = 12;

  for (let span = 0; span < supportZs.length - 1; span += 1) {
    const startZ = supportZs[span];
    const endZ = supportZs[span + 1];
    const startStagger = span % 2 === 0 ? -0.16 : 0.16;
    const endStagger = -startStagger;

    for (let sample = span === 0 ? 0 : 1; sample <= samplesPerSpan; sample += 1) {
      const t = sample / samplesPerSpan;
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      const railTop = gradeAt(z) + RAIL_TOP_ABOVE_GRADE;
      const sag = 4 * t * (1 - t);
      const x = trackCenter + THREE.MathUtils.lerp(startStagger, endStagger, t);
      const y = wire === 'contact'
        ? railTop + TRACK_STUDY.oheContactHeight + 0.04 - 0.08 * sag
        : railTop + TRACK_STUDY.oheCatenarySupportHeight - 0.22 * sag;
      points.push(new THREE.Vector3(x, y, z));
    }
  }

  return points;
}

function addOhe(
  group: THREE.Group,
  gradeAt: TrackGradeSampler,
  supportZs: readonly number[],
): void {
  const steel = new THREE.MeshStandardMaterial({ color: '#68716e', metalness: 0.62, roughness: 0.56 });
  const footing = new THREE.MeshStandardMaterial({ color: '#4d514e', metalness: 0.28, roughness: 0.83 });
  const porcelain = new THREE.MeshStandardMaterial({ color: '#a99e85', metalness: 0.08, roughness: 0.72 });
  const contactMaterial = new THREE.MeshStandardMaterial({ color: '#877b63', metalness: 0.78, roughness: 0.42 });
  const catenaryMaterial = new THREE.MeshStandardMaterial({ color: '#69716d', metalness: 0.68, roughness: 0.48 });

  const mastHeight = 9.25;
  const mastWidth = 0.17;
  const mastOffset = 2.5 + mastWidth / 2;
  const mastTransforms: BoxTransform[] = [];
  const baseTransforms: BoxTransform[] = [];
  const boomTransforms: BoxTransform[] = [];
  const braceSegments: BeamSegment[] = [];
  const insulatorTransforms: BoxTransform[] = [];

  for (let trackIndex = 0; trackIndex < TRACK_CENTERS.length; trackIndex += 1) {
    const trackCenter = TRACK_CENTERS[trackIndex];
    const outward = trackIndex === 0 ? -1 : 1;
    const inward = -outward;

    for (let supportIndex = 0; supportIndex < supportZs.length; supportIndex += 1) {
      const z = supportZs[supportIndex];
      const grade = gradeAt(z);
      const stagger = supportIndex % 2 === 0 ? -0.16 : 0.16;
      const wireX = trackCenter + stagger;
      const mastX = trackCenter + outward * mastOffset;
      const boomEndX = trackCenter + inward * 0.34;
      const boomY = grade + RAIL_TOP_ABOVE_GRADE + TRACK_STUDY.oheCatenarySupportHeight;
      const contactY = grade + RAIL_TOP_ABOVE_GRADE + TRACK_STUDY.oheContactHeight + 0.04;

      mastTransforms.push({
        position: new THREE.Vector3(mastX, grade + mastHeight / 2, z),
        scale: new THREE.Vector3(mastWidth, mastHeight, 0.14),
      });
      baseTransforms.push({
        position: new THREE.Vector3(mastX, grade + 0.035, z),
        scale: new THREE.Vector3(0.48, 0.07, 0.44),
      });
      boomTransforms.push({
        position: new THREE.Vector3((mastX + boomEndX) / 2, boomY, z),
        scale: new THREE.Vector3(Math.abs(boomEndX - mastX), 0.075, 0.07),
      });

      braceSegments.push({
        start: new THREE.Vector3(mastX + inward * 0.28, grade + 5.35, z),
        end: new THREE.Vector3(boomEndX, boomY - 0.05, z),
      });
      braceSegments.push({
        start: new THREE.Vector3(boomEndX, boomY - 0.12, z),
        end: new THREE.Vector3(wireX, contactY + 0.13, z),
      });

      insulatorTransforms.push(
        {
          position: new THREE.Vector3(boomEndX, boomY - 0.2, z),
          scale: new THREE.Vector3(1, 0.24, 1),
        },
        {
          position: new THREE.Vector3(wireX, contactY + 0.13, z),
          scale: new THREE.Vector3(1, 0.2, 1),
        },
      );
    }
  }

  const mastMesh = makeBoxInstances('Galvanized OHE masts', new THREE.BoxGeometry(1, 1, 1), steel, mastTransforms);
  mastMesh.castShadow = true;
  mastMesh.receiveShadow = true;
  group.add(mastMesh);
  group.add(makeBoxInstances('OHE mast base plates', new THREE.BoxGeometry(1, 1, 1), footing, baseTransforms));
  group.add(makeBoxInstances('OHE cantilever arms', new THREE.BoxGeometry(1, 1, 1), steel, boomTransforms));
  group.add(makeBeamInstances(
    'OHE cantilever braces and steady arms',
    new THREE.CylinderGeometry(0.025, 0.034, 1, 6),
    steel,
    braceSegments,
  ));
  group.add(makeBoxInstances(
    'Porcelain OHE insulators',
    new THREE.CylinderGeometry(0.035, 0.045, 1, 8),
    porcelain,
    insulatorTransforms,
  ));

  const dropperSegments: BeamSegment[] = [];
  const dropperGeometry = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4);
  const samplesPerSpan = 12;
  for (const trackCenter of TRACK_CENTERS) {
    for (let span = 0; span < supportZs.length - 1; span += 1) {
      const startZ = supportZs[span];
      const endZ = supportZs[span + 1];
      const spanLength = endZ - startZ;
      const dropperCount = Math.ceil(spanLength / TRACK_STUDY.oheDropperSpacing);
      const startStagger = span % 2 === 0 ? -0.16 : 0.16;
      const endStagger = -startStagger;

      for (let dropper = 1; dropper < dropperCount; dropper += 1) {
        const t = dropper / dropperCount;
        const z = THREE.MathUtils.lerp(startZ, endZ, t);
        const grade = gradeAt(z);
        const railTop = grade + RAIL_TOP_ABOVE_GRADE;
        const sag = 4 * t * (1 - t);
        const x = trackCenter + THREE.MathUtils.lerp(startStagger, endStagger, t);
        const contactY = railTop + TRACK_STUDY.oheContactHeight + 0.04 - 0.08 * sag;
        const catenaryY = railTop + TRACK_STUDY.oheCatenarySupportHeight - 0.22 * sag;
        dropperSegments.push({
          start: new THREE.Vector3(x, contactY, z),
          end: new THREE.Vector3(x, catenaryY, z),
        });
      }
    }
  }
  group.add(makeBeamInstances('OHE droppers', dropperGeometry, catenaryMaterial, dropperSegments));

  for (const trackCenter of TRACK_CENTERS) {
    const contactCurve = new THREE.CatmullRomCurve3(makeWirePoints(trackCenter, supportZs, gradeAt, 'contact'), false, 'centripetal');
    const catenaryCurve = new THREE.CatmullRomCurve3(makeWirePoints(trackCenter, supportZs, gradeAt, 'catenary'), false, 'centripetal');
    const contactWire = new THREE.Mesh(
      new THREE.TubeGeometry(contactCurve, (supportZs.length - 1) * samplesPerSpan * 4, 0.006, 5, false),
      contactMaterial,
    );
    contactWire.name = '107 mm² copper OHE contact wire (visually scaled)';
    contactWire.frustumCulled = false;
    const catenaryWire = new THREE.Mesh(
      new THREE.TubeGeometry(catenaryCurve, (supportZs.length - 1) * samplesPerSpan * 4, 0.0045, 5, false),
      catenaryMaterial,
    );
    catenaryWire.name = 'OHE catenary wire (visually scaled)';
    catenaryWire.frustumCulled = false;
    group.add(contactWire, catenaryWire);
  }
}

export function createTrackStudy(gradeAt: TrackGradeSampler): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Scene 02 — illustrative Secunderabad–Kazipet double track and OHE';

  const ballast = new THREE.Mesh(
    makeBallastGeometry(gradeAt),
    new THREE.MeshStandardMaterial({
      color: '#e0ddd3',
      map: makeBallastTexture(),
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  ballast.name = 'Continuous crushed-stone double-track ballast shoulders';
  ballast.receiveShadow = true;
  group.add(ballast);

  const sleepers: Array<{ trackCenter: number; z: number; grade: number }> = [];
  const sleeperCount = Math.floor(TRACK_LENGTH / SLEEPER_SPACING) + 1;
  for (const trackCenter of TRACK_CENTERS) {
    for (let sleeper = 0; sleeper < sleeperCount; sleeper += 1) {
      const z = TRACK_STUDY.startZ + sleeper * SLEEPER_SPACING;
      if (z > TRACK_STUDY.endZ) break;
      sleepers.push({ trackCenter, z, grade: gradeAt(z) });
    }
  }

  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0 });
  const sleeperMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(TRACK_STUDY.sleeperLength, TRACK_STUDY.sleeperThickness, TRACK_STUDY.sleeperWidth),
    sleeperMaterial,
    sleepers.length,
  );
  sleeperMesh.name = 'PSC sleepers — 1660 per kilometre reference';
  sleeperMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  sleeperMesh.receiveShadow = true;
  const object = new THREE.Object3D();
  const sleeperColor = new THREE.Color();
  let colorSeed = 28_417;
  const randomShade = (): number => {
    colorSeed = (Math.imul(colorSeed, 1_664_525) + 1_013_904_223) >>> 0;
    return 0.82 + (colorSeed / 4_294_967_296) * 0.24;
  };
  for (let index = 0; index < sleepers.length; index += 1) {
    const sleeper = sleepers[index];
    object.position.set(
      sleeper.trackCenter,
      sleeper.grade + TRACK_STUDY.ballastDepth + TRACK_STUDY.sleeperThickness / 2,
      sleeper.z,
    );
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.updateMatrix();
    sleeperMesh.setMatrixAt(index, object.matrix);
    sleeperColor.setRGB(0.48 * randomShade(), 0.49 * randomShade(), 0.47 * randomShade());
    sleeperMesh.setColorAt(index, sleeperColor);
  }
  sleeperMesh.instanceMatrix.needsUpdate = true;
  if (sleeperMesh.instanceColor) sleeperMesh.instanceColor.needsUpdate = true;
  sleeperMesh.computeBoundingSphere();
  group.add(sleeperMesh);

  const padTransforms: BoxTransform[] = [];
  const clipTransforms: BoxTransform[] = [];
  for (const sleeper of sleepers) {
    for (const side of [-1, 1]) {
      const railX = sleeper.trackCenter + side * RAIL_CENTER_OFFSET;
      const baseY = sleeper.grade + TRACK_STUDY.ballastDepth + TRACK_STUDY.sleeperThickness;
      padTransforms.push({
        position: new THREE.Vector3(railX, baseY + 0.0125, sleeper.z),
        scale: new THREE.Vector3(0.19, 0.025, 0.12),
      });
      for (const clipSide of [-1, 1]) {
        clipTransforms.push({
          position: new THREE.Vector3(railX + clipSide * 0.09, baseY + 0.02, sleeper.z),
          scale: new THREE.Vector3(0.055, 0.026, 0.035),
        });
      }
    }
  }

  const padMaterial = new THREE.MeshStandardMaterial({ color: '#373b39', roughness: 0.86, metalness: 0.08 });
  const pads = makeBoxInstances('Dark rail-seat pads', new THREE.BoxGeometry(1, 1, 1), padMaterial, padTransforms);
  pads.receiveShadow = true;
  group.add(pads);
  const clipMaterial = new THREE.MeshStandardMaterial({ color: '#454946', roughness: 0.62, metalness: 0.46 });
  group.add(makeBoxInstances('Elastic-clip fastening details', new THREE.BoxGeometry(1, 1, 1), clipMaterial, clipTransforms));

  const rails = new THREE.Mesh(
    makeRailGeometry(gradeAt),
    new THREE.MeshStandardMaterial({ color: '#77817d', metalness: 0.78, roughness: 0.38 }),
  );
  rails.name = 'Continuous 60 kg-style rail sections with a detailed rail profile';
  rails.receiveShadow = true;
  group.add(rails);

  const supportZs = makeSupportZs();
  addOhe(group, gradeAt, supportZs);
  group.userData.trackCenters = [...TRACK_CENTERS];
  group.userData.trackCenterSpacingMeters = TRACK_STUDY.centerSpacing;
  group.userData.trackGaugeMeters = TRACK_STUDY.gauge;
  group.userData.sleeperSpacingMeters = SLEEPER_SPACING;
  group.userData.ballastDepthMeters = TRACK_STUDY.ballastDepth;
  group.userData.oheSpanMeters = TRACK_STUDY.oheSpan;
  return group;
}
