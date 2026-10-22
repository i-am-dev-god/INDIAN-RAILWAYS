import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getSecunderabadTrackCenter, SECUNDERABAD_RAIL_TOP_Y } from './secunderabad-yard';

type Transform = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationZ?: number;
};

type Segment = { start: THREE.Vector3; end: THREE.Vector3 };

export const VANDE_BHARAT_20102 = {
  number: '20102',
  route: 'Secunderabad → Nagpur',
  coachOrderFromLeadingEnd: ['C7', 'C6', 'E1', 'C5', 'C4', 'C3', 'C2', 'C1'],
  coachLengthMeters: 24,
  coachCount: 8,
  modelTrackIndex: 5,
  modelCenterZ: -120,
} as const;

const COACH_ORDER_FROM_REAR = ['C1', 'C2', 'C3', 'C4', 'C5', 'E1', 'C6', 'C7'] as const;
const COACH_SPACING = VANDE_BHARAT_20102.coachLengthMeters;
const TRAIN_TRACK_X = getSecunderabadTrackCenter(VANDE_BHARAT_20102.modelTrackIndex);
const TRAIN_RAIL_Y = SECUNDERABAD_RAIL_TOP_Y;

function addBoxInstances(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
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
    dummy.rotation.set(0, 0, transform.rotationZ ?? 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
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
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const vertical = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    direction.subVectors(segment.end, segment.start);
    const length = direction.length();
    dummy.position.copy(segment.start).add(segment.end).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(vertical, direction.normalize());
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function makeCoachLabelTexture(code: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 88;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the Vande Bharat coach label.');
  context.fillStyle = '#163f51';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#e8bd71';
  context.lineWidth = 5;
  context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  context.fillStyle = '#fff8e8';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 48px Arial, sans-serif';
  context.fillText(code, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addPantograph(
  parent: THREE.Group,
  z: number,
  steel: THREE.Material,
  insulator: THREE.Material,
  shoe: THREE.Material,
): void {
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 2.7), steel);
  base.name = 'Pantograph roof plinth — schematic';
  base.position.set(0, 4.19, z);
  parent.add(base);

  const armSegments: Segment[] = [];
  const transverseTies: Segment[] = [];
  const frameZs = [z - 0.48, z + 0.48];
  for (const frameZ of frameZs) {
    const leftBase = new THREE.Vector3(-0.66, 4.27, frameZ);
    const rightBase = new THREE.Vector3(0.66, 4.27, frameZ);
    const leftKnee = new THREE.Vector3(0.42, 4.94, frameZ);
    const rightKnee = new THREE.Vector3(-0.42, 4.94, frameZ);
    const leftTop = new THREE.Vector3(-0.22, 5.61, frameZ);
    const rightTop = new THREE.Vector3(0.22, 5.61, frameZ);
    armSegments.push(
      { start: leftBase, end: leftKnee },
      { start: rightBase, end: rightKnee },
      { start: leftKnee, end: leftTop },
      { start: rightKnee, end: rightTop },
      { start: leftKnee, end: rightKnee },
    );
  }
  transverseTies.push(
    { start: new THREE.Vector3(-0.66, 4.27, frameZs[0]!), end: new THREE.Vector3(-0.66, 4.27, frameZs[1]!) },
    { start: new THREE.Vector3(0.66, 4.27, frameZs[0]!), end: new THREE.Vector3(0.66, 4.27, frameZs[1]!) },
    { start: new THREE.Vector3(-0.22, 5.61, frameZs[0]!), end: new THREE.Vector3(-0.22, 5.61, frameZs[1]!) },
    { start: new THREE.Vector3(0.22, 5.61, frameZs[0]!), end: new THREE.Vector3(0.22, 5.61, frameZs[1]!) },
    { start: new THREE.Vector3(-0.22, 5.61, z), end: new THREE.Vector3(0.22, 5.61, z) },
  );
  addBoxInstances(
    parent,
    'Pantograph ceramic insulator stacks',
    new THREE.CylinderGeometry(0.12, 0.16, 0.36, 8),
    insulator,
    [-0.72, 0.72].flatMap((x) => frameZs.map((frameZ) => ({
      position: new THREE.Vector3(x, 4.38, frameZ),
      scale: new THREE.Vector3(1, 1, 1),
    }))),
  );
  addBeamInstances(parent, 'Single-arm pantograph linkages — schematic, raised', new THREE.CylinderGeometry(0.035, 0.045, 1, 6), steel, armSegments);
  addBeamInstances(parent, 'Pantograph cross ties', new THREE.CylinderGeometry(0.025, 0.03, 1, 5), steel, transverseTies);
  const collector = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.055, 0.12), shoe);
  collector.name = 'Pantograph collector strip — schematic contact point';
  collector.position.set(0, 5.64, z);
  parent.add(collector);
}

