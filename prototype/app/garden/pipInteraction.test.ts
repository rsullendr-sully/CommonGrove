import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPipBehaviorState, resumePipBehaviorAfterInteraction } from './usePipBehavior';
import { GARDEN_OBSTACLES, isSafeGardenPoint, type GardenInterest } from './navigation';
import {
  PIP_CARRY_ANCHOR,
  PIP_PET_MESSAGE,
  PIP_PET_REACTION_SECONDS,
  PIP_PLACEMENT_FALLBACK_MESSAGE,
  cameraRelativeCarryPosition,
  canDirectlyInteractWithPip,
  employeeWalkSpeedWhileHolding,
  handleHeldPipEscape,
  hasPetReactionCompleted,
  interactionPoseKind,
  projectPipPlacement,
  resolvePipPlacement,
  shouldSuspendPipMotion,
} from './pipInteraction';

const interests: readonly GardenInterest[] = [
  { id: 'flowers', position: { x: 8.8, z: -5.9 } },
  { id: 'wander-east', position: { x: 8.4, z: 1.5 } },
];

describe('direct Pip interactions', () => {
  it('keeps the approved pet reaction visible for exactly 1.8 seconds', () => {
    expect(PIP_PET_MESSAGE).toBe('Pip leans into your hand, listening ear tipped toward you.');
    expect(PIP_PET_REACTION_SECONDS).toBe(1.8);
    expect(hasPetReactionCompleted(10, 11.799)).toBe(false);
    expect(hasPetReactionCompleted(10, 11.8)).toBe(true);
  });

  it('suspends locomotion and activity selection for petting and carrying', () => {
    expect(shouldSuspendPipMotion('pet')).toBe(true);
    expect(shouldSuspendPipMotion('carried')).toBe(true);
    expect(shouldSuspendPipMotion('placed')).toBe(true);
    expect(shouldSuspendPipMotion('none')).toBe(false);
  });

  it('reduces employee walking speed only while Pip is held', () => {
    expect(employeeWalkSpeedWhileHolding('pip')).toBe(3);
    expect(employeeWalkSpeedWhileHolding('food')).toBe(4);
    expect(employeeWalkSpeedWhileHolding(null)).toBe(4);
  });

  it('presents Pip at the exact camera-relative carry anchor', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 1.7, 5);
    camera.rotation.set(0, Math.PI / 2, 0, 'YXZ');
    camera.updateMatrixWorld(true);

    const carried = cameraRelativeCarryPosition(camera);
    const expected = camera.localToWorld(new THREE.Vector3(...PIP_CARRY_ANCHOR));

    expect(carried.toArray()).toEqual(expected.toArray());
    expect(PIP_CARRY_ANCHOR).toEqual([0.48, -0.42, -1.35]);
  });

  it('projects placement exactly 1.4 meters along corrected planar camera forward', () => {
    const projectedLeft = projectPipPlacement({ x: 2, y: 1.7, z: 3 }, { x: -1, y: -0.2, z: 0 });
    expect(projectedLeft.x).toBeCloseTo(0.6, 12);
    expect(projectedLeft.z).toBe(3);
    expect(projectPipPlacement({ x: 2, y: 1.7, z: 3 }, { x: 0, y: -1, z: 0 })).toEqual({ x: 2, z: 1.6 });
  });

  it('makes direct petting and pickup unavailable during a priority mission', () => {
    expect(canDirectlyInteractWithPip('ordinary')).toBe(true);
    expect(canDirectlyInteractWithPip('priority')).toBe(false);
  });

  it('places held Pip on Escape before unrelated dismissal handlers can run', () => {
    const order: string[] = [];
    const event = {
      key: 'Escape',
      preventDefault: () => order.push('prevent'),
      stopImmediatePropagation: () => order.push('stop'),
    };

    expect(handleHeldPipEscape(event, 'pip', () => order.push('place'))).toBe(true);
    expect(order).toEqual(['prevent', 'stop', 'place']);
    expect(handleHeldPipEscape(event, null, () => order.push('unexpected'))).toBe(false);
  });

  it.each([
    ['open ground', { x: 12, z: 10 }],
    ['pond', { x: 0, z: 0 }],
    ['boundary', { x: 24, z: 3 }],
    ['tree obstacle', { x: 11.8, z: -9.2 }],
  ] as const)('resolves %s placement to canonical safe ground', (_label, requested) => {
    const result = resolvePipPlacement(requested, { x: 8.4, z: 1.5 }, GARDEN_OBSTACLES);

    expect(result.usedFallback).toBe(false);
    expect(isSafeGardenPoint(result.point, GARDEN_OBSTACLES)).toBe(true);
  });

  it('restores Pip’s recorded last-safe point and explains recovery if placement cannot validate', () => {
    const invalidResolver = vi.fn(() => ({ x: 0, z: 0 }));
    const result = resolvePipPlacement(
      { x: 12, z: 10 },
      { x: 8.4, z: 1.5 },
      GARDEN_OBSTACLES,
      invalidResolver,
    );

    expect(result).toEqual({
      point: { x: 8.4, z: 1.5 },
      usedFallback: true,
      message: PIP_PLACEMENT_FALLBACK_MESSAGE,
    });
    expect(PIP_PLACEMENT_FALLBACK_MESSAGE).toBe("There wasn't a safe spot there, so Pip returned to the path.");
  });

  it('maps interaction phases to readable pet, carried, and placed poses', () => {
    expect(interactionPoseKind('pet')).toBe('pet');
    expect(interactionPoseKind('carried')).toBe('carried');
    expect(interactionPoseKind('placed')).toBe('placed');
    expect(interactionPoseKind('none')).toBeNull();
  });

  it('resumes an interrupted ordinary activity with a fresh selection', () => {
    const interrupted = createPipBehaviorState({
      activity: { kind: 'wander', weight: 1, durationSeconds: 4, cooldownSeconds: 2 },
      target: { x: 8.4, z: 1.5 },
      phase: 'traveling',
      poseKind: 'walk',
      recentKind: 'look-around',
    });
    const resumed = resumePipBehaviorAfterInteraction(interrupted, {
      now: 4,
      interests,
      employeeDistance: 10,
      locomotionComplete: false,
      rewardMission: null,
      choiceMission: null,
      randomValue: 0,
    });

    expect(resumed.mode).toBe('ordinary');
    expect(resumed.activity?.kind).not.toBe('wander');
    expect(resumed.recentKind).toBe('wander');
  });

  it('does not suspend or replace an active priority mission', () => {
    const priority = createPipBehaviorState({
      mode: 'priority',
      activity: { kind: 'inspect-destination', weight: 1, durationSeconds: 6, cooldownSeconds: 4 },
      target: { x: 8.2, z: 6.6 },
      phase: 'traveling',
      poseKind: 'walk',
    });
    const resumed = resumePipBehaviorAfterInteraction(priority, {
      now: 4,
      interests,
      employeeDistance: 2,
      locomotionComplete: false,
      rewardMission: null,
      choiceMission: null,
      randomValue: 0,
    });

    expect(resumed).toBe(priority);
  });
});
