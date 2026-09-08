import { describe, expect, it } from 'vitest';
import { characterActing } from './characterActing';

describe('readable creature acting', () => {
  it('finishes greeting gestures and icons without interrupting the activity', () => {
    expect(characterActing('greet', 1, .5, 0, false).perk).toBeGreaterThan(0);
    const settled = characterActing('greet', 4, 3, 0, false);
    expect(settled.perk).toBe(0);
    expect(settled.iconVisible).toBe(false);
  });
  it('does not repeat greeting motion while eating or claim affection during ordinary exploration', () => {
    expect(characterActing('eating', 1, .5, 0, false).perk).toBe(0);
    for (const activity of ['walk', 'idle', 'inspect', 'rest'] as const) {
      expect(characterActing(activity, 1, .5, 0, false).iconVisible).toBe(false);
    }
  });
  it('keeps reduced-motion expressions readable without secondary motion', () => {
    const quiet = characterActing('inspect', 1, .5, 0, true);
    expect(quiet).toMatchObject({ eyeOpen: 1, glance: 0, headTurn: 0, breathe: 0, perk: 0 });
    expect(characterActing('greet', 1, .5, 0, true).perk).toBe(0);
    expect(characterActing('pet', 1, .5, 0, true)).toMatchObject({ eyeOpen: 0, iconVisible: true });
  });
  it('uses bounded staggered blinks and keeps the walking body free of idle bobbing', () => {
    expect(characterActing('idle', .09, 0, 0, false).eyeOpen).toBeCloseTo(0);
    expect(characterActing('idle', .09, 0, 2, false).eyeOpen).toBe(1);
    expect(characterActing('walk', 1, 1, 0, false).breathe).toBe(0);
    for (let t = 0; t < 10; t += .03) {
      const state = characterActing('inspect', t, t, 0, false);
      expect(state.eyeOpen).toBeGreaterThanOrEqual(0);
      expect(state.eyeOpen).toBeLessThanOrEqual(1);
      expect(Math.abs(state.headTurn)).toBeLessThanOrEqual(.075);
    }
  });
});
