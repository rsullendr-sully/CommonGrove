import { describe, expect, it } from 'vitest';
import {
  PAVILION_BOOKSHELF,
  PAVILION_CENTER,
  PAVILION_LOCAL_BENCHES,
  PAVILION_OBSTACLES,
  PAVILION_PERMANENT_FURNITURE,
  PAVILION_READING_POINT,
  PAVILION_SURFACE,
} from './pavilionLayout';

type Furniture = {
  x: number;
  z: number;
  width: number;
  depth: number;
  collisionSamples: readonly { x: number; z: number; radius: number }[];
};

function rawObstacleCovers(point: { x: number; z: number }) {
  return PAVILION_OBSTACLES.some((obstacle) => (
    Math.hypot(point.x - obstacle.x, point.z - obstacle.z) <= obstacle.radius
  ));
}

function furnitureCoveragePoints(furniture: Furniture) {
  const x = PAVILION_CENTER.x + furniture.x;
  const z = PAVILION_CENTER.z + furniture.z;
  const halfWidth = furniture.width / 2;
  const halfDepth = furniture.depth / 2;
  const corners = [
    { x: x - halfWidth, z: z - halfDepth },
    { x: x - halfWidth, z: z + halfDepth },
    { x: x + halfWidth, z: z - halfDepth },
    { x: x + halfWidth, z: z + halfDepth },
  ];
  const longAxis = furniture.depth > furniture.width ? 'z' : 'x';
  const sampleCoordinates = furniture.collisionSamples
    .map((sample) => sample[longAxis])
    .toSorted((left, right) => left - right);
  const gapMidpoints = sampleCoordinates.slice(1).flatMap((coordinate, index) => {
    const midpoint = (sampleCoordinates[index] + coordinate) / 2;
    return longAxis === 'z'
      ? [{ x: x - halfWidth, z: z + midpoint }, { x: x + halfWidth, z: z + midpoint }]
      : [{ x: x + midpoint, z: z - halfDepth }, { x: x + midpoint, z: z + halfDepth }];
  });
  return [...corners, ...gapMidpoints];
}

describe('pavilion layout', () => {
  it('keeps the reading point clear of every pavilion structure', () => {
    for (const obstacle of PAVILION_OBSTACLES) {
      expect(Math.hypot(
        PAVILION_READING_POINT.x - obstacle.x,
        PAVILION_READING_POINT.z - obstacle.z,
      )).toBeGreaterThanOrEqual(obstacle.radius + 0.35);
    }
  });

  it('uses a shallow deck reached by four small visual rises', () => {
    const stepTops = PAVILION_SURFACE.approachSteps.map(({ centerY, height }) => centerY + height / 2);
    const deckTop = PAVILION_SURFACE.deck.centerY + PAVILION_SURFACE.deck.height / 2;
    expect(stepTops).toEqual([0.04, 0.08, 0.12, 0.16]);
    expect(deckTop).toBe(0.16);
    for (const rise of stepTops.map((top, index) => top - (stepTops[index - 1] ?? 0))) {
      expect(rise).toBeCloseTo(0.04, 8);
    }
  });

  it('covers furniture corners and long-edge gaps so removing an end circle, shrinking a radius, or drifting a footprint fails', () => {
    const furniture = [...PAVILION_LOCAL_BENCHES, PAVILION_BOOKSHELF];

    for (const record of furniture) {
      expect(record).toMatchObject({
        width: expect.any(Number),
        depth: expect.any(Number),
        collisionSamples: expect.any(Array),
      });
      for (const point of furnitureCoveragePoints(record)) {
        expect(rawObstacleCovers(point)).toBe(true);
      }
    }
  });

  it('keeps the permanent bookshelf presentation aligned with its shared coverage record', () => {
    expect(PAVILION_PERMANENT_FURNITURE).toEqual([expect.objectContaining({
      x: 0,
      z: -1.35,
      centerY: 1.185,
      width: 2.9,
      height: 2.05,
      depth: 0.42,
    })]);
    expect(PAVILION_PERMANENT_FURNITURE[0]).toBe(PAVILION_BOOKSHELF);
  });
});
