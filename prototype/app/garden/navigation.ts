export const SAFE_GARDEN_HALF_SIZE = 18.7;
export const SAFE_POND_RADIUS = 7.1;
export const PIP_ACTIVITY_TIMEOUT_SECONDS = 8;

const SCENERY_CLEARANCE = 0.35;
const RECOVERY_PADDING = 0.001;

export type GardenPoint = {
  x: number;
  z: number;
};

export type GardenObstacle = GardenPoint & {
  radius: number;
};

export type GardenInterest = {
  id: string;
  position: GardenPoint;
};

function isOutsideCircle(point: GardenPoint, center: GardenPoint, radius: number) {
  return Math.hypot(point.x - center.x, point.z - center.z) >= radius;
}

export function isSafeGardenPoint(point: GardenPoint, obstacles: readonly GardenObstacle[]) {
  if (Math.abs(point.x) > SAFE_GARDEN_HALF_SIZE || Math.abs(point.z) > SAFE_GARDEN_HALF_SIZE) return false;
  if (!isOutsideCircle(point, { x: 0, z: 0 }, SAFE_POND_RADIUS)) return false;
  return obstacles.every((obstacle) => isOutsideCircle(point, obstacle, obstacle.radius + SCENERY_CLEARANCE));
}

function clampedToGarden(point: GardenPoint): GardenPoint {
  return {
    x: Math.max(-SAFE_GARDEN_HALF_SIZE, Math.min(SAFE_GARDEN_HALF_SIZE, point.x)),
    z: Math.max(-SAFE_GARDEN_HALF_SIZE, Math.min(SAFE_GARDEN_HALF_SIZE, point.z)),
  };
}

function inwardFallback(center: GardenPoint): GardenPoint {
  if (center.x || center.z) {
    const length = Math.hypot(center.x, center.z);
    return { x: -center.x / length, z: -center.z / length };
  }
  return { x: 1, z: 0 };
}

function pushOutside(point: GardenPoint, center: GardenPoint, radius: number): GardenPoint {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= radius) return point;
  const direction = distance > 0.000001
    ? { x: dx / distance, z: dz / distance }
    : inwardFallback(center);
  const safeRadius = radius + RECOVERY_PADDING;
  return {
    x: center.x + direction.x * safeRadius,
    z: center.z + direction.z * safeRadius,
  };
}

export function nearestSafePoint(point: GardenPoint, obstacles: readonly GardenObstacle[]): GardenPoint {
  let recovered = { ...point };

  // Repeating the ordered recovery resolves a scenery push that reaches the hedge boundary.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    recovered = clampedToGarden(recovered);
    recovered = pushOutside(recovered, { x: 0, z: 0 }, SAFE_POND_RADIUS);
    for (const obstacle of obstacles) {
      recovered = pushOutside(recovered, obstacle, obstacle.radius + SCENERY_CLEARANCE);
    }
    if (isSafeGardenPoint(recovered, obstacles)) return recovered;
  }

  return clampedToGarden(recovered);
}

export function hasActivityTimedOut(startedAt: number, now: number, timeoutSeconds: number) {
  return now - startedAt > timeoutSeconds;
}
