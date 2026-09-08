import { describe, expect, it } from 'vitest';
import type { AbilityId } from './abilities';
import {
  PROJECT_RECIPES,
  validateProjectRecipes,
  type ProjectId,
  type RecipeStep,
} from './projectDefinitions';

describe('project recipes', () => {
  it('orders the planter work with a reusable mallet delivery between fitted parts', () => {
    expect(PROJECT_RECIPES.planter).toEqual([
      { id: 'fit-base', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'planter-base-seated' },
      { id: 'tap-base', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'planter-base-fastened' },
      { id: 'fit-frame', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'planter-frame-seated' },
      { id: 'tap-frame', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'planter-frame-fastened' },
      { id: 'fill', action: 'fill', ability: 'G1', tool: 'soil', seconds: 4, reveal: 'planter-soil-filled' },
      { id: 'plant', action: 'plant', ability: 'G2', tool: 'seeds', seconds: 4, reveal: 'planter-seeds-planted' },
    ]);
  });

  it('orders the tool rack work as three independently seated and fastened parts', () => {
    expect(PROJECT_RECIPES['tool-rack']).toEqual([
      { id: 'fit-base', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-base-seated' },
      { id: 'tap-base', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-base-fastened' },
      { id: 'fit-upright', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-upright-seated' },
      { id: 'tap-upright', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-upright-fastened' },
      { id: 'fit-crossbar', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-crossbar-seated' },
      { id: 'tap-crossbar', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-crossbar-fastened' },
    ]);
  });

  it('accepts the shipped recipe definitions', () => {
    expect(validateProjectRecipes()).toEqual([]);
  });

  it('reports unusable step ids, disabled abilities, and invalid durations', () => {
    const step = (overrides: Partial<RecipeStep>): RecipeStep => ({
      id: 'valid', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'visible-change',
      ...overrides,
    });
    const recipes = {
      planter: [
        step({ id: '' }),
        step({ id: 'duplicate' }),
        step({ id: 'duplicate' }),
        step({ id: 'disabled', ability: 'B3' }),
      ],
      'tool-rack': [
        step({ id: 'zero', seconds: 0 }),
        step({ id: 'infinite', seconds: Number.POSITIVE_INFINITY }),
        step({ id: 'unknown', ability: 'Z9' as AbilityId }),
      ],
    } satisfies Record<ProjectId, readonly RecipeStep[]>;

    expect(validateProjectRecipes(recipes)).toEqual([
      'Invalid step id for planter at index 0',
      'Duplicate step id for planter: duplicate',
      'Disabled or unknown ability for planter/disabled: B3',
      'Invalid duration for tool-rack/zero: 0',
      'Invalid duration for tool-rack/infinite: Infinity',
      'Disabled or unknown ability for tool-rack/unknown: Z9',
    ]);
  });
});
