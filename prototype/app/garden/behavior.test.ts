import { describe, expect, it } from 'vitest';
import { activityDefinitions, chooseNextActivity, type BehaviorContext } from './behavior';

const context: BehaviorContext = {
  now: 20,
  recentKind: 'inspect-flowers',
  employeeNearby: false,
  availableInterestIds: ['flowers', 'pond', 'pavilion'],
  cooldownUntil: {},
};

describe('Pip behavior selection', () => {
  it('does not immediately repeat an ordinary activity', () => {
    expect(chooseNextActivity(context, 0).kind).not.toBe('inspect-flowers');
  });

  it('chooses greeting when the employee is nearby', () => {
    expect(chooseNextActivity({ ...context, employeeNearby: true }, 0.5).kind).toBe('greet');
  });

  it('excludes activities still on cooldown', () => {
    const next = chooseNextActivity({ ...context, cooldownUntil: { 'watch-pond': 40 } }, 0);
    expect(next.kind).not.toBe('watch-pond');
  });

  it('selects weighted eligible activities from a deterministic random value', () => {
    const next = chooseNextActivity({ ...context, recentKind: null }, 0.999);
    expect(next.kind).toBe('greet');
  });

  it('ignores unavailable interest activities', () => {
    const next = chooseNextActivity({ ...context, recentKind: null, availableInterestIds: [] }, 0.99);
    expect(['inspect-flowers', 'watch-pond', 'visit-pavilion', 'inspect-destination']).not.toContain(next.kind);
  });

  it('clamps invalid random values without throwing', () => {
    expect(() => chooseNextActivity(context, Number.NaN)).not.toThrow();
    expect(() => chooseNextActivity(context, Number.POSITIVE_INFINITY)).not.toThrow();
    expect(() => chooseNextActivity(context, -1)).not.toThrow();
  });

  it('exposes complete definitions for every activity kind', () => {
    expect(activityDefinitions.map((definition) => definition.kind)).toEqual([
      'wander', 'look-around', 'inspect-flowers', 'watch-pond', 'visit-pavilion',
      'inspect-destination', 'rest', 'greet',
    ]);
    for (const definition of activityDefinitions) {
      expect(definition.weight).toBeGreaterThan(0);
      expect(definition.durationSeconds).toBeGreaterThan(0);
      expect(definition.cooldownSeconds).toBeGreaterThanOrEqual(0);
    }
  });
});
