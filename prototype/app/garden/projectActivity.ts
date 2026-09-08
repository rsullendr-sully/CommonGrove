import type { ProjectAction, ProjectDirective } from './projectScheduler';
import { createSafeGardenRoute, type GardenObstacle, type GardenPoint } from './navigation';
import { PIP_MOTION_CONFIG, stepSafeRouteLocomotion, type LocomotionState } from './locomotion';

export type ProjectVisual = { action: ProjectAction; tool: ProjectDirective['tool']; elapsed: number; performing: boolean; reducedMotion: boolean };
export function projectVisual(d: ProjectDirective, reducedMotion: boolean): ProjectVisual {
  return { action: d.action, tool: d.tool, elapsed: d.elapsed, performing: d.phase === 'perform', reducedMotion };
}
export type ProjectMotion = {
  lean: number;
  tap: number;
  tilt: number;
  fitRotation: number;
  settle: number;
  reach: number;
  contact: boolean;
};
const STILL_PROJECT_MOTION: ProjectMotion = {
  lean: 0, tap: 0, tilt: 0, fitRotation: 0, settle: 0, reach: 0, contact: false,
};
export function projectMotion(v: ProjectVisual): ProjectMotion {
  if (!v.performing) return STILL_PROJECT_MOTION;
  const work = v.action === 'fit' || v.action === 'tap' || v.action === 'fill' || v.action === 'plant';
  const contact = work || v.action === 'water';
  const tap = v.action === 'tap' && !v.reducedMotion ? Math.max(0, Math.sin(v.elapsed * Math.PI * 2)) * .22 : 0;
  const fitRemaining = Math.max(0, 1 - Math.min(v.elapsed, 3) / 3);
  const fitRotation = v.action === 'fit'
    ? v.reducedMotion ? .2 : fitRemaining * .62 + Math.sin(v.elapsed * Math.PI * 2) * .035
    : 0;
  const settle = v.action === 'fit' && !v.reducedMotion ? fitRemaining * .13 : 0;
  const dip = v.reducedMotion ? 0 : Math.sin(v.elapsed * Math.PI) * .025;
  return {
    lean: v.action === 'fill' || v.action === 'plant' ? .12 + dip : v.action === 'fit' || v.action === 'tap' ? .09 : .025,
    tap,
    tilt: v.action === 'fill' ? .58 : v.action === 'plant' ? .28 : v.action === 'water' ? .48
      : v.action === 'read' || v.action === 'inspect' || v.action === 'observe' ? .1 : 0,
    fitRotation,
    settle,
    // Work slots stay outside project collision radii. Move the one held prop to
    // the near edge for contact without changing the spirit body or adding hands.
    reach: work ? .9 : v.action === 'water' ? .52 : 0,
    contact,
  };
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
