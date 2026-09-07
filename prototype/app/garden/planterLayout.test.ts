import { describe, expect, it } from 'vitest';
import { getGardenElevation } from './gardenElevation';
import {
  DESTINATION_OBSTACLE,
  getJourneyGrowth,
  PIP_RETURN_POSITION,
} from './journeyLayout';
import {
  createSafeGardenRoute,
  GARDEN_OBSTACLES,
  isSafeGardenPoint,
  isSafeGardenSegment,
  type GardenObstacle,
  type GardenPoint,
} from './navigation';
import { PAVILION_READING_POINT } from './pavilionLayout';
import {
  BASKET_RADIUS,
  BOOK_STAND_RADIUS,
  PLANTER_LAYOUT,
  planterObstacles,
} from './planterLayout';
import { createPlanterProgress, type PlanterProgress } from './planterProgress';
import { RESIDENTS } from './residents';

const projectStates: readonly PlanterProgress[] = [
  createPlanterProgress(),
  {
    ...createPlanterProgress(),
    book: true,
    supplies: 'committed',
    stage: 'base',
  },
  {
    ...createPlanterProgress(),
    book: true,
    supplies: 'used',
    stage: 'planted',
  },
];

function expectSafeRoute(
  start: GardenPoint,
  route: readonly GardenPoint[],
  obstacles: readonly GardenObstacle[],
) {
  let previous = start;
  for (const point of route) {
    expect(isSafeGardenPoint(point, obstacles)).toBe(true);
    expect(isSafeGardenSegment(previous, point, obstacles)).toBe(true);
    previous = point;
  }
}

function footprintElevations(obstacle: GardenObstacle) {
  return [
    getGardenElevation(obstacle.x, obstacle.z),
    ...Array.from({ length: 16 }, (_, index) => {
      const angle = index / 16 * Math.PI * 2;
      return getGardenElevation(
        obstacle.x + Math.cos(angle) * obstacle.radius,
        obstacle.z + Math.sin(angle) * obstacle.radius,
      );
    }),
  ];
}

