import { describe, expect, it } from 'vitest';
import {
  createSafeGardenRoute,
  GARDEN_OBSTACLES,
  hasActivityTimedOut,
  isSafeGardenPoint,
  isSafeGardenSegment,
  nearestSafePoint,
  PIP_ACTIVITY_TIMEOUT_SECONDS,
  SAFE_GARDEN_HALF_SIZE,
  SAFE_POND_RADIUS,
  selectCurrentGardenInterests,
  type GardenInterest,
  type GardenObstacle,
} from './navigation';

const scenery: readonly GardenObstacle[] = [
  { x: 13, z: 8, radius: 1.2 },
];

function expectSafeRoute(
  start: { x: number; z: number },
  route: readonly { x: number; z: number }[],
  obstacles: readonly GardenObstacle[],
) {
  let previous = start;
  for (const point of route) {
    expect(isSafeGardenPoint(point, obstacles)).toBe(true);
    expect(isSafeGardenSegment(previous, point, obstacles)).toBe(true);
    previous = point;
  }
}

describe('Pip garden navigation', () => {
  it('excludes points in the protected pond radius', () => {
    expect(isSafeGardenPoint({ x: SAFE_POND_RADIUS - 0.01, z: 0 }, scenery)).toBe(false);
  });

  it('excludes points past the safe square boundary', () => {
    expect(isSafeGardenPoint({ x: SAFE_GARDEN_HALF_SIZE + 0.01, z: 0 }, scenery)).toBe(false);
  });

  it('excludes points inside a declared scenery obstacle', () => {
    expect(isSafeGardenPoint({ x: 13, z: 8 }, scenery)).toBe(false);
  });

  it('recovers a point to a location clear of pond, boundary, and scenery', () => {
    const recoveryObstacles = [
      { x: SAFE_GARDEN_HALF_SIZE, z: 0, radius: 1.5 },
    ];
    const recovered = nearestSafePoint({ x: 30, z: 0 }, recoveryObstacles);

    expect(recovered.x).toBeLessThanOrEqual(SAFE_GARDEN_HALF_SIZE);
    expect(recovered.x).toBeGreaterThan(SAFE_POND_RADIUS);
    expect(isSafeGardenPoint(recovered, recoveryObstacles)).toBe(true);
  });

  it('recovers safely when a scenery exclusion overlaps the pond', () => {
    const recoveryObstacles = [{ x: 8, z: 0, radius: 5 }];
    const recovered = nearestSafePoint({ x: 8, z: 0 }, recoveryObstacles);

    expect(isSafeGardenPoint(recovered, recoveryObstacles)).toBe(true);
  });

  it('recovers safely from multiple overlapping scenery exclusions', () => {
    const recoveryObstacles = [
      { x: 8, z: 0, radius: 3.2 },
      { x: 11, z: 0, radius: 3.2 },
      { x: 9.5, z: 3, radius: 2.4 },
    ];
    const recovered = nearestSafePoint({ x: 9, z: 0 }, recoveryObstacles);

    expect(isSafeGardenPoint(recovered, recoveryObstacles)).toBe(true);
  });

  it('recovers the origin outside the pond', () => {
    const recovered = nearestSafePoint({ x: 0, z: 0 }, []);

    expect(isSafeGardenPoint(recovered, [])).toBe(true);
  });

  it('chooses an in-bounds recovery when a scenery push would cross the boundary', () => {
    const recoveryObstacles = [{ x: SAFE_GARDEN_HALF_SIZE, z: 0, radius: 1.5 }];
    const recovered = nearestSafePoint({ x: SAFE_GARDEN_HALF_SIZE, z: 0 }, recoveryObstacles);

    expect(recovered.x).toBeLessThanOrEqual(SAFE_GARDEN_HALF_SIZE);
    expect(isSafeGardenPoint(recovered, recoveryObstacles)).toBe(true);
  });

  it('times out activities only after their configured duration', () => {
    expect(hasActivityTimedOut(10, 18, PIP_ACTIVITY_TIMEOUT_SECONDS)).toBe(false);
    expect(hasActivityTimedOut(10, 19, PIP_ACTIVITY_TIMEOUT_SECONDS)).toBe(true);
  });

  it('keeps seed and destination interests mutually exclusive', () => {
    const interests: readonly GardenInterest[] = [
      { id: 'seed', position: { x: -8.5, z: 7.4 } },
      { id: 'destination', position: { x: -10.6, z: 9.2 } },
      { id: 'flowers', position: { x: 8.8, z: -5.9 } },
    ];

    expect(selectCurrentGardenInterests(interests, { seedVisible: true, destinationVisible: false }).map(({ id }) => id))
      .toEqual(['seed', 'flowers']);
    expect(selectCurrentGardenInterests(interests, { seedVisible: false, destinationVisible: true }).map(({ id }) => id))
      .toEqual(['destination', 'flowers']);
    expect(selectCurrentGardenInterests(interests, { seedVisible: true, destinationVisible: true }).map(({ id }) => id))
      .toEqual(['destination', 'flowers']);
  });

  it('routes reward one to reward two without crossing the pond or scenery', () => {
    const rewardOne = { x: 8.2, z: 6.6 };
    const rewardTwo = { x: -8.65, z: -8.1 };

    expect(isSafeGardenSegment(rewardOne, rewardTwo, GARDEN_OBSTACLES)).toBe(false);
    const route = createSafeGardenRoute(rewardOne, rewardTwo, GARDEN_OBSTACLES);

    expect(route.length).toBeGreaterThan(1);
    expect(route.at(-1)).toEqual(rewardTwo);
    expectSafeRoute(rewardOne, route, GARDEN_OBSTACLES);
  });

  it('builds safe routes from Pip’s start to every ordinary garden interest', () => {
    const start = { x: 8.4, z: 1.5 };
    const ordinaryTargets = [
      { x: 8.8, z: -5.9 },
      { x: 8.2, z: 6.6 },
      { x: -8.65, z: -8.1 },
      { x: -8.5, z: 7.4 },
      { x: -10.6, z: 9.2 },
      { x: 8.4, z: 1.5 },
      { x: 6.8, z: -7.2 },
      { x: -6.3, z: 7.1 },
    ];

    for (const target of ordinaryTargets) {
      const route = createSafeGardenRoute(start, target, GARDEN_OBSTACLES);
      expect(route.at(-1)).toEqual(target);
      expectSafeRoute(start, route, GARDEN_OBSTACLES);
    }
  });

  it('routes around declared scenery and rejects endpoints outside the boundary', () => {
    const start = { x: 10, z: 8 };
    const end = { x: 16, z: 8 };
    const route = createSafeGardenRoute(start, end, scenery);

    expect(isSafeGardenSegment(start, end, scenery)).toBe(false);
    expectSafeRoute(start, route, scenery);
    expect(() => createSafeGardenRoute(start, { x: SAFE_GARDEN_HALF_SIZE + 1, z: 8 }, scenery))
      .toThrow('Safe garden routes require safe endpoints.');
  });
});
