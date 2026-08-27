import { describe, expect, it } from 'vitest';
import { getFirstPersonMovementVector } from './firstPersonMovement';

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
});
