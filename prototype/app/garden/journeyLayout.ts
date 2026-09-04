import type { Visit } from './journey';
import type { GardenChoice } from './rewardState';

export const WORKSHOP_ROOF_PANELS = [-1, 1].map((side) => ({
  position: [0, 2.49, side * .74] as [number, number, number],
  rotation: [side * .44, 0, 0] as [number, number, number],
  dimensions: [3.95, .18, 1.48 / Math.cos(.44)] as [number, number, number],
}));

export const PIP_RETURN_POSITION = [0.65, 0, 14.9] as const;
// A visible stone-edged planting plot defines this footprint on every return.
export const DESTINATION_OBSTACLE = { x: -13, z: 11, radius: 2.4 } as const;

export function getJourneyGrowth(visit: Visit, choice: GardenChoice | null) {
  const stage = visit - 1;
  return {
    flowerClusters: stage * 2,
    canopyScale: 1 + stage * 0.22,
    trunkGrowth: stage * 0.55,
    lanternCount: choice === 'orchard' ? stage * 2 : 0,
    lanternHeight: 2.65 + stage * .55 - .9 * (1 + stage * .22) - .26,
    inventionCount: choice === 'workshop' ? stage : 0,
    groundRadius: DESTINATION_OBSTACLE.radius,
  };
}
