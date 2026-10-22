import * as THREE from 'three';

type GroundHeight = (x: number, z: number) => number;

type BoxPlacement = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationY?: number;
  color?: THREE.ColorRepresentation;
};

type RibbonLine = { start: THREE.Vector2; end: THREE.Vector2 };

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

const STATION_BASE_Y = 2.8;

function addBoxInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BoxGeometry,
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

function addCityRoadNetwork(
  parent: THREE.Group,
  groundHeight: GroundHeight,
  stationHalfWidth: number,
  stationHalfLength: number,
): void {
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#454c4b', roughness: 0.96, metalness: 0.01 });
  const footpathMaterial = new THREE.MeshStandardMaterial({ color: '#aaa99f', roughness: 0.96, metalness: 0.01 });
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
    const style = (random() < 0.3 ? 2 : random() < 0.56 ? 0 : 1) as 0 | 1 | 2;
    const width = 14 + random() * 23;
    const depth = 18 + random() * 22;
    const height = style === 2
      ? 7 + random() * 13
      : style === 0
        ? 8 + random() ** 1.6 * 26
        : 16 + random() ** 1.7 * 38;
    blocks.push({
      x,
      z,
      width,
      depth,
      height,
      rotationY: (random() - 0.5) * 0.08,
      ground: groundHeight(x, z),
      style,
    });
  };

  // Loose street-block rows leave the station-edge access loop clear. Their
  // positions are illustrative urban massing, not individually mapped parcels.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row += 1) {
      const x = side * (cityStartX + row * 54 + random() * 7);
      for (let column = -8; column <= 8; column += 1) {
        const z = column * 62 + (random() - 0.5) * 14;
        addBlock(x, z);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row += 1) {
      const z = side * (cityStartZ + row * 58 + random() * 10);
      for (let column = -7; column <= 7; column += 1) {
        const x = column * 64 + (random() - 0.5) * 18;
        addBlock(x, z);
      }
    }
  }

  const facadeTextures = [makeFacadeTexture(0), makeFacadeTexture(1), makeFacadeTexture(2)];
  const facadeMaterials = facadeTextures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.93, metalness: 0.01, flatShading: true }));
  const palette = ['#9c9486', '#a89e8b', '#8c938c', '#b6aa96', '#858a83', '#a89e92'];
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
}

function addTreeGroup(
  parent: THREE.Group,
  treeBases: readonly { x: number; z: number; localBaseY: number; scale: number; color: string }[],
  trunkMaterial: THREE.Material,
  leafMaterial: THREE.Material,
): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.25, 1, 7);
  const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const trunks: BoxPlacement[] = [];
  const crowns: BoxPlacement[] = [];
  let seed = 47_113;
  const random = (): number => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 4_294_967_296;
  };
  const greens = ['#536f4f', '#617b52', '#748254', '#4e6851'];
  for (const tree of treeBases) {
    const height = 4.6 * tree.scale;
    trunks.push({
      position: new THREE.Vector3(tree.x, tree.localBaseY + height / 2, tree.z),
      scale: new THREE.Vector3(tree.scale, height, tree.scale),
    });
    const crownColor = tree.color || greens[Math.floor(random() * greens.length)] || '#617b52';
    const crownY = tree.localBaseY + height + 1.1 * tree.scale;
    crowns.push({
      position: new THREE.Vector3(tree.x, crownY, tree.z),
      scale: new THREE.Vector3(2.4 * tree.scale, 2.25 * tree.scale, 2.6 * tree.scale),
      color: crownColor,
    });
    for (const side of [-1, 1]) {
      crowns.push({
        position: new THREE.Vector3(tree.x + side * 1.4 * tree.scale, crownY - 0.65 * tree.scale, tree.z + (random() - 0.5) * 1.1 * tree.scale),
        scale: new THREE.Vector3(1.7 * tree.scale, 1.6 * tree.scale, 1.8 * tree.scale),
        color: greens[Math.floor(random() * greens.length)] || crownColor,
      });
    }
  }
  const trunkMesh = addCylinderInstances(parent, 'Street and station landscaping tree trunks — generic', trunkGeometry, trunkMaterial, trunks);
  trunkMesh.receiveShadow = false;
  const crownMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, crowns.length);
  crownMesh.name = 'Layered low-poly shade tree canopies — representative landscape, not a tree-count survey';
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
}

function addStationGardens(parent: THREE.Group, baseY: number): { trunkMaterial: THREE.Material; leafMaterial: THREE.Material } {
  const planterMaterial = new THREE.MeshStandardMaterial({ color: '#a39e90', roughness: 0.94, metalness: 0.01 });
  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#564d3e', roughness: 1, metalness: 0 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#645441', roughness: 1, metalness: 0 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, flatShading: true });
  const planters: BoxPlacement[] = [];
  const soil: BoxPlacement[] = [];
  const treeBases: { x: number; z: number; localBaseY: number; scale: number; color: string }[] = [];
  const shrubs: BoxPlacement[] = [];
  const shrubGeometry = new THREE.IcosahedronGeometry(1, 0);
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#5d7552', roughness: 1, flatShading: true });
  for (const side of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = side * 136;
      const z = zSide * 90;
      planters.push({ position: new THREE.Vector3(x, baseY + 0.29, z), scale: new THREE.Vector3(1, 1, 1) });
      soil.push({ position: new THREE.Vector3(x, baseY + 0.58, z), scale: new THREE.Vector3(1, 1, 1) });
      treeBases.push({ x, z, localBaseY: baseY + 0.64, scale: 0.92, color: '#657950' });
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
  const treeBases: { x: number; z: number; localBaseY: number; scale: number; color: string }[] = [];
  const halfWidth = sitePadWidth / 2;
  const halfLength = sitePadLength / 2;

  addCityRoadNetwork(group, groundHeight, halfWidth, halfLength);

  const garden = addStationGardens(group, 0.1);

  for (const side of [-1, 1]) {
    for (let z = -330; z <= 330; z += 66) {
      const x = side * (halfWidth + 50);
      treeBases.push({
        x,
        z,
        localBaseY: groundHeight(x, z) - STATION_BASE_Y + 0.06,
        scale: 0.9 + ((Math.abs(z) / 66) % 3) * 0.08,
        color: '',
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
      });
    }
  }
  addTreeGroup(group, treeBases, trunkMaterial, leafMaterial);
  // Forecourt beds sit on the raised station hardstanding; their tree roots
  // start at the soil line, not at the lower surrounding terrain elevation.
  const forecourtTrees = [
    { x: -136, z: -90, localBaseY: 0.74, scale: 0.88, color: '#657950' },
    { x: -136, z: 90, localBaseY: 0.74, scale: 0.88, color: '#62774e' },
    { x: 136, z: -90, localBaseY: 0.74, scale: 0.88, color: '#708054' },
    { x: 136, z: 90, localBaseY: 0.74, scale: 0.88, color: '#63784e' },
  ];
  addTreeGroup(group, forecourtTrees, garden.trunkMaterial, garden.leafMaterial);

  addUrbanBuildings(group, groundHeight, halfWidth + 90, halfLength + 66);
  const streetLampMaterial = new THREE.MeshStandardMaterial({
    color: '#d9d3c0',
    emissive: '#ffd6a1',
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.05,
  });
  addStreetLights(group, groundHeight, streetLampMaterial);
  group.userData.caveat = 'Access-loop roads, block footprints, street-light placements and landscaping clusters are illustrative; no surrounding street/building survey was used.';
  group.userData.landscapeReference = 'Representative planted areas informed by SCR station-profile description; not to scale and not a count of reported trees.';
  return { group, streetLampMaterial };
}
