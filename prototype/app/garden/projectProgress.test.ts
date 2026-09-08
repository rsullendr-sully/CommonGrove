import { describe, expect, it } from 'vitest';
import { learnAbility } from './spiritKnowledge';
import { createPlanterProgress } from './planterProgress';
import {
  createProjectsProgress,
  nextRecipeStep,
  projectComplete,
  reduceProjectProgress,
  migrateLegacyPlanter,
  type ProjectEvent,
  type ProjectsProgress,
} from './projectProgress';

describe('one-way legacy planter migration', () => {
  it.each([['empty', 0], ['base', 2], ['frame', 4], ['soil', 5], ['planted', 6]] as const)(
    'preserves completed %s without inventing practice', (stage, completedSteps) => {
      const old = { ...createPlanterProgress(), book: true, stage, supplies: stage === 'planted' ? 'used' as const : 'committed' as const,
        delivered: true, knowledge: { pip: ['assembly' as const], moss: ['planting' as const], fern: [] }, processed: ['old-event'] };
      const next = migrateLegacyPlanter(old);
      expect(next.projects.planter.completedSteps).toBe(completedSteps);
      expect(next.projects.planter.supplies).toBe(old.supplies);
      expect(next.active).toBe(stage === 'planted' ? null : 'planter');
      expect(next.book).toBe(true);
      expect(next.processed).toEqual(['old-event']);
      expect(next.projects['tool-rack'].supplies).toBe('absent');
      expect(next.knowledge.pip.B1).toMatchObject({ status: 'familiar', source: { kind: 'legacy' } });
      expect(next.knowledge.pip.B2).toMatchObject({ status: 'familiar', source: { kind: 'legacy' } });
      expect(next.knowledge.moss.G1).toMatchObject({ status: 'familiar', source: { kind: 'legacy' } });
      expect(next.knowledge.moss.G2).toMatchObject({ status: 'familiar', source: { kind: 'legacy' } });
      expect(next.knowledge.fern).toEqual({});
      expect(next.projects.planter.deliveredForStep).toBe(stage === 'planted' ? null : completedSteps);
      expect(old.knowledge.pip).toEqual(['assembly']);
    });
  it.each(['absent', 'available', 'committed', 'used'] as const)('preserves %s supplies and returns unallocated input without charging again', supplies => {
    const old = { ...createPlanterProgress(), supplies, delivered: true };
    const next = migrateLegacyPlanter(old);
    expect(next.projects.planter.supplies).toBe(supplies);
    expect(next.projects.planter.deliveredForStep).toBe(supplies === 'committed' ? 0 : null);
    expect(next.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
    expect(next.processed).toEqual([]);
  });
});

function withBookAbilities(
  abilities: readonly ('B1' | 'B2' | 'G1' | 'G2')[],
  resident: 'pip' | 'moss' | 'fern' = 'pip',
): ProjectsProgress {
  let progress = reduceProjectProgress(createProjectsProgress(), { type: 'book', id: 'book' });
  for (const ability of abilities) {
    progress = reduceProjectProgress(progress, {
      type: 'learn',
      id: `learn-${resident}-${ability}`,
      resident,
      ability,
      source: { kind: 'book', id: 'making-and-growing' },
    });
  }
  return progress;
}

function commitReadyProject(project: 'planter' | 'tool-rack'): ProjectsProgress {
  let progress = withBookAbilities(['B1', 'B2', 'G1', 'G2']);
  progress = reduceProjectProgress(progress, { type: 'materials', id: `materials-${project}`, project });
  return reduceProjectProgress(progress, { type: 'commit', id: `commit-${project}`, project, resident: 'pip' });
}

describe('project prerequisites and knowledge', () => {
  it('creates independent empty project and knowledge records', () => {
    const first = createProjectsProgress();
    const second = createProjectsProgress();

    expect(first).toEqual({
      book: false,
      knowledge: { pip: {}, moss: {}, fern: {} },
      projects: {
        planter: { supplies: 'absent', completedSteps: 0, deliveredForStep: null },
        'tool-rack': { supplies: 'absent', completedSteps: 0, deliveredForStep: null },
      },
      active: null,
      processed: [],
    });
    expect(first.projects.planter).not.toBe(first.projects['tool-rack']);
    expect(first.projects.planter).not.toBe(second.projects.planter);
    expect(first.knowledge.pip).not.toBe(second.knowledge.pip);
    expect(first.processed).not.toBe(second.processed);
  });

  it('supplies do not teach and a repeated delivery is harmless', () => {
    const e: ProjectEvent = { type: 'materials', id: 'rack-bundle', project: 'tool-rack' };
    const p = reduceProjectProgress(createProjectsProgress(), e);
    expect(p.knowledge.pip).toEqual({});
    expect(p.projects.planter.supplies).toBe('absent');
    expect(p.projects['tool-rack'].supplies).toBe('available');
    expect(reduceProjectProgress(p, e)).toBe(p);
  });

  it('allows book learning and materials to arrive in either order before commit', () => {
    let bookFirst = withBookAbilities(['B1']);
    expect(reduceProjectProgress(bookFirst, {
      type: 'commit', id: 'too-early-a', project: 'planter', resident: 'pip',
    })).toBe(bookFirst);
    bookFirst = reduceProjectProgress(bookFirst, { type: 'materials', id: 'bundle-a', project: 'planter' });
    expect(reduceProjectProgress(bookFirst, {
      type: 'commit', id: 'start-a', project: 'planter', resident: 'pip',
    }).active).toBe('planter');

    let materialsFirst = reduceProjectProgress(createProjectsProgress(), {
      type: 'materials', id: 'bundle-b', project: 'tool-rack',
    });
    materialsFirst = reduceProjectProgress(materialsFirst, { type: 'book', id: 'book-b' });
    materialsFirst = reduceProjectProgress(materialsFirst, {
      type: 'learn', id: 'learn-b', resident: 'moss', ability: 'B1',
      source: { kind: 'book', id: 'making-and-growing' },
    });
    expect(reduceProjectProgress(materialsFirst, {
      type: 'commit', id: 'start-b', project: 'tool-rack', resident: 'moss',
    }).active).toBe('tool-rack');
  });

  it('requires an available book for book learning without poisoning a retry id', () => {
    const fresh = createProjectsProgress();
    const early = reduceProjectProgress(fresh, {
      type: 'learn', id: 'lesson', resident: 'pip', ability: 'B1',
      source: { kind: 'book', id: 'making-and-growing' },
    });
    expect(early).toBe(fresh);

    const withBook = reduceProjectProgress(early, { type: 'book', id: 'book' });
    const learned = reduceProjectProgress(withBook, {
      type: 'learn', id: 'lesson', resident: 'pip', ability: 'B1',
      source: { kind: 'book', id: 'making-and-growing' },
    });
    expect(learned.knowledge.pip.B1).toEqual({
      status: 'familiar', source: { kind: 'book', id: 'making-and-growing' },
    });
    expect(learned.processed).toContain('lesson');
  });

  it('accepts observation without a book but keeps preview and legacy seeding outside runtime events', () => {
    const fresh = createProjectsProgress();
    const observed = reduceProjectProgress(fresh, {
      type: 'learn', id: 'observed', resident: 'fern', ability: 'G1',
      source: { kind: 'observation', id: 'pip-levels-soil' },
    });
    expect(observed.knowledge.fern.G1?.source.kind).toBe('observation');

    for (const kind of ['preview', 'legacy'] as const) {
      expect(reduceProjectProgress(observed, {
        type: 'learn', id: `runtime-${kind}`, resident: 'moss', ability: 'B1',
        source: { kind, id: `${kind}-fixture` },
      })).toBe(observed);
    }

    const explicitlySeeded = {
      ...fresh,
      knowledge: learnAbility(fresh.knowledge, 'moss', 'B1', { kind: 'preview', id: 'scenario-preview' }),
    };
    expect(explicitlySeeded.knowledge.moss.B1?.source.kind).toBe('preview');
  });
});

describe('authoritative ordered project progress', () => {
  it('allows only one committed project to be active at a time', () => {
    let progress = withBookAbilities(['B1']);
    progress = reduceProjectProgress(progress, { type: 'materials', id: 'planter-bundle', project: 'planter' });
    progress = reduceProjectProgress(progress, { type: 'materials', id: 'rack-bundle', project: 'tool-rack' });
    const active = reduceProjectProgress(progress, {
      type: 'commit', id: 'start-planter', project: 'planter', resident: 'pip',
    });
    const excluded = reduceProjectProgress(active, {
      type: 'commit', id: 'start-rack', project: 'tool-rack', resident: 'pip',
    });

    expect(excluded).toBe(active);
    expect(active.projects.planter.supplies).toBe('committed');
    expect(active.projects['tool-rack'].supplies).toBe('available');
    expect(active.active).toBe('planter');
  });

  it('accepts only the exact active, committed, next-step delivery and keeps rejected ids retryable', () => {
    const committed = commitReadyProject('planter');
    const wrongStep = reduceProjectProgress(committed, {
      type: 'deliver', id: 'delivery', project: 'planter', step: 1,
    });
    expect(wrongStep).toBe(committed);
    expect(reduceProjectProgress(committed, {
      type: 'deliver', id: 'wrong-project', project: 'tool-rack', step: 0,
    })).toBe(committed);

    const delivered = reduceProjectProgress(wrongStep, {
      type: 'deliver', id: 'delivery', project: 'planter', step: 0,
    });
    expect(delivered.projects.planter.deliveredForStep).toBe(0);
    expect(delivered.projects.planter.supplies).toBe('committed');
    expect(delivered.processed).toContain('delivery');
    expect(reduceProjectProgress(delivered, {
      type: 'deliver', id: 'another-delivery', project: 'planter', step: 0,
    })).toBe(delivered);
  });

  it('rejects completion without delivery, at the wrong stage, or by an unqualified resident', () => {
    const committed = commitReadyProject('planter');
    expect(reduceProjectProgress(committed, {
      type: 'complete', id: 'complete', project: 'planter', step: 0, resident: 'pip',
    })).toBe(committed);

    const delivered = reduceProjectProgress(committed, {
      type: 'deliver', id: 'delivery', project: 'planter', step: 0,
    });
    expect(reduceProjectProgress(delivered, {
      type: 'complete', id: 'wrong-stage', project: 'planter', step: 1, resident: 'pip',
    })).toBe(delivered);
    expect(reduceProjectProgress(delivered, {
      type: 'complete', id: 'complete', project: 'planter', step: 0, resident: 'moss',
    })).toBe(delivered);

    const completed = reduceProjectProgress(delivered, {
      type: 'complete', id: 'complete', project: 'planter', step: 0, resident: 'pip',
    });
    expect(completed.projects.planter).toEqual({
      supplies: 'committed', completedSteps: 1, deliveredForStep: null,
    });
    expect(completed.knowledge.pip.B1?.status).toBe('practiced');
    expect(delivered.knowledge.pip.B1?.status).toBe('familiar');
  });

  it('transfers learned and practiced building abilities to the other recipe', () => {
    let progress = commitReadyProject('planter');
    for (const step of [0, 1]) {
      progress = reduceProjectProgress(progress, {
        type: 'deliver', id: `planter-deliver-${step}`, project: 'planter', step,
      });
      progress = reduceProjectProgress(progress, {
        type: 'complete', id: `planter-complete-${step}`, project: 'planter', step, resident: 'pip',
      });
    }
    expect(progress.knowledge.pip.B1?.status).toBe('practiced');
    expect(progress.knowledge.pip.B2?.status).toBe('practiced');

    progress = reduceProjectProgress(progress, { type: 'materials', id: 'rack-bundle', project: 'tool-rack' });
    expect(reduceProjectProgress(progress, {
      type: 'commit', id: 'rack-blocked', project: 'tool-rack', resident: 'pip',
    })).toBe(progress);

    // Finish the already-active planter, then reuse the same resident knowledge.
    for (const step of [2, 3, 4, 5]) {
      progress = reduceProjectProgress(progress, {
        type: 'deliver', id: `planter-deliver-${step}`, project: 'planter', step,
      });
      progress = reduceProjectProgress(progress, {
        type: 'complete', id: `planter-complete-${step}`, project: 'planter', step, resident: 'pip',
      });
    }
    const rack = reduceProjectProgress(progress, {
      type: 'commit', id: 'rack-start', project: 'tool-rack', resident: 'pip',
    });
    expect(rack.active).toBe('tool-rack');
    expect(rack.projects['tool-rack'].supplies).toBe('committed');
  });

  it('marks the final step complete, uses the bundle, and releases the active project', () => {
    let progress = commitReadyProject('tool-rack');
    for (let step = 0; step < 6; step += 1) {
      expect(nextRecipeStep(progress, 'tool-rack')?.id).toBe([
        'fit-base', 'tap-base', 'fit-upright', 'tap-upright', 'fit-crossbar', 'tap-crossbar',
      ][step]);
      progress = reduceProjectProgress(progress, {
        type: 'deliver', id: `deliver-${step}`, project: 'tool-rack', step,
      });
      progress = reduceProjectProgress(progress, {
        type: 'complete', id: `complete-${step}`, project: 'tool-rack', step, resident: 'pip',
      });
    }

    expect(progress.projects['tool-rack']).toEqual({
      supplies: 'used', completedSteps: 6, deliveredForStep: null,
    });
    expect(progress.active).toBeNull();
    expect(nextRecipeStep(progress, 'tool-rack')).toBeNull();
    expect(projectComplete(progress, 'tool-rack')).toBe(true);
    expect(projectComplete(progress, 'planter')).toBe(false);
    expect(reduceProjectProgress(progress, {
      type: 'complete', id: 'complete-5', project: 'tool-rack', step: 5, resident: 'pip',
    })).toBe(progress);
  });
});
