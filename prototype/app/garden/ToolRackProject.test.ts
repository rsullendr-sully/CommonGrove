import { describe, expect, it } from 'vitest';
import { projectToolVerticalExtent } from './PlanterProject';
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
    const malletExtent = projectToolVerticalExtent('mallet');
    const canExtent = projectToolVerticalExtent('can');

    expect(malletExtent.min).toBeCloseTo(-.1629, 4);
    expect(malletExtent.max).toBe(.135);
    expect(canExtent).toEqual({ min: -.13, max: .133 });
    expect(mallet.elevation + malletExtent.min).toBeGreaterThan(.17);
    expect(mallet.elevation + malletExtent.max).toBeCloseTo(.89, 3);
    expect(can.elevation + canExtent.min).toBeGreaterThan(.17);
    expect(can.elevation + canExtent.max).toBeCloseTo(.89, 3);
    expect(mallet.rotation).not.toEqual(can.rotation);
  });
});
