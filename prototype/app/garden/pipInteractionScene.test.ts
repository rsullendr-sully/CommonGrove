import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { InteractionEvent } from './interaction';
import { PIP_DIRECT_GREET_REACTION_SECONDS, PIP_EATING_REACTION_SECONDS, PIP_PLAYING_REACTION_SECONDS, shouldSuspendPipMotion, yawTowardEmployee } from './pipInteraction';
import { createToyPlayApproach, resolveGardenObjectPlacement } from './GardenObjects';
import { createSafeGreetingApproach, GARDEN_OBSTACLES, isSafeGardenPoint, isSafeGardenSegment, type GardenPoint } from './navigation';
import { PIP_MOTION_CONFIG, stepSafeRouteLocomotion, type LocomotionState } from './locomotion';
import {
  consumePipResumeSequence,
  createPipInteractionSceneState,
  eligibleInteractionTarget,
  pipInteractionSceneReducer,
  scheduleDirectGreetingCompletion,
  schedulePipSceneEvent,
  scheduleObjectReactionCompletion,
  type PipInteractionSceneEvent,
} from './pipInteractionScene';

describe('Pip interaction scene lifecycle', () => {
  it('creates the complete authored opening state for refresh or restart', () => {
    const opening = createPipInteractionSceneState();

    expect(opening).toMatchObject({
      interaction: {
        mode: 'idle',
        focused: null,
        held: null,
        lastSafePosition: null,
      },
      phase: 'none',
      placedPosition: null,
      placementMessage: null,
      resumeSequence: 0,
      focusRepublishSequence: 0,
      objectPositions: {
        food: [4.8, 0.25, -4.5],
        toy: [-3.8, 0.2, 5.4],
      },
      reactionStarted: false,
      toyNudged: false,
    });
  });

  it('keeps reducer state and visual phase synchronized through greet, pet, and carry activation', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
    const greeting = pipInteractionSceneReducer(focused, { type: 'activate', event: { type: 'greet' } });
    const arrived = pipInteractionSceneReducer(greeting, { type: 'greet-arrived' });
    const readyToPet = pipInteractionSceneReducer(arrived, { type: 'greet-complete' });
    const petting = pipInteractionSceneReducer(readyToPet, { type: 'activate', event: { type: 'pet' } });
    const ready = pipInteractionSceneReducer(petting, { type: 'pet-complete' });
    const carrying = pipInteractionSceneReducer(ready, {
      type: 'activate',
      event: { type: 'pick-up', target: 'pip', safePosition: [8.4, 0, 1.5] },
    });

    expect(greeting).toMatchObject({ phase: 'greet-approach', interaction: { mode: 'reacting', reaction: 'greet' } });
    expect(arrived).toMatchObject({ phase: 'greet', greetingArrived: true });
    expect(readyToPet).toMatchObject({ phase: 'none', resumeSequence: 1, interaction: { mode: 'idle', pipFocusedAction: 'pet' } });
    expect(petting).toMatchObject({ phase: 'pet', interaction: { mode: 'reacting', focused: 'pip' } });
    expect(shouldSuspendPipMotion(petting.phase)).toBe(true);
    expect(ready).toMatchObject({ phase: 'none', resumeSequence: 2, interaction: { mode: 'idle', pipFocusedAction: 'pick-up' } });
    expect(shouldSuspendPipMotion(ready.phase)).toBe(false);
    expect(carrying).toMatchObject({ phase: 'carried', interaction: { mode: 'carrying', held: 'pip' } });
  });

  it('completes pet and placed phases once and requests exactly one fresh resume each', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
    const greeting = pipInteractionSceneReducer(focused, { type: 'activate', event: { type: 'greet' } });
    const arrived = pipInteractionSceneReducer(greeting, { type: 'greet-arrived' });
    const readyToPet = pipInteractionSceneReducer(arrived, { type: 'greet-complete' });
    const petting = pipInteractionSceneReducer(readyToPet, { type: 'activate', event: { type: 'pet' } });
    const petComplete = pipInteractionSceneReducer(petting, { type: 'pet-complete' });
    const latePetComplete = pipInteractionSceneReducer(petComplete, { type: 'pet-complete' });
    const resume = vi.fn();
    let consumed = consumePipResumeSequence(1, latePetComplete.resumeSequence, resume);
    consumed = consumePipResumeSequence(consumed, latePetComplete.resumeSequence, resume);

    const carrying = pipInteractionSceneReducer(petComplete, {
      type: 'activate',
      event: { type: 'pick-up', target: 'pip', safePosition: [8.4, 0, 1.5] },
    });
    const placed = pipInteractionSceneReducer(carrying, {
      type: 'place-pip',
      point: { x: 9, z: 2 },
      message: null,
    });
    const placedComplete = pipInteractionSceneReducer(placed, { type: 'placed-complete' });

    expect(latePetComplete).toBe(petComplete);
    expect(consumed).toBe(2);
    expect(resume).toHaveBeenCalledOnce();
    expect(placed).toMatchObject({ phase: 'placed', interaction: { mode: 'idle', held: null } });
    expect(placedComplete.resumeSequence).toBe(3);
  });

  it.each([
    ['maximum direct range with worst initial facing', { x: 8.4, z: 1.5 }, { x: 10.8, z: 1.5 }, false],
    ['scenery detour', { x: 12.703, z: -8.001 }, { x: 12.703, z: -10.399 }, true],
  ] as const)('waits for safe greet arrival before starting the exact response timer: %s', (_label, start, employee, expectsDetour) => {
    vi.useFakeTimers();
    try {
      expect(Math.hypot(employee.x - start.x, employee.z - start.z)).toBeLessThanOrEqual(2.400001);
      const approach = createSafeGreetingApproach(start, employee, GARDEN_OBSTACLES);
      if (expectsDetour) expect(approach.route.length).toBeGreaterThan(1);

      let state = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
      state = pipInteractionSceneReducer(state, { type: 'activate', event: { type: 'greet' } });
      const dispatch = (event: PipInteractionSceneEvent) => { state = pipInteractionSceneReducer(state, event); };
      const scheduleBeforeArrival = vi.fn(setTimeout);
      scheduleDirectGreetingCompletion(state, dispatch, scheduleBeforeArrival, clearTimeout);
      vi.advanceTimersByTime(10_000);
      expect(scheduleBeforeArrival).not.toHaveBeenCalled();
      expect(state.phase).toBe('greet-approach');
      expect(pipInteractionSceneReducer(state, { type: 'greet-complete' })).toBe(state);

      let progress = {
        motion: {
          position: new THREE.Vector3(start.x, 0, start.z),
          facing: yawTowardEmployee(start, employee) + Math.PI,
          speed: 0,
          distanceTravelled: 0,
          moving: false,
        } satisfies LocomotionState,
        waypointIndex: 0,
        complete: false,
      };
      let previous: GardenPoint = start;
      for (let frame = 0; frame < 1_200 && !progress.complete; frame += 1) {
        progress = stepSafeRouteLocomotion(progress, approach.route, 1 / 60, PIP_MOTION_CONFIG, GARDEN_OBSTACLES);
        const current = { x: progress.motion.position.x, z: progress.motion.position.z };
        expect(isSafeGardenPoint(current, GARDEN_OBSTACLES)).toBe(true);
        expect(isSafeGardenSegment(previous, current, GARDEN_OBSTACLES)).toBe(true);
        previous = current;
      }
      expect(progress.complete).toBe(true);
      expect(previous.x).toBeCloseTo(approach.target.x, 6);
      expect(previous.z).toBeCloseTo(approach.target.z, 6);
      const facing = yawTowardEmployee(previous, employee);
      expect(Math.sin(facing) * (employee.x - previous.x) + Math.cos(facing) * (employee.z - previous.z)).toBeGreaterThan(0);

      dispatch({ type: 'greet-arrived' });
      const afterDuplicateArrival = pipInteractionSceneReducer(state, { type: 'greet-arrived' });
      expect(afterDuplicateArrival).toBe(state);
      const cleanup = scheduleDirectGreetingCompletion(state, dispatch, setTimeout, clearTimeout);
      vi.advanceTimersByTime(PIP_DIRECT_GREET_REACTION_SECONDS * 1000 - 1);
      expect(state.phase).toBe('greet');
      vi.advanceTimersByTime(1);
      expect(state).toMatchObject({ phase: 'none', greetingArrived: false, interaction: { mode: 'idle', pipFocusedAction: 'pet' } });
      const completed = state;
      dispatch({ type: 'greet-complete' });
      expect(state).toBe(completed);
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans up the direct greeting timer so no completion can fire after unmount', () => {
    let callback: (() => void) | null = null;
    const dispatch = vi.fn();
    const cancel = vi.fn();
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
    const approaching = pipInteractionSceneReducer(focused, { type: 'activate', event: { type: 'greet' } });
    const arrived = pipInteractionSceneReducer(approaching, { type: 'greet-arrived' });
    const cleanup = scheduleDirectGreetingCompletion(
      arrived,
      dispatch,
      (scheduled, delay) => {
        callback = scheduled;
        expect(delay).toBe(PIP_DIRECT_GREET_REACTION_SECONDS * 1000);
        return 29;
      },
      cancel,
    );

    cleanup();
    (callback as (() => void) | null)?.();

    expect(cancel).toHaveBeenCalledWith(29);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cancels timers defensively so cleanup cannot dispatch a late completion', () => {
    let callback: (() => void) | null = null;
    let scheduledDelay = 0;
    const clear = vi.fn();
    const dispatch = vi.fn();
    const event: PipInteractionSceneEvent = { type: 'pet-complete' };
    const cleanup = schedulePipSceneEvent(
      dispatch,
      event,
      1800,
      (next, delay) => {
        callback = next;
        scheduledDelay = delay;
        return 17;
      },
      clear,
    );

    cleanup();
    (callback as (() => void) | null)?.();

    expect(clear).toHaveBeenCalledWith(17);
    expect(scheduledDelay).toBe(1800);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('gates both the prompt and activation target while a priority mission is active', () => {
    expect(eligibleInteractionTarget('pip', false)).toBe('pip');
    expect(eligibleInteractionTarget('pip', true)).toBeNull();
    expect(eligibleInteractionTarget('toy', true)).toBe('toy');
  });

  it('ignores activation events that the interaction reducer rejects', () => {
    const state = createPipInteractionSceneState();
    const illegalPickup: InteractionEvent = { type: 'pick-up', target: 'pip', safePosition: [1, 0, 2] };

    expect(pipInteractionSceneReducer(state, { type: 'activate', event: illegalPickup })).toBe(state);
  });

  it('runs food for exactly three seconds, resets it to authored position, and resumes once', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'food' });
    const held = pipInteractionSceneReducer(focused, {
      type: 'activate', event: { type: 'pick-up', target: 'food', safePosition: [4.8, 0.25, -4.5] },
    });
    const eating = pipInteractionSceneReducer(held, {
      type: 'offer-object', target: 'food', reactionPoint: { x: 8.7, z: 1.5 }, pipAvailable: true,
    });
    const complete = pipInteractionSceneReducer(eating, { type: 'object-reaction-complete' });
    const late = pipInteractionSceneReducer(complete, { type: 'object-reaction-complete' });

    expect(eating).toMatchObject({ phase: 'eating', reactionStarted: true, interaction: { mode: 'reacting', reaction: 'eating', offered: 'food' } });
    expect(eating.objectPositions.food).toEqual([8.7, 0.25, 1.5]);
    expect(complete.objectPositions.food).toEqual([4.8, 0.25, -4.5]);
    expect(complete.resumeSequence).toBe(1);
    expect(complete.focusRepublishSequence).toBe(1);
    expect(late).toBe(complete);
  });

  it('nudges the offered ring exactly once and returns it to its last safe point after four seconds', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'toy' });
    const held = pipInteractionSceneReducer(focused, {
      type: 'activate', event: { type: 'pick-up', target: 'toy', safePosition: [-3.8, 0.2, 5.4] },
    });
    const placed = pipInteractionSceneReducer(held, {
      type: 'place-object', target: 'toy', point: { x: 10, z: 8 }, message: null,
    });
    const refocused = pipInteractionSceneReducer(placed, { type: 'focus', target: 'toy' });
    const heldAgain = pipInteractionSceneReducer(refocused, {
      type: 'activate', event: { type: 'pick-up', target: 'toy', safePosition: [10, 0.2, 8] },
    });
    const playing = pipInteractionSceneReducer(heldAgain, {
      type: 'offer-object', target: 'toy', reactionPoint: { x: 9.5, z: 8 }, pipAvailable: true,
    });
    const nudged = pipInteractionSceneReducer(playing, { type: 'toy-nudged' });
    const lateNudge = pipInteractionSceneReducer(nudged, { type: 'toy-nudged' });
    const complete = pipInteractionSceneReducer(lateNudge, { type: 'object-reaction-complete' });

    expect(playing).toMatchObject({ phase: 'playing', toyNudged: false });
    expect(nudged.toyNudged).toBe(true);
    expect(lateNudge).toBe(nudged);
    expect(complete.objectPositions.toy).toEqual([10, 0.2, 8]);
    expect(complete.toyNudged).toBe(false);
    expect(complete.resumeSequence).toBe(1);
  });

  it('keeps an object held when offer is unavailable and recovers focus after placement without look-away', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'food' });
    const held = pipInteractionSceneReducer(focused, {
      type: 'activate', event: { type: 'pick-up', target: 'food', safePosition: [4.8, 0.25, -4.5] },
    });
    const unavailable = pipInteractionSceneReducer(held, {
      type: 'offer-object', target: 'food', reactionPoint: { x: 8, z: 2 }, pipAvailable: false,
    });
    const placed = pipInteractionSceneReducer(unavailable, {
      type: 'place-object', target: 'food', point: { x: 8, z: 2 }, message: null,
    });
    const republished = pipInteractionSceneReducer(placed, { type: 'focus', target: 'food' });

    expect(unavailable).toBe(held);
    expect(placed).toMatchObject({ interaction: { mode: 'idle', focused: null, held: null }, focusRepublishSequence: 1 });
    expect(republished.interaction.focused).toBe('food');
  });

  it('keeps authored display positions while initializing canonical safe recovery points', () => {
    const state = createPipInteractionSceneState();

    expect(state.objectPositions).toEqual({
      food: [4.8, 0.25, -4.5],
      toy: [-3.8, 0.2, 5.4],
    });
    for (const id of ['food', 'toy'] as const) {
      const safe = state.objectLastSafePositions[id];
      expect(isSafeGardenPoint({ x: safe[0], z: safe[2] }, GARDEN_OBSTACLES)).toBe(true);
      expect(() => resolveGardenObjectPlacement(
        id,
        { x: 0, z: 0 },
        { x: safe[0], z: safe[2] },
        GARDEN_OBSTACLES,
        () => ({ x: 0, z: 0 }),
      )).not.toThrow();
    }
  });

  it('does not start the four-second play timer until routed arrival produces one nudge', () => {
    vi.useFakeTimers();
    try {
      const initial = createPipInteractionSceneState();
      const focused = pipInteractionSceneReducer(initial, { type: 'focus', target: 'toy' });
      const held = pipInteractionSceneReducer(focused, {
        type: 'activate', event: { type: 'pick-up', target: 'toy', safePosition: [10, 0.2, 8] },
      });
      let state = pipInteractionSceneReducer(held, {
        type: 'offer-object', target: 'toy', reactionPoint: { x: 10, z: 8.6 }, pipAvailable: true,
      });
      const dispatch = (event: PipInteractionSceneEvent) => {
        state = pipInteractionSceneReducer(state, event);
      };

      expect(pipInteractionSceneReducer(state, { type: 'object-reaction-complete' })).toBe(state);
      const beforeArrivalCleanup = scheduleObjectReactionCompletion(
        state,
        dispatch,
        setTimeout,
        clearTimeout,
      );
      vi.advanceTimersByTime(10_000);
      expect(state.phase).toBe('playing');
      expect(state.toyNudged).toBe(false);

      const start = { x: 8.4, z: 1.5 };
      const approach = createToyPlayApproach(start, { x: 10, z: 8.6 }, GARDEN_OBSTACLES);
      let progress = {
        motion: {
          position: new THREE.Vector3(start.x, 0, start.z),
          facing: 0,
          speed: 0,
          distanceTravelled: 0,
          moving: false,
        } satisfies LocomotionState,
        waypointIndex: 0,
        complete: false,
      };
      let nudgeDispatches = 0;
      for (let frame = 0; frame < 1_200 && !progress.complete; frame += 1) {
        progress = stepSafeRouteLocomotion(progress, approach.route, 1 / 60, PIP_MOTION_CONFIG, GARDEN_OBSTACLES);
        if (progress.complete) {
          dispatch({ type: 'toy-nudged' });
          nudgeDispatches += 1;
        }
      }
      expect(progress.complete).toBe(true);
      expect(nudgeDispatches).toBe(1);
      expect(state.toyNudged).toBe(true);

      const afterNudgeCleanup = scheduleObjectReactionCompletion(
        state,
        dispatch,
        setTimeout,
        clearTimeout,
      );
      vi.advanceTimersByTime(PIP_PLAYING_REACTION_SECONDS * 1000 - 1);
      expect(state.phase).toBe('playing');
      vi.advanceTimersByTime(1);
      expect(state.phase).toBe('none');
      expect(state.resumeSequence).toBe(1);

      beforeArrivalCleanup();
      afterNudgeCleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('completes eating at the 3000ms boundary and cleanup prevents a late completion', () => {
    vi.useFakeTimers();
    try {
      const createEating = () => {
        const initial = createPipInteractionSceneState();
        const focused = pipInteractionSceneReducer(initial, { type: 'focus', target: 'food' });
        const held = pipInteractionSceneReducer(focused, {
          type: 'activate', event: { type: 'pick-up', target: 'food', safePosition: [8, 0.25, 2] },
        });
        return pipInteractionSceneReducer(held, {
          type: 'offer-object', target: 'food', reactionPoint: { x: 8, z: 2 }, pipAvailable: true,
        });
      };
      let state = createEating();
      scheduleObjectReactionCompletion(
        state,
        (event) => { state = pipInteractionSceneReducer(state, event); },
        setTimeout,
        clearTimeout,
      );

      vi.advanceTimersByTime(PIP_EATING_REACTION_SECONDS * 1000 - 1);
      expect(state.phase).toBe('eating');
      vi.advanceTimersByTime(1);
      expect(state.phase).toBe('none');

      state = createEating();
      const cleanup = scheduleObjectReactionCompletion(
        state,
        (event) => { state = pipInteractionSceneReducer(state, event); },
        setTimeout,
        clearTimeout,
      );
      cleanup();
      vi.advanceTimersByTime(PIP_EATING_REACTION_SECONDS * 1000);
      expect(state.phase).toBe('eating');
    } finally {
      vi.useRealTimers();
    }
  });
});
