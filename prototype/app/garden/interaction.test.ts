import { describe, expect, it } from 'vitest';
import { actionLabelFor, interactionReducer, type InteractionState } from './interaction';

const idle: InteractionState = {
  mode: 'idle',
  focused: null,
  held: null,
  lastSafePosition: null,
};

describe('first-person interaction state', () => {
  it('offers petting when Pip is focused', () => {
    const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });

    expect(actionLabelFor(focused)).toBe('Pet Pip');
  });

  it('picks up and safely places Pip', () => {
    const held = interactionReducer(
      { ...idle, focused: 'pip' },
      { type: 'pick-up', target: 'pip', safePosition: [1, 0, 2] },
    );

    expect(held.mode).toBe('carrying');

    const placed = interactionReducer(held, { type: 'place', position: [2, 0, 3] });

    expect(placed).toEqual({
      mode: 'idle',
      focused: null,
      held: null,
      lastSafePosition: [2, 0, 3],
    });
  });

  it('restores the last safe position when carrying is canceled', () => {
    const held: InteractionState = {
      mode: 'carrying',
      focused: null,
      held: 'toy',
      lastSafePosition: [4, 0, 5],
    };

    expect(interactionReducer(held, { type: 'cancel' }).lastSafePosition).toEqual([4, 0, 5]);
  });

  it('rejects picking up another target while already carrying', () => {
    const held: InteractionState = {
      mode: 'carrying',
      focused: null,
      held: 'food',
      lastSafePosition: [1, 0, 2],
    };

    expect(
      interactionReducer(held, { type: 'pick-up', target: 'toy', safePosition: [3, 0, 4] }),
    ).toEqual(held);
  });

  it('clears focus without changing an otherwise idle state', () => {
    const focused = interactionReducer(idle, { type: 'focus', target: 'toy' });

    expect(interactionReducer(focused, { type: 'focus', target: null })).toEqual(idle);
  });

  it('does not cancel an interaction outside carrying mode', () => {
    const reacting: InteractionState = {
      mode: 'reacting',
      focused: 'pip',
      held: null,
      lastSafePosition: [1, 0, 2],
    };

    expect(interactionReducer(reacting, { type: 'cancel' })).toEqual(reacting);
  });

  it.each([
    ['pip', 'Place Pip'],
    ['food', 'Place snack'],
    ['toy', 'Place toy'],
  ] as const)('labels every held item', (held, label) => {
    const state: InteractionState = {
      mode: 'carrying',
      focused: null,
      held,
      lastSafePosition: null,
    };

    expect(actionLabelFor(state)).toBe(label);
  });

  it('does not retain references to caller-owned safe-position tuples', () => {
    const safePosition: [number, number, number] = [1, 0, 2];
    const held = interactionReducer(
      { ...idle, focused: 'food' },
      { type: 'pick-up', target: 'food', safePosition },
    );

    safePosition[0] = 99;

    expect(held.lastSafePosition).toEqual([1, 0, 2]);
  });
});
