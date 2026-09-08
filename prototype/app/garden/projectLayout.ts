import type { GardenObstacle, GardenPoint } from './navigation';
import type { ProjectId } from './projectDefinitions';
import type { ProjectsProgress } from './projectProgress';
import { projectComplete } from './projectProgress';
import { BASKET_RADIUS, BOOK_STAND_RADIUS, PLANTER_LAYOUT } from './planterLayout';
export type ReusableTool = 'mallet' | 'can';
export type ProjectLayout = { center: GardenPoint; radius: number; slots: Record<'pickup' | 'carryDrop' | 'work' | 'observe' | 'water', GardenPoint> };
export const PROJECT_LAYOUTS: Record<ProjectId, ProjectLayout> = {
  planter: { center: PLANTER_LAYOUT.planter, radius: PLANTER_LAYOUT.planterRadius, slots: PLANTER_LAYOUT.slots },
  // One unit east of the original candidate keeps carrying approaches off the western berm.
  'tool-rack': { center: { x: -16, z: 1.5 }, radius: .65, slots: {
    pickup: PLANTER_LAYOUT.slots.carryDrop,
    carryDrop: { x: -15, z: .2 }, work: { x: -14.75, z: 1.5 },
    observe: { x: -13.55, z: .6 }, water: { x: -16, z: 2.8 },
  } },
};

/** Explicit scenario selection or a material opportunity activates a reserved final footprint. */
export function projectObstacles(p: ProjectsProgress, activated: readonly ProjectId[] = []): GardenObstacle[] {
  const obstacles: GardenObstacle[] = [];
  if (p.book) obstacles.push({ ...PLANTER_LAYOUT.book, radius: BOOK_STAND_RADIUS });
  for (const id of Object.keys(PROJECT_LAYOUTS) as ProjectId[]) {
    const state = p.projects[id];
    if (state.supplies !== 'absent') obstacles.push({ ...PLANTER_LAYOUT.basket, radius: BASKET_RADIUS });
    if (activated.includes(id) || state.supplies !== 'absent' || state.completedSteps > 0 || p.active === id) {
      obstacles.push({ ...PROJECT_LAYOUTS[id].center, radius: PROJECT_LAYOUTS[id].radius });
    }
  }
  return [...new Map(obstacles.map(o => [`${o.x}:${o.z}:${o.radius}`, o])).values()];
}

/** A held tool retains its pickup anchor; callers commit a new anchor only after release/storage. */
export function toolRestAnchor(p: ProjectsProgress, tool: ReusableTool, claimed: GardenPoint | null): GardenPoint {
  if (claimed) return { ...claimed };
  if (projectComplete(p, 'tool-rack')) {
    const rack = PROJECT_LAYOUTS['tool-rack'].center;
    return { x: rack.x + (tool === 'mallet' ? -.25 : .25), z: rack.z };
  }
  return { x: PLANTER_LAYOUT.basket.x + (tool === 'mallet' ? -.2 : .2), z: PLANTER_LAYOUT.basket.z };
}
