import { describe, expect, it } from 'vitest';
import {
  createInteractionAimSamples,
  resolveRetainedInteractionTarget,
  selectNearestInteractionTarget,
} from './useInteractionTarget';

describe('interaction target selection', () => {
  it('selects the nearest registered interactable hit', () => {
    expect(
      selectNearestInteractionTarget(
        [
          { target: 'toy', distance: 1.8 },
          { target: 'pip', distance: 1.1 },
          { target: 'food', distance: 1.5 },
        ],
        2.4,
      ),
    ).toEqual({ target: 'pip', distance: 1.1 });
  });

  it('includes a target at the exact interaction boundary', () => {
    expect(selectNearestInteractionTarget([{ target: 'pip', distance: 2.4 }], 2.4)).toEqual({
      target: 'pip',
      distance: 2.4,
    });
  });

  it('rejects targets beyond the interaction boundary', () => {
    expect(selectNearestInteractionTarget([{ target: 'pip', distance: 2.400_001 }], 2.4)).toBeNull();
  });

  it('filters unregistered identifiers and invalid distances', () => {
    expect(
      selectNearestInteractionTarget(
        [
          { target: 'seed', distance: 0.2 },
          { target: 'pip', distance: -1 },
          { target: 'toy', distance: Number.NaN },
          { target: null, distance: 0.1 },
        ],
        2.4,
      ),
    ).toBeNull();
  });

  it('casts a compact center-first aim pattern around the reticle', () => {
    expect(createInteractionAimSamples()).toEqual([
      { x: 0, y: 0, aimOffset: 0 },
      { x: -0.075, y: 0, aimOffset: 0.075 },
      { x: 0.075, y: 0, aimOffset: 0.075 },
      { x: 0, y: -0.075, aimOffset: 0.075 },
      { x: 0, y: 0.075, aimOffset: 0.075 },
      { x: -0.06, y: -0.06, aimOffset: 0.08485281374238571 },
      { x: 0.06, y: -0.06, aimOffset: 0.08485281374238571 },
      { x: -0.06, y: 0.06, aimOffset: 0.08485281374238571 },
      { x: 0.06, y: 0.06, aimOffset: 0.08485281374238571 },
    ]);
  });

  it('prefers the most centered eligible hit before comparing distance', () => {
    expect(selectNearestInteractionTarget([
      { target: 'pip', distance: 1.2, aimOffset: 0.075 },
      { target: 'toy', distance: 2.1, aimOffset: 0 },
    ], 2.4)).toEqual({ target: 'toy', distance: 2.1 });
  });

  it('supports a longer conversational reach for Pip without extending object reach', () => {
    expect(selectNearestInteractionTarget([
      { target: 'pip', distance: 3.1, maxDistance: 3.2 },
      { target: 'toy', distance: 2.5 },
    ], 2.4)).toEqual({ target: 'pip', distance: 3.1 });
  });

  it('retains a briefly lost target but clears it after the grace period', () => {
    const previous = { target: 'pip' as const, distance: 2.7 };

    expect(resolveRetainedInteractionTarget(previous, null, 8.5, 8, 0.65)).toEqual({
      target: previous,
      lastSeenAt: 8,
    });
    expect(resolveRetainedInteractionTarget(previous, null, 8.651, 8, 0.65)).toEqual({
      target: null,
      lastSeenAt: 8,
    });
  });

  it('switches immediately to a newly acquired target and refreshes its seen time', () => {
    const next = { target: 'food' as const, distance: 1.4 };

    expect(resolveRetainedInteractionTarget(
      { target: 'pip', distance: 2.2 },
      next,
      12,
      11.8,
      0.65,
    )).toEqual({ target: next, lastSeenAt: 12 });
  });
});
