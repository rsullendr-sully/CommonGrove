import * as THREE from 'three';
import { isSafeGardenSegment, type GardenObstacle, type GardenPoint } from './navigation';

export const EMPLOYEE_WALK_SPEED = 4;

export type LocomotionConfig = {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  arrivalRadius: number;
  brakingRadius: number;
};

export type LocomotionState = {
  position: THREE.Vector3;
  facing: number;
  speed: number;
  distanceTravelled: number;
  moving: boolean;
};

export const PIP_MOTION_CONFIG: LocomotionConfig = {
  maxSpeed: 1.2,
  acceleration: 3,
  deceleration: 4,
  turnSpeed: Math.PI * 2,
  arrivalRadius: 0.16,
  brakingRadius: 0.9,
};

export const PIP_REWARD_MOTION_CONFIG: LocomotionConfig = {
  ...PIP_MOTION_CONFIG,
  maxSpeed: 1.65,
};

export type SafeRouteLocomotionProgress = {
  motion: LocomotionState;
  waypointIndex: number;
  complete: boolean;
};

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function stepLocomotion(
  state: LocomotionState,
  target: THREE.Vector3,
  delta: number,
  config: LocomotionConfig,
): LocomotionState {
  const dt = Math.min(delta, 0.05);
  const offset = target.clone().sub(state.position);
  offset.y = 0;
  const distance = offset.length();
  if (distance <= config.arrivalRadius) {
    return {
      ...state,
      position: state.position.clone(),
      speed: 0,
      moving: false,
    };
  }
  const desiredFacing = Math.atan2(offset.x, offset.z);
  const turn = THREE.MathUtils.clamp(
    shortestAngleDelta(state.facing, desiredFacing),
    -config.turnSpeed * dt,
    config.turnSpeed * dt,
  );
  const facing = state.facing + turn;
  const direction = offset.normalize();
  const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
  const aligned = forward.dot(direction) > 0.999;
  const desiredSpeed = aligned
    ? Math.max(
      config.maxSpeed * THREE.MathUtils.smoothstep(distance, config.arrivalRadius, config.brakingRadius),
      config.maxSpeed * 0.25,
    )
    : 0;
  const speed = THREE.MathUtils.clamp(
    state.speed + THREE.MathUtils.clamp(desiredSpeed - state.speed, -config.deceleration * dt, config.acceleration * dt),
    0,
    config.maxSpeed,
  );
  const stepDistance = aligned ? Math.min(distance, speed * dt) : 0;
  const position = state.position.clone().addScaledVector(forward, stepDistance);
  return {
    position,
    facing,
    speed,
    distanceTravelled: state.distanceTravelled + stepDistance,
    moving: stepDistance > 0.0001,
  };
}

export function stepSafeRouteLocomotion(
  progress: SafeRouteLocomotionProgress,
  route: readonly GardenPoint[],
  delta: number,
  config: LocomotionConfig,
  obstacles: readonly GardenObstacle[],
): SafeRouteLocomotionProgress {
  if (progress.complete || route.length === 0) return { ...progress, complete: true };

  const waypointIndex = Math.min(progress.waypointIndex, route.length - 1);
  const waypoint = route[waypointIndex];
  const target = new THREE.Vector3(waypoint.x, progress.motion.position.y, waypoint.z);
  const previousMotion = progress.motion;
  const steppedMotion = stepLocomotion(previousMotion, target, delta, config);
  const acceptedMotion = isSafeGardenSegment(
    { x: previousMotion.position.x, z: previousMotion.position.z },
    { x: steppedMotion.position.x, z: steppedMotion.position.z },
    obstacles,
  ) ? steppedMotion : {
    ...steppedMotion,
    position: previousMotion.position.clone(),
    speed: 0,
    distanceTravelled: previousMotion.distanceTravelled,
    moving: false,
  };

  const reachedWaypoint = !acceptedMotion.moving
    && acceptedMotion.position.distanceTo(target) <= config.arrivalRadius;
  if (!reachedWaypoint) return { motion: acceptedMotion, waypointIndex, complete: false };

  if (!isSafeGardenSegment(
    { x: acceptedMotion.position.x, z: acceptedMotion.position.z },
    waypoint,
    obstacles,
  )) return { motion: acceptedMotion, waypointIndex, complete: false };

  const snapDistance = acceptedMotion.position.distanceTo(target);
  const snappedMotion: LocomotionState = {
    ...acceptedMotion,
    position: target,
    speed: 0,
    distanceTravelled: acceptedMotion.distanceTravelled + snapDistance,
    moving: false,
  };
  const complete = waypointIndex === route.length - 1;
  return {
    motion: snappedMotion,
    waypointIndex: complete ? waypointIndex : waypointIndex + 1,
    complete,
  };
}
