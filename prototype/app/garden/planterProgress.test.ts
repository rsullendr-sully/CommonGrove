import { describe, expect, it } from 'vitest';
import {
  canStartPlanter,
  createPlanterProgress,
  nextBuildStage,
  reducePlanterProgress,
  type BuildStage,
} from './planterProgress';

describe('planter progress prerequisites', () => {
  it('starts with no shared knowledge, supplies, or construction progress', () => {
    const first = createPlanterProgress();
    const second = createPlanterProgress();

    expect(first).toEqual({
      book: false,
      knowledge: { pip: [], moss: [], fern: [] },
      supplies: 'absent',
      stage: 'empty',
      delivered: false,
      processed: [],
    });
    expect(first.knowledge.pip).not.toBe(second.knowledge.pip);
    expect(first.knowledge.moss).not.toBe(second.knowledge.moss);
    expect(first.knowledge.fern).not.toBe(second.knowledge.fern);
    expect(first.processed).not.toBe(second.processed);
  });

  it('allows either prerequisite order but requires book, assembly knowledge, and supplies', () => {
    let bookFirst = reducePlanterProgress(createPlanterProgress(), { type: 'book', id: 'book-a' });
    bookFirst = reducePlanterProgress(bookFirst, {
      type: 'learn', id: 'learn-a', resident: 'pip', abilities: ['assembly'],
    });
    expect(canStartPlanter(bookFirst, 'pip')).toBe(false);
    bookFirst = reducePlanterProgress(bookFirst, { type: 'materials', id: 'bundle-a' });
    expect(canStartPlanter(bookFirst, 'pip')).toBe(true);

    let materialsFirst = reducePlanterProgress(createPlanterProgress(), { type: 'materials', id: 'bundle-b' });
    materialsFirst = reducePlanterProgress(materialsFirst, { type: 'book', id: 'book-b' });
    expect(canStartPlanter(materialsFirst, 'moss')).toBe(false);
    materialsFirst = reducePlanterProgress(materialsFirst, {
      type: 'learn', id: 'learn-b', resident: 'moss', abilities: ['assembly'],
    });
    expect(canStartPlanter(materialsFirst, 'moss')).toBe(true);
  });

  it('unlocks learning only after the book and unions abilities per resident', () => {
    const fresh = createPlanterProgress();
    const rejected = reducePlanterProgress(fresh, {
      type: 'learn', id: 'early', resident: 'fern', abilities: ['assembly'],
    });
    expect(rejected).toBe(fresh);

    const withBook = reducePlanterProgress(fresh, { type: 'book', id: 'book-1' });
    const learned = reducePlanterProgress(withBook, {
      type: 'learn', id: 'lesson-1', resident: 'fern', abilities: ['assembly', 'planting', 'assembly'],
    });
    expect(learned.knowledge).toEqual({
      pip: [],
      moss: [],
      fern: ['assembly', 'planting'],
    });
    expect(reducePlanterProgress(learned, {
      type: 'learn', id: 'lesson-2', resident: 'fern', abilities: ['planting'],
    })).toBe(learned);
  });

  it('does not turn a materials delivery into knowledge', () => {
    const p = reducePlanterProgress(createPlanterProgress(), { type: 'materials', id: 'bundle-1' });
    expect(p.supplies).toBe('available');
    expect(canStartPlanter(p, 'pip')).toBe(false);
    expect(p.knowledge.pip).toEqual([]);
    expect(reducePlanterProgress(p, { type: 'materials', id: 'bundle-1' })).toBe(p);
  });

  it('accepts only one supply bundle even when later deliveries use distinct IDs', () => {
    const supplied = reducePlanterProgress(createPlanterProgress(), { type: 'materials', id: 'bundle-1' });
    expect(reducePlanterProgress(supplied, { type: 'materials', id: 'bundle-2' })).toBe(supplied);
  });
});

const readyProgress = () => {
  let progress = reducePlanterProgress(createPlanterProgress(), { type: 'book', id: 'book-ready' });
  progress = reducePlanterProgress(progress, {
    type: 'learn', id: 'pip-assembly', resident: 'pip', abilities: ['assembly'],
  });
  progress = reducePlanterProgress(progress, {
    type: 'learn', id: 'fern-planting', resident: 'fern', abilities: ['planting'],
  });
  return reducePlanterProgress(progress, { type: 'materials', id: 'bundle-ready' });
};

