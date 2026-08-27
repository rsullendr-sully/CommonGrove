import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPipBehaviorState, resumePipBehaviorAfterInteraction } from './usePipBehavior';
import { GARDEN_OBSTACLES, isSafeGardenPoint, type GardenInterest } from './navigation';
import {
  PIP_CARRY_ANCHOR,
  CAMERA_CONTROLS_FRAME_PRIORITY,
  PIP_INTERACTION_FRAME_PRIORITY,
  PIP_PET_MESSAGE,
  PIP_PET_REACTION_SECONDS,
  PIP_DIRECT_GREET_MESSAGE,
  PIP_DIRECT_GREET_REACTION_SECONDS,
  PIP_EATING_REACTION_SECONDS,
  PIP_PLAYING_REACTION_SECONDS,
  PIP_PLACEMENT_FALLBACK_MESSAGE,
  canDirectlyInteractWithPip,
  employeeWalkSpeedWhileHolding,
  handleHeldPipEscape,
  handleHeldInteractionEscape,
  hasPetReactionCompleted,
  interactionPoseKind,
  projectPipPlacement,
  resolvePipPlacement,
  shouldSuspendPipMotion,
  updateCarriedPipTransform,
  updatePlacedPipTransform,
  yawTowardEmployee,
} from './pipInteraction';

const interests: readonly GardenInterest[] = [
  { id: 'flowers', position: { x: 8.8, z: -5.9 } },
  { id: 'wander-east', position: { x: 8.4, z: 1.5 } },
];

describe('direct Pip interactions', () => {
  it('keeps the approved direct greeting readable for exactly 1.4 seconds', () => {
    expect(PIP_DIRECT_GREET_MESSAGE).toBe('Pip steps closer, listening ear lifted in hello.');
    expect(PIP_DIRECT_GREET_REACTION_SECONDS).toBe(1.4);
  });

  it('keeps the approved pet reaction visible for exactly 1.8 seconds', () => {
    expect(PIP_PET_MESSAGE).toBe('Pip leans into your hand, listening ear tipped toward you.');
    expect(PIP_PET_REACTION_SECONDS).toBe(1.8);
    expect(hasPetReactionCompleted(10, 11.799)).toBe(false);
    expect(hasPetReactionCompleted(10, 11.8)).toBe(true);
  });

  it('suspends ordinary locomotion and activity selection throughout direct greeting, petting, and carrying', () => {
    expect(shouldSuspendPipMotion('greet')).toBe(true);
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

  it('follows camera translation and rotation in the same frame at the exact carry anchor', () => {
    const camera = new THREE.PerspectiveCamera();
    const pip = new THREE.Group();
    const frames = [
      { position: [3, 1.7, 5] as const, rotation: [0, Math.PI / 2, 0] as const },
      { position: [-4, 1.7, 8] as const, rotation: [-0.2, -Math.PI / 3, 0] as const },
    ];

    for (const frame of frames) {
      const callbacks = [
        {
          priority: PIP_INTERACTION_FRAME_PRIORITY,
          run: () => updateCarriedPipTransform(camera, pip),
        },
        {
          priority: CAMERA_CONTROLS_FRAME_PRIORITY,
          run: () => {
            camera.position.set(...frame.position);
            camera.rotation.set(...frame.rotation, 'YXZ');
          },
        },
      ].sort((left, right) => left.priority - right.priority);
      callbacks.forEach(({ run }) => run());

      const expected = new THREE.Vector3(...PIP_CARRY_ANCHOR)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      expect(pip.position.x).toBeCloseTo(expected.x, 12);
      expect(pip.position.y).toBeCloseTo(expected.y, 12);
      expect(pip.position.z).toBeCloseTo(expected.z, 12);
    }

    expect(CAMERA_CONTROLS_FRAME_PRIORITY).toBeLessThan(PIP_INTERACTION_FRAME_PRIORITY);
    expect(PIP_CARRY_ANCHOR).toEqual([0.48, -0.42, -1.35]);
  });

  it.each([
    [{ x: 0, z: 4 }, 0],
    [{ x: 4, z: 0 }, Math.PI / 2],
    [{ x: 0, z: -4 }, Math.PI],
    [{ x: -4, z: 0 }, -Math.PI / 2],
  ] as const)('turns Pip toward an employee at %o during direct greeting and pet reactions', (employee, expectedYaw) => {
    const yaw = yawTowardEmployee({ x: 0, z: 0 }, employee);
    const facing = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const distance = Math.hypot(employee.x, employee.z);

    expect(yaw).toBeCloseTo(expectedYaw, 12);
    expect(facing.x * (employee.x / distance) + facing.z * (employee.z / distance)).toBeCloseTo(1, 12);
  });

  it('projects placement exactly 1.4 meters along corrected planar camera forward', () => {
    const projectedLeft = projectPipPlacement({ x: 2, y: 1.7, z: 3 }, { x: -1, y: -0.2, z: 0 });
    expect(projectedLeft.x).toBeCloseTo(0.6, 12);
    expect(projectedLeft.z).toBe(3);
    expect(projectPipPlacement({ x: 2, y: 1.7, z: 3 }, { x: 0, y: -1, z: 0 })).toEqual({ x: 2, z: 1.6 });
  });

  it('makes direct greeting, petting, and pickup unavailable during a priority mission or autonomous greet', () => {
    expect(canDirectlyInteractWithPip('ordinary')).toBe(true);
    expect(canDirectlyInteractWithPip('ordinary', 'greet')).toBe(false);
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

  it.each(['pip', 'food', 'toy'] as const)('safely places held %s on Escape before unrelated handlers', (held) => {
    const order: string[] = [];
    const event = {
      key: 'Escape',
      preventDefault: () => order.push('prevent'),
      stopImmediatePropagation: () => order.push('stop'),
    };

    expect(handleHeldInteractionEscape(event, held, () => order.push('place'))).toBe(true);
    expect(order).toEqual(['prevent', 'stop', 'place']);
  });

  it('uses exact temporary food and toy reaction durations without creating upkeep state', () => {
    expect(PIP_EATING_REACTION_SECONDS).toBe(3);
    expect(PIP_PLAYING_REACTION_SECONDS).toBe(4);
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

  it('moves the existing Pip object through carry and placement without duplication or loss', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const pip = new THREE.Group();
    const originalId = pip.uuid;
    scene.add(pip);
    camera.position.set(1, 1.7, 6);
    camera.rotation.set(0, -0.4, 0, 'YXZ');

    updateCarriedPipTransform(camera, pip);
    updatePlacedPipTransform(pip, { x: 8.4, z: 1.5 }, GARDEN_OBSTACLES);

    let occurrences = 0;
    scene.traverse((object) => {
      if (object.uuid === originalId) occurrences += 1;
    });
    expect(pip.uuid).toBe(originalId);
    expect(pip.parent).toBe(scene);
    expect(occurrences).toBe(1);
    expect(pip.position.toArray()).toEqual([8.4, 0, 1.5]);
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
      employeePosition: null,
      pipPosition: { x: 8.4, z: 1.5 },
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
      employeePosition: { x: 8.4, z: 3.5 },
      pipPosition: { x: 8.4, z: 1.5 },
      locomotionComplete: false,
      rewardMission: null,
      choiceMission: null,
      randomValue: 0,
    });

    expect(resumed).toBe(priority);
  });
});
