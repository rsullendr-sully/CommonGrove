import { describe, expect, it } from 'vitest';
import { getFirstPersonMovementVector, resolveFirstPersonGardenMove } from './firstPersonMovement';
import type { GardenObstacle } from './navigation';
import { PAVILION_BOOKSHELF, PAVILION_CENTER } from './pavilionLayout';

const bookshelfObstacles: readonly GardenObstacle[] = PAVILION_BOOKSHELF.collisionSamples.map((sample) => ({
  x: PAVILION_CENTER.x + PAVILION_BOOKSHELF.x + sample.x,
  z: PAVILION_CENTER.z + PAVILION_BOOKSHELF.z + sample.z,
  radius: sample.radius,
}));

describe('first-person camera-relative movement', () => {
  it('moves W along the camera forward direction at zero yaw', () => {
    expect(getFirstPersonMovementVector(0, 1, 0)).toEqual({ x: 0, z: -1 });
  });

  it('moves W toward negative X when the camera yaw is pi over two', () => {
    const movement = getFirstPersonMovementVector(Math.PI / 2, 1, 0);

    expect(movement.x).toBeCloseTo(-1, 10);
    expect(movement.z).toBeCloseTo(0, 10);
  });

  it('moves screen-right toward negative Z when the camera yaw is pi over two', () => {
    const movement = getFirstPersonMovementVector(Math.PI / 2, 0, 1);

    expect(movement.x).toBeCloseTo(0, 10);
    expect(movement.z).toBeCloseTo(-1, 10);
  });

  it('normalizes diagonal movement', () => {
    const movement = getFirstPersonMovementVector(Math.PI / 3, 1, 1);

    expect(Math.hypot(movement.x, movement.z)).toBeCloseTo(1, 10);
  });

  it('does not drift sideways or cross through the bookshelf after sustained straight movement', () => {
    const start = { x: PAVILION_CENTER.x, z: PAVILION_CENTER.z + 1 };
    let position = start;

    for (let frame = 0; frame < 240; frame += 1) {
      position = resolveFirstPersonGardenMove(position, { x: 0, z: -0.05 }, bookshelfObstacles);
      expect(position.x).toBe(start.x);
      expect(position.z).toBeGreaterThanOrEqual(PAVILION_CENTER.z + PAVILION_BOOKSHELF.z);
    }
  });

  it('slides diagonally along a blocked obstacle instead of rejecting both axes', () => {
    const position = resolveFirstPersonGardenMove(
      { x: -1, z: 0 },
      { x: 1, z: 0.5 },
      [{ x: 0, z: 0, radius: 0.5 }],
    );

    expect(position).toEqual({ x: -1, z: 0.5 });
  });

  it('keeps unobstructed planar motion unchanged', () => {
    expect(resolveFirstPersonGardenMove(
      { x: 1, z: 2 },
      { x: 0.3, z: -0.4 },
      [{ x: -5, z: -5, radius: 1 }],
    )).toEqual({ x: 1.3, z: 1.6 });
  });

  it('allows a player marginally inside an obstacle to move farther away', () => {
    expect(resolveFirstPersonGardenMove(
      { x: 0.49, z: 0 },
      { x: 0.1, z: 0 },
      [{ x: 0, z: 0, radius: 0.5 }],
    )).toEqual({ x: 0.59, z: 0 });
  });
});
