import { describe, expect, it } from 'vitest';
import { getJourneyGrowth, DESTINATION_OBSTACLE, PIP_RETURN_POSITION, WORKSHOP_ROOF_PANELS } from './journeyLayout';
import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenPoint, isSafeGardenSegment, type GardenPoint } from './navigation';

describe('journey growth and safe approach', () => {
  it('joins both roof slopes at one high ridge instead of crossing into a valley', () => {
    const ridgeEnds = WORKSHOP_ROOF_PANELS.map(({ position, rotation, dimensions }) => {
      const inside = -Math.sign(position[2]) * dimensions[2] / 2;
      const ridgeY = position[1] - Math.sin(rotation[0]) * inside;
      const edgeY = position[1] + Math.sin(rotation[0]) * inside;
      expect(ridgeY).toBeGreaterThan(edgeY);
      return { y: ridgeY, z: position[2] + Math.cos(rotation[0]) * inside };
    });
    expect(ridgeEnds[0].y).toBeCloseTo(ridgeEnds[1].y, 5);
    ridgeEnds.forEach(({ z }) => expect(Math.abs(z)).toBeLessThan(.005));
  });
  it('grows both destinations without expanding their ground footprint', () => {
    for (const choice of ['orchard', 'workshop'] as const) {
      const first = getJourneyGrowth(1, choice);
      const mature = getJourneyGrowth(4, choice);
      expect(mature.flowerClusters).toBeGreaterThan(first.flowerClusters);
      expect(mature.canopyScale).toBeGreaterThan(first.canopyScale);
      expect(mature.lanternCount).toBe(choice === 'orchard' ? 6 : 0);
      expect(mature.inventionCount).toBe(choice === 'workshop' ? 3 : 0);
      expect(mature.groundRadius).toBe(first.groundRadius);
      expect(mature.groundRadius).toBeLessThanOrEqual(DESTINATION_OBSTACLE.radius);
    }
  });
  it('does not show branch decorations when the choice is postponed', () => {
    expect(getJourneyGrowth(4, null)).toMatchObject({ lanternCount: 0, inventionCount: 0 });
    expect(getJourneyGrowth(4, null).flowerClusters).toBeGreaterThan(0);
  });
  it('keeps the lantern globes below the growing crowns instead of hidden inside them', () => {
    for (const visit of [1, 2, 3, 4] as const) {
      const growth = getJourneyGrowth(visit, 'orchard');
      const crownBottom = 2.65 + growth.trunkGrowth - .9 * growth.canopyScale;
      expect(growth.lanternHeight + .16).toBeLessThan(crownBottom);
      expect(growth.lanternHeight).toBeGreaterThan(1.3);
    }
  });
  it('keeps Pip’s arrival safe and lets him reach the destination without passing through it', () => {
    const start: GardenPoint = { x: PIP_RETURN_POSITION[0], z: PIP_RETURN_POSITION[2] };
    const target = { x: -10.6, z: 9.2 };
    expect(isSafeGardenPoint(start, GARDEN_OBSTACLES)).toBe(true);
    expect(isSafeGardenPoint(DESTINATION_OBSTACLE, GARDEN_OBSTACLES)).toBe(false);
    const route = createSafeGardenRoute(start, target, GARDEN_OBSTACLES);
    expect(route.at(-1)).toEqual(target);
    let previous = start;
    for (const next of route) {
      expect(isSafeGardenSegment(previous, next, GARDEN_OBSTACLES)).toBe(true);
      previous = next;
    }
  });
});