describe('shared planter layout', () => {
  it('adds only the solid project footprints present in each progress state', () => {
    const empty = createPlanterProgress();
    expect(planterObstacles(empty)).toEqual([]);

    const book = planterObstacles({ ...empty, book: true });
    expect(book).toContainEqual({ ...PLANTER_LAYOUT.book, radius: BOOK_STAND_RADIUS });

    const supplies = planterObstacles({ ...empty, supplies: 'available' });
    expect(supplies).toContainEqual({ ...PLANTER_LAYOUT.basket, radius: BASKET_RADIUS });

    const base = planterObstacles({ ...empty, stage: 'base' });
    expect(base).toContainEqual({ ...PLANTER_LAYOUT.planter, radius: PLANTER_LAYOUT.planterRadius });

    const used = planterObstacles({ ...empty, supplies: 'used' });
    expect(used.some((obstacle) => (
      obstacle.x === PLANTER_LAYOUT.basket.x && obstacle.z === PLANTER_LAYOUT.basket.z
    ))).toBe(true);
  });

  it('keeps every approach outside finished geometry', () => {
    const progress = {
      ...createPlanterProgress(),
      book: true,
      supplies: 'used' as const,
      stage: 'planted' as const,
    };
    const obstacles = [...GARDEN_OBSTACLES, ...planterObstacles(progress)];

    for (const point of Object.values(PLANTER_LAYOUT.slots)) {
      expect(isSafeGardenPoint(point, obstacles)).toBe(true);
    }
  });

  it('places each visible footprint on level ground', () => {
    const progress = {
      ...createPlanterProgress(),
      book: true,
      supplies: 'used' as const,
      stage: 'planted' as const,
    };

    for (const obstacle of planterObstacles(progress)) {
      const elevations = footprintElevations(obstacle);
      expect(Math.max(...elevations) - Math.min(...elevations)).toBeLessThanOrEqual(.08);
    }
  });

  it('uses the nook reading point while keeping its book stand out of the occupied spot', () => {
    expect(PLANTER_LAYOUT.slots.read).toEqual(PAVILION_READING_POINT);
    expect(Math.hypot(
      PLANTER_LAYOUT.book.x - PAVILION_READING_POINT.x,
      PLANTER_LAYOUT.book.z - PAVILION_READING_POINT.z,
    )).toBeGreaterThanOrEqual(.65);
  });

  it('keeps simultaneous carrying and work positions separated by resident clearance', () => {
    const concurrent = (['pickup', 'carryDrop', 'work', 'observe'] as const)
      .map((slot) => PLANTER_LAYOUT.slots[slot]);

    for (const [index, point] of concurrent.entries()) {
      for (const other of concurrent.slice(index + 1)) {
        expect(Math.hypot(point.x - other.x, point.z - other.z)).toBeGreaterThanOrEqual(.85);
      }
    }
  });

  it('routes every resident to project roles and back into the nook in every geometry state', () => {
    const roles = (['read', 'pickup', 'work', 'observe'] as const)
      .map((slot) => PLANTER_LAYOUT.slots[slot]);

    for (const progress of projectStates) {
      const obstacles = [...GARDEN_OBSTACLES, ...planterObstacles(progress)];
      for (const resident of RESIDENTS) {
        const spawn = { x: resident.spawn[0], z: resident.spawn[2] };
        for (const target of roles) {
          const outbound = createSafeGardenRoute(spawn, target, obstacles);
          expect(outbound.at(-1)).toEqual(target);
          expectSafeRoute(spawn, outbound, obstacles);

          const onward = createSafeGardenRoute(target, PAVILION_READING_POINT, obstacles);
          expect(onward.at(-1)).toEqual(PAVILION_READING_POINT);
          expectSafeRoute(target, onward, obstacles);
        }
      }
    }
  });

  it('keeps each active project slot reachable while peers occupy the others', () => {
    const activeSlots = ['pickup', 'carryDrop', 'work', 'observe'] as const;
    const progress = projectStates[2];
    const projectGeometry = [...GARDEN_OBSTACLES, ...planterObstacles(progress)];

    for (const [residentIndex, slot] of activeSlots.entries()) {
      const start = {
        x: RESIDENTS[residentIndex % RESIDENTS.length].spawn[0],
        z: RESIDENTS[residentIndex % RESIDENTS.length].spawn[2],
      };
      const peers = activeSlots
        .filter((other) => other !== slot)
        .map((other) => ({ ...PLANTER_LAYOUT.slots[other], radius: .5 }));
      const obstacles = [...projectGeometry, ...peers];
      const route = createSafeGardenRoute(start, PLANTER_LAYOUT.slots[slot], obstacles);

      expect(route.at(-1)).toEqual(PLANTER_LAYOUT.slots[slot]);
      expectSafeRoute(start, route, obstacles);
    }
  });

  it('leaves the central nook approach open with the finished project present', () => {
    const obstacles = [...GARDEN_OBSTACLES, ...planterObstacles(projectStates[2])];
    const approach = { x: PAVILION_READING_POINT.x, z: -3.2 };
    const route = createSafeGardenRoute(approach, PAVILION_READING_POINT, obstacles);

    expect(route.at(-1)).toEqual(PAVILION_READING_POINT);
    expectSafeRoute(approach, route, obstacles);
  });

  it.each(['orchard', 'workshop'] as const)(
    'preserves the existing %s destination approach in every geometry state',
    (choice) => {
      const start = { x: PIP_RETURN_POSITION[0], z: PIP_RETURN_POSITION[2] };
      const target = { x: -10.6, z: 9.2 };
      expect(getJourneyGrowth(4, choice).groundRadius).toBeLessThanOrEqual(DESTINATION_OBSTACLE.radius);

      for (const progress of projectStates) {
        const obstacles = [...GARDEN_OBSTACLES, ...planterObstacles(progress)];
        expect(isSafeGardenPoint(DESTINATION_OBSTACLE, obstacles)).toBe(false);
        const route = createSafeGardenRoute(start, target, obstacles);
        expect(route.at(-1)).toEqual(target);
        expectSafeRoute(start, route, obstacles);
      }
    },
  );
});
