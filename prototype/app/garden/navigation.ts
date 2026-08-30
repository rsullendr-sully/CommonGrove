import { PAVILION_OBSTACLES } from './pavilionLayout';

export const SAFE_GARDEN_HALF_SIZE = 18.7;
export const SAFE_POND_RADIUS = 7.1;
export const PIP_ACTIVITY_TIMEOUT_SECONDS = 8;
export const PIP_GREETING_STANDOFF_DISTANCE = 1.65;

const SCENERY_CLEARANCE = 0.35;
const RECOVERY_PADDING = 0.001;
const ROUTE_GRID_STEP = 0.5;
const ROUTE_GRID_HALF_SIZE = 18.5;
const SEGMENT_EPSILON = 0.000001;

export type GardenPoint = {
  x: number;
  z: number;
};

export type GardenObstacle = GardenPoint & {
  radius: number;
};

export const GARDEN_OBSTACLES: readonly GardenObstacle[] = [
  { x: 0, z: 0, radius: 6.7 },
  { x: 0, z: -15.2, radius: 6.8 },
  ...PAVILION_OBSTACLES,
  { x: 11.8, z: -9.2, radius: 1.15 },
  { x: 14.4, z: 5.8, radius: 1.15 },
  { x: -14.8, z: 4.5, radius: 1.15 },
];

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

function segmentDistanceToPoint(start: GardenPoint, end: GardenPoint, point: GardenPoint) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= SEGMENT_EPSILON) return Math.hypot(point.x - start.x, point.z - start.z);
  const projection = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.z - start.z) * dz
  ) / lengthSquared));
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.z - (start.z + projection * dz),
  );
}

export function isSafeGardenSegment(
  start: GardenPoint,
  end: GardenPoint,
  obstacles: readonly GardenObstacle[],
) {
  if (!isSafeGardenPoint(start, obstacles) || !isSafeGardenPoint(end, obstacles)) return false;
  if (segmentDistanceToPoint(start, end, { x: 0, z: 0 }) < SAFE_POND_RADIUS - SEGMENT_EPSILON) return false;
  return obstacles.every((obstacle) => (
    segmentDistanceToPoint(start, end, obstacle) >= obstacle.radius + SCENERY_CLEARANCE - SEGMENT_EPSILON
  ));
}

function routeGridPoints(obstacles: readonly GardenObstacle[]) {
  const points = new Map<string, GardenPoint>();
  const cellsPerAxis = Math.round((ROUTE_GRID_HALF_SIZE * 2) / ROUTE_GRID_STEP);
  for (let xIndex = 0; xIndex <= cellsPerAxis; xIndex += 1) {
    for (let zIndex = 0; zIndex <= cellsPerAxis; zIndex += 1) {
      const point = {
        x: -ROUTE_GRID_HALF_SIZE + xIndex * ROUTE_GRID_STEP,
        z: -ROUTE_GRID_HALF_SIZE + zIndex * ROUTE_GRID_STEP,
      };
      if (isSafeGardenPoint(point, obstacles)) points.set(`${xIndex},${zIndex}`, point);
    }
  }
  return { points, cellsPerAxis };
}

function nearestVisibleGridKey(
  point: GardenPoint,
  grid: ReadonlyMap<string, GardenPoint>,
  obstacles: readonly GardenObstacle[],
) {
  let nearestKey: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const [key, candidate] of grid) {
    const distance = (candidate.x - point.x) ** 2 + (candidate.z - point.z) ** 2;
    if (distance < nearestDistance && isSafeGardenSegment(point, candidate, obstacles)) {
      nearestKey = key;
      nearestDistance = distance;
    }
  }
  return nearestKey;
}

