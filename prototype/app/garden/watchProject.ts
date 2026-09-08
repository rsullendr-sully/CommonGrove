import { residentLookAngles } from './findResident';
import { groundGardenPosition } from './gardenElevation';
import type { ProjectId } from './projectDefinitions';
import { PROJECT_LAYOUTS } from './projectLayout';
export type WatchProjectRequest = { project: ProjectId; sequence: number };
export function projectWatchDestination(project: ProjectId) {
  const work = PROJECT_LAYOUTS[project].slots.work;
  const [, y] = groundGardenPosition(work.x, work.z, .5);
  return { name: project === 'planter' ? 'Planter' : 'Tool rack', direction: 'west garden', point: { ...work, y } };
}
export function consumeProjectWatch(request: WatchProjectRequest | null, lastSequence: number | null, busy: boolean,
  camera: { x: number; y: number; z: number }, yaw: number): { sequence: number; yaw: number; pitch: number } | null {
  if (busy || !request || request.sequence === lastSequence) return null;
  return { sequence: request.sequence, ...residentLookAngles(camera, projectWatchDestination(request.project).point, yaw) };
}
