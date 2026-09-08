import { describe, expect, it } from 'vitest';
import type { ProjectDirective } from './projectScheduler';
import { createProjectsProgress } from './projectProgress';
import { basketItems, planterParts } from './PlanterProject';

describe('planter scene presentation', () => {
  it.each([
    [0, []],
    [1, ['base']],
    [2, ['base', 'base-fasteners']],
    [3, ['base', 'base-fasteners', 'frame']],
    [4, ['base', 'base-fasteners', 'frame', 'frame-fasteners']],
    [5, ['base', 'base-fasteners', 'frame', 'frame-fasteners', 'soil']],
    [6, ['base', 'base-fasteners', 'frame', 'frame-fasteners', 'soil', 'sprouts']],
  ])('derives completed planter geometry at reveal boundary %i', (completedSteps, expected) => {
    expect(planterParts(completedSteps)).toEqual(expected);
  });

  it('hides material only after it is attached and restores it when the claim is released', () => {
    const progress = createProjectsProgress();
    progress.projects.planter.supplies = 'committed';
    const carrying: ProjectDirective = {
      key: 'planter:1:2', actor: 'pip', action: 'carry', phase: 'approach',
      target: { x: -15, z: -3.15 }, lookAt: { x: -15, z: -1.8 },
      tool: 'piece', elapsed: 0, project: 'planter', step: 0, ability: 'B1',
    };
    const reserved = { ...carrying, tool: null };

    expect(basketItems(progress, { pip: reserved })).toEqual(['piece', 'soil', 'seeds']);
    expect(basketItems(progress, { pip: carrying })).toEqual(['soil', 'seeds']);
    expect(basketItems(progress, {})).toEqual(['piece', 'soil', 'seeds']);
  });

  it('shows the shared supply basket for a rack-only opportunity without planter inputs', () => {
    const progress = createProjectsProgress();
    progress.projects['tool-rack'].supplies = 'available';

    expect(basketItems(progress, {})).toEqual(['piece']);
  });
});
