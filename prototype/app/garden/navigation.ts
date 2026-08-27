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

export type GardenInterestState = {
  seedVisible: boolean;
  destinationVisible: boolean;
};

function isOutsideCircle(point: GardenPoint, center: GardenPoint, radius: number) {
  return Math.hypot(point.x - center.x, point.z - center.z) >= radius;
}

export function isSafeGardenPoint(point: GardenPoint, obstacles: readonly GardenObstacle[]) {
  if (Math.abs(point.x) > SAFE_GARDEN_HALF_SIZE || Math.abs(point.z) > SAFE_GARDEN_HALF_SIZE) return false;
  if (!isOutsideCircle(point, { x: 0, z: 0 }, SAFE_POND_RADIUS)) return false;
  return obstacles.every((obstacle) => isOutsideCircle(point, obstacle, obstacle.radius + SCENERY_CLEARANCE));
}

export function selectCurrentGardenInterests(
  interests: readonly GardenInterest[],
  state: GardenInterestState,
) {
  return interests.filter((interest) => {
    if (interest.id === 'seed') return state.seedVisible && !state.destinationVisible;
    if (interest.id === 'destination') return state.destinationVisible;
    return true;
  });
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
  const candidates: GardenPoint[] = [];
  const addCandidate = (candidate: GardenPoint) => candidates.push(clampedToGarden(candidate));
  const addCircularCandidates = (center: GardenPoint, radius: number) => {
    for (let step = 0; step < 72; step += 1) {
      const angle = (step / 72) * Math.PI * 2;
      addCandidate({
        x: center.x + Math.cos(angle) * (radius + RECOVERY_PADDING),
        z: center.z + Math.sin(angle) * (radius + RECOVERY_PADDING),
      });
    }
  };

  let recovered = clampedToGarden(point);
  addCandidate(recovered);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    recovered = pushOutside(recovered, { x: 0, z: 0 }, SAFE_POND_RADIUS);
    for (const obstacle of obstacles) recovered = pushOutside(recovered, obstacle, obstacle.radius + SCENERY_CLEARANCE);
    addCandidate(recovered);
    recovered = clampedToGarden(recovered);
  }

  addCircularCandidates({ x: 0, z: 0 }, SAFE_POND_RADIUS);
  for (const obstacle of obstacles) addCircularCandidates(obstacle, obstacle.radius + SCENERY_CLEARANCE);

  const safeCandidates = candidates.filter((candidate) => isSafeGardenPoint(candidate, obstacles));
  if (safeCandidates.length > 0) {
    return safeCandidates.reduce((nearest, candidate) => (
      Math.hypot(candidate.x - point.x, candidate.z - point.z) < Math.hypot(nearest.x - point.x, nearest.z - point.z)
        ? candidate
        : nearest
    ));
  }

  throw new Error('No safe garden point exists for the declared obstacles.');
}

export function hasActivityTimedOut(startedAt: number, now: number, timeoutSeconds: number) {
  return now - startedAt > timeoutSeconds;
}
