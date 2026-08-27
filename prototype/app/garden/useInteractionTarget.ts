import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type InteractableId } from './interaction';

const CENTER_OF_VIEW = new THREE.Vector2(0, 0);

export type InteractionTargetResult = {
  target: InteractableId;
  distance: number;
};

export type InteractionTargetCandidate = {
  target: unknown;
  distance: number;
};

export type InteractionTargetRegistration = {
  target: InteractableId;
  ref: RefObject<THREE.Object3D | null>;
};

function isInteractableId(target: unknown): target is InteractableId {
  return target === 'pip' || target === 'food' || target === 'toy';
}

export function selectNearestInteractionTarget(
  candidates: readonly InteractionTargetCandidate[],
  maxDistance: number,
): InteractionTargetResult | null {
  let nearest: InteractionTargetResult | null = null;

  for (const candidate of candidates) {
    if (
      !isInteractableId(candidate.target) ||
      !Number.isFinite(candidate.distance) ||
      candidate.distance < 0 ||
      candidate.distance > maxDistance
    ) {
      continue;
    }
    if (nearest === null || candidate.distance < nearest.distance) {
      nearest = { target: candidate.target, distance: candidate.distance };
    }
  }

  return nearest;
}

function findRegisteredTarget(
  object: THREE.Object3D,
  roots: ReadonlyMap<THREE.Object3D, InteractableId>,
): InteractableId | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const registeredTarget = roots.get(current);
    if (registeredTarget) return registeredTarget;
    current = current.parent;
  }
  return null;
}

export function useInteractionTarget(
  registrations: readonly InteractionTargetRegistration[],
  maxDistance: number,
): InteractionTargetResult | null {
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const latestTarget = useRef<InteractionTargetResult | null>(null);
  const publishedTarget = useRef<InteractionTargetResult | null>(null);
  const lastDistancePublication = useRef(Number.NEGATIVE_INFINITY);
  const [currentTarget, setCurrentTarget] = useState<InteractionTargetResult | null>(null);

  useFrame(({ camera, clock }) => {
    const roots = new Map<THREE.Object3D, InteractableId>();
    for (const registration of registrations) {
      if (registration.ref.current) roots.set(registration.ref.current, registration.target);
    }

    raycaster.setFromCamera(CENTER_OF_VIEW, camera);
    const intersections = raycaster.intersectObjects([...roots.keys()], true);
    const candidates = intersections.map((intersection) => ({
      target: findRegisteredTarget(intersection.object, roots),
      distance: intersection.distance,
    }));
    const nextTarget = selectNearestInteractionTarget(candidates, maxDistance);
    const previousTarget = latestTarget.current;
    const targetChanged = previousTarget?.target !== nextTarget?.target;
    const distanceChanged = publishedTarget.current !== null && nextTarget !== null &&
      Math.abs(publishedTarget.current.distance - nextTarget.distance) >= 0.01;
    latestTarget.current = nextTarget;

    if (
      targetChanged ||
      (distanceChanged && clock.elapsedTime - lastDistancePublication.current >= 0.1)
    ) {
      lastDistancePublication.current = clock.elapsedTime;
      publishedTarget.current = nextTarget;
      setCurrentTarget(nextTarget);
    }
  });

  return currentTarget;
}
