import { describe, expect, it } from 'vitest';
import { selectNearestInteractionTarget } from './useInteractionTarget';

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
});
