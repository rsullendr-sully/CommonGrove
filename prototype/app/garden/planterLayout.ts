import type { GardenObstacle, GardenPoint } from './navigation';
import { PAVILION_READING_POINT } from './pavilionLayout';
import type { PlanterProjection } from './planterProgress';

export type PlanterSlot = 'read' | 'pickup' | 'carryDrop' | 'work' | 'observe' | 'water';

export type PlanterLayout = {
  book: GardenPoint;
  basket: GardenPoint;
  planter: GardenPoint;
  slots: Record<PlanterSlot, GardenPoint>;
  planterRadius: number;
};

export const BOOK_STAND_RADIUS = .24;
export const BASKET_RADIUS = .5;

/**
 * The project sits on the flat lawn west of the reading approach. The approach
 * itself stays centered on x=-12.2, while distinct radial slots leave room for
 * a carrier, worker, and observer to arrive without occupying one another.
 */
export const PLANTER_LAYOUT: PlanterLayout = {
  book: { x: PAVILION_READING_POINT.x, z: PAVILION_READING_POINT.z - .8 },
  basket: { x: -16, z: -3.1 },
  planter: { x: -15, z: -1.8 },
  slots: {
    read: { ...PAVILION_READING_POINT },
    pickup: { x: -16.7, z: -3.9 },
    carryDrop: { x: -15, z: -3.15 },
    work: { x: -13.65, z: -1.8 },
    observe: { x: -13.65, z: -.4 },
    water: { x: -15.15, z: -.2 },
  },
  planterRadius: .85,
};

export function planterObstacles(progress: PlanterProjection): GardenObstacle[] {
  const obstacles: GardenObstacle[] = [];
  if (progress.book) obstacles.push({ ...PLANTER_LAYOUT.book, radius: BOOK_STAND_RADIUS });
  if (progress.supplies !== 'absent') obstacles.push({ ...PLANTER_LAYOUT.basket, radius: BASKET_RADIUS });
  if (progress.stage !== 'empty') {
    obstacles.push({ ...PLANTER_LAYOUT.planter, radius: PLANTER_LAYOUT.planterRadius });
  }
  return obstacles;
}
