import { describe, expect, it } from 'vitest';
import { toolRackParts } from './ToolRackProject';

describe('tool rack scene presentation', () => {
  it.each([
    [0, []],
    [1, ['base']],
    [2, ['base', 'base-fasteners']],
    [3, ['base', 'base-fasteners', 'upright']],
    [4, ['base', 'base-fasteners', 'upright', 'upright-fasteners']],
    [5, ['base', 'base-fasteners', 'upright', 'upright-fasteners', 'crossbar']],
    [6, ['base', 'base-fasteners', 'upright', 'upright-fasteners', 'crossbar', 'crossbar-fasteners']],
  ])('derives completed rack geometry at reveal boundary %i', (completedSteps, expected) => {
    expect(toolRackParts(completedSteps)).toEqual(expected);
  });
});
