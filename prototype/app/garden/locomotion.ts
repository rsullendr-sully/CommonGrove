import * as THREE from 'three';

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
