import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { isResidentId, type ResidentTarget } from './residents';

const CENTER_OF_VIEW = new THREE.Vector2(0, 0);

export type InteractionTargetResult = {
  target: ResidentTarget;
  distance: number;
};

export type InteractionTargetCandidate = {
  target: unknown;
  distance: number;
  aimOffset?: number;
  maxDistance?: number;
};

export type InteractionTargetRegistration = {
  target: ResidentTarget;
  ref: RefObject<THREE.Object3D | null>;
  maxDistance?: number;
};

export type InteractionAimSample = {
  x: number;
  y: number;
  aimOffset: number;
};

export const INTERACTION_TARGET_LOSS_GRACE_SECONDS = 0.65;

export function createInteractionAimSamples(): readonly InteractionAimSample[] {
  return [
    { x: 0, y: 0, aimOffset: 0 },
    { x: -0.075, y: 0, aimOffset: 0.075 },
    { x: 0.075, y: 0, aimOffset: 0.075 },
    { x: 0, y: -0.075, aimOffset: 0.075 },
    { x: 0, y: 0.075, aimOffset: 0.075 },
    { x: -0.06, y: -0.06, aimOffset: Math.hypot(0.06, 0.06) },
    { x: 0.06, y: -0.06, aimOffset: Math.hypot(0.06, 0.06) },
    { x: -0.06, y: 0.06, aimOffset: Math.hypot(0.06, 0.06) },
    { x: 0.06, y: 0.06, aimOffset: Math.hypot(0.06, 0.06) },
  ];
}

function isResidentTarget(target: unknown): target is ResidentTarget {
  return isResidentId(target) || target === 'food' || target === 'toy';
}

export function selectNearestInteractionTarget(
  candidates: readonly InteractionTargetCandidate[],
  maxDistance: number,
): InteractionTargetResult | null {
  let nearest: InteractionTargetResult | null = null;
  let nearestAimOffset = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const candidateMaxDistance = candidate.maxDistance ?? maxDistance;
    const candidateAimOffset = candidate.aimOffset ?? 0;
    if (
      !isResidentTarget(candidate.target) ||
      !Number.isFinite(candidate.distance) ||
      !Number.isFinite(candidateMaxDistance) ||
      !Number.isFinite(candidateAimOffset) ||
      candidate.distance < 0 ||
      candidate.distance > candidateMaxDistance ||
      candidateAimOffset < 0
    ) {
      continue;
    }
    if (
      nearest === null ||
      candidateAimOffset < nearestAimOffset ||
      (candidateAimOffset === nearestAimOffset && candidate.distance < nearest.distance)
    ) {
      nearest = { target: candidate.target, distance: candidate.distance };
      nearestAimOffset = candidateAimOffset;
    }
  }

  return nearest;
}

export function resolveRetainedInteractionTarget(
  previous: InteractionTargetResult | null,
  next: InteractionTargetResult | null,
  now: number,
  lastSeenAt: number,
  graceSeconds = INTERACTION_TARGET_LOSS_GRACE_SECONDS,
): { target: InteractionTargetResult | null; lastSeenAt: number } {
  if (next) return { target: next, lastSeenAt: now };
  if (previous && now - lastSeenAt <= graceSeconds) {
    return { target: previous, lastSeenAt };
  }
  return { target: null, lastSeenAt };
}

function findRegisteredTarget(
  object: THREE.Object3D,
  roots: ReadonlyMap<THREE.Object3D, InteractionTargetRegistration>,
): InteractionTargetRegistration | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const registration = roots.get(current);
    if (registration) return registration;
    current = current.parent;
  }
  return null;
}

export function useInteractionTarget(
  registrations: readonly InteractionTargetRegistration[],
  maxDistance: number,
): InteractionTargetResult | null {
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const aimSamples = useMemo(() => createInteractionAimSamples(), []);
  const latestTarget = useRef<InteractionTargetResult | null>(null);
  const publishedTarget = useRef<InteractionTargetResult | null>(null);
  const lastDistancePublication = useRef(Number.NEGATIVE_INFINITY);
  const lastTargetSeenAt = useRef(Number.NEGATIVE_INFINITY);
  const [currentTarget, setCurrentTarget] = useState<InteractionTargetResult | null>(null);

  useFrame(({ camera, clock }) => {
    const roots = new Map<THREE.Object3D, InteractionTargetRegistration>();
    for (const registration of registrations) {
      if (registration.ref.current) roots.set(registration.ref.current, registration);
    }

    const candidates: InteractionTargetCandidate[] = [];
    for (const sample of aimSamples) {
      raycaster.setFromCamera(
        sample.aimOffset === 0 ? CENTER_OF_VIEW : new THREE.Vector2(sample.x, sample.y),
        camera,
      );
      const intersections = raycaster.intersectObjects([...roots.keys()], true);
      for (const intersection of intersections) {
        const registration = findRegisteredTarget(intersection.object, roots);
        candidates.push({
          target: registration?.target ?? null,
          distance: intersection.distance,
          aimOffset: sample.aimOffset,
          maxDistance: registration?.maxDistance,
        });
      }
    }
    const rawTarget = selectNearestInteractionTarget(candidates, maxDistance);
    const retained = resolveRetainedInteractionTarget(
      latestTarget.current,
      rawTarget,
      clock.elapsedTime,
      lastTargetSeenAt.current,
    );
    lastTargetSeenAt.current = retained.lastSeenAt;
    const nextTarget = retained.target;
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