export function createVandeBharat20102(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Train 20102 — eight-coach Vande Bharat exterior study';
  group.position.set(TRAIN_TRACK_X, TRAIN_RAIL_Y, VANDE_BHARAT_20102.modelCenterZ);
  group.userData.trainNumber = VANDE_BHARAT_20102.number;
  group.userData.route = VANDE_BHARAT_20102.route;
  group.userData.coachOrderFromLeadingEnd = [...VANDE_BHARAT_20102.coachOrderFromLeadingEnd];
  group.userData.motion = 'bounded straight-line driving prototype; no route, timetable, signalling or station-stop simulation';
  group.userData.dimensions = 'generic Vande Bharat references; 24 m coach / 3.24 m width / 4.14 m roofline are approximate, not a 20102 rake drawing';
  group.userData.coachOrderConfidence = 'coach order is third-party listing, not an official train formation drawing';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#f2f4ef', roughness: 0.36, metalness: 0.16 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: '#c5cbc7', roughness: 0.52, metalness: 0.26 });
  const blueBandMaterial = new THREE.MeshStandardMaterial({ color: '#005d83', roughness: 0.38, metalness: 0.18 });
  const saffronMaterial = new THREE.MeshStandardMaterial({ color: '#e99a48', roughness: 0.5, metalness: 0.08 });
  const windowMaterial = new THREE.MeshPhysicalMaterial({ color: '#203f4e', roughness: 0.19, metalness: 0.44, clearcoat: 0.85, clearcoatRoughness: 0.18 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: '#cbd1cc', roughness: 0.42, metalness: 0.14 });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#30383a', roughness: 0.78, metalness: 0.34 });
  const bogieMaterial = new THREE.MeshStandardMaterial({ color: '#353b3b', roughness: 0.76, metalness: 0.62 });
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#292e30', roughness: 0.52, metalness: 0.78 });
  const connectorMaterial = new THREE.MeshStandardMaterial({ color: '#253638', roughness: 0.9, metalness: 0.14 });
  const windshieldMaterial = new THREE.MeshPhysicalMaterial({ color: '#10232d', roughness: 0.16, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12 });
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#e9f5f3', emissive: '#d5f1f4', emissiveIntensity: 0.8, roughness: 0.28 });
  const pantographMaterial = new THREE.MeshStandardMaterial({ color: '#5e6866', roughness: 0.48, metalness: 0.62 });
  const porcelainMaterial = new THREE.MeshStandardMaterial({ color: '#e3dcc7', roughness: 0.38, metalness: 0.05 });
  const collectorMaterial = new THREE.MeshStandardMaterial({ color: '#373b3a', roughness: 0.34, metalness: 0.78 });

  const bodyGeometry = new RoundedBoxGeometry(3.24, 2.68, 21.6, 4, 0.16);
  const roofPodGeometry = new RoundedBoxGeometry(2.55, 0.25, 3.2, 3, 0.08);
  const equipmentGeometry = new THREE.BoxGeometry(2.65, 0.62, 4.6);
  const bogieGeometry = new THREE.BoxGeometry(2.35, 0.34, 3.45);
  const wheelGeometry = new THREE.CylinderGeometry(0.475, 0.475, 0.16, 16);
  const windowGeometry = new RoundedBoxGeometry(0.06, 0.98, 1.86, 3, 0.11);
  const doorGeometry = new RoundedBoxGeometry(0.075, 2.32, 0.94, 3, 0.08);
  const doorGlassGeometry = new RoundedBoxGeometry(0.08, 0.72, 0.62, 3, 0.08);
  const blueStripeGeometry = new THREE.BoxGeometry(0.07, 0.2, 21.1);
  const saffronStripeGeometry = new THREE.BoxGeometry(0.075, 0.075, 21.1);
  const underbodyTransforms: Transform[] = [];
  const bogieTransforms: Transform[] = [];
  const wheelTransforms: Transform[] = [];
  const windowTransforms: Transform[] = [];
  const doorTransforms: Transform[] = [];
  const doorGlassTransforms: Transform[] = [];
  const blueStripeTransforms: Transform[] = [];
  const saffronStripeTransforms: Transform[] = [];
  const roofPodTransforms: Transform[] = [];
  const pantographPositions: number[] = [];
  const labelMaterials = new Map<string, THREE.Material>();

  for (let coachIndex = 0; coachIndex < COACH_ORDER_FROM_REAR.length; coachIndex += 1) {
    const coachCode = COACH_ORDER_FROM_REAR[coachIndex]!;
    const coachZ = (coachIndex - (COACH_ORDER_FROM_REAR.length - 1) / 2) * COACH_SPACING;
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = `Coach ${coachCode} — ${coachCode === 'E1' ? 'Executive Chair Car' : 'AC Chair Car'}`;
    body.position.set(0, 2.54, coachZ);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.class = coachCode === 'E1' ? 'Executive Chair Car' : 'Chair Car';
    group.add(body);

    underbodyTransforms.push({
      position: new THREE.Vector3(0, 0.95, coachZ),
      scale: new THREE.Vector3(1, 1, 1),
    });
    for (const bogieOffset of [-7.5, 7.5]) {
      const bogieZ = coachZ + bogieOffset;
      bogieTransforms.push({ position: new THREE.Vector3(0, 0.72, bogieZ), scale: new THREE.Vector3(1, 1, 1) });
      for (const axleOffset of [-1.15, 1.15]) {
        const axleZ = bogieZ + axleOffset;
        for (const side of [-1, 1]) {
          wheelTransforms.push({
            position: new THREE.Vector3(side * 0.838, 0.475, axleZ),
            scale: new THREE.Vector3(1, 1, 1),
            rotationZ: Math.PI / 2,
          });
        }
      }
    }

    for (const side of [-1, 1]) {
      for (let windowIndex = 0; windowIndex < 8; windowIndex += 1) {
        const windowZ = coachZ - 8 + windowIndex * (16 / 7);
        windowTransforms.push({
          position: new THREE.Vector3(side * 1.62, 2.78, windowZ),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
      for (const doorOffset of [-9.95, 9.95]) {
        doorTransforms.push({
          position: new THREE.Vector3(side * 1.63, 2.38, coachZ + doorOffset),
          scale: new THREE.Vector3(1, 1, 1),
        });
        doorGlassTransforms.push({
          position: new THREE.Vector3(side * 1.68, 2.82, coachZ + doorOffset),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
      blueStripeTransforms.push({
        position: new THREE.Vector3(side * 1.63, 1.48, coachZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
      saffronStripeTransforms.push({
        position: new THREE.Vector3(side * 1.64, 1.66, coachZ),
        scale: new THREE.Vector3(1, 1, 1),
      });
      let labelMaterial = labelMaterials.get(coachCode);
      if (!labelMaterial) {
        labelMaterial = new THREE.MeshBasicMaterial({ map: makeCoachLabelTexture(coachCode), side: THREE.DoubleSide });
        labelMaterials.set(coachCode, labelMaterial);
      }
      const label = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), labelMaterial);
      label.name = `Coach ${coachCode} side plate — illustrative`;
      label.position.set(side * 1.66, 3.47, coachZ);
      label.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(label);
    }

    roofPodTransforms.push(
      { position: new THREE.Vector3(0, 4.01, coachZ - 5.4), scale: new THREE.Vector3(1, 1, 1) },
      { position: new THREE.Vector3(0, 4.01, coachZ + 5.4), scale: new THREE.Vector3(1, 1, 1) },
    );

    if (coachCode === 'C2' || coachCode === 'C6') pantographPositions.push(coachZ);

    if (coachCode === 'C1' || coachCode === 'C7') {
      const direction = coachCode === 'C7' ? 1 : -1;
      const nose = new MeshWithPosition(
        new RoundedBoxGeometry(3.12, 2.52, 2.8, 5, 0.5),
        bodyMaterial,
        new THREE.Vector3(0, 2.54, coachZ + direction * 10.5),
        `Vande Bharat ${coachCode} aerodynamic driving cab nose — schematic`,
      );
      group.add(nose);
      const windshield = new MeshWithPosition(
        new RoundedBoxGeometry(2.08, 1.06, 0.1, 4, 0.13),
        windshieldMaterial,
        new THREE.Vector3(0, 3.07, coachZ + direction * 11.94),
        `${coachCode} driving cab windscreen — schematic`,
      );
      group.add(windshield);
      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.12), lampMaterial);
        lamp.name = `${coachCode} headlamp — study light`;
        lamp.position.set(side * 0.98, 1.72, coachZ + direction * 11.88);
        group.add(lamp);
        const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.04), frameMaterial);
        wiper.name = `${coachCode} windscreen wiper — schematic`;
        wiper.position.set(side * 0.42, 2.91, coachZ + direction * 12.0);
        wiper.rotation.z = side * 0.12;
        group.add(wiper);
      }
      const noseBand = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.12), blueBandMaterial);
      noseBand.name = `${coachCode} lower blue nose accent`;
      noseBand.position.set(0, 2.03, coachZ + direction * 11.98);
      group.add(noseBand);
      const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.82), frameMaterial);
      coupler.name = `${coachCode} central coupler — simplified`;
      coupler.position.set(0, 0.96, coachZ + direction * 11.95);
      group.add(coupler);
    }
  }

  // Flexible inter-car bellows occupy the coupler gaps without covering the
  // blue/white side stripe or the repeated door/window pattern.
  for (let connection = 0; connection < COACH_ORDER_FROM_REAR.length - 1; connection += 1) {
    const midpoint = (connection - (COACH_ORDER_FROM_REAR.length - 2) / 2) * COACH_SPACING;
    const bellows = new THREE.Mesh(new RoundedBoxGeometry(2.94, 2.5, 1.5, 3, 0.16), connectorMaterial);
    bellows.name = `Flexible inter-coach gangway ${connection + 1}`;
    bellows.position.set(0, 2.46, midpoint);
    group.add(bellows);
  }

  addBoxInstances(group, 'Eight-coach underframe equipment boxes', equipmentGeometry, frameMaterial, underbodyTransforms);
  addBoxInstances(group, 'Vande Bharat bogie frames', bogieGeometry, bogieMaterial, bogieTransforms);
  addBoxInstances(group, 'Sixteen wheelsets — 64 wheels, schematic', wheelGeometry, wheelMaterial, wheelTransforms);
  addBoxInstances(group, 'Blue coach waist stripe — white/blue rake finish', blueStripeGeometry, blueBandMaterial, blueStripeTransforms);
  addBoxInstances(group, 'Saffron hairline above blue belt — livery cue', saffronStripeGeometry, saffronMaterial, saffronStripeTransforms);
  addBoxInstances(group, 'Coach passenger windows', windowGeometry, windowMaterial, windowTransforms);
  addBoxInstances(group, 'Automatic sliding coach doors', doorGeometry, doorMaterial, doorTransforms);
  addBoxInstances(group, 'Door vision panes', doorGlassGeometry, windowMaterial, doorGlassTransforms);
  addBoxInstances(group, 'Roof-mounted HVAC housings — low-profile study', roofPodGeometry, roofMaterial, roofPodTransforms);

  const pantographInsulatorMaterial = porcelainMaterial;
  for (const z of pantographPositions) addPantograph(group, z, pantographMaterial, pantographInsulatorMaterial, collectorMaterial);

  group.userData.approximateOverallLengthMeters = COACH_SPACING * VANDE_BHARAT_20102.coachCount;
  group.userData.modelWidthMeters = 3.24;
  group.userData.modelRoofHeightAboveRailMeters = 5.65;
  group.userData.pantographCars = ['C2', 'C6'];
  group.userData.pantographPlacement = 'illustrative; exact 20102 pantograph-bearing coach IDs were not verified';
  group.userData.selectedTrack = 'central schematic road; exact 20102 platform/road assignment not verified';
  return group;
}

class MeshWithPosition extends THREE.Mesh {
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, name: string) {
    super(geometry, material);
    this.position.copy(position);
    this.name = name;
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
