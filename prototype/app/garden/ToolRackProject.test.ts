import { describe, expect, it } from 'vitest';
import { toolRackParts, toolRackStoredPose } from './ToolRackProject';

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

  it('hangs stored tools clear of the rack base and aligned with its hooks', () => {
    const mallet = toolRackStoredPose('mallet');
    const can = toolRackStoredPose('can');

    expect(mallet.elevation - .16).toBeGreaterThan(.17);
    expect(mallet.elevation + .135).toBeCloseTo(.89, 2);
    expect(can.elevation - .13).toBeGreaterThan(.17);
    expect(can.elevation + .218).toBeCloseTo(.89, 1);
    expect(mallet.rotation).not.toEqual(can.rotation);
  });
});
