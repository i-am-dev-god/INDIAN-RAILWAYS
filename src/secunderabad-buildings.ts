import * as THREE from 'three';

type BoxTransform = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  color?: THREE.ColorRepresentation;
};

type TerminalSide = {
  name: string;
  x: number;
  width: number;
  length: number;
  reportedFloorArea: number;
};

function addBoxInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BoxGeometry,
  material: THREE.Material,
  transforms: readonly BoxTransform[],
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
    dummy.rotation.set(0, 0, 0);
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

function makeStationSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the Secunderabad terminal sign.');
  context.fillStyle = '#113b43';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#ddbd79';
  context.lineWidth = 8;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = '#fff4d9';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 54px Arial, sans-serif';
  context.fillText('SECUNDERABAD JUNCTION', canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addTerminalBuilding(
  parent: THREE.Group,
  side: TerminalSide,
  phase: 'current' | 'planned',
  materials: {
    wall: THREE.Material;
    podium: THREE.Material;
    concrete: THREE.Material;
    glass: THREE.Material;
    recess: THREE.Material;
    metal: THREE.Material;
    canopy: THREE.Material;
    sign: THREE.Material;
    roofPlant: THREE.Material;
  },
): void {
  const building = new THREE.Group();
  building.name = `${side.name} terminal building — ${phase === 'planned' ? 'schematic G+3 massing' : 'illustrative active construction'}`;
  building.position.set(side.x, 0, 0);
  building.userData.reportedGPlusFloors = 3;
  building.userData.reportedFloorAreaSquareMetres = side.reportedFloorArea;
  building.userData.geometry = 'schematic footprint; no approved facade or as-built drawing inspected';
  building.userData.orientation = 'north/south side naming follows reporting; cardinal scene placement is assumed';

  const floorBases = [0, 4.3, 7.9, 11.5];
  const floorHeights = [4.3, 3.6, 3.6, 3.6];
  const cladFloorCount = phase === 'planned' ? 4 : 2;
  const wallVolumes: THREE.Mesh[] = [];
  const levelSlabs: BoxTransform[] = [];
  const frameColumns: BoxTransform[] = [];
  const frameBeams: BoxTransform[] = [];

  for (let floor = 0; floor < 4; floor += 1) {
    const base = floorBases[floor] ?? 0;
    const height = floorHeights[floor] ?? 3.6;
    if (floor < cladFloorCount) {
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(side.width, height, side.length),
        floor === 0 ? materials.podium : materials.wall,
      );
      shell.name = `Terminal facade mass — G${floor === 0 ? '' : `+${floor}`}`;
      shell.position.set(0, base + height / 2, 0);
      shell.castShadow = true;
      shell.receiveShadow = true;
      building.add(shell);
      wallVolumes.push(shell);
    } else {
      const columnBottom = base + 0.12;
      const columnTop = base + height - 0.12;
      const columnHeight = columnTop - columnBottom;
      const columnYs = [
        -side.width / 2 + 0.25,
        -side.width / 4,
        0,
        side.width / 4,
        side.width / 2 - 0.25,
      ];
      for (const x of columnYs) {
        for (const z of [-side.length / 2 + 0.25, side.length / 2 - 0.25]) {
          frameColumns.push({
            position: new THREE.Vector3(x, columnBottom + columnHeight / 2, z),
            scale: new THREE.Vector3(0.42, columnHeight, 0.42),
          });
        }
      }
      for (const z of [-side.length / 2 + 0.25, side.length / 2 - 0.25]) {
        frameBeams.push({
          position: new THREE.Vector3(0, base + height - 0.14, z),
          scale: new THREE.Vector3(side.width, 0.34, 0.4),
        });
      }
      for (const x of [-side.width / 2 + 0.2, side.width / 2 - 0.2]) {
        frameBeams.push({
          position: new THREE.Vector3(x, base + height - 0.14, 0),
          scale: new THREE.Vector3(0.4, 0.34, side.length),
        });
      }
    }
    if (floor > 0) {
      levelSlabs.push({
        position: new THREE.Vector3(0, base + 0.04, 0),
        scale: new THREE.Vector3(side.width + 0.45, 0.22, side.length + 0.45),
      });
    }
  }

  addBoxInstances(building, 'Reinforced-concrete floor plates and roof edge', new THREE.BoxGeometry(1, 1, 1), materials.concrete, levelSlabs);
  addBoxInstances(building, 'Open upper-floor construction columns', new THREE.BoxGeometry(1, 1, 1), materials.concrete, frameColumns);
  addBoxInstances(building, 'Open upper-floor perimeter beams', new THREE.BoxGeometry(1, 1, 1), materials.concrete, frameBeams);

  const windowRecessLong: BoxTransform[] = [];
  const windowGlassLong: BoxTransform[] = [];
  const windowRecessEnd: BoxTransform[] = [];
  const windowGlassEnd: BoxTransform[] = [];
  const mullionsLong: BoxTransform[] = [];
  const mullionsEnd: BoxTransform[] = [];
  const cladFloors = Array.from({ length: cladFloorCount }, (_, index) => index);
  for (const floor of cladFloors) {
    const base = floorBases[floor] ?? 0;
    const height = floorHeights[floor] ?? 3.6;
    const windowY = base + (floor === 0 ? 2.55 : height / 2 + 0.12);
    for (const face of [-1, 1]) {
      const faceX = face * (side.width / 2 + 0.025);
      for (let z = -side.length / 2 + 6; z <= side.length / 2 - 6; z += 5) {
        windowRecessLong.push({
          position: new THREE.Vector3(faceX, windowY, z),
          scale: new THREE.Vector3(1, 1, 1),
        });
        windowGlassLong.push({
          position: new THREE.Vector3(face * (side.width / 2 + 0.085), windowY, z),
          scale: new THREE.Vector3(1, 1, 1),
        });
        mullionsLong.push({
          position: new THREE.Vector3(face * (side.width / 2 + 0.13), windowY, z),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    }
    for (let x = -side.width / 2 + 6; x <= side.width / 2 - 6; x += 5) {
      for (const end of [-1, 1]) {
        const endZ = end * (side.length / 2 + 0.025);
        windowRecessEnd.push({
          position: new THREE.Vector3(x, windowY, endZ),
          scale: new THREE.Vector3(1, 1, 1),
        });
        windowGlassEnd.push({
          position: new THREE.Vector3(x, windowY, end * (side.length / 2 + 0.085)),
          scale: new THREE.Vector3(1, 1, 1),
        });
        mullionsEnd.push({
          position: new THREE.Vector3(x, windowY, end * (side.length / 2 + 0.13)),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    }
  }

  const recessLongGeometry = new THREE.BoxGeometry(0.08, 1.64, 2.78);
  const glassLongGeometry = new THREE.BoxGeometry(0.05, 1.42, 2.48);
  const mullionLongGeometry = new THREE.BoxGeometry(0.055, 1.42, 0.07);
  const recessEndGeometry = new THREE.BoxGeometry(2.78, 1.64, 0.08);
  const glassEndGeometry = new THREE.BoxGeometry(2.48, 1.42, 0.05);
  const mullionEndGeometry = new THREE.BoxGeometry(0.07, 1.42, 0.055);
  addBoxInstances(building, 'Dark window reveals — long elevations', recessLongGeometry, materials.recess, windowRecessLong);
  addBoxInstances(building, 'Blue-grey curtain glazing — long elevations', glassLongGeometry, materials.glass, windowGlassLong);
  addBoxInstances(building, 'Window vertical mullions — long elevations', mullionLongGeometry, materials.metal, mullionsLong);
  addBoxInstances(building, 'Dark window reveals — end elevations', recessEndGeometry, materials.recess, windowRecessEnd);
  addBoxInstances(building, 'Blue-grey curtain glazing — end elevations', glassEndGeometry, materials.glass, windowGlassEnd);
  addBoxInstances(building, 'Window vertical mullions — end elevations', mullionEndGeometry, materials.metal, mullionsEnd);

  const horizontalBands: BoxTransform[] = [];
  const verticalFins: BoxTransform[] = [];
  const builtHeight = floorBases[cladFloorCount - 1]! + floorHeights[cladFloorCount - 1]!;
  for (const face of [-1, 1]) {
    for (const level of floorBases.slice(1, cladFloorCount).concat(phase === 'planned' ? [15.1] : [])) {
      horizontalBands.push({
        position: new THREE.Vector3(face * (side.width / 2 + 0.07), level, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
    for (let z = -side.length / 2 + 10; z <= side.length / 2 - 10; z += 20) {
      verticalFins.push({
        position: new THREE.Vector3(face * (side.width / 2 + 0.08), builtHeight / 2, z),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
  }
  for (const end of [-1, 1]) {
    for (const level of floorBases.slice(1, cladFloorCount).concat(phase === 'planned' ? [15.1] : [])) {
      horizontalBands.push({
        position: new THREE.Vector3(0, level, end * (side.length / 2 + 0.07)),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
  }
  addBoxInstances(
    building,
    'Continuous architectural floor bands',
    new THREE.BoxGeometry(0.18, 0.28, side.length + 0.55),
    materials.concrete,
    horizontalBands.filter((item) => Math.abs(item.position.x) > 0),
  );
  addBoxInstances(
    building,
    'End-facade floor bands',
    new THREE.BoxGeometry(side.width + 0.55, 0.28, 0.18),
    materials.concrete,
    horizontalBands.filter((item) => Math.abs(item.position.x) === 0),
  );
  addBoxInstances(
    building,
    'Shallow vertical facade fins',
    new THREE.BoxGeometry(0.22, builtHeight, 0.42),
    materials.concrete,
    verticalFins,
  );

  const innerDirection = side.x > 0 ? -1 : 1;
  const innerFaceX = innerDirection * (side.width / 2 + 0.12);
  const entranceGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 2.45, 15.5),
    materials.glass,
  );
  entranceGlass.name = 'Ground-floor station entrance glazing — schematic';
  entranceGlass.position.set(innerFaceX, 2.45, 0);
  building.add(entranceGlass);
  const entryCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.24, 24),
    materials.canopy,
  );
  entryCanopy.name = 'Passenger drop-off / entrance canopy — massing only';
  entryCanopy.position.set(innerDirection * (side.width / 2 + 1.8), 4.52, 0);
  entryCanopy.castShadow = true;
  building.add(entryCanopy);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 1.85), materials.sign);
  sign.name = 'Secunderabad Junction terminal sign — illustrative English panel';
  sign.position.set(innerFaceX + innerDirection * 0.08, 4.06, 0);
  sign.rotation.y = innerDirection < 0 ? -Math.PI / 2 : Math.PI / 2;
  building.add(sign);

  if (phase === 'planned') {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(side.width + 1.3, 0.42, side.length + 1.3),
      materials.concrete,
    );
    roof.name = 'Terminal roof slab and parapet cap';
    roof.position.set(0, 15.25, 0);
    building.add(roof);

    const plantTransforms: BoxTransform[] = [];
    for (const z of [-side.length / 3, 0, side.length / 3]) {
      plantTransforms.push({
        position: new THREE.Vector3(0, 16.0, z),
        scale: new THREE.Vector3(4.8, 1.0, 6.5),
      });
    }
    addBoxInstances(building, 'Schematic rooftop mechanical plant screens', new THREE.BoxGeometry(1, 1, 1), materials.roofPlant, plantTransforms);
  } else {
    const rebarTransforms: BoxTransform[] = [];
    for (let z = -side.length / 2 + 10; z <= side.length / 2 - 10; z += 20) {
      rebarTransforms.push({
        position: new THREE.Vector3(0, 15.35, z),
        scale: new THREE.Vector3(0.055, 0.72, 0.055),
      });
    }
    addBoxInstances(building, 'Sparse top-floor starter bars — construction cue', new THREE.BoxGeometry(1, 1, 1), materials.metal, rebarTransforms);
  }

  building.userData.cladFloorsInThisView = cladFloorCount;
  building.userData.modelledGrossFloorAreaSquareMetres = side.width * side.length * 4;
  building.userData.areaAssumption = 'reported areas used only as broad scale cues; footprints and facade are not surveyed';
  parent.add(building);
}

function addConcourseLinks(parent: THREE.Group, material: THREE.Material): void {
  const connectors = new THREE.Group();
  connectors.name = 'Conceptual terminal-to-air-concourse links';
  for (const side of [
    { sign: -1, x: -105, width: 50 },
    { sign: 1, x: 105, width: 40 },
  ]) {
    const terminalInnerX = Math.abs(side.x) - side.width / 2;
    const length = terminalInnerX - 58;
    if (length <= 0) continue;
    const centerX = side.sign * (58 + length / 2);
    const link = new THREE.Mesh(new THREE.BoxGeometry(length, 0.42, 10), material);
    link.name = 'Lower concourse link — assumed terminal connection';
    link.position.set(centerX, 12.1, 0);
    connectors.add(link);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(length, 0.22, 10), material);
    roof.name = 'Concourse link canopy';
    roof.position.set(centerX, 14.05, 0);
    connectors.add(roof);
    for (const zSide of [-1, 1]) {
      const glassWall = new THREE.Mesh(
        new THREE.BoxGeometry(length, 1.6, 0.12),
        new THREE.MeshStandardMaterial({
          color: '#82a6ad',
          roughness: 0.28,
          metalness: 0.12,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        }),
      );
      glassWall.name = 'Air-concourse link glazing — conceptual';
      glassWall.position.set(centerX, 13.0, zSide * 4.92);
      connectors.add(glassWall);
    }
  }
  parent.add(connectors);
}

export type SecunderabadBuildingParts = {
  current: THREE.Group;
  future: THREE.Group;
};

export function createSecunderabadBuildings(): SecunderabadBuildingParts {
  const current = new THREE.Group();
  current.name = 'Secunderabad terminal buildings — active construction, schematic';
  const future = new THREE.Group();
  future.name = 'Secunderabad terminal buildings — planned G+3 massing, schematic';

  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: '#d5d0c4', roughness: 0.78, metalness: 0.05 }),
    podium: new THREE.MeshStandardMaterial({ color: '#c9c2b3', roughness: 0.85, metalness: 0.02 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#b7b5ad', roughness: 0.88, metalness: 0.03 }),
    glass: new THREE.MeshStandardMaterial({ color: '#355963', roughness: 0.24, metalness: 0.38, envMapIntensity: 0.45 }),
    recess: new THREE.MeshStandardMaterial({ color: '#23383c', roughness: 0.48, metalness: 0.12 }),
    metal: new THREE.MeshStandardMaterial({ color: '#737e7b', roughness: 0.62, metalness: 0.48 }),
    canopy: new THREE.MeshStandardMaterial({ color: '#d8d0bc', roughness: 0.52, metalness: 0.15 }),
    sign: new THREE.MeshBasicMaterial({ map: makeStationSignTexture(), side: THREE.DoubleSide }),
    roofPlant: new THREE.MeshStandardMaterial({ color: '#8e9690', roughness: 0.8, metalness: 0.1 }),
  };

  const north: TerminalSide = { name: 'North-side', x: -105, width: 50, length: 112, reportedFloorArea: 22_516 };
  const south: TerminalSide = { name: 'South-side', x: 105, width: 40, length: 93, reportedFloorArea: 14_792 };
  for (const side of [north, south]) {
    addTerminalBuilding(current, side, 'current', materials);
    addTerminalBuilding(future, side, 'planned', materials);
  }

  const linkMaterial = new THREE.MeshStandardMaterial({ color: '#9ba9a4', roughness: 0.52, metalness: 0.18, transparent: true, opacity: 0.78, depthWrite: false });
  addConcourseLinks(future, linkMaterial);
  current.userData.caveat = 'Partial cladding/open upper frame is a readable construction-stage assumption, not a dated Secunderabad as-built survey.';
  future.userData.caveat = 'Reported G+3 terminal scope and a lower concourse connection; facade, footprint, placement and finish remain schematic.';
  return { current, future };
}
