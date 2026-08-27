import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_WALK_SPEED,
  PIP_REWARD_MOTION_CONFIG,
  shortestAngleDelta,
  stepLocomotion,
  stepSafeRouteLocomotion,
  type LocomotionConfig,
  type LocomotionState,
} from './locomotion';
import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenSegment } from './navigation';

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

function turnUntilMoving(target: THREE.Vector3) {
  let state = idle();
  const stationarySpeeds: number[] = [];

  for (let index = 0; index < 120; index += 1) {
    const next = stepLocomotion(state, target, 1 / 60, config);
    if (next.moving) return { stationarySpeeds, launchSpeed: next.speed };
    stationarySpeeds.push(next.speed);
    state = next;
  }

  throw new Error('Pip never began translating toward the target');
}

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

  it('travels nearly the same distance at 30 and 60 fps', () => {
    const run = (delta: number, frames: number) => {
      let state = idle();
      const target = new THREE.Vector3(0, 0, -20);
      for (let index = 0; index < frames; index += 1) state = stepLocomotion(state, target, delta, config);
      return state.position.z;
    };

    expect(run(1 / 30, 60)).toBeCloseTo(run(1 / 60, 120), 1);
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

  it('does not translate sideways while turning toward a target', () => {
    const state = stepLocomotion(idle(), new THREE.Vector3(1, 0, 0), 1 / 60, config);
    expect(state.position.x).toBe(0);
    expect(state.position.z).toBe(0);
    expect(state.facing).toBeGreaterThan(0);
  });

  it('does not bank launch speed during a stationary 90-degree turn', () => {
    const result = turnUntilMoving(new THREE.Vector3(10, 0, 0));

    expect(Math.max(...result.stationarySpeeds)).toBe(0);
    expect(result.launchSpeed).toBeCloseTo(0.05, 5);
  });

  it('does not bank launch speed during a stationary 180-degree turn', () => {
    const result = turnUntilMoving(new THREE.Vector3(0, 0, -10));

    expect(Math.max(...result.stationarySpeeds)).toBe(0);
    expect(result.launchSpeed).toBeCloseTo(0.05, 5);
  });

  it('reaches arrival without teleporting from outside the radius', () => {
    const target = new THREE.Vector3(0, 0, -0.5);
    let state = { ...idle(), speed: 1.2 };
    let maximumStep = 0;
    for (let index = 0; index < 120; index += 1) {
      const previous = state.position.clone();
      state = stepLocomotion(state, target, 1 / 60, config);
      maximumStep = Math.max(maximumStep, previous.distanceTo(state.position));
    }
    expect(maximumStep).toBeLessThan(0.1);
    expect(state.position.distanceTo(target)).toBeLessThanOrEqual(config.arrivalRadius);
    expect(state.distanceTravelled).toBeGreaterThan(0);
  });

  it('preserves the grounded y coordinate on arrival', () => {
    const state = { ...idle(), position: new THREE.Vector3(0, 2, 0) };
    const result = stepLocomotion(state, new THREE.Vector3(0, 9, 0), 1 / 60, config);
    expect(result.position.y).toBe(2);
  });

  it('completes the full reward-one to reward-two route without unsafe steps or corner deadlock', () => {
    const start = { x: 8.2, z: 6.6 };
    const end = { x: -8.65, z: -8.1 };
    const route = createSafeGardenRoute(start, end, GARDEN_OBSTACLES);
    let progress = {
      motion: {
        position: new THREE.Vector3(start.x, 0, start.z),
        facing: Math.PI,
        speed: 0,
        distanceTravelled: 0,
        moving: false,
      },
      waypointIndex: 0,
      complete: false,
    };

    for (let frame = 0; frame < 60 * 60 && !progress.complete; frame += 1) {
      const previousPosition = progress.motion.position.clone();
      const previousWaypointIndex = progress.waypointIndex;
      progress = stepSafeRouteLocomotion(
        progress,
        route,
        1 / 60,
        PIP_REWARD_MOTION_CONFIG,
        GARDEN_OBSTACLES,
      );

      expect(isSafeGardenSegment(
        { x: previousPosition.x, z: previousPosition.z },
        { x: progress.motion.position.x, z: progress.motion.position.z },
        GARDEN_OBSTACLES,
      )).toBe(true);
      if (progress.waypointIndex > previousWaypointIndex) {
        expect(progress.motion.position.x).toBeCloseTo(route[previousWaypointIndex].x, 8);
        expect(progress.motion.position.z).toBeCloseTo(route[previousWaypointIndex].z, 8);
      }
    }

    expect(route.length).toBeGreaterThan(1);
    expect(progress.complete).toBe(true);
    expect(progress.motion.position.x).toBeCloseTo(end.x, 8);
    expect(progress.motion.position.z).toBeCloseTo(end.z, 8);
  });
});
