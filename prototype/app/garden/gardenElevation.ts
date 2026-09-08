import * as THREE from 'three';
import { PAVILION_CENTER, PAVILION_SURFACE } from './pavilionLayout';

export const READING_TERRACE_HEIGHT = 1.5;
export const PAVILION_BASE_Y = READING_TERRACE_HEIGHT
  - PAVILION_SURFACE.deck.centerY - PAVILION_SURFACE.deck.height / 2;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Shared walkable heightfield. Navigation stays planar; presentation adds ground height once. */
export function getGardenElevation(x: number, z: number): number {
  const across = clamp((8 - Math.abs(x - PAVILION_CENTER.x)) / 4.7);
  const along = clamp((9 - Math.abs(z - PAVILION_CENTER.z)) / 5.7);
  const pondClearance = clamp((Math.hypot(x, z) - 7.1) / 1.5);
  return READING_TERRACE_HEIGHT * Math.min(across, along) * pondClearance;
}

export function groundGardenPosition(x: number, z: number, offset = 0): [number, number, number] {
  return [x, getGardenElevation(x, z) + offset, z];
}

/** Store local height, never the already-grounded render Y, for pickup/recovery cycles. */
export function captureGardenLocalPosition(
  world: { x: number; y: number; z: number },
  safePoint: { x: number; z: number },
): [number, number, number] {
  return [safePoint.x, world.y - getGardenElevation(world.x, world.z), safePoint.z];
}

export function createGardenGroundGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(40, 40, 160, 160).rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    positions.setY(index, getGardenElevation(positions.getX(index), positions.getZ(index)));
  }
  geometry.computeVertexNormals();
  return geometry;
}
