import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_WALK_SPEED,
  shortestAngleDelta,
  stepLocomotion,
  type LocomotionConfig,
  type LocomotionState,
} from './locomotion';

const config: LocomotionConfig = {
  maxSpeed: 1.2,
  acceleration: 3,
  deceleration: 4,
  turnSpeed: Math.PI * 2,
  arrivalRadius: 0.12,
  brakingRadius: 0.9,
};

const idle = (): LocomotionState => ({
  position: new THREE.Vector3(0, 0, 0),
  facing: 0,
  speed: 0,
  distanceTravelled: 0,
  moving: false,
});

describe('locomotion constants', () => {
  it('sets employee travel to four meters per second', () => {
    expect(EMPLOYEE_WALK_SPEED).toBe(4);
  });
});

describe('grounded locomotion', () => {
  it('accelerates without exceeding max speed', () => {
    let state = idle();
    for (let index = 0; index < 120; index += 1) {
      state = stepLocomotion(state, new THREE.Vector3(0, 0, -10), 1 / 60, config);
    }
    expect(state.speed).toBeCloseTo(1.2, 5);
    expect(state.position.z).toBeLessThan(-1);
  });

  it('brakes to a stop inside the arrival radius', () => {
    let state = { ...idle(), speed: 1.2 };
    const target = new THREE.Vector3(0, 0, -0.5);
    for (let index = 0; index < 120; index += 1) state = stepLocomotion(state, target, 1 / 60, config);
    expect(state.position.distanceTo(target)).toBeLessThanOrEqual(config.arrivalRadius);
    expect(state.speed).toBe(0);
    expect(state.moving).toBe(false);
  });

  it('uses the shortest turn across the pi boundary', () => {
    expect(shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2, 5);
  });
});
