import { SAFE_GARDEN_HALF_SIZE, SAFE_POND_RADIUS, type GardenPoint } from './navigation';
import type { GardenChoice } from './rewardState';

export type EnvironmentInstance = Readonly<{
  id: string;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

export type EnvironmentDisc = Readonly<{ id: string; center: GardenPoint; radius: number }>;
export type GardenCorridor = Readonly<{ id: string; start: GardenPoint; end: GardenPoint; halfWidth: number }>;

export const STORYBOOK_FOLIAGE_RADII = {
  shrubs: 0.72,
  grassTufts: 0.28,
  flowers: 0.17,
} as const;

export const STORYBOOK_POND_DRESSING_RADII = {
  pondStones: 0.5,
  reeds: 0.5,
} as const;

type PlantingCluster = Readonly<{
  id: string;
  center: GardenPoint;
  spread: number;
  scale: number;
  rotationY: number;
  variant: number;
}>;

type PlantingOffset = readonly [x: number, z: number, scale: number, rotationY: number];

export type StorybookEnvironmentLayout = Readonly<{
  berms: readonly EnvironmentDisc[];
  plantingBeds: readonly EnvironmentDisc[];
  corridors: readonly GardenCorridor[];
  trees: readonly EnvironmentInstance[];
  shrubs: readonly EnvironmentInstance[];
  grassTufts: readonly EnvironmentInstance[];
  flowers: readonly EnvironmentInstance[];
  pondStones: readonly EnvironmentInstance[];
  reeds: readonly EnvironmentInstance[];
  motes: readonly EnvironmentInstance[];
}>;

export type EnvironmentPresentationInput = Readonly<{
  rewardStage: number;
  pavilionImproved: boolean;
  starflowersVisible: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
  reducedMotion: boolean;
}>;

export type EnvironmentPresentation = Readonly<{
  moteMotion: boolean;
  rippleMotion: boolean;
  cloudMotion: boolean;
  pondGlow: number;
  sanctuaryGlow: number;
  pavilionGlow: number;
  starflowerGlow: number;
  seedGlow: number;
  destinationGlow: number;
  destinationAccent: GardenChoice | null;
}>;

const VISIBLE_GARDEN_HALF_SIZE = 20;
const POND_DRESSING_MARGIN = 0.05;

const corridors: readonly GardenCorridor[] = [
  { id: 'spawn-to-pond', start: { x: 0, z: 18 }, end: { x: 0, z: 7.55 }, halfWidth: 1.35 },
  { id: 'pond-to-pavilion', start: { x: -5.8, z: -4.2 }, end: { x: -10.4, z: -9.5 }, halfWidth: 1.2 },
  { id: 'pond-east-loop', start: { x: 6.9, z: 2.5 }, end: { x: 13.5, z: 5.8 }, halfWidth: 1.15 },
  { id: 'pond-west-loop', start: { x: -6.9, z: 2.5 }, end: { x: -13.5, z: 5.8 }, halfWidth: 1.15 },
];

const trees: readonly EnvironmentInstance[] = [
  { id: 'tree-east-north', position: [11.8, 0, -9.2], scale: [1.05, 1.05, 1.05], rotationY: 0.18, variant: 0 },
  { id: 'tree-east-south', position: [14.4, 0, 5.8], scale: [0.88, 0.88, 0.88], rotationY: -0.42, variant: 1 },
  { id: 'tree-west-south', position: [-14.8, 0, 4.5], scale: [0.94, 0.94, 0.94], rotationY: 0.66, variant: 2 },
];

const berms: readonly EnvironmentDisc[] = [
  { id: 'berm-north', center: { x: 0, z: -19.1 }, radius: 3.8 },
  { id: 'berm-north-east', center: { x: 12.2, z: -19 }, radius: 3.2 },
  { id: 'berm-east', center: { x: 19.1, z: -2.8 }, radius: 3.5 },
  { id: 'berm-south-east', center: { x: 19, z: 12.4 }, radius: 3.1 },
  { id: 'berm-south', center: { x: 1.5, z: 19.1 }, radius: 3.6 },
  { id: 'berm-south-west', center: { x: -12.4, z: 19 }, radius: 3.15 },
  { id: 'berm-west', center: { x: -19.1, z: -1.1 }, radius: 3.5 },
  { id: 'berm-north-west', center: { x: -11.8, z: -19 }, radius: 3.25 },
];

const plantingBeds: readonly EnvironmentDisc[] = [
  { id: 'bed-north-east', center: { x: 8.8, z: 12 }, radius: 1.2 },
  { id: 'bed-east-shade', center: { x: 10.5, z: -4.5 }, radius: 1.1 },
  { id: 'bed-south-east', center: { x: 8.3, z: -12.1 }, radius: 1.15 },
  { id: 'bed-west-gate', center: { x: -12.5, z: -1.2 }, radius: 1.2 },
  { id: 'bed-pavilion-west', center: { x: -16.2, z: -9.6 }, radius: 1.15 },
  { id: 'bed-sanctuary-west', center: { x: -8.1, z: -15.8 }, radius: 1.1 },
  { id: 'bed-sanctuary-east', center: { x: 8.2, z: -15.7 }, radius: 1.15 },
  { id: 'bed-foreground-west', center: { x: -11.2, z: 13.3 }, radius: 1.2 },
  { id: 'bed-foreground-east', center: { x: 14.8, z: 12.1 }, radius: 1.05 },
];

const shrubOffsets: readonly PlantingOffset[] = [
  [-0.58, -0.34, 1, -0.18],
  [0.48, -0.3, 0.82, 0.34],
  [-0.32, 0.48, 0.9, 0.62],
  [0.55, 0.38, 0.74, -0.52],
];

const shrubClusters: readonly PlantingCluster[] = [
  { id: 'pavilion-west', center: { x: -16.2, z: -10.1 }, spread: 0.95, scale: 0.82, rotationY: 0.2, variant: 0 },
  { id: 'pavilion-back', center: { x: -12.4, z: -16.5 }, spread: 0.88, scale: 0.72, rotationY: -0.4, variant: 1 },
  { id: 'pond-east', center: { x: 8.8, z: -1.8 }, spread: 0.86, scale: 0.68, rotationY: 0.5, variant: 2 },
  { id: 'pond-west', center: { x: -9.1, z: -0.8 }, spread: 0.82, scale: 0.7, rotationY: -0.2, variant: 0 },
  { id: 'foreground-east', center: { x: 11.5, z: 13.8 }, spread: 1.05, scale: 0.76, rotationY: 0.7, variant: 1 },
  { id: 'foreground-west', center: { x: -11.3, z: 14.2 }, spread: 1, scale: 0.78, rotationY: -0.6, variant: 2 },
  { id: 'sanctuary-east', center: { x: 8.4, z: -14.2 }, spread: 0.9, scale: 0.74, rotationY: 0.1, variant: 0 },
];

const grassOffsets: readonly PlantingOffset[] = [
  [-0.72, -0.45, 0.82, -0.28],
  [-0.18, -0.62, 1, 0.15],
  [0.5, -0.5, 0.9, 0.48],
  [0.72, 0.02, 0.76, -0.62],
  [0.45, 0.52, 1.04, 0.72],
  [-0.08, 0.66, 0.88, -0.12],
  [-0.62, 0.4, 0.94, 0.36],
  [-0.72, 0.02, 0.72, -0.75],
];

const grassClusters: readonly PlantingCluster[] = [
  { id: 'pond-east', center: { x: 8.5, z: -2.7 }, spread: 0.78, scale: 0.58, rotationY: 0.1, variant: 0 },
  { id: 'pond-west', center: { x: -8.7, z: -1.1 }, spread: 0.78, scale: 0.55, rotationY: -0.35, variant: 1 },
  { id: 'pavilion-west', center: { x: -16.5, z: -7.8 }, spread: 0.9, scale: 0.6, rotationY: 0.52, variant: 2 },
  { id: 'foreground-east', center: { x: 14.4, z: 15.2 }, spread: 1, scale: 0.62, rotationY: -0.18, variant: 0 },
  { id: 'foreground-west', center: { x: -14.3, z: 15 }, spread: 1, scale: 0.6, rotationY: 0.3, variant: 1 },
  { id: 'sanctuary-east', center: { x: 8.2, z: -17.2 }, spread: 0.88, scale: 0.58, rotationY: -0.44, variant: 2 },
  { id: 'sanctuary-west', center: { x: -7.8, z: -17.1 }, spread: 0.9, scale: 0.57, rotationY: 0.62, variant: 0 },
  { id: 'boundary-east', center: { x: 17.4, z: -4.6 }, spread: 0.82, scale: 0.61, rotationY: -0.14, variant: 1 },
  { id: 'boundary-west', center: { x: -17.3, z: -2.5 }, spread: 0.84, scale: 0.59, rotationY: 0.4, variant: 2 },
];

const flowerOffsets: readonly PlantingOffset[] = [
  [-0.52, -0.3, 0.86, -0.2],
  [0.4, -0.38, 1, 0.28],
  [-0.28, 0.48, 0.92, 0.58],
  [0.52, 0.34, 0.78, -0.48],
];

const flowerClusters: readonly PlantingCluster[] = [
  { id: 'north-east', center: { x: 8.8, z: 12 }, spread: 0.76, scale: 0.48, rotationY: 0.1, variant: 0 },
  { id: 'east-shade', center: { x: 10.5, z: -4.5 }, spread: 0.7, scale: 0.46, rotationY: -0.3, variant: 1 },
  { id: 'south-east', center: { x: 8.3, z: -12.1 }, spread: 0.72, scale: 0.5, rotationY: 0.48, variant: 2 },
  { id: 'west-gate', center: { x: -12.5, z: -1.2 }, spread: 0.75, scale: 0.48, rotationY: -0.52, variant: 0 },
  { id: 'pavilion-west', center: { x: -16.2, z: -9.6 }, spread: 0.72, scale: 0.47, rotationY: 0.36, variant: 1 },
  { id: 'sanctuary-west', center: { x: -8.1, z: -15.8 }, spread: 0.7, scale: 0.45, rotationY: -0.18, variant: 2 },
  { id: 'sanctuary-east', center: { x: 8.2, z: -15.7 }, spread: 0.72, scale: 0.49, rotationY: 0.62, variant: 0 },
  { id: 'foreground-west', center: { x: -11.2, z: 13.3 }, spread: 0.76, scale: 0.5, rotationY: -0.4, variant: 1 },
  { id: 'foreground-east', center: { x: 14.8, z: 12.1 }, spread: 0.68, scale: 0.46, rotationY: 0.24, variant: 2 },
];

const pondStones: readonly EnvironmentInstance[] = [
  { id: 'pond-stone-01', position: [6.42, 0, 0], scale: [0.76, 0.38, 0.58], rotationY: 0.22, variant: 0 },
  { id: 'pond-stone-02', position: [6.18, 0, 1.66], scale: [0.62, 0.32, 0.72], rotationY: -0.38, variant: 1 },
  { id: 'pond-stone-03', position: [5.5, 0, 3.18], scale: [0.84, 0.4, 0.56], rotationY: 0.58, variant: 2 },
  { id: 'pond-stone-04', position: [4.49, 0, 4.49], scale: [0.68, 0.34, 0.78], rotationY: -0.16, variant: 0 },
  { id: 'pond-stone-05', position: [3.15, 0, 5.46], scale: [0.72, 0.45, 0.62], rotationY: 0.72, variant: 1 },
  { id: 'pond-stone-06', position: [1.64, 0, 6.12], scale: [0.58, 0.3, 0.7], rotationY: -0.55, variant: 2 },
  { id: 'pond-stone-07', position: [0, 0, 6.42], scale: [0.82, 0.42, 0.54], rotationY: 0.12, variant: 0 },
  { id: 'pond-stone-08', position: [-1.65, 0, 6.16], scale: [0.64, 0.35, 0.76], rotationY: 0.46, variant: 1 },
  { id: 'pond-stone-09', position: [-3.18, 0, 5.51], scale: [0.78, 0.38, 0.6], rotationY: -0.68, variant: 2 },
  { id: 'pond-stone-10', position: [-4.42, 0, 4.42], scale: [0.6, 0.31, 0.7], rotationY: 0.31, variant: 0 },
  { id: 'pond-stone-11', position: [-5.54, 0, 3.2], scale: [0.86, 0.44, 0.56], rotationY: -0.44, variant: 1 },
  { id: 'pond-stone-12', position: [-6.16, 0, 1.65], scale: [0.66, 0.34, 0.74], rotationY: 0.63, variant: 2 },
  { id: 'pond-stone-13', position: [-6.43, 0, 0], scale: [0.8, 0.4, 0.58], rotationY: -0.24, variant: 0 },
  { id: 'pond-stone-14', position: [-6.12, 0, -1.64], scale: [0.6, 0.3, 0.68], rotationY: 0.5, variant: 1 },
  { id: 'pond-stone-15', position: [-5.48, 0, -3.16], scale: [0.82, 0.43, 0.62], rotationY: -0.72, variant: 2 },
  { id: 'pond-stone-16', position: [-4.52, 0, -4.52], scale: [0.7, 0.36, 0.76], rotationY: 0.18, variant: 0 },
  { id: 'pond-stone-17', position: [-3.15, 0, -5.46], scale: [0.76, 0.39, 0.58], rotationY: 0.69, variant: 1 },
  { id: 'pond-stone-18', position: [-1.64, 0, -6.11], scale: [0.62, 0.32, 0.72], rotationY: -0.36, variant: 2 },
  { id: 'pond-stone-19', position: [0, 0, -6.4], scale: [0.88, 0.46, 0.56], rotationY: 0.28, variant: 0 },
  { id: 'pond-stone-20', position: [1.66, 0, -6.2], scale: [0.64, 0.33, 0.74], rotationY: -0.61, variant: 1 },
  { id: 'pond-stone-21', position: [3.19, 0, -5.52], scale: [0.8, 0.41, 0.6], rotationY: 0.42, variant: 2 },
  { id: 'pond-stone-22', position: [4.46, 0, -4.46], scale: [0.68, 0.35, 0.78], rotationY: -0.2, variant: 0 },
  { id: 'pond-stone-23', position: [5.55, 0, -3.2], scale: [0.84, 0.44, 0.56], rotationY: 0.66, variant: 1 },
  { id: 'pond-stone-24', position: [6.16, 0, -1.65], scale: [0.62, 0.31, 0.7], rotationY: -0.49, variant: 2 },
];

const reeds: readonly EnvironmentInstance[] = [
  { id: 'pond-reeds-01', position: [6.16, 0.02, 0.58], scale: [0.44, 1.08, 0.44], rotationY: 0.12, variant: 0 },
  { id: 'pond-reeds-02', position: [5.58, 0.02, 2.55], scale: [0.38, 0.9, 0.38], rotationY: -0.35, variant: 1 },
  { id: 'pond-reeds-03', position: [4.32, 0.02, 4.41], scale: [0.46, 1.16, 0.46], rotationY: 0.5, variant: 2 },
  { id: 'pond-reeds-04', position: [2.55, 0.02, 5.56], scale: [0.4, 0.96, 0.4], rotationY: -0.18, variant: 0 },
  { id: 'pond-reeds-05', position: [0.54, 0.02, 6.14], scale: [0.42, 1.12, 0.42], rotationY: 0.66, variant: 1 },
  { id: 'pond-reeds-06', position: [-1.58, 0.02, 5.98], scale: [0.36, 0.88, 0.36], rotationY: -0.52, variant: 2 },
  { id: 'pond-reeds-07', position: [-3.56, 0.02, 5.04], scale: [0.46, 1.18, 0.46], rotationY: 0.29, variant: 0 },
  { id: 'pond-reeds-08', position: [-5.13, 0.02, 3.45], scale: [0.4, 1, 0.4], rotationY: -0.7, variant: 1 },
  { id: 'pond-reeds-09', position: [-6.03, 0.02, 1.28], scale: [0.44, 1.1, 0.44], rotationY: 0.42, variant: 2 },
  { id: 'pond-reeds-10', position: [-6.12, 0.02, -0.72], scale: [0.38, 0.92, 0.38], rotationY: -0.24, variant: 0 },
  { id: 'pond-reeds-11', position: [-5.45, 0.02, -2.84], scale: [0.46, 1.14, 0.46], rotationY: 0.58, variant: 1 },
  { id: 'pond-reeds-12', position: [-4.01, 0.02, -4.69], scale: [0.4, 0.98, 0.4], rotationY: -0.46, variant: 2 },
  { id: 'pond-reeds-13', position: [-2.1, 0.02, -5.78], scale: [0.42, 1.12, 0.42], rotationY: 0.2, variant: 0 },
  { id: 'pond-reeds-14', position: [0.03, 0.02, -6.17], scale: [0.36, 0.86, 0.36], rotationY: -0.62, variant: 1 },
  { id: 'pond-reeds-15', position: [2.14, 0.02, -5.8], scale: [0.46, 1.2, 0.46], rotationY: 0.38, variant: 2 },
  { id: 'pond-reeds-16', position: [4.07, 0.02, -4.66], scale: [0.4, 0.96, 0.4], rotationY: -0.28, variant: 0 },
  { id: 'pond-reeds-17', position: [5.44, 0.02, -2.91], scale: [0.44, 1.1, 0.44], rotationY: 0.72, variant: 1 },
  { id: 'pond-reeds-18', position: [6.13, 0.02, -0.81], scale: [0.38, 0.9, 0.38], rotationY: -0.4, variant: 2 },
];

const motes: readonly EnvironmentInstance[] = [
  { id: 'mote-pond-north', position: [-1.3, 2.1, -4.4], scale: [0.16, 0.16, 0.16], rotationY: 0, variant: 0 },
  { id: 'mote-pond-east', position: [4.1, 1.7, 1.8], scale: [0.12, 0.12, 0.12], rotationY: 0.5, variant: 1 },
  { id: 'mote-pavilion', position: [-10.6, 2.4, -9.1], scale: [0.15, 0.15, 0.15], rotationY: -0.35, variant: 2 },
];

const canonicalTreeRoots = [
  { x: 11.8, z: -9.2 },
  { x: 14.4, z: 5.8 },
  { x: -14.8, z: 4.5 },
] as const;

export function getEnvironmentPresentation(input: EnvironmentPresentationInput): EnvironmentPresentation {
  return {
    moteMotion: !input.reducedMotion,
    rippleMotion: !input.reducedMotion,
    cloudMotion: !input.reducedMotion,
    pondGlow: input.rewardStage >= 3 ? 1 : input.rewardStage >= 1 ? 0.9 : 0.78,
    sanctuaryGlow: input.rewardStage >= 3 ? 1.25 : 1,
    pavilionGlow: input.pavilionImproved ? 1.35 : 0.55,
    starflowerGlow: input.starflowersVisible ? 1.4 : 0.2,
    seedGlow: input.seedVisible ? 1.45 : 0.15,
    destinationGlow: input.destinationVisible ? 1.5 : 0,
    destinationAccent: input.destinationVisible,
  };
}

export function createStorybookEnvironmentLayout(): StorybookEnvironmentLayout {
  return {
    berms: berms.map(cloneDisc),
    plantingBeds: plantingBeds.map(cloneDisc),
    corridors: corridors.map(cloneCorridor),
    trees: trees.map(cloneInstance),
    shrubs: createAuthoredPlanting('shrub', shrubClusters, shrubOffsets),
    grassTufts: createAuthoredPlanting('grass', grassClusters, grassOffsets),
    flowers: createAuthoredPlanting('flower', flowerClusters, flowerOffsets),
    pondStones: pondStones.map(cloneInstance),
    reeds: reeds.map(cloneInstance),
    motes: motes.map(cloneInstance),
  };
}

export function validateEnvironmentLayout(layout: StorybookEnvironmentLayout): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const allDiscs = [...layout.berms, ...layout.plantingBeds];
  const allInstances = [
    ...layout.trees,
    ...layout.shrubs,
    ...layout.grassTufts,
    ...layout.flowers,
    ...layout.pondStones,
    ...layout.reeds,
    ...layout.motes,
  ];

  for (const item of [...allDiscs, ...layout.corridors, ...allInstances]) {
    if (ids.has(item.id)) errors.push(`Environment layout has duplicate id "${item.id}".`);
    ids.add(item.id);
  }

  for (const berm of layout.berms) {
    const outsideSafeGarden = Math.abs(berm.center.x) >= SAFE_GARDEN_HALF_SIZE
      || Math.abs(berm.center.z) >= SAFE_GARDEN_HALF_SIZE;
    if (!outsideSafeGarden || !isInsideVisibleBoundary(berm.center)) {
      errors.push(`Berm "${berm.id}" must frame the safe garden inside the visible boundary.`);
    }
  }

  for (const bed of layout.plantingBeds) {
    if (Math.hypot(bed.center.x, bed.center.z) - bed.radius < SAFE_POND_RADIUS) {
      errors.push(`Planting bed "${bed.id}" enters the pond exclusion.`);
    }
    for (const corridor of layout.corridors) {
      if (pointToSegmentDistance(bed.center, corridor.start, corridor.end) < bed.radius + corridor.halfWidth) {
        errors.push(`Planting bed "${bed.id}" blocks corridor "${corridor.id}".`);
      }
    }
  }

  for (const family of [
    { instances: layout.shrubs, radius: STORYBOOK_FOLIAGE_RADII.shrubs },
    { instances: layout.grassTufts, radius: STORYBOOK_FOLIAGE_RADII.grassTufts },
    { instances: layout.flowers, radius: STORYBOOK_FOLIAGE_RADII.flowers },
  ]) {
    for (const instance of family.instances) {
      const horizontalAllowance = Math.max(instance.scale[0], instance.scale[2]) * family.radius;
      if (Math.hypot(instance.position[0], instance.position[2]) - horizontalAllowance < SAFE_POND_RADIUS) {
        errors.push(`Foliage "${instance.id}" enters the pond exclusion.`);
      }
      for (const corridor of layout.corridors) {
        if (pointToSegmentDistance(
          { x: instance.position[0], z: instance.position[2] },
          corridor.start,
          corridor.end,
        ) < horizontalAllowance + corridor.halfWidth) {
          errors.push(`Foliage "${instance.id}" narrows corridor "${corridor.id}".`);
        }
      }
    }
  }

  if (layout.trees.length !== canonicalTreeRoots.length || canonicalTreeRoots.some((root) => (
    !layout.trees.some((tree) => root.x === tree.position[0] && root.z === tree.position[2])
  ))) {
    errors.push('Tree roots must equal the three canonical tree obstacle centers.');
  }

  for (const family of [
    { instances: layout.pondStones, radius: STORYBOOK_POND_DRESSING_RADII.pondStones },
    { instances: layout.reeds, radius: STORYBOOK_POND_DRESSING_RADII.reeds },
  ]) {
    for (const instance of family.instances) {
      const horizontalAllowance = Math.max(instance.scale[0], instance.scale[2]) * family.radius;
      if (Math.hypot(instance.position[0], instance.position[2]) + horizontalAllowance > SAFE_POND_RADIUS - POND_DRESSING_MARGIN) {
        errors.push(`Pond dressing "${instance.id}" exceeds the pond boundary.`);
      }
    }
  }

  for (const instance of allInstances) {
    if (!isInsideVisibleBoundary({ x: instance.position[0], z: instance.position[2] })) {
      errors.push(`Environment instance "${instance.id}" exceeds the visible boundary.`);
    }
  }

  return errors;
}

