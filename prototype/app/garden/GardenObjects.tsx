'use client';

import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { GardenCommunity } from './CommunityCoordinator';
import { groundGardenPosition } from './gardenElevation';
import type { SafePosition } from './interaction';
import { PIP_INTERACTION_FRAME_PRIORITY, projectPipPlacement } from './pipInteraction';
import {
  isSafeGardenPoint,
  createSafeGardenRoute,
  nearestSafePoint,
  type GardenObstacle,
  type GardenPoint,
} from './navigation';

export const GARDEN_SNACK_AUTHORED_POSITION = [4.8, 0.25, -4.5] as const;
export const GARDEN_TOY_AUTHORED_POSITION = [-3.8, 0.2, 5.4] as const;
export const GARDEN_OBJECT_CARRY_ANCHOR = [0.42, -0.34, -1.05] as const;
export const TOY_NUDGE_STANDOFF_DISTANCE = 0.72;

export type GardenObjectId = 'food' | 'toy';

export function resetGardenObjectPosition(
  id: GardenObjectId,
  lastSafePosition: SafePosition,
): SafePosition {
  return id === 'food'
    ? [...GARDEN_SNACK_AUTHORED_POSITION]
    : [...lastSafePosition];
}

export function updateCarriedGardenObjectTransform(
  camera: THREE.Camera,
  object: THREE.Object3D,
): void {
  object.position.copy(
    camera.localToWorld(new THREE.Vector3(...GARDEN_OBJECT_CARRY_ANCHOR)),
  );
  object.rotation.set(0, camera.rotation.y, 0);
}

export type GardenObjectPlacementResult = {
  point: GardenPoint;
  position: SafePosition;
  message: string | null;
};

export function resolveGardenObjectPlacement(
  id: GardenObjectId,
  requested: GardenPoint,
  lastSafe: GardenPoint,
  obstacles: readonly GardenObstacle[],
  findNearest: (point: GardenPoint, obstacles: readonly GardenObstacle[]) => GardenPoint = nearestSafePoint,
): GardenObjectPlacementResult {
  const y = id === 'food'
    ? GARDEN_SNACK_AUTHORED_POSITION[1]
    : GARDEN_TOY_AUTHORED_POSITION[1];
  try {
    const point = findNearest(requested, obstacles);
    if (isSafeGardenPoint(point, obstacles)) {
      return { point, position: [point.x, y, point.z], message: null };
    }
  } catch {
    // Fall through to the recorded safe point.
  }
  if (!isSafeGardenPoint(lastSafe, obstacles)) {
    throw new Error('Garden object cannot be restored because its recorded last-safe point is invalid.');
  }
  const name = id === 'food' ? 'snack' : 'toy';
  return {
    point: { ...lastSafe },
    position: [lastSafe.x, y, lastSafe.z],
    message: `There wasn't a safe spot there, so the ${name} returned to where you found it.`,
  };
}

export function projectGardenObjectOffer(
  cameraPosition: { x: number; y: number; z: number },
  cameraForward: { x: number; y: number; z: number },
  obstacles: readonly GardenObstacle[],
): GardenPoint {
  return nearestSafePoint(
    projectPipPlacement(cameraPosition, cameraForward),
    obstacles,
  );
}

export type ToyPlayApproach = {
  standoff: GardenPoint;
  route: readonly GardenPoint[];
};

export function createToyPlayApproach(
  start: GardenPoint,
  toy: GardenPoint,
  obstacles: readonly GardenObstacle[],
  minimumStandoff = TOY_NUDGE_STANDOFF_DISTANCE,
): ToyPlayApproach {
  const towardStart = Math.atan2(start.z - toy.z, start.x - toy.x);
  const angularStep = Math.PI / 36;
  const offsets = [0];
  for (let step = 1; step < 36; step += 1) offsets.push(step, -step);

  for (const extra of [0, .1, .2, .3, .4]) {
    const distance = minimumStandoff + extra;
    for (const offset of offsets) {
      const angle = towardStart + offset * angularStep;
      const standoff = {
        x: toy.x + Math.cos(angle) * distance,
        z: toy.z + Math.sin(angle) * distance,
      };
      if (!isSafeGardenPoint(standoff, obstacles)) continue;
      try {
        return {
          standoff,
          route: createSafeGardenRoute(start, standoff, obstacles),
        };
      } catch {
        // Try the next deterministic standoff candidate.
      }
    }
  }

  throw new Error('No safe toy-play standoff is reachable.');
}

