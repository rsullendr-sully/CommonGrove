'use client';

import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { SafePosition } from './interaction';
import { PIP_INTERACTION_FRAME_PRIORITY, projectPipPlacement } from './pipInteraction';
import {
  isSafeGardenPoint,
  nearestSafePoint,
  type GardenObstacle,
  type GardenPoint,
} from './navigation';

export const GARDEN_SNACK_AUTHORED_POSITION = [4.8, 0.25, -4.5] as const;
export const GARDEN_TOY_AUTHORED_POSITION = [-3.8, 0.2, 5.4] as const;
export const GARDEN_OBJECT_CARRY_ANCHOR = [0.42, -0.34, -1.05] as const;

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

type GardenObjectProps = {
  position: SafePosition;
  carried: boolean;
  nudged?: boolean;
};

function useGardenObjectTransform(
  forwardedRef: React.ForwardedRef<THREE.Group>,
  position: SafePosition,
  carried: boolean,
  nudged: boolean,
) {
  const object = useRef<THREE.Group>(null);
  useImperativeHandle(forwardedRef, () => object.current!, []);
  useFrame(({ camera }) => {
    if (!object.current) return;
    if (carried) {
      updateCarriedGardenObjectTransform(camera, object.current);
      return;
    }
    object.current.position.set(position[0], position[1], position[2]);
    object.current.rotation.set(nudged ? 0.18 : 0, 0, nudged ? -0.34 : 0);
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
        <meshStandardMaterial color="#d99a37" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 8]} />
        <meshStandardMaterial color="#6f5738" roughness={0.96} />
      </mesh>
      <mesh position={[0.07, 0.32, 0]} rotation={[0, 0, -0.55]} scale={[0.11, 0.045, 0.035]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#618653" roughness={1} />
      </mesh>
    </group>
  );
});

export const GardenToy = forwardRef<THREE.Group, GardenObjectProps>(function GardenToy(
  { position, carried, nudged = false },
  forwardedRef,
) {
  const object = useGardenObjectTransform(forwardedRef, position, carried, nudged);
  return (
    <group ref={object} position={position} userData={{ interactableId: 'toy' }}>
      {[
        { x: -0.17, color: '#9b683f', rotation: 0.08 },
        { x: 0, color: '#c58b52', rotation: -0.06 },
        { x: 0.17, color: '#7e593d', rotation: 0.1 },
      ].map(({ x, color, rotation }, index) => (
        <mesh key={index} position={[x, 0, 0]} rotation={[0, Math.PI / 2 + rotation, 0]} castShadow>
          <torusGeometry args={[0.2, 0.055, 10, 20]} />
          <meshStandardMaterial color={color} roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
});