function compressedSafeRoute(
  start: GardenPoint,
  points: readonly GardenPoint[],
  obstacles: readonly GardenObstacle[],
) {
  const route: GardenPoint[] = [];
  let anchor = start;
  let nextIndex = 0;
  while (nextIndex < points.length) {
    let furthestVisible = nextIndex;
    for (let candidateIndex = points.length - 1; candidateIndex >= nextIndex; candidateIndex -= 1) {
      if (isSafeGardenSegment(anchor, points[candidateIndex], obstacles)) {
        furthestVisible = candidateIndex;
        break;
      }
    }
    const next = points[furthestVisible];
    if (Math.hypot(next.x - anchor.x, next.z - anchor.z) > SEGMENT_EPSILON) route.push(next);
    anchor = next;
    nextIndex = furthestVisible + 1;
  }
  return route;
}

export function createSafeGardenRoute(
  start: GardenPoint,
  end: GardenPoint,
  obstacles: readonly GardenObstacle[],
): GardenPoint[] {
  if (!isSafeGardenPoint(start, obstacles) || !isSafeGardenPoint(end, obstacles)) {
    throw new Error('Safe garden routes require safe endpoints.');
  }
  if (Math.hypot(end.x - start.x, end.z - start.z) <= SEGMENT_EPSILON) return [{ ...end }];
  if (isSafeGardenSegment(start, end, obstacles)) return [{ ...end }];

  const { points: grid, cellsPerAxis } = routeGridPoints(obstacles);
  const startKey = nearestVisibleGridKey(start, grid, obstacles);
  const endKey = nearestVisibleGridKey(end, grid, obstacles);
  if (!startKey || !endKey) throw new Error('No safe garden route exists for the declared obstacles.');

  const queue = [startKey];
  const visited = new Set([startKey]);
  const previous = new Map<string, string>();
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  let queueIndex = 0;
  while (queueIndex < queue.length && !visited.has(endKey)) {
    const currentKey = queue[queueIndex++];
    const current = grid.get(currentKey)!;
    const [xIndex, zIndex] = currentKey.split(',').map(Number);
    for (const [xOffset, zOffset] of directions) {
      const nextX = xIndex + xOffset;
      const nextZ = zIndex + zOffset;
      if (nextX < 0 || nextZ < 0 || nextX > cellsPerAxis || nextZ > cellsPerAxis) continue;
      const nextKey = `${nextX},${nextZ}`;
      const next = grid.get(nextKey);
      if (!next || visited.has(nextKey) || !isSafeGardenSegment(current, next, obstacles)) continue;
      visited.add(nextKey);
      previous.set(nextKey, currentKey);
      queue.push(nextKey);
    }
  }
  if (!visited.has(endKey)) throw new Error('No safe garden route exists for the declared obstacles.');

  const gridPath: GardenPoint[] = [];
  let cursor = endKey;
  while (cursor !== startKey) {
    gridPath.push(grid.get(cursor)!);
    cursor = previous.get(cursor)!;
  }
  gridPath.push(grid.get(startKey)!);
  gridPath.reverse();
  return compressedSafeRoute(start, [...gridPath, { ...end }], obstacles);
}

export function createSafeGreetingApproach(
  pip: GardenPoint,
  employee: GardenPoint,
  obstacles: readonly GardenObstacle[],
): { target: GardenPoint; route: GardenPoint[] } {
  if (!isSafeGardenPoint(pip, obstacles)) {
    throw new Error('Greeting approaches require Pip to start on safe garden ground.');
  }
  const dx = pip.x - employee.x;
  const dz = pip.z - employee.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= PIP_GREETING_STANDOFF_DISTANCE || distance <= SEGMENT_EPSILON) {
    return { target: { ...pip }, route: [{ ...pip }] };
  }

  const requested = {
    x: employee.x + (dx / distance) * PIP_GREETING_STANDOFF_DISTANCE,
    z: employee.z + (dz / distance) * PIP_GREETING_STANDOFF_DISTANCE,
  };
  const candidate = nearestSafePoint(requested, obstacles);
  const candidateDistance = Math.hypot(candidate.x - employee.x, candidate.z - employee.z);
  if (candidateDistance >= distance - SEGMENT_EPSILON) {
    return { target: { ...pip }, route: [{ ...pip }] };
  }
  return {
    target: candidate,
    route: createSafeGardenRoute(pip, candidate, obstacles),
  };
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
