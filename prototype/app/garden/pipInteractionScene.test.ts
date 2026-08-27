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
});