export type ToyPlayFrame = {
  facing: number;
  shouldNudge: boolean;
  nudgeSent: boolean;
};

export function resolveToyPlayFrame(
  pip: GardenPoint,
  toy: GardenPoint,
  routeFacing: number,
  arrived: boolean,
  nudgeAlreadySent: boolean,
): ToyPlayFrame {
  if (!arrived) {
    return {
      facing: routeFacing,
      shouldNudge: false,
      nudgeSent: nudgeAlreadySent,
    };
  }
  return {
    facing: Math.atan2(toy.x - pip.x, toy.z - pip.z),
    shouldNudge: !nudgeAlreadySent,
    nudgeSent: true,
  };
}

type GardenObjectProps = {
  position: SafePosition;
  carried: boolean;
  nudged?: boolean;
  community?: GardenCommunity;
};

function useGardenObjectTransform(
  forwardedRef: React.ForwardedRef<THREE.Group>,
  position: SafePosition,
  carried: boolean,
  nudged: boolean,
  community?: GardenCommunity,
) {
  const object = useRef<THREE.Group>(null);
  useImperativeHandle(forwardedRef, () => object.current!, []);
  useFrame(({ camera }) => {
    if (!object.current) return;
    if (carried) {
      updateCarriedGardenObjectTransform(camera, object.current);
      return;
    }
    const point = community?.state.toy.point ?? { x: position[0], z: position[2] };
    object.current.position.set(...groundGardenPosition(point.x, point.z, position[1]));
    const roll = community?.state.toy.roll ?? 0;
    object.current.rotation.set(community ? roll : nudged ? .18 : 0, 0, community ? 0 : nudged ? -.34 : 0);
  }, PIP_INTERACTION_FRAME_PRIORITY);
  return object;
}

export const GardenSnack = forwardRef<THREE.Group, GardenObjectProps>(function GardenSnack(
  { position, carried },
  forwardedRef,
) {
  const object = useGardenObjectTransform(forwardedRef, position, carried, false);
  return (
    <group ref={object} position={position} userData={{ interactableId: 'food' }}>
      <mesh scale={[0.2, 0.27, 0.2]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#d4ad66" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 8]} />
        <meshStandardMaterial color="#6f5738" roughness={0.96} />
      </mesh>
      <mesh position={[0.07, 0.32, 0]} rotation={[0, 0, -0.55]} scale={[0.11, 0.045, 0.035]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#8e9d59" roughness={1} />
      </mesh>
    </group>
  );
});

export const GardenToy = forwardRef<THREE.Group, GardenObjectProps>(function GardenToy(
  { position, carried, nudged = false, community },
  forwardedRef,
) {
  const object = useGardenObjectTransform(forwardedRef, position, carried, nudged, community);
  return (
    <group ref={object} position={position} userData={{ interactableId: 'toy' }}>
      {[
        { x: -0.17, color: '#b39773', rotation: 0.08 },
        { x: 0, color: '#d1b184', rotation: -0.06 },
        { x: 0.17, color: '#9b8265', rotation: 0.1 },
      ].map(({ x, color, rotation }, index) => (
        <mesh key={index} position={[x, 0, 0]} rotation={[0, Math.PI / 2 + rotation, 0]} castShadow>
          <torusGeometry args={[0.2, 0.055, 14, 28]} />
          <meshStandardMaterial color={color} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
});