function cloneDisc(disc: EnvironmentDisc): EnvironmentDisc {
  return { id: disc.id, center: { ...disc.center }, radius: disc.radius };
}

function cloneCorridor(corridor: GardenCorridor): GardenCorridor {
  return {
    id: corridor.id,
    start: { ...corridor.start },
    end: { ...corridor.end },
    halfWidth: corridor.halfWidth,
  };
}

function cloneInstance(instance: EnvironmentInstance): EnvironmentInstance {
  return {
    id: instance.id,
    position: [...instance.position],
    scale: [...instance.scale],
    rotationY: instance.rotationY,
    variant: instance.variant,
  };
}

function createAuthoredPlanting(
  family: string,
  clusters: readonly PlantingCluster[],
  offsets: readonly PlantingOffset[],
): EnvironmentInstance[] {
  return clusters.flatMap((cluster) => offsets.map(([x, z, scale, rotationY], index) => {
    const instanceScale = cluster.scale * scale;
    return {
      id: `${family}-${cluster.id}-${index + 1}`,
      position: [
        cluster.center.x + x * cluster.spread,
        0,
        cluster.center.z + z * cluster.spread,
      ] as const,
      scale: [instanceScale, instanceScale, instanceScale] as const,
      rotationY: cluster.rotationY + rotationY,
      variant: (cluster.variant + index) % 3,
    };
  }));
}

function isInsideVisibleBoundary(point: GardenPoint): boolean {
  return Math.abs(point.x) <= VISIBLE_GARDEN_HALF_SIZE && Math.abs(point.z) <= VISIBLE_GARDEN_HALF_SIZE;
}

function pointToSegmentDistance(point: GardenPoint, start: GardenPoint, end: GardenPoint): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.z - start.z);
  const projection = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.z - start.z) * dz
  ) / lengthSquared));
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.z - (start.z + projection * dz),
  );
}
