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
    expect(next?.kind).toBe('rest');
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

  it('returns null when every ordinary activity is cooled down', () => {
    const cooldownUntil = Object.fromEntries(
      activityDefinitions
        .filter(({ kind }) => kind !== 'greet')
        .map(({ kind }) => [kind, context.now + 1]),
    );
    expect(chooseNextActivity({ ...context, recentKind: null, cooldownUntil }, 0)).toBeNull();
  });

  it('allows an activity whose cooldown ends now', () => {
    expect(chooseNextActivity({ ...context, recentKind: null, cooldownUntil: { wander: context.now } }, 0)?.kind).toBe('wander');
  });

  it('does not select interest activities when no interests are available', () => {
    const kinds = new Set(
      Array.from({ length: 40 }, (_, index) => chooseNextActivity({ ...context, recentKind: null, availableInterestIds: [] }, index / 40)?.kind),
    );
    expect([...kinds].some((kind) => activityDefinitions.find((definition) => definition.kind === kind)?.interestId)).toBe(false);
  });

  it('never selects greeting when the employee is not nearby', () => {
    const kinds = new Set(
      Array.from({ length: 40 }, (_, index) => chooseNextActivity({ ...context, recentKind: null }, index / 40)?.kind),
    );
    expect(kinds.has('greet')).toBe(false);
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
