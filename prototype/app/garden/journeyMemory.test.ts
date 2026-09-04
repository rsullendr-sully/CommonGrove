import { describe, expect, it } from 'vitest';
import { createPipInteractionSceneState, pipInteractionSceneReducer } from './pipInteractionScene';

describe('completed companion memories', () => {
  it('does not remember a pet until its reaction completes', () => {
    const fresh = createPipInteractionSceneState();
    const pet = { ...fresh, phase: 'pet' as const };
    expect(fresh.completedMemory).toBeNull();
    expect(pet.completedMemory).toBeNull();
    const completed = pipInteractionSceneReducer(pet, { type: 'pet-complete' });
    expect(completed.completedMemory).toEqual({ kind: 'pet', sequence: 1 });
    expect(pipInteractionSceneReducer(completed, { type: 'pet-complete' })).toBe(completed);
  });

  it.each([['food', 'eating', 'snack'], ['toy', 'playing', 'toy']] as const)('records %s only after an accepted reaction', (offered, phase, memory) => {
    const fresh = createPipInteractionSceneState();
    const reacting = { ...fresh, phase, interaction: { mode: 'reacting' as const, focused: 'pip' as const, held: null, lastSafePosition: null, reaction: phase, offered }, toyNudged: false };
    if (offered === 'toy') expect(pipInteractionSceneReducer(reacting, { type: 'object-reaction-complete' })).toBe(reacting);
    const completed = pipInteractionSceneReducer({ ...reacting, toyNudged: offered === 'toy' }, { type: 'object-reaction-complete' });
    expect(completed.completedMemory).toEqual({ kind: memory, sequence: 1 });
    expect(pipInteractionSceneReducer(completed, { type: 'object-reaction-complete' })).toBe(completed);
  });

  it('ignores stale completion events and forgets everything on reset', () => {
    const state = createPipInteractionSceneState();
    expect(pipInteractionSceneReducer(state, { type: 'pet-complete' })).toBe(state);
    expect(pipInteractionSceneReducer(state, { type: 'object-reaction-complete' })).toBe(state);
    expect(state.completedMemory).toBeNull();
  });
});
