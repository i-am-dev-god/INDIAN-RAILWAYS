import * as THREE from 'three';

type GroundHeight = (x: number, z: number) => number;

type BoxPlacement = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationY?: number;
  color?: THREE.ColorRepresentation;
};

type RibbonLine = { start: THREE.Vector2; end: THREE.Vector2 };
type BeamSegment = { start: THREE.Vector3; end: THREE.Vector3 };

type CityBlock = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  ground: number;
  style: 0 | 1 | 2;
};

type TreeSpecies = 'neem' | 'banyan' | 'copperpod' | 'pongamia' | 'palm';

type TreeBase = {
  x: number;
  z: number;
  localBaseY: number;
  scale: number;
  color: string;
  species: TreeSpecies;
};

const STATION_BASE_Y = 2.8;

function addBoxInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: readonly BoxPlacement[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const transform = new THREE.Object3D();
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    if (!placement) continue;
    transform.position.copy(placement.position);
    transform.scale.copy(placement.scale);
    transform.rotation.set(0, placement.rotationY ?? 0, 0);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    if (placement.color !== undefined) mesh.setColorAt(index, new THREE.Color(placement.color));
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
  placements: readonly BoxPlacement[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const transform = new THREE.Object3D();
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    if (!placement) continue;
    transform.position.copy(placement.position);
    transform.scale.copy(placement.scale);
    transform.rotation.set(0, placement.rotationY ?? 0, 0);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    if (placement.color !== undefined) mesh.setColorAt(index, new THREE.Color(placement.color));
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
  placements: readonly BoxPlacement[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const transform = new THREE.Object3D();
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    if (!placement) continue;
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
  segments: readonly BeamSegment[],
  castShadow = true,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  const transform = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) continue;
    direction.subVectors(segment.end, segment.start);
    const length = direction.length();
    transform.position.copy(segment.start).add(segment.end).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    transform.scale.set(1, length, 1);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function makeTerrainRibbonGeometry(
  start: THREE.Vector2,
  end: THREE.Vector2,
  width: number,
  groundHeight: GroundHeight,
  localBaseY: number,
  lift: number,
): THREE.BufferGeometry {
  const length = start.distanceTo(end);
  const alongSegments = Math.max(2, Math.ceil(length / 6));
  const acrossSegments = 4;
  const direction = new THREE.Vector2().subVectors(end, start).normalize();
  const perpendicular = new THREE.Vector2(-direction.y, direction.x);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let along = 0; along <= alongSegments; along += 1) {
    const t = along / alongSegments;
    const center = start.clone().lerp(end, t);
    for (let across = 0; across <= acrossSegments; across += 1) {
      const acrossT = across / acrossSegments - 0.5;
      const x = center.x + perpendicular.x * width * acrossT;
      const z = center.y + perpendicular.y * width * acrossT;
      const y = groundHeight(x, z) - localBaseY + lift;
      positions.push(x, y, z);
      uvs.push(t * length / 18, acrossT + 0.5);
    }
  }

  const rowSize = acrossSegments + 1;
  for (let along = 0; along < alongSegments; along += 1) {
    for (let across = 0; across < acrossSegments; across += 1) {
      const a = along * rowSize + across;
      const b = a + rowSize;
      const c = a + 1;
      const d = b + 1;
      // Winding is upward-facing for a path whose perpendicular is left of travel.
      indices.push(a, c, b, b, c, d);
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

function makeMarkingGeometry(
  lines: readonly RibbonLine[],
  width: number,
  groundHeight: GroundHeight,
  localBaseY: number,
  lift: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const line of lines) {
    const direction = new THREE.Vector2().subVectors(line.end, line.start);
    const length = direction.length();
    if (length < 0.01) continue;
    direction.normalize();
    const perpendicular = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(width / 2);
    const corners = [
      line.start.clone().sub(perpendicular),
      line.end.clone().sub(perpendicular),
      line.start.clone().add(perpendicular),
      line.end.clone().add(perpendicular),
    ];
    const offset = positions.length / 3;
    for (const point of corners) {
      positions.push(point.x, groundHeight(point.x, point.y) - localBaseY + lift, point.y);
    }
    uvs.push(0, 0, length, 0, 0, width, length, width);
    indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addRibbon(
  parent: THREE.Group,
  name: string,
  start: THREE.Vector2,
  end: THREE.Vector2,
  width: number,
  groundHeight: GroundHeight,
  material: THREE.Material,
  lift: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    makeTerrainRibbonGeometry(start, end, width, groundHeight, STATION_BASE_Y, lift),
    material,
  );
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeAsphaltTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create urban asphalt texture.');
  let state = 1_905_713;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
  const image = context.createImageData(size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const grain = Math.round(random() * 17 - 8);
    image.data[index] = 72 + grain;
    image.data[index + 1] = 77 + grain;
    image.data[index + 2] = 75 + grain;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const aggregate = ['rgba(28,32,30,0.28)', 'rgba(155,151,135,0.30)', 'rgba(188,181,161,0.19)'];
  for (let pebble = 0; pebble < 4_200; pebble += 1) {
    context.fillStyle = aggregate[Math.floor(random() * aggregate.length)] ?? aggregate[0]!;
    context.beginPath();
    context.ellipse(random() * size, random() * size, 0.35 + random() * 1.4, 0.3 + random() * 0.9, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = 'rgba(28,31,29,0.28)';
  context.lineWidth = 1.1;
  for (let crack = 0; crack < 18; crack += 1) {
    let x = random() * size;
    let y = random() * size;
    context.beginPath();
    context.moveTo(x, y);
    for (let segment = 0; segment < 4; segment += 1) {
      x += (random() - 0.5) * 12;
      y += (random() - 0.5) * 16;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function makePavingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create urban footpath texture.');
  context.fillStyle = '#88887f';
  context.fillRect(0, 0, size, size);
  const pavers = ['#b0aea3', '#a7a69c', '#b7b2a5', '#9e9e94', '#b2afa3'];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const stagger = row % 2 === 0 ? 0 : 32;
      const x = column * 64 - stagger;
      const y = row * 32;
      context.fillStyle = pavers[(row * 3 + column * 2) % pavers.length] ?? '#aaa89e';
      context.fillRect(x + 1.2, y + 1.2, 61.6, 29.6);
      context.fillStyle = 'rgba(242,239,226,0.12)';
      context.fillRect(x + 3, y + 3, 56, 1.4);
      context.fillStyle = 'rgba(53,58,54,0.13)';
      context.fillRect(x + 2, y + 28.5, 60, 1.5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 1);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function addCityRoadNetwork(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  stationHalfWidth: number,
  stationHalfLength: number,
): void {
  const roadTexture = makeAsphaltTexture();
  roadTexture.repeat.set(5, 1);
  const footpathTexture = makePavingTexture();
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#dfdcd2', map: roadTexture, roughness: 0.98, metalness: 0.01 });
  const footpathMaterial = new THREE.MeshStandardMaterial({ color: '#e3dfd4', map: footpathTexture, roughness: 0.96, metalness: 0.01 });
  const markingMaterial = new THREE.MeshBasicMaterial({ color: '#ece8dc', side: THREE.DoubleSide, toneMapped: false });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#8f938b', roughness: 0.92, metalness: 0.02 });
  const roadOffsetX = stationHalfWidth + 19;
  const roadOffsetZ = stationHalfLength + 16;
  const roadHalfWidth = 6.5;
  const roadRunX = roadOffsetX;
  const roadLengthZ = roadOffsetZ - roadHalfWidth;

  addRibbon(
    parent,
    'West-side urban access road — schematic perimeter, not a traced street plan',
    new THREE.Vector2(-roadRunX, -roadLengthZ),
    new THREE.Vector2(-roadRunX, roadLengthZ),
    roadHalfWidth * 2,
    groundHeight,
    roadMaterial,
    0.085,
  );
  addRibbon(
    parent,
    'East-side urban access road — schematic perimeter, not a traced street plan',
    new THREE.Vector2(roadRunX, -roadLengthZ),
    new THREE.Vector2(roadRunX, roadLengthZ),
    roadHalfWidth * 2,
    groundHeight,
    roadMaterial,
    0.085,
  );
  for (const side of [-1, 1]) {
    const z = side * roadOffsetZ;
    addRibbon(
      parent,
      `${side < 0 ? 'South' : 'North'}-end urban access road — schematic`,
      new THREE.Vector2(-roadRunX, z),
      new THREE.Vector2(roadRunX, z),
      roadHalfWidth * 2,
      groundHeight,
      roadMaterial,
      0.085,
    );
  }

  const footpathOffsetX = stationHalfWidth + 5.7;
  const footpathOffsetZ = stationHalfLength + 4.3;
  const footpathHalfWidth = 1.8;
  addRibbon(parent, 'West perimeter footpath — generic station-city edge',
    new THREE.Vector2(-footpathOffsetX, -stationHalfLength), new THREE.Vector2(-footpathOffsetX, stationHalfLength),
    footpathHalfWidth * 2, groundHeight, footpathMaterial, 0.12);
  addRibbon(parent, 'East perimeter footpath — generic station-city edge',
    new THREE.Vector2(footpathOffsetX, -stationHalfLength), new THREE.Vector2(footpathOffsetX, stationHalfLength),
    footpathHalfWidth * 2, groundHeight, footpathMaterial, 0.12);
  for (const side of [-1, 1]) {
    const z = side * footpathOffsetZ;
    addRibbon(parent, 'Perimeter footpath return — generic urban connection',
      new THREE.Vector2(-stationHalfWidth, z), new THREE.Vector2(stationHalfWidth, z),
      footpathHalfWidth * 2, groundHeight, footpathMaterial, 0.12);
  }

  const lines: RibbonLine[] = [];
  const dash = (start: THREE.Vector2, end: THREE.Vector2): void => {
    lines.push({ start, end });
  };
  for (const side of [-1, 1]) {
    const x = side * roadRunX;
    for (let z = -roadLengthZ + 8; z < roadLengthZ - 4; z += 24) {
      dash(new THREE.Vector2(x, z), new THREE.Vector2(x, Math.min(z + 8, roadLengthZ)));
    }
  }
  for (const side of [-1, 1]) {
    const z = side * roadOffsetZ;
    for (let x = -roadRunX + 8; x < roadRunX - 4; x += 24) {
      dash(new THREE.Vector2(x, z), new THREE.Vector2(Math.min(x + 8, roadRunX), z));
    }
  }
  const crosswalkZs = [-stationHalfLength * 0.16, stationHalfLength * 0.16];
  for (const side of [-1, 1]) {
    const x = side * roadRunX;
    for (const zCenter of crosswalkZs) {
      for (let stripe = 0; stripe < 7; stripe += 1) {
        const z = zCenter + (stripe - 3) * 0.9;
        dash(new THREE.Vector2(x - 4.9, z), new THREE.Vector2(x + 4.9, z));
      }
    }
  }
  const markings = new THREE.Mesh(
    makeMarkingGeometry(lines, 0.18, groundHeight, STATION_BASE_Y, 0.14),
    markingMaterial,
  );
  markings.name = 'Schematic lane dashes and pedestrian crossings — non-surveyed urban access';
  markings.castShadow = false;
  markings.receiveShadow = false;
  parent.add(markings);

  // Raised kerbs and marker blocks make the road edge legible without adding
  // poles or gantries inside the track/OHE clearance envelope.
  const curbTransforms: BoxPlacement[] = [];
  for (const side of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = side * (roadOffsetX + roadHalfWidth - 0.12);
      const z = zSide * roadOffsetZ;
      curbTransforms.push({
        position: new THREE.Vector3(x, groundHeight(x, z) - STATION_BASE_Y + 0.12, z),
        scale: new THREE.Vector3(0.24, 0.24, 14),
      });
    }
  }
  const curbCorners = addBoxInstances(parent, 'Perimeter-road kerb corner markers — schematic', new THREE.BoxGeometry(1, 1, 1), edgeMaterial, curbTransforms);
  curbCorners.receiveShadow = false;
}

function makeBoundaryWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a station boundary-wall texture.');
  context.fillStyle = '#9b988d';
  context.fillRect(0, 0, 256, 128);
  const blocks = ['#b0aa9d', '#aaa69a', '#a19d91', '#b4aea1', '#9d998e'];
  const blockW = 32;
  const blockH = 20;
  for (let row = 0; row < 7; row += 1) {
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    for (let column = -1; column < 9; column += 1) {
      const x = column * blockW - offset;
      const y = row * blockH;
      context.fillStyle = blocks[(row * 3 + column + blocks.length) % blocks.length] ?? '#aaa69a';
      context.fillRect(x + 1, y + 1, blockW - 2, blockH - 2);
      context.fillStyle = 'rgba(246,241,225,0.14)';
      context.fillRect(x + 2, y + 2, blockW - 4, 1.2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function addRepresentativeBoundaryWalls(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  halfWidth: number,
  halfLength: number,
): void {
  const wallX = halfWidth + 10;
  const endsAt = halfLength - 17.5;
  const gateCenters = [-270, -60, 60, 270];
  const wallTransforms: BoxPlacement[] = [];
  const postTransforms: BoxPlacement[] = [];
  const capTransforms: BoxPlacement[] = [];
  const wireSegments: BeamSegment[] = [];
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#777e77', roughness: 0.88, metalness: 0.04 });
  const wireMaterial = new THREE.MeshStandardMaterial({ color: '#707b76', roughness: 0.66, metalness: 0.42 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e0dbce', map: makeBoundaryWallTexture(), roughness: 0.93, metalness: 0.01 });
  const height = 1.8;
  const wallIntervals: Array<[number, number]> = [];
  let cursor = -endsAt;
  for (const gate of gateCenters) {
    const start = gate - 7.5;
    const end = gate + 7.5;
    if (start > cursor) wallIntervals.push([cursor, start]);
    cursor = end;
  }
  if (cursor < endsAt) wallIntervals.push([cursor, endsAt]);

  for (const side of [-1, 1]) {
    const x = side * wallX;
    for (const [start, end] of wallIntervals) {
      for (let z0 = start; z0 < end; z0 += 8) {
        const z1 = Math.min(end, z0 + 8);
        const z = (z0 + z1) / 2;
        const localGround = groundHeight(x, z) - STATION_BASE_Y;
        wallTransforms.push({
          position: new THREE.Vector3(x, localGround + height / 2, z),
          scale: new THREE.Vector3(1, 1, z1 - z0),
          color: (Math.floor((z0 + endsAt) / 8) % 3 === 0) ? '#d3cec1' : '#e4dfd2',
        });
        for (const wireY of [height + 0.22, height + 0.46]) {
          wireSegments.push({
            start: new THREE.Vector3(x, localGround + wireY, z0),
            end: new THREE.Vector3(x, groundHeight(x, z1) - STATION_BASE_Y + wireY, z1),
          });
        }
      }
      for (let z = start; z <= end; z += 8) {
        const localGround = groundHeight(x, z) - STATION_BASE_Y;
        postTransforms.push({
          position: new THREE.Vector3(x, localGround + height / 2 + 0.12, z),
          scale: new THREE.Vector3(0.42, height + 0.24, 0.42),
          color: '#8a8c81',
        });
        capTransforms.push({
          position: new THREE.Vector3(x, localGround + height + 0.08, z),
          scale: new THREE.Vector3(0.46, 0.16, 0.46),
          color: '#aaa596',
        });
      }
    }
    for (const gate of gateCenters) {
      for (const z of [gate - 7.5, gate + 7.5]) {
        const localGround = groundHeight(x, z) - STATION_BASE_Y;
        postTransforms.push({
          position: new THREE.Vector3(x, localGround + 1.2, z),
          scale: new THREE.Vector3(0.65, 2.4, 0.65),
          color: '#c1bdaF',
        });
      }
    }
  }

  const walls = addBoxInstances(parent, 'Segmented urban-edge railway boundary wall — access gaps illustrative', new THREE.BoxGeometry(0.26, height, 8), wallMaterial, wallTransforms);
  walls.receiveShadow = true;
  addBoxInstances(parent, 'Boundary-wall piers and access-gate cheeks — schematic', new THREE.BoxGeometry(1, 1, 1), postMaterial, postTransforms).castShadow = false;
  addBoxInstances(parent, 'Masonry wall pier caps', new THREE.BoxGeometry(1, 1, 1), postMaterial, capTransforms).castShadow = false;
  addBeamInstances(parent, 'Light twin-strand perimeter wire over selected boundary segments — schematic', new THREE.CylinderGeometry(0.012, 0.012, 1, 4), wireMaterial, wireSegments, false);
}

function makeFacadeTexture(style: 0 | 1 | 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a procedural city facade.');
  const bases = ['#c7bea9', '#b5b4aa', '#d0c1aa'] as const;
  const glass = ['#456269', '#405b62', '#4a6366'] as const;
  context.fillStyle = bases[style];
  context.fillRect(0, 0, 256, 256);
  for (let floor = 0; floor < 6; floor += 1) {
    const y = floor * 42;
    context.fillStyle = floor % 2 === style % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(49,55,52,0.08)';
    context.fillRect(0, y, 256, 40);
    context.fillStyle = style === 1 ? '#827a6c' : '#8f8879';
    context.fillRect(0, y + 39, 256, 3);
    for (let bay = 0; bay < 5; bay += 1) {
      const x = 12 + bay * 49;
      if (style === 2 && floor === 0) {
        context.fillStyle = ['#515956', '#625e55', '#454c4b'][bay % 3] ?? '#515956';
        context.fillRect(x - 4, y + 6, 40, 29);
        context.fillStyle = '#d0b677';
        context.fillRect(x - 4, y + 4, 40, 4);
        context.fillStyle = 'rgba(235,220,178,0.45)';
        for (let shutter = 0; shutter < 4; shutter += 1) context.fillRect(x - 1, y + 10 + shutter * 6, 34, 1);
      } else {
        context.fillStyle = glass[style];
        context.fillRect(x, y + 8, 31, 24);
        context.fillStyle = 'rgba(226,206,162,0.8)';
        context.fillRect(x, y + 8, 31, 3);
        context.fillStyle = '#766e60';
        context.fillRect(x - 2, y + 32, 35, 3);
        context.fillStyle = '#d5ccba';
        context.fillRect(x + 13, y + 8, 2, 24);
        if (style === 0 && floor > 0) {
          context.fillStyle = '#777f79';
          context.fillRect(x - 2, y + 34, 35, 2);
          context.fillStyle = '#929990';
          for (let rail = 0; rail < 5; rail += 1) context.fillRect(x + rail * 8, y + 33, 1, 7);
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function rotatedOffset(x: number, z: number, angle: number): THREE.Vector2 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new THREE.Vector2(x * cosine + z * sine, -x * sine + z * cosine);
}

function addUrbanBuildings(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  cityStartX: number,
  cityStartZ: number,
): void {
  let state = 5_832_041;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
  const blocks: CityBlock[] = [];
  const addBlock = (x: number, z: number): void => {
    // Leave a deliberately reserved, illustrative intermodal parcel for the
    // Metro/Rathifile context study; it is not a mapped station boundary.
    if ((x > 190 && x < 260 && z > -330 && z < 330)
      || (x > 230 && x < 305 && z > 250 && z < 385)) return;
    const style = (random() < 0.32 ? 2 : random() < 0.52 ? 0 : 1) as 0 | 1 | 2;
    const width = 12 + random() * 30;
    const depth = 15 + random() * 29;
    const height = style === 2
      ? 6 + random() * 15
      : style === 0
        ? 7 + random() ** 1.35 * 30
        : 13 + random() ** 1.55 * 42;
    blocks.push({
      x,
      z,
      width,
      depth,
      height,
      rotationY: (random() - 0.5) * 0.22,
      ground: groundHeight(x, z),
      style,
    });
  };

  // Loose street-block rows leave the station-edge access loop clear. Their
  // positions are illustrative urban massing, not individually mapped parcels.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row += 1) {
      const x = side * (cityStartX + row * 51 + (random() - 0.5) * 16);
      for (let column = -8; column <= 8; column += 1) {
        const z = column * 58 + (random() - 0.5) * 26;
        addBlock(x, z);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row += 1) {
      const z = side * (cityStartZ + row * 54 + (random() - 0.5) * 22);
      for (let column = -7; column <= 7; column += 1) {
        const x = column * 59 + (random() - 0.5) * 30;
        addBlock(x, z);
      }
    }
  }

  const facadeTextures = [makeFacadeTexture(0), makeFacadeTexture(1), makeFacadeTexture(2)];
  const facadeMaterials = facadeTextures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.93, metalness: 0.01, flatShading: true }));
  const palette = ['#c6b69d', '#c9c2b2', '#99adb1', '#c59d88', '#c2ae7f', '#8e9a91', '#a96f56', '#d0c6b1'];
  const blockPlacements: BoxPlacement[][] = [[], [], []];
  const parapets: BoxPlacement[] = [];
  const balconyDecks: BoxPlacement[] = [];
  const balconyRails: BoxPlacement[] = [];
  const balconyPosts: BoxPlacement[] = [];
  const awnings: BoxPlacement[] = [];
  const awningValances: BoxPlacement[] = [];
  const airConditioners: BoxPlacement[] = [];
  const solarPanels: BoxPlacement[] = [];
  const tankBodies: BoxPlacement[] = [];
  const tankLids: BoxPlacement[] = [];
  const rooftopMasts: BeamSegment[] = [];
  const rooftopMastBraces: BeamSegment[] = [];
  const satelliteDishSupports: BeamSegment[] = [];
  const satelliteDishes: Array<{ position: THREE.Vector3; rotationY: number }> = [];
  const billboards: BoxPlacement[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block) continue;
    const groundLocal = block.ground - STATION_BASE_Y;
    const color = palette[Math.floor(random() * palette.length)] ?? '#a89e92';
    blockPlacements[block.style]?.push({
      position: new THREE.Vector3(block.x, groundLocal + block.height / 2, block.z),
      scale: new THREE.Vector3(block.width, block.height, block.depth),
      rotationY: block.rotationY,
      color,
    });

    const rooftopY = groundLocal + block.height;
    const offsetAt = (localX: number, localZ: number): THREE.Vector2 => rotatedOffset(localX, localZ, block.rotationY);
    const parapetHeight = 0.55;
    for (const side of [-1, 1]) {
      const front = offsetAt(0, side * (block.depth / 2 - 0.18));
      parapets.push({
        position: new THREE.Vector3(block.x + front.x, rooftopY + parapetHeight / 2, block.z + front.y),
        scale: new THREE.Vector3(block.width + 0.25, parapetHeight, 0.36),
        rotationY: block.rotationY,
        color: '#9c9789',
      });
      const edge = offsetAt(side * (block.width / 2 - 0.18), 0);
      parapets.push({
        position: new THREE.Vector3(block.x + edge.x, rooftopY + parapetHeight / 2, block.z + edge.y),
        scale: new THREE.Vector3(0.36, parapetHeight, block.depth + 0.2),
        rotationY: block.rotationY,
        color: '#9c9789',
      });
    }

    if (index % 6 === 0) {
      tankBodies.push({
        position: new THREE.Vector3(block.x, rooftopY + 1.05, block.z),
        scale: new THREE.Vector3(1, 1, 1),
        color: index % 12 === 0 ? '#8e948e' : '#c7c8bf',
      });
      tankLids.push({
        position: new THREE.Vector3(block.x, rooftopY + 1.91, block.z),
        scale: new THREE.Vector3(1, 1, 1),
        color: '#777f7b',
      });
    }
    if (index % 5 === 1 && block.width > 19) {
      const front = offsetAt(0, block.depth / 2 + 0.58);
      const balconyWidth = Math.min(3.2, block.width * 0.45);
      const balconyY = groundLocal + block.height * 0.64;
      const centerX = block.x + front.x;
      const centerZ = block.z + front.y;
      balconyDecks.push({
        position: new THREE.Vector3(centerX, balconyY, centerZ),
        scale: new THREE.Vector3(balconyWidth, 0.16, 1.05),
        rotationY: block.rotationY,
        color: '#a39c8e',
      });
      const railOffset = offsetAt(0, block.depth / 2 + 1.04);
      balconyRails.push({
        position: new THREE.Vector3(block.x + railOffset.x, balconyY + 0.62, block.z + railOffset.y),
        scale: new THREE.Vector3(balconyWidth, 0.08, 0.08),
        rotationY: block.rotationY,
        color: '#757e7a',
      });
      for (const side of [-1, 1]) {
        const post = offsetAt(side * balconyWidth / 2, block.depth / 2 + 1.04);
        balconyPosts.push({
          position: new THREE.Vector3(block.x + post.x, balconyY + 0.32, block.z + post.y),
          scale: new THREE.Vector3(0.08, 0.62, 0.08),
          rotationY: block.rotationY,
          color: '#757e7a',
        });
      }
    }
    if (block.style === 2 && block.height < 22 && index % 3 === 0) {
      const front = offsetAt(0, block.depth / 2 + 0.48);
      const width = Math.min(block.width - 1, 9);
      const y = groundLocal + Math.min(3.1, block.height * 0.38);
      awnings.push({
        position: new THREE.Vector3(block.x + front.x, y, block.z + front.y),
        scale: new THREE.Vector3(width, 0.2, 1.05),
        rotationY: block.rotationY,
        color: ['#bb8d57', '#6c847e', '#a35f4b'][index % 3] ?? '#bb8d57',
      });
      const valance = offsetAt(0, block.depth / 2 + 0.98);
      awningValances.push({
        position: new THREE.Vector3(block.x + valance.x, y - 0.2, block.z + valance.y),
        scale: new THREE.Vector3(width, 0.35, 0.1),
        rotationY: block.rotationY,
        color: ['#c5a06b', '#86958b', '#ae7461'][index % 3] ?? '#c5a06b',
      });
    }
    if (index % 3 === 0 && block.height > 10) {
      const front = offsetAt((random() - 0.5) * block.width * 0.45, block.depth / 2 + 0.3);
      airConditioners.push({
        position: new THREE.Vector3(block.x + front.x, groundLocal + block.height * (0.48 + random() * 0.25), block.z + front.y),
        scale: new THREE.Vector3(0.85, 0.5, 0.42),
        rotationY: block.rotationY,
        color: '#b6b7ae',
      });
    }
    if (index % 7 === 2 && block.width > 22) {
      const panelOffset = offsetAt(0, -block.depth * 0.17);
      solarPanels.push({
        position: new THREE.Vector3(block.x + panelOffset.x, rooftopY + 0.13, block.z + panelOffset.y),
        scale: new THREE.Vector3(Math.min(3.8, block.width * 0.42), 0.12, Math.min(2.2, block.depth * 0.24)),
        rotationY: block.rotationY,
        color: '#49616a',
      });
    }
    if (index % 17 === 4 && block.height > 24) {
      const mastOffset = offsetAt((random() - 0.5) * block.width * 0.34, (random() - 0.5) * block.depth * 0.3);
      const mastX = block.x + mastOffset.x;
      const mastZ = block.z + mastOffset.y;
      const baseY = rooftopY + 0.35;
      const mastHeight = 4.0 + random() * 2.2;
      rooftopMasts.push({ start: new THREE.Vector3(mastX, baseY, mastZ), end: new THREE.Vector3(mastX, baseY + mastHeight, mastZ) });
      for (const level of [0.35, 0.65, 0.92]) {
        const y = baseY + mastHeight * level;
        rooftopMastBraces.push(
          { start: new THREE.Vector3(mastX - 0.85, y, mastZ), end: new THREE.Vector3(mastX + 0.85, y, mastZ) },
          { start: new THREE.Vector3(mastX, y - 0.5, mastZ), end: new THREE.Vector3(mastX + 0.85, y, mastZ) },
        );
      }
      rooftopMastBraces.push({
        start: new THREE.Vector3(mastX, baseY + mastHeight, mastZ),
        end: new THREE.Vector3(mastX, baseY + mastHeight + 1.1, mastZ),
      });
    }
    if (index % 11 === 3 && block.height > 8) {
      const dishOffset = offsetAt((random() - 0.5) * block.width * 0.42, (random() - 0.5) * block.depth * 0.42);
      const dishX = block.x + dishOffset.x;
      const dishZ = block.z + dishOffset.y;
      satelliteDishes.push({
        position: new THREE.Vector3(dishX, rooftopY + 0.62, dishZ),
        rotationY: block.rotationY + (random() - 0.5) * 0.8,
      });
      satelliteDishSupports.push({
        start: new THREE.Vector3(dishX, rooftopY + 0.08, dishZ),
        end: new THREE.Vector3(dishX, rooftopY + 0.46, dishZ),
      });
    }
    if (index % 23 === 7 && block.style === 2 && block.height > 9) {
      const front = offsetAt(0, block.depth / 2 + 0.16);
      billboards.push({
        position: new THREE.Vector3(block.x + front.x, groundLocal + block.height * 0.68, block.z + front.y),
        scale: new THREE.Vector3(Math.min(9, block.width * 0.55), 2.2, 0.18),
        rotationY: block.rotationY,
        color: ['#25546a', '#9c563f', '#b48d42', '#536e61'][index % 4] ?? '#25546a',
      });
    }
  }

  for (let style = 0; style < blockPlacements.length; style += 1) {
    const mesh = addBoxInstances(
      parent,
      ['Painted mixed-use city blocks — schematic', 'Apartment blocks with balcony texture — schematic', 'Low-rise commercial blocks with shutter texture — schematic'][style] ?? 'Urban block',
      new THREE.BoxGeometry(1, 1, 1),
      facadeMaterials[style] ?? facadeMaterials[0]!,
      blockPlacements[style] ?? [],
    );
    mesh.castShadow = false;
  }
  const detailMaterial = new THREE.MeshStandardMaterial({ color: '#93988f', roughness: 0.86, metalness: 0.04 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#777f7b', roughness: 0.72, metalness: 0.18 });
  const awningMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.76, metalness: 0.02 });
  const tankMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.03 });
  const solarMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0.35 });
  const parapetMesh = addBoxInstances(parent, 'Roof parapets and terraces on generic city blocks', new THREE.BoxGeometry(1, 1, 1), detailMaterial, parapets);
  parapetMesh.receiveShadow = false;
  const deckMesh = addBoxInstances(parent, 'Sparse external apartment balconies', new THREE.BoxGeometry(1, 1, 1), detailMaterial, balconyDecks);
  deckMesh.receiveShadow = false;
  const railMesh = addBoxInstances(parent, 'Balcony rails on generic urban blocks', new THREE.BoxGeometry(1, 1, 1), trimMaterial, balconyRails);
  railMesh.receiveShadow = false;
  const postMesh = addBoxInstances(parent, 'Balcony rail posts on generic urban blocks', new THREE.BoxGeometry(1, 1, 1), trimMaterial, balconyPosts);
  postMesh.receiveShadow = false;
  const awningMesh = addBoxInstances(parent, 'Small shopfront awnings — generic streetscape', new THREE.BoxGeometry(1, 1, 1), awningMaterial, awnings);
  awningMesh.receiveShadow = false;
  const valanceMesh = addBoxInstances(parent, 'Shopfront awning valances — generic streetscape', new THREE.BoxGeometry(1, 1, 1), awningMaterial, awningValances);
  valanceMesh.receiveShadow = false;
  const acMesh = addBoxInstances(parent, 'Exterior air-conditioner units on generic buildings', new THREE.BoxGeometry(1, 1, 1), detailMaterial, airConditioners);
  acMesh.receiveShadow = false;
  const solarMesh = addBoxInstances(parent, 'Generic rooftop solar-panel fields — illustrative', new THREE.BoxGeometry(1, 1, 1), solarMaterial, solarPanels);
  solarMesh.receiveShadow = false;
  const tankGeometry = new THREE.CylinderGeometry(0.76, 0.78, 1.7, 10);
  const tankMesh = addCylinderInstances(parent, 'Generic rooftop water tanks — not mapped individual assets', tankGeometry, tankMaterial, tankBodies);
  tankMesh.receiveShadow = false;
  const tankLidMesh = addCylinderInstances(parent, 'Rooftop tank lids and collars', new THREE.CylinderGeometry(0.8, 0.8, 0.12, 10), trimMaterial, tankLids);
  tankLidMesh.receiveShadow = false;
  addBeamInstances(parent, 'Occasional rooftop cellular masts — generic city context', new THREE.CylinderGeometry(0.04, 0.055, 1, 6), trimMaterial, rooftopMasts, false);
  addBeamInstances(parent, 'Short rooftop antenna cross-arms', new THREE.CylinderGeometry(0.025, 0.03, 1, 5), trimMaterial, rooftopMastBraces, false);
  addBeamInstances(parent, 'Satellite-dish support stems — generic rooftops', new THREE.CylinderGeometry(0.035, 0.045, 1, 6), trimMaterial, satelliteDishSupports, false);
  const dishGeometry = new THREE.CircleGeometry(0.38, 12);
  const dishMaterial = new THREE.MeshStandardMaterial({ color: '#71817f', roughness: 0.42, metalness: 0.36, side: THREE.DoubleSide });
  const dishMesh = new THREE.InstancedMesh(dishGeometry, dishMaterial, satelliteDishes.length);
  dishMesh.name = 'Sparse tilted rooftop satellite dishes — illustrative';
  dishMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  dishMesh.castShadow = false;
  dishMesh.receiveShadow = false;
  const dishTransform = new THREE.Object3D();
  satelliteDishes.forEach((dish, index) => {
    dishTransform.position.copy(dish.position);
    dishTransform.rotation.set(-1.0, dish.rotationY, 0);
    dishTransform.updateMatrix();
    dishMesh.setMatrixAt(index, dishTransform.matrix);
  });
  dishMesh.computeBoundingSphere();
  parent.add(dishMesh);
  const billboardMesh = addBoxInstances(parent, 'Small unbranded roofline advertising boards — generic urban context', new THREE.BoxGeometry(1, 1, 1), awningMaterial, billboards);
  billboardMesh.castShadow = false;
  billboardMesh.receiveShadow = false;
}

function addDeccanScrubAndStones(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  halfWidth: number,
  halfLength: number,
): void {
  let state = 8_341_027;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
  const lowScrub: BoxPlacement[] = [];
  const rocks: BoxPlacement[] = [];
  const dryGrass: BeamSegment[] = [];
  const scrubColors = ['#65754b', '#7c8052', '#8b855a', '#586c4c', '#9a8d5f'];
  const anchors: Array<{ x: number; z: number }> = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 22; index += 1) {
      const z = -315 + index * 30 + (random() - 0.5) * 12;
      if (side > 0 && z > 140 && z < 380) continue;
      anchors.push({
        x: side * (halfWidth + 50 + random() * 10),
        z,
      });
    }
  }
  for (const end of [-1, 1]) {
    for (let index = 0; index < 15; index += 1) {
      anchors.push({
        x: -205 + index * 29 + (random() - 0.5) * 12,
        z: end * (halfLength + 35 + random() * 22),
      });
    }
  }
  for (const anchor of anchors) {
    const groundLocal = groundHeight(anchor.x, anchor.z) - STATION_BASE_Y;
    for (let cluster = 0; cluster < 3; cluster += 1) {
      const x = anchor.x + (random() - 0.5) * 4.2;
      const z = anchor.z + (random() - 0.5) * 5.2;
      const scale = 0.58 + random() * 0.82;
      lowScrub.push({
        position: new THREE.Vector3(x, groundLocal + 0.3 * scale, z),
        scale: new THREE.Vector3(0.72 * scale, 0.42 * scale, 0.64 * scale),
        color: scrubColors[Math.floor(random() * scrubColors.length)] ?? '#65754b',
      });
    }
    const stoneCount = 1 + Math.floor(random() * 3);
    for (let stone = 0; stone < stoneCount; stone += 1) {
      const x = anchor.x + (random() - 0.5) * 5.5;
      const z = anchor.z + (random() - 0.5) * 6.5;
      const size = 0.32 + random() * 0.62;
      const y = groundHeight(x, z) - STATION_BASE_Y;
      rocks.push({
        position: new THREE.Vector3(x, y + size * 0.35, z),
        scale: new THREE.Vector3(size * (0.8 + random() * 0.55), size * 0.58, size * (0.75 + random() * 0.5)),
        rotationY: random() * Math.PI,
        color: ['#827f73', '#9a927e', '#777c72', '#a19a87'][Math.floor(random() * 4)] ?? '#827f73',
      });
    }
    for (let tuft = 0; tuft < 4; tuft += 1) {
      const x = anchor.x + (random() - 0.5) * 5.0;
      const z = anchor.z + (random() - 0.5) * 5.0;
      const base = groundHeight(x, z) - STATION_BASE_Y + 0.02;
      const height = 0.42 + random() * 0.55;
      for (const direction of [-1, 0, 1]) {
        dryGrass.push({
          start: new THREE.Vector3(x, base, z),
          end: new THREE.Vector3(x + direction * 0.14, base + height * (direction === 0 ? 1 : 0.78), z + (random() - 0.5) * 0.2),
        });
      }
    }
  }
  const scrubGeometry = new THREE.IcosahedronGeometry(1, 0);
  const scrubMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  const scrubMesh = addBoxInstances(parent, 'Sparse dry scrub at the station-city margins — representative Deccan landscape', scrubGeometry, scrubMaterial, lowScrub);
  scrubMesh.castShadow = false;
  scrubMesh.receiveShadow = true;
  const stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0.02, flatShading: true });
  const stoneMesh = addBoxInstances(parent, 'Scattered low stones at access-road margins — illustrative scrub detail', stoneGeometry, stoneMaterial, rocks);
  stoneMesh.castShadow = false;
  stoneMesh.receiveShadow = true;
  addBeamInstances(
    parent,
    'Fine dry-grass tufts along urban margins — subtle, low-profile detail',
    new THREE.CylinderGeometry(0.022, 0.04, 1, 3),
    new THREE.MeshStandardMaterial({ color: '#94895d', roughness: 1, metalness: 0 }),
    dryGrass,
    false,
  );
}

function makeContextSignTexture(title: string, subtitle: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a city-transfer context sign.');
  context.fillStyle = '#124462';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#e6c05d';
  context.lineWidth = 7;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f7f1df';
  context.font = '700 40px Arial, sans-serif';
  context.fillText(title, canvas.width / 2, 60);
  context.fillStyle = '#f0c65d';
  context.font = '600 23px Arial, sans-serif';
  context.fillText(subtitle, canvas.width / 2, 117);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addIntermodalContext(parent: THREE.Group, groundHeight: GroundHeight, halfWidth: number): void {
  const group = new THREE.Group();
  group.name = 'Secunderabad Metro and Rathifile bus interchange context — conceptual massing, no surveyed alignment';
  group.userData.caveat = 'Both Metro stations and nearby Rathifile are documented; this guideway, station bearing, bus-terminal footprint, and exact separation are illustrative only.';
  const metroX = halfWidth + 45;
  const metroStationZ = 170;
  const metroGround = groundHeight(metroX, metroStationZ) - STATION_BASE_Y;
  const guidewayTop = metroGround + 13.2;
  const guidewayLength = 520;
  const concrete = new THREE.MeshStandardMaterial({ color: '#c1c3bd', roughness: 0.82, metalness: 0.06 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#56615e', roughness: 0.38, metalness: 0.72 });
  const platformMaterial = new THREE.MeshStandardMaterial({ color: '#bcbcb1', roughness: 0.88, metalness: 0.02 });
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: '#d2d0c6', roughness: 0.74, metalness: 0.12 });
  const metroRoofMaterial = new THREE.MeshStandardMaterial({ color: '#a9b0ab', roughness: 0.84, metalness: 0.08 });
  const tactileMaterial = new THREE.MeshStandardMaterial({ color: '#e4c55d', roughness: 0.86, metalness: 0.01 });
  const metroSupport: BoxPlacement[] = [];
  const platformSlabs: BoxPlacement[] = [];
  const platformEdges: BoxPlacement[] = [];
  const platformRoof: BoxPlacement[] = [];
  const platformColumns: BoxPlacement[] = [];
  const metroRailBeds: BoxPlacement[] = [];
  const metroRails: BoxPlacement[] = [];
  const metroSignTransforms: BoxPlacement[] = [];
  const stationRange = 82;
  const platformY = guidewayTop + 0.26;
  const stationRoofY = guidewayTop + 6.1;

  const guideway = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.68, guidewayLength),
    concrete,
  );
  guideway.name = 'Elevated two-track Metro viaduct — orientation and alignment schematic';
  guideway.position.set(metroX, guidewayTop - 0.34, 0);
  guideway.castShadow = true;
  guideway.receiveShadow = true;
  group.add(guideway);
  for (let z = -guidewayLength / 2 + 20; z <= guidewayLength / 2 - 20; z += 30) {
    const localGround = groundHeight(metroX, z) - STATION_BASE_Y;
    const pierHeight = guidewayTop - 0.68 - localGround;
    metroSupport.push({
      position: new THREE.Vector3(metroX, localGround + pierHeight / 2, z),
      scale: new THREE.Vector3(1.65, pierHeight, 1.65),
      color: '#b5b8b2',
    });
  }
  for (const trackOffset of [-1.8, 1.8]) {
    metroRailBeds.push({
      position: new THREE.Vector3(metroX + trackOffset, guidewayTop + 0.07, 0),
      scale: new THREE.Vector3(1.1, 0.08, guidewayLength),
      color: '#686b66',
    });
    for (const railOffset of [-0.72, 0.72]) {
      metroRails.push({
        position: new THREE.Vector3(metroX + trackOffset + railOffset, guidewayTop + 0.19, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
  }
  addBoxInstances(group, 'Metro viaduct concrete piers — context-only massing', new THREE.BoxGeometry(1, 1, 1), concrete, metroSupport).castShadow = true;
  addBoxInstances(group, 'Metro trackways — illustrative, not a gauge/track-engineering model', new THREE.BoxGeometry(1, 1, 1), railMaterial, metroRailBeds).castShadow = false;
  addBoxInstances(group, 'Twin Metro rail-head ribbons — generic elevated line', new THREE.BoxGeometry(0.09, 0.16, guidewayLength), railMaterial, metroRails).castShadow = false;

  for (const side of [-1, 1]) {
    const centerX = metroX + side * 6.0;
    platformSlabs.push({
      position: new THREE.Vector3(centerX, platformY, metroStationZ),
      scale: new THREE.Vector3(3.4, 0.36, stationRange),
      color: '#c1c0b5',
    });
    platformEdges.push({
      position: new THREE.Vector3(centerX - side * 1.48, platformY + 0.2, metroStationZ),
      scale: new THREE.Vector3(0.22, 0.06, stationRange - 1.8),
      color: '#e2bd52',
    });
    for (const postSide of [-1, 1]) {
      for (let z = -stationRange / 2 + 7; z <= stationRange / 2 - 7; z += 14) {
        platformColumns.push({
          position: new THREE.Vector3(centerX + postSide * 2.0, (platformY + stationRoofY) / 2, metroStationZ + z),
          scale: new THREE.Vector3(0.18, stationRoofY - platformY, 0.18),
          color: '#818a84',
        });
      }
    }
  }
  for (const side of [-1, 1]) {
    platformRoof.push({
      position: new THREE.Vector3(metroX + side * 6.0, stationRoofY, metroStationZ),
      scale: new THREE.Vector3(4.8, 0.28, stationRange - 5),
      color: '#a9b0ab',
    });
  }
  addBoxInstances(group, 'Elevated Metro side-platforms — generic Secunderabad interchange study', new THREE.BoxGeometry(1, 1, 1), platformMaterial, platformSlabs).castShadow = true;
  addBoxInstances(group, 'Metro platform yellow edge safety strips — generic', new THREE.BoxGeometry(1, 1, 1), tactileMaterial, platformEdges).castShadow = false;
  addBoxInstances(group, 'Metro side-platform canopy panels — schematic, separated from station-yard roof', new THREE.BoxGeometry(1, 1, 1), metroRoofMaterial, platformRoof).castShadow = true;
  addBoxInstances(group, 'Metro station canopy posts — sparse context massing', new THREE.BoxGeometry(1, 1, 1), concrete, platformColumns).castShadow = false;

  const metroSign = makeContextSignTexture('SECUNDERABAD METRO', 'INTERCHANGE CONTEXT STUDY');
  const metroSignMaterial = new THREE.MeshBasicMaterial({ map: metroSign, side: THREE.DoubleSide, toneMapped: false });
  metroSignTransforms.push({
    position: new THREE.Vector3(metroX, guidewayTop + 3.5, metroStationZ - stationRange / 2 - 2),
    scale: new THREE.Vector3(1, 1, 1),
  });
  addPlaneInstances(group, 'Metro interchange sign — contextual label, not exact station branding', new THREE.PlaneGeometry(9.5, 2.0), metroSignMaterial, metroSignTransforms);

  const busX = metroX - 2;
  const busZ = 330;
  const busGround = groundHeight(busX, busZ) - STATION_BASE_Y;
  const busRoofY = busGround + 6.0;
  const busTerminal = new THREE.Group();
  busTerminal.name = 'Rathifile bus-station context — approximate location and footprint, not surveyed';
  busTerminal.userData.caveat = 'Name is supported by L&T Metro neighborhood listings; geometry and placement are representative only.';
  const terminalBase = new THREE.Mesh(new THREE.BoxGeometry(36, 0.22, 66), new THREE.MeshStandardMaterial({ color: '#777c76', roughness: 0.94 }));
  terminalBase.position.set(busX, busGround + 0.11, busZ);
  terminalBase.receiveShadow = true;
  busTerminal.add(terminalBase);
  for (const side of [-1, 1]) {
    const terminalRoof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.32, 58), canopyMaterial);
    terminalRoof.name = 'Open bus-bay waiting canopy wing — contextual massing';
    terminalRoof.position.set(busX + side * 14.5, busRoofY, busZ);
    terminalRoof.receiveShadow = true;
    busTerminal.add(terminalRoof);
  }
  const bayPosts: BoxPlacement[] = [];
  for (const xOffset of [-18, -11, 11, 18]) {
    for (const zOffset of [-24, 24]) {
      bayPosts.push({
        position: new THREE.Vector3(busX + xOffset, (busGround + 0.22 + busRoofY) / 2, busZ + zOffset),
        scale: new THREE.Vector3(0.22, busRoofY - busGround - 0.22, 0.22),
        color: '#7d8580',
      });
    }
  }
  addBoxInstances(busTerminal, 'Bus-terminal canopy columns', new THREE.BoxGeometry(1, 1, 1), concrete, bayPosts).castShadow = false;
  const busSignMaterial = new THREE.MeshBasicMaterial({
    map: makeContextSignTexture('RATHIFILE BUS STATION', 'CONTEXT MASSING · NOT A SITE PLAN'),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  addPlaneInstances(
    busTerminal,
    'Rathifile context sign — illustrative label, not a measured entrance',
    new THREE.PlaneGeometry(14, 2.5),
    busSignMaterial,
    [{ position: new THREE.Vector3(busX, busRoofY - 0.4, busZ - 30), scale: new THREE.Vector3(1, 1, 1) }],
  );

  const busBody: BoxPlacement[] = [];
  const busBands: BoxPlacement[] = [];
  const busWindows: BoxPlacement[] = [];
  const busWindscreens: BoxPlacement[] = [];
  const busWheels: BoxPlacement[] = [];
  const busRoofUnits: BoxPlacement[] = [];
  const motorcycleFrames: BoxPlacement[] = [];
  const motorcycleTanks: BoxPlacement[] = [];
  const motorcycleSeats: BoxPlacement[] = [];
  const motorcycleWheels: BoxPlacement[] = [];
  const motorcycleForks: BeamSegment[] = [];
  const motorcycleBars: BeamSegment[] = [];
  const motorcyclePositions = [
    { x: busX - 15.2, z: busZ - 28.5, color: '#8b493b' },
    { x: busX + 15.2, z: busZ - 28.5, color: '#41656c' },
  ];
  const busPositions = [
    { x: busX - 9, z: busZ - 10 },
    { x: busX, z: busZ + 7 },
    { x: busX + 9, z: busZ - 7 },
  ];
  const busWhite = new THREE.MeshStandardMaterial({ color: '#f0eee3', roughness: 0.66, metalness: 0.08 });
  const busBlue = new THREE.MeshStandardMaterial({ color: '#28728c', roughness: 0.62, metalness: 0.12 });
  const busGlass = new THREE.MeshStandardMaterial({ color: '#34494e', roughness: 0.3, metalness: 0.14 });
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#252a28', roughness: 0.92, metalness: 0.02 });
  const motorcycleTrim = new THREE.MeshStandardMaterial({ color: '#59635f', roughness: 0.78, metalness: 0.24 });
  for (const bus of busPositions) {
    const groundLocal = groundHeight(bus.x, bus.z) - STATION_BASE_Y;
    busBody.push({ position: new THREE.Vector3(bus.x, groundLocal + 1.58, bus.z), scale: new THREE.Vector3(1, 1, 1) });
    busBands.push({ position: new THREE.Vector3(bus.x, groundLocal + 0.9, bus.z), scale: new THREE.Vector3(1, 1, 1) });
    busRoofUnits.push({ position: new THREE.Vector3(bus.x, groundLocal + 3.3, bus.z), scale: new THREE.Vector3(1, 1, 1) });
    for (const side of [-1, 1]) {
      for (let windowIndex = 0; windowIndex < 7; windowIndex += 1) {
        const z = bus.z - 3.65 + windowIndex * 1.2;
        busWindows.push({ position: new THREE.Vector3(bus.x + side * 1.286, groundLocal + 2.1, z), scale: new THREE.Vector3(1, 1, 1) });
      }
      for (const wheelZ of [-3.25, 3.25]) {
        busWheels.push({ position: new THREE.Vector3(bus.x + side * 1.25, groundLocal + 0.42, bus.z + wheelZ), scale: new THREE.Vector3(1, 1, 1) });
      }
    }
    busWindscreens.push(
      { position: new THREE.Vector3(bus.x, groundLocal + 2.18, bus.z - 5.27), scale: new THREE.Vector3(1, 1, 1) },
      { position: new THREE.Vector3(bus.x, groundLocal + 2.18, bus.z + 5.27), scale: new THREE.Vector3(1, 1, 1) },
    );
  }
  for (const motorcycle of motorcyclePositions) {
    const groundLocal = groundHeight(motorcycle.x, motorcycle.z) - STATION_BASE_Y;
    motorcycleFrames.push({
      position: new THREE.Vector3(motorcycle.x, groundLocal + 0.78, motorcycle.z),
      scale: new THREE.Vector3(1, 1, 1),
      color: motorcycle.color,
    });
    motorcycleTanks.push({
      position: new THREE.Vector3(motorcycle.x, groundLocal + 1.03, motorcycle.z - 0.1),
      scale: new THREE.Vector3(1, 1, 1),
      color: motorcycle.color,
    });
    motorcycleSeats.push({
      position: new THREE.Vector3(motorcycle.x, groundLocal + 1.12, motorcycle.z + 0.26),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (const offsetZ of [-0.67, 0.67]) {
      motorcycleWheels.push({
        position: new THREE.Vector3(motorcycle.x, groundLocal + 0.34, motorcycle.z + offsetZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    motorcycleForks.push(
      { start: new THREE.Vector3(motorcycle.x, groundLocal + 0.78, motorcycle.z - 0.36), end: new THREE.Vector3(motorcycle.x, groundLocal + 0.4, motorcycle.z - 0.67) },
      { start: new THREE.Vector3(motorcycle.x, groundLocal + 0.72, motorcycle.z + 0.36), end: new THREE.Vector3(motorcycle.x, groundLocal + 0.4, motorcycle.z + 0.67) },
    );
    motorcycleBars.push({
      start: new THREE.Vector3(motorcycle.x - 0.36, groundLocal + 1.12, motorcycle.z - 0.64),
      end: new THREE.Vector3(motorcycle.x + 0.36, groundLocal + 1.12, motorcycle.z - 0.64),
    });
  }
  addBoxInstances(busTerminal, 'Unbranded white-and-blue city buses — static regional traffic props', new THREE.BoxGeometry(2.55, 3.05, 10.5), busWhite, busBody).castShadow = false;
  addBoxInstances(busTerminal, 'Blue lower bands on generic city buses — no operator logo', new THREE.BoxGeometry(2.58, 0.44, 10.52), busBlue, busBands).castShadow = false;
  addBoxInstances(busTerminal, 'Passenger window bands on contextual buses', new THREE.BoxGeometry(0.025, 0.94, 0.88), busGlass, busWindows).castShadow = false;
  addBoxInstances(busTerminal, 'Front and rear bus windscreens', new THREE.BoxGeometry(1.92, 1.02, 0.03), busGlass, busWindscreens).castShadow = false;
  addBoxInstances(busTerminal, 'Bus roof ventilation pods', new THREE.BoxGeometry(0.62, 0.18, 1.05), concrete, busRoofUnits).castShadow = false;
  const busWheelGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.23, 12);
  busWheelGeometry.rotateZ(Math.PI / 2);
  addCylinderInstances(busTerminal, 'Static city-bus wheels', busWheelGeometry, wheelMaterial, busWheels).receiveShadow = false;
  addBoxInstances(busTerminal, 'Small unbranded motorcycles — static access-road traffic cues', new THREE.BoxGeometry(0.18, 0.22, 1.18), busBlue, motorcycleFrames).castShadow = false;
  addBoxInstances(busTerminal, 'Motorcycle fuel-tank shells', new THREE.BoxGeometry(0.44, 0.34, 0.55), busWhite, motorcycleTanks).castShadow = false;
  addBoxInstances(busTerminal, 'Motorcycle seats', new THREE.BoxGeometry(0.4, 0.13, 0.58), motorcycleTrim, motorcycleSeats).castShadow = false;
  const motorcycleWheelGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10);
  motorcycleWheelGeometry.rotateZ(Math.PI / 2);
  addCylinderInstances(busTerminal, 'Motorcycle wheels', motorcycleWheelGeometry, wheelMaterial, motorcycleWheels).receiveShadow = false;
  addBeamInstances(busTerminal, 'Motorcycle fork and rear stays', new THREE.CylinderGeometry(0.035, 0.045, 1, 5), motorcycleTrim, motorcycleForks, false);
  addBeamInstances(busTerminal, 'Motorcycle handlebars', new THREE.CylinderGeometry(0.025, 0.03, 1, 5), motorcycleTrim, motorcycleBars, false);
  group.add(busTerminal);
  group.userData.caveat = 'Metro guideway, station massing, bus terminal and static buses are context props only; alignment, footprint, vehicle livery and traffic are not mapped.';
  parent.add(group);
}

function addTreeGroup(
  parent: THREE.Group,
  treeBases: readonly TreeBase[],
  trunkMaterial: THREE.Material,
  leafMaterial: THREE.Material,
): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.25, 1, 8);
  const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const trunks: BoxPlacement[] = [];
  const crowns: BoxPlacement[] = [];
  const blossoms: BoxPlacement[] = [];
  const banyanRoots: BeamSegment[] = [];
  const frondPositions: number[] = [];
  const frondColors: number[] = [];
  const frondIndices: number[] = [];
  let seed = 47_113;
  const random = (): number => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 4_294_967_296;
  };
  const greens = ['#4d6b4b', '#5e784f', '#708154', '#65754d', '#49664d'];
  const addLeafColour = (color: THREE.Color): void => {
    frondColors.push(color.r, color.g, color.b);
  };

  for (const tree of treeBases) {
    const crownColor = tree.color || greens[Math.floor(random() * greens.length)] || '#617b52';
    if (tree.species === 'palm') {
      const height = 6.9 * tree.scale;
      const crownY = tree.localBaseY + height;
      trunks.push({
        position: new THREE.Vector3(tree.x, tree.localBaseY + height / 2, tree.z),
        scale: new THREE.Vector3(tree.scale * 0.46, height, tree.scale * 0.46),
        color: '#705e47',
      });
      crowns.push({
        position: new THREE.Vector3(tree.x, crownY, tree.z),
        scale: new THREE.Vector3(0.42 * tree.scale, 0.36 * tree.scale, 0.42 * tree.scale),
        color: '#627748',
      });
      for (let leaf = 0; leaf < 10; leaf += 1) {
        const angle = (leaf / 10) * Math.PI * 2 + random() * 0.11;
        const length = (2.35 + random() * 0.75) * tree.scale;
        const halfWidth = (0.31 + random() * 0.08) * tree.scale;
        const green = new THREE.Color(greens[Math.floor(random() * greens.length)] ?? '#617b52');
        const rowOffsets: Array<{ left: THREE.Vector3; right: THREE.Vector3 }> = [];
        const segments = 5;
        for (let segment = 0; segment <= segments; segment += 1) {
          const t = segment / segments;
          const radius = length * t;
          const center = new THREE.Vector3(
            tree.x + Math.cos(angle) * radius,
            crownY - 0.18 * tree.scale * t - 0.62 * tree.scale * t * t + Math.sin(t * Math.PI) * 0.22 * tree.scale,
            tree.z + Math.sin(angle) * radius,
          );
          const width = halfWidth * (1 - t * 0.9);
          const perpendicularX = -Math.sin(angle) * width;
          const perpendicularZ = Math.cos(angle) * width;
          rowOffsets.push({
            left: new THREE.Vector3(center.x + perpendicularX, center.y, center.z + perpendicularZ),
            right: new THREE.Vector3(center.x - perpendicularX, center.y, center.z - perpendicularZ),
          });
        }
        const vertexStart = frondPositions.length / 3;
        for (let row = 0; row < rowOffsets.length; row += 1) {
          const edge = rowOffsets[row];
          if (!edge) continue;
          frondPositions.push(edge.left.x, edge.left.y, edge.left.z, edge.right.x, edge.right.y, edge.right.z);
          const leafTone = green.clone().lerp(new THREE.Color('#b5a95e'), row / segments * 0.22);
          addLeafColour(leafTone);
          addLeafColour(leafTone);
          if (row > 0) {
            const current = vertexStart + row * 2;
            const previous = current - 2;
            frondIndices.push(previous, previous + 1, current, previous + 1, current + 1, current);
          }
        }
      }
      continue;
    }

    const height = tree.species === 'banyan'
      ? 4.1 * tree.scale
      : tree.species === 'pongamia'
        ? 4.8 * tree.scale
        : tree.species === 'copperpod'
          ? 5.0 * tree.scale
          : 5.4 * tree.scale;
    trunks.push({
      position: new THREE.Vector3(tree.x, tree.localBaseY + height / 2, tree.z),
      scale: new THREE.Vector3(tree.species === 'banyan' ? 1.25 : tree.scale, height, tree.species === 'banyan' ? 1.25 : tree.scale),
      color: '#685541',
    });
    const crownY = tree.localBaseY + height + (tree.species === 'banyan' ? 0.85 : 1.0) * tree.scale;
    const clusterCount = tree.species === 'banyan' ? 8 : tree.species === 'copperpod' ? 7 : 6;
    const canopyRadius = tree.species === 'banyan' ? 2.15 : tree.species === 'copperpod' ? 1.9 : tree.species === 'pongamia' ? 1.75 : 1.55;
    for (let cluster = 0; cluster < clusterCount; cluster += 1) {
      const angle = cluster / clusterCount * Math.PI * 2 + random() * 0.35;
      const radius = cluster === 0 ? 0 : canopyRadius * tree.scale * (0.68 + random() * 0.48);
      const centerX = tree.x + Math.cos(angle) * radius;
      const centerZ = tree.z + Math.sin(angle) * radius;
      const centerY = crownY + (cluster === 0 ? 0.12 : (random() - 0.5) * 0.72 * tree.scale);
      const spread = tree.species === 'banyan' ? 1.2 : tree.species === 'copperpod' ? 1.05 : tree.species === 'pongamia' ? 0.98 : 0.88;
      crowns.push({
        position: new THREE.Vector3(centerX, centerY, centerZ),
        scale: new THREE.Vector3(
          spread * tree.scale * (0.82 + random() * 0.44),
          (tree.species === 'copperpod' ? 1.08 : tree.species === 'pongamia' ? 1.25 : 1.42) * tree.scale * (0.78 + random() * 0.34),
          spread * tree.scale * (0.82 + random() * 0.44),
        ),
        color: cluster === 0 ? crownColor : greens[Math.floor(random() * greens.length)] ?? crownColor,
      });
      if (tree.species === 'copperpod' && cluster % 2 === 1) {
        blossoms.push({
          position: new THREE.Vector3(centerX + 0.2 * tree.scale, centerY + 0.42 * tree.scale, centerZ - 0.18 * tree.scale),
          scale: new THREE.Vector3(0.44 * tree.scale, 0.34 * tree.scale, 0.46 * tree.scale),
          color: ['#b38b3c', '#c19a47', '#98783c'][cluster % 3] ?? '#b38b3c',
        });
      }
    }
    if (tree.species === 'banyan') {
      for (let root = 0; root < 4; root += 1) {
        const angle = (root / 4) * Math.PI * 2 + random() * 0.3;
        const radius = 1.15 * tree.scale;
        banyanRoots.push({
          start: new THREE.Vector3(tree.x + Math.cos(angle) * radius, crownY - 0.45 * tree.scale, tree.z + Math.sin(angle) * radius),
          end: new THREE.Vector3(tree.x + Math.cos(angle) * radius * 0.82, tree.localBaseY + 0.65 * tree.scale, tree.z + Math.sin(angle) * radius * 0.82),
        });
      }
    }
  }

  const trunkMesh = addCylinderInstances(parent, 'Street and station landscape trunks — procedural Neem, Banyan, Copperpod, Pongamia and Palm forms', trunkGeometry, trunkMaterial, trunks);
  trunkMesh.receiveShadow = false;
  const crownMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, crowns.length);
  crownMesh.name = 'Irregular, varied native-tree canopy clumps — representative, not botanical scans';
  crownMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  crownMesh.castShadow = false;
  crownMesh.receiveShadow = true;
  const transform = new THREE.Object3D();
  for (let index = 0; index < crowns.length; index += 1) {
    const crown = crowns[index];
    if (!crown) continue;
    transform.position.copy(crown.position);
    transform.scale.copy(crown.scale);
    transform.updateMatrix();
    crownMesh.setMatrixAt(index, transform.matrix);
    if (crown.color) crownMesh.setColorAt(index, new THREE.Color(crown.color));
  }
  crownMesh.instanceMatrix.needsUpdate = true;
  if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;
  crownMesh.computeBoundingSphere();
  parent.add(crownMesh);

  if (blossoms.length > 0) {
    const blossomMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, blossoms.length);
    blossomMesh.name = 'Sparse Copperpod blossom accents — artistic seasonal cue, not a seasonal inventory';
    blossomMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    blossomMesh.castShadow = false;
    blossomMesh.receiveShadow = false;
    for (let index = 0; index < blossoms.length; index += 1) {
      const blossom = blossoms[index];
      if (!blossom) continue;
      transform.position.copy(blossom.position);
      transform.scale.copy(blossom.scale);
      transform.updateMatrix();
      blossomMesh.setMatrixAt(index, transform.matrix);
      if (blossom.color) blossomMesh.setColorAt(index, new THREE.Color(blossom.color));
    }
    blossomMesh.instanceMatrix.needsUpdate = true;
    if (blossomMesh.instanceColor) blossomMesh.instanceColor.needsUpdate = true;
    blossomMesh.computeBoundingSphere();
    parent.add(blossomMesh);
  }
  addBeamInstances(parent, 'Sparse hanging aerial-root cues under illustrative Banyan crowns', new THREE.CylinderGeometry(0.035, 0.045, 1, 5), trunkMaterial, banyanRoots, false);

  if (frondPositions.length > 0) {
    const frondGeometry = new THREE.BufferGeometry();
    frondGeometry.setAttribute('position', new THREE.Float32BufferAttribute(frondPositions, 3));
    frondGeometry.setAttribute('color', new THREE.Float32BufferAttribute(frondColors, 3));
    frondGeometry.setIndex(frondIndices);
    frondGeometry.computeVertexNormals();
    frondGeometry.computeBoundingSphere();
    const frondMesh = new THREE.Mesh(
      frondGeometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, flatShading: true, side: THREE.DoubleSide }),
    );
    frondMesh.name = 'Layered, tapered fan-palm fronds — procedural Deccan landscape cue';
    frondMesh.castShadow = false;
    frondMesh.receiveShadow = false;
    parent.add(frondMesh);
  }
}
function addStationGardens(parent: THREE.Group, baseY: number): { trunkMaterial: THREE.Material; leafMaterial: THREE.Material } {
  const planterMaterial = new THREE.MeshStandardMaterial({ color: '#a39e90', roughness: 0.94, metalness: 0.01 });
  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#564d3e', roughness: 1, metalness: 0 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#645441', roughness: 1, metalness: 0 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, flatShading: true });
  const planters: BoxPlacement[] = [];
  const soil: BoxPlacement[] = [];
  const treeBases: TreeBase[] = [];
  const shrubs: BoxPlacement[] = [];
  const shrubGeometry = new THREE.IcosahedronGeometry(1, 0);
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#5d7552', roughness: 1, flatShading: true });
  for (const side of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = side * 136;
      const z = zSide * 90;
      planters.push({ position: new THREE.Vector3(x, baseY + 0.29, z), scale: new THREE.Vector3(1, 1, 1) });
      soil.push({ position: new THREE.Vector3(x, baseY + 0.58, z), scale: new THREE.Vector3(1, 1, 1) });
      treeBases.push({
        x,
        z,
        localBaseY: baseY + 0.64,
        scale: 0.92,
        color: '#657950',
        species: side < 0 ? (zSide < 0 ? 'neem' : 'copperpod') : (zSide < 0 ? 'banyan' : 'palm'),
      });
      for (const shrubSide of [-1, 1]) {
        shrubs.push({
          position: new THREE.Vector3(x + shrubSide * 1.65, baseY + 0.94, z + zSide * 1.9),
          scale: new THREE.Vector3(0.95, 0.58, 0.95),
          color: shrubSide < 0 ? '#667650' : '#748158',
        });
      }
    }
  }
  const planterMesh = addBoxInstances(parent, 'Raised forecourt planting beds — representative SCR landscape', new THREE.BoxGeometry(5.4, 0.58, 9.6), planterMaterial, planters);
  planterMesh.receiveShadow = false;
  const soilMesh = addBoxInstances(parent, 'Soil beds in forecourt planters', new THREE.BoxGeometry(5.05, 0.1, 9.25), soilMaterial, soil);
  soilMesh.receiveShadow = false;
  const shrubMesh = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, shrubs.length);
  shrubMesh.name = 'Low shrub clusters in station landscape beds';
  shrubMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  shrubMesh.castShadow = false;
  shrubMesh.receiveShadow = true;
  const transform = new THREE.Object3D();
  for (let index = 0; index < shrubs.length; index += 1) {
    const shrub = shrubs[index];
    if (!shrub) continue;
    transform.position.copy(shrub.position);
    transform.scale.copy(shrub.scale);
    transform.updateMatrix();
    shrubMesh.setMatrixAt(index, transform.matrix);
    if (shrub.color) shrubMesh.setColorAt(index, new THREE.Color(shrub.color));
  }
  shrubMesh.instanceMatrix.needsUpdate = true;
  if (shrubMesh.instanceColor) shrubMesh.instanceColor.needsUpdate = true;
  shrubMesh.computeBoundingSphere();
  parent.add(shrubMesh);
  return { trunkMaterial, leafMaterial };
}

function addStreetLights(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  lampMaterial: THREE.MeshStandardMaterial,
): void {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#7d8580', roughness: 0.72, metalness: 0.36 });
  const poleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const poles: BoxPlacement[] = [];
  const heads: BoxPlacement[] = [];
  const baseOffsets: Array<{ x: number; z: number }> = [];
  for (const side of [-1, 1]) {
    for (let z = -315; z <= 315; z += 90) baseOffsets.push({ x: side * 177, z });
  }
  for (const point of baseOffsets) {
    const localGround = groundHeight(point.x, point.z) - STATION_BASE_Y;
    const roadSide = point.x < 0 ? 1 : -1;
    const height = 7.6;
    poles.push({
      position: new THREE.Vector3(point.x, localGround + height / 2, point.z),
      scale: new THREE.Vector3(0.15, height, 0.15),
    });
    heads.push({
      position: new THREE.Vector3(point.x + roadSide * 1.15, localGround + height - 0.15, point.z),
      scale: new THREE.Vector3(1.15, 0.18, 0.42),
      rotationY: roadSide < 0 ? Math.PI : 0,
    });
  }
  const poleMesh = addBoxInstances(parent, 'Simple urban street-light masts — generic surrounding context', poleGeometry, poleMaterial, poles);
  poleMesh.receiveShadow = false;
  const headMesh = addBoxInstances(parent, 'Warm street-light heads — emissive at night, no extra shadow lights', poleGeometry, lampMaterial, heads);
  headMesh.receiveShadow = false;
}

export type SecunderabadSurroundingsParts = {
  group: THREE.Group;
  streetLampMaterial: THREE.MeshStandardMaterial;
};

export function createSecunderabadSurroundings(
  groundHeight: GroundHeight,
  sitePadWidth: number,
  sitePadLength: number,
): SecunderabadSurroundingsParts {
  const group = new THREE.Group();
  group.name = 'Generic Secunderabad urban edge, access loop and landscape — schematic, not a map survey';
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#645441', roughness: 1, metalness: 0 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, flatShading: true });
  const treeBases: TreeBase[] = [];
  const halfWidth = sitePadWidth / 2;
  const halfLength = sitePadLength / 2;

  addCityRoadNetwork(group, groundHeight, halfWidth, halfLength);
  addRepresentativeBoundaryWalls(group, groundHeight, halfWidth, halfLength);

  const garden = addStationGardens(group, 0.1);

  for (const side of [-1, 1]) {
    for (let z = -330; z <= 330; z += 66) {
      if (side > 0 && z > 140 && z < 380) continue;
      const x = side * (halfWidth + 50);
      treeBases.push({
        x,
        z,
        localBaseY: groundHeight(x, z) - STATION_BASE_Y + 0.06,
        scale: 0.9 + ((Math.abs(z) / 66) % 3) * 0.08,
        color: '',
        species: (['neem', 'banyan', 'copperpod', 'pongamia', 'palm'] as const)[(Math.round(Math.abs(z) / 66) + (side > 0 ? 1 : 0)) % 5] ?? 'neem',
      });
    }
  }
  for (const side of [-1, 1]) {
    for (let x = -125; x <= 125; x += 50) {
      const z = side * (halfLength + 35);
      treeBases.push({
        x,
        z,
        localBaseY: groundHeight(x, z) - STATION_BASE_Y + 0.06,
        scale: 0.88 + (Math.abs(x) % 3) * 0.04,
        color: '',
        species: (['palm', 'copperpod', 'neem', 'banyan', 'pongamia'] as const)[(Math.round(Math.abs(x) / 50) + (side > 0 ? 2 : 0)) % 5] ?? 'palm',
      });
    }
  }
  addTreeGroup(group, treeBases, trunkMaterial, leafMaterial);
  // Forecourt beds sit on the raised station hardstanding; their tree roots
  // start at the soil line, not at the lower surrounding terrain elevation.
  const forecourtTrees: TreeBase[] = [
    { x: -136, z: -90, localBaseY: 0.74, scale: 0.88, color: '#657950', species: 'neem' },
    { x: -136, z: 90, localBaseY: 0.74, scale: 0.88, color: '#62774e', species: 'copperpod' },
    { x: 136, z: -90, localBaseY: 0.74, scale: 0.88, color: '#708054', species: 'banyan' },
    { x: 136, z: 90, localBaseY: 0.74, scale: 0.88, color: '#63784e', species: 'palm' },
  ];
  addTreeGroup(group, forecourtTrees, garden.trunkMaterial, garden.leafMaterial);

  addUrbanBuildings(group, groundHeight, halfWidth + 90, halfLength + 66);
  addIntermodalContext(group, groundHeight, halfWidth);
  addDeccanScrubAndStones(group, groundHeight, halfWidth, halfLength);
  const streetLampMaterial = new THREE.MeshStandardMaterial({
    color: '#d9d3c0',
    emissive: '#ffd6a1',
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.05,
  });
  addStreetLights(group, groundHeight, streetLampMaterial);
  group.userData.caveat = 'Access-loop roads, boundary treatment, block footprints, street-light placements, traffic props and landscaping clusters are illustrative; no surrounding street/building survey was used.';
  group.userData.intermodalCaveat = 'Metro guideway bearing, station massing, bus-terminal footprint and relative spacing are conceptual only. Nearby landmarks do not establish an exact route, direct shared interchange or surveyed connection.';
  group.userData.landscapeReference = 'Tree palette is informed by Hyderabad urban-tree surveys and park examples; forms, species distribution and quantities are illustrative, not a station-site inventory.';
  return { group, streetLampMaterial };
}
