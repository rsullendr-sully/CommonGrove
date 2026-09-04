import { describe, expect, it } from 'vitest';
import { createJourney, journeyReducer, projectJourneyScene, getPipJourneyProfile } from './journey';

const opening = () => [1, 2, 3].reduce((state) => journeyReducer(state, { type: 'accomplishment' }), createJourney());

describe('garden return journey', () => {
  it('requires opening accomplishments but never a choice or care to advance', () => {
    const fresh = createJourney();
    expect(journeyReducer(fresh, { type: 'return' })).toBe(fresh);
    let state = opening();
    for (const visit of [2, 3, 4]) {
      state = journeyReducer(state, { type: 'return' });
      expect(state.visit).toBe(visit);
      expect(state.choice).toBeNull();
      expect(projectJourneyScene(state, 'now').seedVisible).toBe(true);
    }
    expect(journeyReducer(state, { type: 'return' })).toBe(state);
  });

  it.each(['orchard', 'workshop'] as const)('retains %s and all rewards through the mature return', (choice) => {
    let state = journeyReducer(opening(), { type: 'choose', choice });
    for (const visit of [2, 3, 4]) {
      state = journeyReducer(state, { type: 'return' });
      expect(projectJourneyScene(state, 'now')).toMatchObject({
        visit, starflowersVisible: true, pavilionImproved: true, seedVisible: false, destinationVisible: choice,
      });
      expect(projectJourneyScene(state, 'before')).toMatchObject({ visit: visit - 1, destinationVisible: choice });
    }
  });

  it('allows a late choice without rewriting the previous return', () => {
    let state = journeyReducer(opening(), { type: 'return' });
    state = journeyReducer(state, { type: 'choose', choice: 'workshop' });
    expect(projectJourneyScene(state, 'before')).toMatchObject({ visit: 1, seedVisible: true, destinationVisible: null });
    expect(projectJourneyScene(state, 'now')).toMatchObject({ visit: 2, seedVisible: false, destinationVisible: 'workshop' });
    expect(journeyReducer(state, { type: 'choose', choice: 'orchard' })).toBe(state);
  });

  it('does not grant early choices or extra accomplishments on later visits', () => {
    const fresh = createJourney();
    expect(journeyReducer(fresh, { type: 'choose', choice: 'orchard' })).toBe(fresh);
    const later = journeyReducer(opening(), { type: 'return' });
    expect(journeyReducer(later, { type: 'accomplishment' })).toBe(later);
  });

  it('remembers completed interactions on the next return without inventing them', () => {
    let state = opening();
    expect(getPipJourneyProfile(state).memory).toBeNull();
    state = journeyReducer(state, { type: 'remember', interaction: 'toy' });
    expect(getPipJourneyProfile(state).memory).toBeNull();
    state = journeyReducer(state, { type: 'return' });
    expect(getPipJourneyProfile(state).memory).toBe('toy');
    state = journeyReducer(state, { type: 'remember', interaction: 'pet' });
    expect(getPipJourneyProfile(state).memory).toBe('toy');
    state = journeyReducer(state, { type: 'return' });
    expect(getPipJourneyProfile(state).memory).toBe('pet');
    expect(getPipJourneyProfile(state).preferredKind).toBe('visit-pavilion');
  });

  it('resets choice, history and memories together', () => {
    let state = journeyReducer(opening(), { type: 'choose', choice: 'orchard' });
    state = journeyReducer(state, { type: 'remember', interaction: 'snack' });
    state = journeyReducer(state, { type: 'return' });
    expect(journeyReducer(state, { type: 'reset' })).toEqual({
      visit: 1, rewardStage: 0, choice: null, previousChoice: null, lastInteraction: null, returnMemory: null,
    });
  });

  it('preserves the opening reward comparison semantics', () => {
    const state = journeyReducer(createJourney(), { type: 'accomplishment' });
    expect(projectJourneyScene(state, 'before').starflowersVisible).toBe(false);
    expect(projectJourneyScene(state, 'now').starflowersVisible).toBe(true);
  });
});
