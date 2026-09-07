import type { ProjectAction, ProjectDirective } from './planterCoordinator';
import { createSafeGardenRoute, type GardenObstacle, type GardenPoint } from './navigation';
import { PIP_MOTION_CONFIG, stepSafeRouteLocomotion, type LocomotionState } from './locomotion';

export type ProjectVisual = { action: ProjectAction; tool: ProjectDirective['tool']; elapsed: number; performing: boolean; reducedMotion: boolean };
export function projectVisual(d: ProjectDirective, reducedMotion: boolean): ProjectVisual {
  return { action: d.action, tool: d.tool, elapsed: d.elapsed, performing: d.phase === 'perform', reducedMotion };
}
export function projectMotion(v: ProjectVisual): { lean: number; tap: number; tilt: number } {
  if (!v.performing) return { lean: 0, tap: 0, tilt: 0 };
  const tap = v.action === 'assemble' && !v.reducedMotion ? Math.max(0, Math.sin(v.elapsed * Math.PI * 2)) * .16 : 0;
  const dip = v.reducedMotion ? 0 : Math.sin(v.elapsed * Math.PI) * .025;
  return { lean: v.action === 'fill' || v.action === 'plant' ? .1 + dip : v.action === 'assemble' ? .06 : .025,
    tap, tilt: v.action === 'water' ? .48 : v.action === 'read' || v.action === 'inspect' || v.action === 'observe' ? .1 : 0 };
}

export type ProjectTravel = { motion: LocomotionState; key: string | null; waypoints: readonly GardenPoint[];
  waypointIndex: number; planned: boolean; arrived?: boolean };
/** Shared safe locomotion, including failure semantics: an empty failed route is never arrival. */
export function stepProjectTravel(previous: ProjectTravel, d: ProjectDirective, delta: number, obstacles: readonly GardenObstacle[]): ProjectTravel {
  let travel = previous;
  if (travel.key !== d.key) {
    try {
      travel = { ...travel, key: d.key, waypoints: createSafeGardenRoute(travel.motion.position, d.target, obstacles), waypointIndex: 0, planned: true };
    } catch {
      travel = { ...travel, key: d.key, waypoints: [], waypointIndex: 0, planned: false };
    }
  }
  if (!travel.planned) return { ...travel, motion: { ...travel.motion, speed: 0, moving: false }, arrived: false };
  const step = stepSafeRouteLocomotion({ motion: travel.motion, waypointIndex: travel.waypointIndex, complete: false },
    travel.waypoints, delta, PIP_MOTION_CONFIG, obstacles);
  return { ...travel, motion: step.motion, waypointIndex: step.waypointIndex,
    arrived: step.complete && Math.hypot(step.motion.position.x - d.target.x, step.motion.position.z - d.target.z) <= .28 };
}
