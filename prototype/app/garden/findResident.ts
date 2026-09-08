import type { ResidentId } from './residents';
export type FindResidentRequest = { id: ResidentId; sequence: number };
type Point = { x: number; y: number; z: number };
export function residentLookAngles(camera: Point, target: Point, yaw: number) {
  const dx = target.x - camera.x, dz = target.z - camera.z;
  const horizontal = Math.hypot(dx, dz);
  return {
    yaw: horizontal < .0001 ? yaw : Math.atan2(-dx, -dz),
    pitch: Math.max(-1.25, Math.min(.5, Math.atan2(target.y - camera.y, horizontal))),
  };
}
