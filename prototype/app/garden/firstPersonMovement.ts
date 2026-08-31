import type { GardenObstacle } from './navigation';

export type PlanarMovementVector = {
  x: number;
  z: number;
};

export function getFirstPersonMovementVector(
  yaw: number,
  forwardAmount: number,
  sideAmount: number,
): PlanarMovementVector {
  const inputLength = Math.hypot(forwardAmount, sideAmount) || 1;
  const normalizedForward = forwardAmount / inputLength;
  const normalizedSide = sideAmount / inputLength;

  return {
    x: -Math.sin(yaw) * normalizedForward + Math.cos(yaw) * normalizedSide,
    z: -Math.cos(yaw) * normalizedForward - Math.sin(yaw) * normalizedSide,
  };
}

function segmentDistanceToObstacle(
  start: PlanarMovementVector,
  end: PlanarMovementVector,
  obstacle: GardenObstacle,
) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(start.x - obstacle.x, start.z - obstacle.z);
  const projection = Math.max(0, Math.min(1, (
    (obstacle.x - start.x) * dx + (obstacle.z - start.z) * dz
  ) / lengthSquared));
  return Math.hypot(
    start.x + dx * projection - obstacle.x,
    start.z + dz * projection - obstacle.z,
  );
}

function canMoveAlongSegment(
  start: PlanarMovementVector,
  end: PlanarMovementVector,
  obstacle: GardenObstacle,
) {
  const startDistance = Math.hypot(start.x - obstacle.x, start.z - obstacle.z);
  const endDistance = Math.hypot(end.x - obstacle.x, end.z - obstacle.z);
  const segmentDistance = segmentDistanceToObstacle(start, end, obstacle);
  if (startDistance < obstacle.radius) {
    return endDistance > startDistance && segmentDistance >= startDistance;
  }
  return segmentDistance >= obstacle.radius;
}

export function resolveFirstPersonGardenMove(
  start: PlanarMovementVector,
  desiredMove: PlanarMovementVector,
  obstacles: readonly GardenObstacle[],
): PlanarMovementVector {
  const position = { ...start };
  const xCandidate = { x: start.x + desiredMove.x, z: start.z };
  if (obstacles.every((obstacle) => canMoveAlongSegment(position, xCandidate, obstacle))) {
    position.x = xCandidate.x;
  }

  const zCandidate = { x: position.x, z: position.z + desiredMove.z };
  if (obstacles.every((obstacle) => canMoveAlongSegment(position, zCandidate, obstacle))) {
    position.z = zCandidate.z;
  }
  return position;
}
