import { describe, expect, it, vi } from 'vitest';
import type { InteractionEvent } from './interaction';
import { shouldSuspendPipMotion } from './pipInteraction';
import {
  consumePipResumeSequence,
  createPipInteractionSceneState,
  eligibleInteractionTarget,
  pipInteractionSceneReducer,
  schedulePipSceneEvent,
  type PipInteractionSceneEvent,
} from './pipInteractionScene';

describe('Pip interaction scene lifecycle', () => {
  it('keeps reducer state and visual phase synchronized through pet and carry activation', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
    const petting = pipInteractionSceneReducer(focused, { type: 'activate', event: { type: 'pet' } });
    const ready = pipInteractionSceneReducer(petting, { type: 'pet-complete' });
    const carrying = pipInteractionSceneReducer(ready, {
      type: 'activate',
      event: { type: 'pick-up', target: 'pip', safePosition: [8.4, 0, 1.5] },
    });

    expect(petting).toMatchObject({ phase: 'pet', interaction: { mode: 'reacting', focused: 'pip' } });
    expect(shouldSuspendPipMotion(petting.phase)).toBe(true);
    expect(ready).toMatchObject({ phase: 'none', resumeSequence: 1, interaction: { mode: 'idle', pipFocusedAction: 'pick-up' } });
    expect(shouldSuspendPipMotion(ready.phase)).toBe(false);
    expect(carrying).toMatchObject({ phase: 'carried', interaction: { mode: 'carrying', held: 'pip' } });
  });

  it('completes pet and placed phases once and requests exactly one fresh resume each', () => {
    const focused = pipInteractionSceneReducer(createPipInteractionSceneState(), { type: 'focus', target: 'pip' });
    const petting = pipInteractionSceneReducer(focused, { type: 'activate', event: { type: 'pet' } });
    const petComplete = pipInteractionSceneReducer(petting, { type: 'pet-complete' });
    const latePetComplete = pipInteractionSceneReducer(petComplete, { type: 'pet-complete' });
    const resume = vi.fn();
    let consumed = consumePipResumeSequence(0, latePetComplete.resumeSequence, resume);
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
    expect(consumed).toBe(1);
    expect(resume).toHaveBeenCalledOnce();
    expect(placed).toMatchObject({ phase: 'placed', interaction: { mode: 'idle', held: null } });
    expect(placedComplete.resumeSequence).toBe(2);
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
});
