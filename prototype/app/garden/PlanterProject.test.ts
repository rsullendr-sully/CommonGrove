import { describe, expect, it } from 'vitest';
import type { ProjectDirective } from './planterCoordinator';
import { createPlanterProgress } from './planterProgress';
import { basketItems, planterParts } from './PlanterProject';

describe('planter scene presentation', () => {
  it('does not reveal planting before it is completed', () => {
    expect(planterParts('frame')).toEqual(['base', 'frame']);
    expect(planterParts('planted')).toEqual(['base', 'frame', 'soil', 'sprouts']);
  });

  it('hides only a claimed carried item and restores it when the claim is interrupted', () => {
    const progress = {
      ...createPlanterProgress(),
      supplies: 'committed' as const,
      stage: 'empty' as const,
    };
    const carrying: ProjectDirective = {
      key: 'planter:1:2', actor: 'pip', action: 'carry', phase: 'approach',
      target: { x: -15, z: -3.15 }, lookAt: { x: -15, z: -1.8 },
      tool: 'piece', elapsed: 0,
    };

    expect(basketItems(progress, { pip: carrying })).toEqual(['soil', 'seeds', 'mallet', 'can']);
    expect(basketItems(progress, {})).toEqual(['piece', 'soil', 'seeds', 'mallet', 'can']);
  });

  it('leaves the starter tools after the planter uses its supplies', () => {
    const progress = {
      ...createPlanterProgress(),
      supplies: 'used' as const,
      stage: 'planted' as const,
    };

    expect(basketItems(progress, {})).toEqual(['mallet', 'can']);
  });
});
