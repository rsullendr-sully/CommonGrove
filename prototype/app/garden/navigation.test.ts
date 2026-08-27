import { describe, expect, it } from 'vitest';
import {
  hasActivityTimedOut,
  isSafeGardenPoint,
  nearestSafePoint,
  PIP_ACTIVITY_TIMEOUT_SECONDS,
  SAFE_GARDEN_HALF_SIZE,
  SAFE_POND_RADIUS,
  type GardenObstacle,
} from './navigation';

const scenery: readonly GardenObstacle[] = [
  { x: 13, z: 8, radius: 1.2 },
];

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

  it('times out activities only after their configured duration', () => {
    expect(hasActivityTimedOut(10, 18, PIP_ACTIVITY_TIMEOUT_SECONDS)).toBe(false);
    expect(hasActivityTimedOut(10, 19, PIP_ACTIVITY_TIMEOUT_SECONDS)).toBe(true);
  });
});
