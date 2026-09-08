import { describe, expect, it } from 'vitest';
import { createProjectsProgress } from './projectProgress';
import type { ProjectDirective } from './projectScheduler';
import { restingToolPose, reusableToolInstances } from './LearningProjects';

const anchors = {
  mallet: { x: -15.2, z: -3.15 },
  can: { x: -14.8, z: -3.15 },
};
const reserved: ProjectDirective = {
  key: 'project:1:1', actor: 'pip', action: 'retrieve-tool', phase: 'approach',
  target: { x: -15, z: -3.15 }, lookAt: anchors.mallet, tool: null,
  elapsed: 0, project: 'tool-rack', step: 1, ability: 'B2',
};

describe('shared project tool presentation', () => {
  it('keeps a reserved tool at its actual resting anchor until attachment', () => {
    const progress = createProjectsProgress();
    progress.projects['tool-rack'].supplies = 'committed';

    expect(reusableToolInstances(progress, { pip: reserved }, anchors)).toEqual([
      { tool: 'mallet', kind: 'resting', anchor: anchors.mallet },
      { tool: 'can', kind: 'resting', anchor: anchors.can },
    ]);
  });

  it('selects one held or resting instance per reusable tool and restores released claims', () => {
    const progress = createProjectsProgress();
    progress.projects['tool-rack'] = { supplies: 'used', completedSteps: 6, deliveredForStep: null };
    const attached = { ...reserved, action: 'tap' as const, phase: 'perform' as const, tool: 'mallet' as const };

    expect(reusableToolInstances(progress, { pip: attached }, anchors)).toEqual([
      { tool: 'mallet', kind: 'held', actor: 'pip' },
      { tool: 'can', kind: 'resting', anchor: anchors.can },
    ]);
    expect(reusableToolInstances(progress, {}, anchors)).toEqual([
      { tool: 'mallet', kind: 'resting', anchor: anchors.mallet },
      { tool: 'can', kind: 'resting', anchor: anchors.can },
    ]);
  });

  it('does not synthesize tools without a real anchor snapshot or project opportunity', () => {
    const progress = createProjectsProgress();
    expect(reusableToolInstances(progress, {}, anchors)).toEqual([]);
    progress.projects.planter.supplies = 'available';
    expect(reusableToolInstances(progress, {}, undefined)).toEqual([]);
  });

  it('keeps basket tools low while actual rack anchors select hanging poses', () => {
    expect(restingToolPose('mallet', anchors.mallet)).toEqual({ elevation: .2, rotation: [0, 0, 0] });
    expect(restingToolPose('can', anchors.can)).toEqual({ elevation: .17, rotation: [0, 0, 0] });

    expect(restingToolPose('mallet', { x: -16.25, z: 1.5 }).elevation).toBeGreaterThan(.33);
    expect(restingToolPose('can', { x: -15.75, z: 1.5 }).elevation).toBeGreaterThan(.3);
  });
});
