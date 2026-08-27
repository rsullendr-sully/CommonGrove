import { describe, expect, it } from 'vitest';
import {
  actionEventForLiveTarget,
  actionLabelFor,
  actionLabelForLiveTarget,
  interactionReducer,
  type InteractionState,
} from './interaction';

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

  it('progresses a focused Pip from petting to a discoverable pick-up action', () => {
    const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });
    const petting = interactionReducer(focused, { type: 'pet' });
    const readyToCarry = interactionReducer(petting, { type: 'reaction-complete' });

    expect(petting.mode).toBe('reacting');
    expect(readyToCarry).toMatchObject({ mode: 'idle', focused: 'pip', held: null });
    expect(actionLabelFor(readyToCarry)).toBe('Pick up Pip');

    const held = interactionReducer(readyToCarry, {
      type: 'pick-up',
      target: 'pip',
      safePosition: [1, 0, 2],
    });

    expect(held).toMatchObject({ mode: 'carrying', focused: null, held: 'pip' });
  });

  it.each([null, 'food', 'toy'] as const)(
    'does not expose or activate Pip pick-up after petting when the live target is %s',
    (liveTarget) => {
      const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });
      const petting = interactionReducer(focused, { type: 'pet' });
      const readyToCarry = interactionReducer(petting, { type: 'reaction-complete' });

      expect(actionLabelForLiveTarget(readyToCarry, liveTarget)).toBeNull();
      expect(actionEventForLiveTarget(readyToCarry, liveTarget, [1, 0, 2])).toBeNull();
    },
  );

  it('restores the legal pick-up-ready action when live targeting reacquires Pip', () => {
    const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });
    const petting = interactionReducer(focused, { type: 'pet' });
    const readyToCarry = interactionReducer(petting, { type: 'reaction-complete' });

    expect(actionLabelForLiveTarget(readyToCarry, 'pip')).toBe('Pick up Pip');
    expect(actionEventForLiveTarget(readyToCarry, 'pip', [1, 0, 2])).toEqual({
      type: 'pick-up',
      target: 'pip',
      safePosition: [1, 0, 2],
    });
  });

  it('clears an ordinary completed reaction while preserving its safe position', () => {
    const reacting: InteractionState = {
      mode: 'reacting',
      focused: null,
      held: null,
      lastSafePosition: [4, 0, 5],
      reaction: 'eating',
      offered: 'food',
    };

    expect(interactionReducer(reacting, { type: 'reaction-complete' })).toEqual({
      mode: 'idle',
      focused: null,
      held: null,
      lastSafePosition: [4, 0, 5],
    });
  });

  it.each([null, 'food', 'toy'] as const)(
    'keeps Pip ready for pick-up when the reticle changes to %s during petting',
    (target) => {
      const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });
      const petting = interactionReducer(focused, { type: 'pet' });
      const afterFocusChange = interactionReducer(petting, { type: 'focus', target });
      const readyToCarry = interactionReducer(afterFocusChange, { type: 'reaction-complete' });

      expect(afterFocusChange).toEqual(petting);
      expect(readyToCarry).toEqual({
        mode: 'idle',
        focused: 'pip',
        held: null,
        lastSafePosition: null,
        pipFocusedAction: 'pick-up',
      });
      expect(actionLabelFor(readyToCarry)).toBe('Pick up Pip');
    },
  );

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
      reaction: 'pet',
      offered: null,
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

  it.each([
    ['food', 'eating'],
    ['toy', 'playing'],
  ] as const)('offers held %s to an available Pip as a temporary %s reaction', (held, reaction) => {
    const carrying: InteractionState = {
      mode: 'carrying',
      focused: null,
      held,
      lastSafePosition: [4, 0, 5],
    };

    const offered = interactionReducer(carrying, { type: 'offer', target: held, pipAvailable: true });

    expect(offered).toEqual({
      mode: 'reacting',
      focused: null,
      held: null,
      lastSafePosition: [4, 0, 5],
      reaction,
      offered: held,
    });
  });

  it.each(['food', 'toy'] as const)('keeps held %s when Pip is unavailable', (held) => {
    const carrying: InteractionState = {
      mode: 'carrying',
      focused: null,
      held,
      lastSafePosition: [4, 0, 5],
    };

    expect(interactionReducer(carrying, { type: 'offer', target: held, pipAvailable: false }))
      .toBe(carrying);
    expect(interactionReducer(carrying, { type: 'offer', target: held === 'food' ? 'toy' : 'food', pipAvailable: true }))
      .toBe(carrying);
  });

  it.each([
    ['food', 'Offer snack'],
    ['toy', 'Offer toy'],
  ] as const)('shows one offer action for held %s only while Pip is the live target', (held, offerLabel) => {
    const carrying: InteractionState = {
      mode: 'carrying',
      focused: null,
      held,
      lastSafePosition: [4, 0, 5],
    };

    expect(actionLabelForLiveTarget(carrying, 'pip')).toBe(offerLabel);
    expect(actionLabelForLiveTarget(carrying, null)).toBe(actionLabelFor(carrying));
    expect(actionLabelForLiveTarget(carrying, held)).toBe(actionLabelFor(carrying));
  });
});
