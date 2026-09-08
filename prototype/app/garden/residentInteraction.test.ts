import { describe, expect, it } from 'vitest';
import * as resident from './residentInteraction';

describe('resident-specific player interactions', () => {
  it('releases an unreachable direct action without crediting a memory', () => {
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'moss' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'greet' } });
    const epoch = state.epoch;
    state = resident.residentInteractionReducer(state, { type: 'cancel', id: 'moss', epoch });
    expect(state.scene.interaction.mode).toBe('idle');
    expect(state.scene.phase).toBe('none');
    expect(state.completedMemory).toBeNull();
    expect(state.resumes.moss).toBe(1);
    expect(resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch, event: { type: 'greet-arrived' } })).toBe(state);
  });
  it('restores the same resident prompt after an offered snack completes', () => {
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'food' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'pick-up', target: 'food', safePosition: [0, .25, 12] } });
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'fern' });
    state = resident.residentInteractionReducer(state, { type: 'offer', id: 'fern', target: 'food', point: { x: 2, z: 12 }, available: true });
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'fern', epoch: state.epoch, event: { type: 'object-reaction-complete' } });
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'fern' });
    expect(resident.residentActionLabel(state, 'fern')).toBe('Greet Fern');
  });
  it('reconciles focus changed during a reaction before allowing the next action', () => {
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'moss' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'greet' } });
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch: state.epoch, event: { type: 'greet-arrived' } });
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'fern' });
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch: state.epoch, event: { type: 'greet-complete' } });
    expect(resident.residentActionLabel(state, 'fern')).toBe('Greet Fern');
  });
  it('credits a completed pet only to the captured resident', () => {
    expect(resident.createResidentInteraction).toBeTypeOf('function');
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'moss' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'greet' } });
    expect(state.activeId).toBe('moss');
    const send = (type: 'greet-arrived' | 'greet-complete' | 'pet-complete') => {
      state = resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch: state.epoch, event: { type } });
    };
    send('greet-arrived'); send('greet-complete');
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'pet' } });
    const wrong = resident.residentInteractionReducer(state, { type: 'scene', id: 'fern', epoch: state.epoch, event: { type: 'pet-complete' } });
    expect(wrong).toBe(state);
    send('pet-complete');
    expect(state.completedMemory).toEqual({ id: 'moss', kind: 'pet', sequence: 1 });
    expect(state.resumes.pip).toBe(0);
    expect(state.resumes.fern).toBe(0);
    expect(state.resumes.moss).toBe(2);
  });

  it('does not transfer the greet/pet chain when the player aims at another resident', () => {
    expect(resident.createResidentInteraction).toBeTypeOf('function');
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'moss' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'greet' } });
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch: state.epoch, event: { type: 'greet-arrived' } });
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'moss', epoch: state.epoch, event: { type: 'greet-complete' } });
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'fern' });
    expect(resident.residentActionLabel(state, 'fern')).toBe('Greet Fern');
    expect(resident.residentActionLabel(state, 'moss')).toBeNull();
  });

  it('captures the offered recipient while allowing focus to move elsewhere', () => {
    expect(resident.createResidentInteraction).toBeTypeOf('function');
    let state = resident.createResidentInteraction();
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'food' });
    state = resident.residentInteractionReducer(state, { type: 'activate', event: { type: 'pick-up', target: 'food', safePosition: [0, .25, 12] } });
    expect(resident.residentActionLabel(state, 'fern')).toBe('Offer snack to Fern');
    state = resident.residentInteractionReducer(state, { type: 'offer', id: 'fern', target: 'food', point: { x: 2, z: 12 }, available: true });
    const epoch = state.epoch;
    state = resident.residentInteractionReducer(state, { type: 'focus', target: 'moss' });
    expect(state.activeId).toBe('fern');
    expect(resident.residentPhase(state, 'moss')).toBe('none');
    state = resident.residentInteractionReducer(state, { type: 'scene', id: 'fern', epoch, event: { type: 'object-reaction-complete' } });
    expect(state.completedMemory).toEqual({ id: 'fern', kind: 'snack', sequence: 1 });
    const stale = resident.residentInteractionReducer(state, { type: 'scene', id: 'fern', epoch: epoch - 1, event: { type: 'object-reaction-complete' } });
    expect(stale).toBe(state);
  });
});