describe('ordered planter construction', () => {
  it.each([
    ['empty', 'base'],
    ['base', 'frame'],
    ['frame', 'soil'],
    ['soil', 'planted'],
    ['planted', null],
  ] as const)('advances %s to %s', (stage, expected) => {
    expect(nextBuildStage(stage)).toBe(expected);
  });

  it('commits the one available bundle only for a resident with assembly knowledge', () => {
    const ready = readyProgress();
    const rejected = reducePlanterProgress(ready, { type: 'commit', id: 'commit-1', resident: 'fern' });
    expect(rejected).toBe(ready);

    const committed = reducePlanterProgress(rejected, { type: 'commit', id: 'commit-1', resident: 'pip' });
    expect(committed.supplies).toBe('committed');
    expect(committed.processed).toContain('commit-1');
    expect(ready.supplies).toBe('available');
    expect(ready.processed).not.toContain('commit-1');
    expect(reducePlanterProgress(committed, { type: 'commit', id: 'commit-2', resident: 'pip' })).toBe(committed);
  });

  it('delivers only the exact next stage and does not consume a rejected event ID', () => {
    const committed = reducePlanterProgress(readyProgress(), {
      type: 'commit', id: 'commit-ready', resident: 'pip',
    });
    const wrongStage = reducePlanterProgress(committed, { type: 'deliver', id: 'delivery-1', stage: 'frame' });
    expect(wrongStage).toBe(committed);

    const delivered = reducePlanterProgress(wrongStage, { type: 'deliver', id: 'delivery-1', stage: 'base' });
    expect(delivered).toMatchObject({ stage: 'empty', delivered: true });
    expect(delivered.processed).toContain('delivery-1');
    expect(committed.delivered).toBe(false);
    expect(committed.processed).not.toContain('delivery-1');
    expect(reducePlanterProgress(delivered, { type: 'deliver', id: 'delivery-1', stage: 'base' })).toBe(delivered);
    expect(reducePlanterProgress(delivered, { type: 'deliver', id: 'delivery-2', stage: 'base' })).toBe(delivered);
  });

  it('builds each delivered stage in order with the required resident ability', () => {
    let progress = reducePlanterProgress(readyProgress(), {
      type: 'commit', id: 'commit-build', resident: 'pip',
    });

    const builders: Array<['base' | 'frame' | 'soil' | 'planted', 'pip' | 'fern']> = [
      ['base', 'pip'],
      ['frame', 'pip'],
      ['soil', 'fern'],
      ['planted', 'fern'],
    ];
    for (const [stage, resident] of builders) {
      progress = reducePlanterProgress(progress, { type: 'deliver', id: `deliver-${stage}`, stage });
      progress = reducePlanterProgress(progress, { type: 'build', id: `build-${stage}`, resident, stage });
      expect(progress).toMatchObject({ stage, delivered: false });
    }

    expect(progress.supplies).toBe('used');
    expect(nextBuildStage(progress.stage)).toBeNull();
  });

  it('rejects wrong-stage, untrained, and repeated builds without mutating prior states', () => {
    const committed = reducePlanterProgress(readyProgress(), {
      type: 'commit', id: 'commit-guards', resident: 'pip',
    });
    const delivered = reducePlanterProgress(committed, { type: 'deliver', id: 'deliver-base', stage: 'base' });

    expect(reducePlanterProgress(delivered, {
      type: 'build', id: 'build-wrong-stage', resident: 'pip', stage: 'frame',
    })).toBe(delivered);
    const untrained = reducePlanterProgress(delivered, {
      type: 'build', id: 'build-base', resident: 'fern', stage: 'base',
    });
    expect(untrained).toBe(delivered);

    const built = reducePlanterProgress(untrained, {
      type: 'build', id: 'build-base', resident: 'pip', stage: 'base',
    });
    expect(built).toMatchObject({ stage: 'base', delivered: false });
    expect(reducePlanterProgress(built, {
      type: 'build', id: 'build-base', resident: 'pip', stage: 'base',
    })).toBe(built);
    expect(reducePlanterProgress(built, {
      type: 'build', id: 'build-base-again', resident: 'pip', stage: 'base',
    })).toBe(built);

    expect(committed).toMatchObject({ stage: 'empty', delivered: false });
    expect(delivered).toMatchObject({ stage: 'empty', delivered: true });
    expect(delivered.processed).not.toContain('build-base');
  });

  it('requires planting knowledge for both soil and planted stages', () => {
    let progress = reducePlanterProgress(readyProgress(), {
      type: 'commit', id: 'commit-planting', resident: 'pip',
    });
    for (const stage of ['base', 'frame'] as BuildStage[]) {
      progress = reducePlanterProgress(progress, { type: 'deliver', id: `deliver-${stage}`, stage });
      progress = reducePlanterProgress(progress, { type: 'build', id: `build-${stage}`, resident: 'pip', stage });
    }

    progress = reducePlanterProgress(progress, { type: 'deliver', id: 'deliver-soil', stage: 'soil' });
    expect(reducePlanterProgress(progress, {
      type: 'build', id: 'build-soil-pip', resident: 'pip', stage: 'soil',
    })).toBe(progress);
    expect(reducePlanterProgress(progress, {
      type: 'build', id: 'build-soil-moss', resident: 'moss', stage: 'soil',
    })).toBe(progress);

    progress = reducePlanterProgress(progress, {
      type: 'build', id: 'build-soil-fern', resident: 'fern', stage: 'soil',
    });
    progress = reducePlanterProgress(progress, {
      type: 'deliver', id: 'deliver-planted', stage: 'planted',
    });
    expect(reducePlanterProgress(progress, {
      type: 'build', id: 'build-planted-pip', resident: 'pip', stage: 'planted',
    })).toBe(progress);
    expect(reducePlanterProgress(progress, {
      type: 'build', id: 'build-planted-moss', resident: 'moss', stage: 'planted',
    })).toBe(progress);
  });
});
