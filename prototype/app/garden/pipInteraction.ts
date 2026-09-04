import * as THREE from 'three';
import { EMPLOYEE_WALK_SPEED } from './locomotion';
import {
  isSafeGardenPoint,
  nearestSafePoint,
  type GardenObstacle,
  type GardenPoint,
} from './navigation';
import type { InteractableId } from './interaction';
import type { PipActivityKind } from './behavior';

export type PipInteractionPhase = 'none' | 'greet-approach' | 'greet' | 'pet' | 'carried' | 'placed' | 'eating' | 'playing';

export const PIP_EATING_REACTION_SECONDS = 3;
export const PIP_PLAYING_REACTION_SECONDS = 4;

export const PIP_PET_REACTION_SECONDS = 1.8;
export const PIP_PET_MESSAGE = 'Pip leans into your hand, listening ear tipped toward you.';
export const PIP_DIRECT_GREET_REACTION_SECONDS = 1.4;
export const PIP_DIRECT_GREET_MESSAGE = 'Pip steps closer, listening ear lifted in hello.';
export const PIP_PLACEMENT_FALLBACK_MESSAGE = "There wasn't a safe spot there, so Pip returned to the path.";
export const PIP_CARRY_ANCHOR = [0.48, -0.42, -1.35] as const;
export const PIP_PLACEMENT_DISTANCE = 1.4;
export const PIP_CARRY_WALK_SPEED = 3;
export const PIP_INTERACTION_INVITATION_DISTANCE = 3.8;
export const CAMERA_CONTROLS_FRAME_PRIORITY = -1;
export const PIP_INTERACTION_FRAME_PRIORITY = 0;

export function hasPetReactionCompleted(startedAt: number, now: number): boolean {
  return now - startedAt >= PIP_PET_REACTION_SECONDS;
}

export function shouldSuspendPipMotion(
  phase: PipInteractionPhase,
): phase is Exclude<PipInteractionPhase, 'none'> {
  return phase !== 'none';
}

export function employeeWalkSpeedWhileHolding(held: InteractableId | null): number {
  return held === 'pip' ? PIP_CARRY_WALK_SPEED : EMPLOYEE_WALK_SPEED;
}

export function canDirectlyInteractWithPip(
  mode: 'ordinary' | 'priority',
): boolean {
  return mode === 'ordinary';
}

export function shouldHoldPipForInteraction(
  interactionEngaged: boolean,
  visitorDistance: number,
  activityKind: PipActivityKind | null,
  mode: 'ordinary' | 'priority',
  phase: PipInteractionPhase,
): boolean {
  if (phase !== 'none' || !canDirectlyInteractWithPip(mode) || activityKind === 'greet') return false;

  return interactionEngaged || visitorDistance <= PIP_INTERACTION_INVITATION_DISTANCE;
}

export function handleHeldPipEscape(
  event: Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopImmediatePropagation'>,
  held: InteractableId | null,
  placePip: () => void,
): boolean {
  if (event.key !== 'Escape' || held !== 'pip') return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  placePip();
  return true;
}

export function handleHeldInteractionEscape(
  event: Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopImmediatePropagation'>,
  held: InteractableId | null,
  placeHeld: () => void,
): boolean {
  if (event.key !== 'Escape' || held === null) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  placeHeld();
  return true;
}

export function interactionPoseKind(phase: PipInteractionPhase) {
  return phase === 'none' ? null : phase;
}

function cameraRelativeCarryPosition(camera: THREE.Camera): THREE.Vector3 {
  return camera.localToWorld(new THREE.Vector3(...PIP_CARRY_ANCHOR));
}

export function updateCarriedPipTransform(camera: THREE.Camera, pip: THREE.Object3D): void {
  pip.position.copy(cameraRelativeCarryPosition(camera));
  pip.rotation.set(0, camera.rotation.y, 0);
}

export function yawTowardEmployee(pip: GardenPoint, employee: GardenPoint): number {
  return Math.atan2(employee.x - pip.x, employee.z - pip.z);
}

export function updatePlacedPipTransform(
  pip: THREE.Object3D,
  point: GardenPoint,
  obstacles: readonly GardenObstacle[],
): void {
  if (!isSafeGardenPoint(point, obstacles)) throw new Error('Pip placement requires a safe garden point.');
  pip.position.set(point.x, 0, point.z);
}

export function projectPipPlacement(
  cameraPosition: { x: number; y: number; z: number },
  cameraForward: { x: number; y: number; z: number },
): GardenPoint {
  const planarLength = Math.hypot(cameraForward.x, cameraForward.z);
  const forward = planarLength > 0.000001
    ? { x: cameraForward.x / planarLength, z: cameraForward.z / planarLength }
    : { x: 0, z: -1 };
  return {
    x: cameraPosition.x + forward.x * PIP_PLACEMENT_DISTANCE,
    z: cameraPosition.z + forward.z * PIP_PLACEMENT_DISTANCE,
  };
}

export type PipPlacementResult = {
  point: GardenPoint;
  usedFallback: boolean;
  message: string | null;
};

export function resolvePipPlacement(
  requested: GardenPoint,
  lastSafe: GardenPoint,
  obstacles: readonly GardenObstacle[],
  findNearest: (point: GardenPoint, obstacles: readonly GardenObstacle[]) => GardenPoint = nearestSafePoint,
): PipPlacementResult {
  try {
    const point = findNearest(requested, obstacles);
    if (isSafeGardenPoint(point, obstacles)) return { point, usedFallback: false, message: null };
  } catch {
    // The recorded safe point remains the deterministic recovery below.
  }

  if (!isSafeGardenPoint(lastSafe, obstacles)) {
    throw new Error('Pip cannot be restored because the recorded last-safe point is invalid.');
  }
  return {
    point: { ...lastSafe },
    usedFallback: true,
    message: PIP_PLACEMENT_FALLBACK_MESSAGE,
  };
}
