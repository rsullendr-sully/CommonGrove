import { describe, expect, it } from 'vitest';
import * as residents from './residents';
import * as journey from './journey';

describe('a growing community of individuals', () => {
  it.each([[1, ['pip']], [2, ['pip', 'moss']], [3, ['pip', 'moss', 'fern']], [4, ['pip', 'moss', 'fern']]])('shows only arrived residents on return %s', (visit, ids) => {
    expect(residents.residentsForVisit).toBeTypeOf('function');
    expect(residents.residentsForVisit(visit as number).map(r => r.id)).toEqual(ids);
  });

  it('previews the real third return without inventing care or choosing a destination', () => {
    const next = journey.journeyReducer(journey.createJourney(), { type: 'preview-community' });
    expect(next).toMatchObject({ visit: 3, rewardStage: 3, choice: null, lastInteraction: null, returnMemory: null });
    expect(journey.projectJourneyScene(next, 'before').visit).toBe(2);
    expect(journey.journeyReducer(next, { type: 'preview-community' })).toBe(next);
    const last = journey.journeyReducer(next, { type: 'return' });
    expect(journey.journeyReducer(last, { type: 'preview-community' })).toBe(last);
  });

  it('keeps a completed moment with its recipient and exposes it only on the next return', () => {
    expect(journey.getResidentJourneyProfile).toBeTypeOf('function');
    let state = journey.journeyReducer(journey.createJourney(), { type: 'preview-community' });
    state = journey.journeyReducer(state, { type: 'remember', residentId: 'moss', interaction: 'pet' });
    expect(state.lastInteraction).toBeNull();
    expect(journey.getResidentJourneyProfile(state, 'moss').memory).toBeNull();
    state = journey.journeyReducer(state, { type: 'return' });
    expect(journey.getResidentJourneyProfile(state, 'moss').memory).toBe('pet');
    expect(journey.getResidentJourneyProfile(state, 'pip').memory).toBeNull();
    expect(journey.getResidentJourneyProfile(state, 'fern').memory).toBeNull();
    expect(journey.journeyReducer(state, { type: 'reset' })).toEqual(journey.createJourney());
  });

  it('does not give an absent resident a memory', () => {
    const first = journey.createJourney();
    expect(journey.journeyReducer(first, { type: 'remember', residentId: 'fern', interaction: 'toy' })).toBe(first);
  });

  it('retains choice and actual Pip memory when skipping the fictional visits', () => {
    let state = journey.createJourney();
    for (let i = 0; i < 3; i++) state = journey.journeyReducer(state, { type: 'accomplishment' });
    state = journey.journeyReducer(state, { type: 'choose', choice: 'workshop' });
    state = journey.journeyReducer(state, { type: 'remember', interaction: 'snack' });
    state = journey.journeyReducer(state, { type: 'preview-community' });
    expect(state).toMatchObject({ visit: 3, choice: 'workshop', previousChoice: 'workshop', returnMemory: 'snack' });
  });

  it('keeps ear and marking geometry independent of colors and uses different repeatable activity streams', () => {
    expect(residents.appearanceFeatures).toBeTypeOf('function');
    const moss = residents.residentDefinition('moss').appearance;
    const geometry = residents.appearanceFeatures(moss);
    expect(residents.appearanceFeatures({ ...moss, body: '#ffffff', accent: '#000000' })).toEqual(geometry);
    expect(geometry.earScale.every(n => n > 0 && n <= 1.5)).toBe(true);
    expect(geometry.markings.length).toBeGreaterThan(0);
    expect(residents.appearanceFeatures(residents.residentDefinition('pip').appearance).markings).toHaveLength(3);
    const first = residents.createResidentRandom(37);
    const replay = residents.createResidentRandom(37);
    const other = residents.createResidentRandom(913);
    const stream = Array.from({ length: 6 }, () => first());
    expect(Array.from({ length: 6 }, () => replay())).toEqual(stream);
    expect(Array.from({ length: 6 }, () => other())).not.toEqual(stream);
  });

  it('gives each resident a distinct, neutral journal cue', () => {
    const notes = residents.RESIDENTS.map(resident => resident.journalNote);
    expect(notes).toHaveLength(3);
    expect(new Set(notes).size).toBe(notes.length);
    expect(notes.every(note => note.length > 20 && !/score|need|health/i.test(note))).toBe(true);
  });

  it('keeps the shared clay body compact at first-person distance', () => {
    expect(residents.RESIDENT_WORLD_SCALE).toBeGreaterThanOrEqual(0.65);
    expect(residents.RESIDENT_WORLD_SCALE).toBeLessThanOrEqual(0.8);
  });
});
