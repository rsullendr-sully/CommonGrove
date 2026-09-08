import { describe, expect, it } from 'vitest';
import { createProjectsProgress, nextRecipeStep, reduceProjectProgress, type ProjectsProgress } from './projectProgress';
import { projectPlanter } from './planterProgress';

function learn(progress: ProjectsProgress, resident: 'pip' | 'moss' | 'fern', abilities: readonly ('B1' | 'B2' | 'G1' | 'G2')[]) {
  return abilities.reduce((p, ability) => reduceProjectProgress(p, {
    type: 'learn', id: resident + ':' + ability, resident, ability, source: { kind: 'book', id: 'book' },
  }), progress);
}
function readyProgress() {
  let p = reduceProjectProgress(createProjectsProgress(), { type: 'book', id: 'book' });
  p = learn(p, 'pip', ['B1', 'B2']);
  p = learn(p, 'fern', ['G1', 'G2']);
  return reduceProjectProgress(p, { type: 'materials', id: 'bundle', project: 'planter' });
}
function commit(p = readyProgress()) {
  return reduceProjectProgress(p, { type: 'commit', id: 'commit', project: 'planter', resident: 'pip' });
}
function deliver(p: ProjectsProgress, step: number, id = 'deliver-' + step) {
  return reduceProjectProgress(p, { type: 'deliver', id, project: 'planter', step });
}
function complete(p: ProjectsProgress, step: number, resident: 'pip' | 'moss' | 'fern', id = 'complete-' + step) {
  return reduceProjectProgress(p, { type: 'complete', id, project: 'planter', step, resident });
}

describe('migrated planter progress prerequisites', () => {
  it('starts with no shared knowledge, supplies, or construction progress and no shared mutable records', () => {
    const a = createProjectsProgress(), b = createProjectsProgress();
    expect(a.book).toBe(false); expect(a.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
    expect(a.projects.planter).toEqual({ supplies: 'absent', completedSteps: 0, deliveredForStep: null });
    expect(a.processed).toEqual([]);
    for (const resident of ['pip', 'moss', 'fern'] as const) expect(a.knowledge[resident]).not.toBe(b.knowledge[resident]);
    expect(a.processed).not.toBe(b.processed);
  });
  it('allows either book/material order but requires qualified knowledge and supplies', () => {
    let bookFirst = reduceProjectProgress(createProjectsProgress(), { type: 'book', id: 'book-a' });
    bookFirst = learn(bookFirst, 'pip', ['B1']);
    expect(commit(bookFirst)).toBe(bookFirst);
    bookFirst = reduceProjectProgress(bookFirst, { type: 'materials', id: 'bundle-a', project: 'planter' });
    expect(commit(bookFirst).active).toBe('planter');
    let materialsFirst = reduceProjectProgress(createProjectsProgress(), { type: 'materials', id: 'bundle-b', project: 'planter' });
    expect(commit(materialsFirst)).toBe(materialsFirst);
    materialsFirst = reduceProjectProgress(materialsFirst, { type: 'book', id: 'book-b' });
    expect(commit(materialsFirst)).toBe(materialsFirst);
    materialsFirst = learn(materialsFirst, 'pip', ['B1']);
    expect(commit(materialsFirst).active).toBe('planter');
  });
  it('unlocks book learning only after the book and unions abilities per resident', () => {
    const fresh = createProjectsProgress(); expect(learn(fresh, 'fern', ['B1'])).toBe(fresh);
    const book = reduceProjectProgress(fresh, { type: 'book', id: 'book' });
    const learned = learn(book, 'fern', ['B1', 'B2', 'G1', 'G2', 'B1']);
    expect(Object.keys(learned.knowledge.fern)).toEqual(['B1', 'B2', 'G1', 'G2']);
    expect(learned.knowledge.pip).toEqual({}); expect(learned.knowledge.moss).toEqual({});
    expect(learn(learned, 'fern', ['G1', 'G2'])).toBe(learned);
  });
  it('does not turn a materials delivery into knowledge', () => {
    const e = { type: 'materials' as const, id: 'bundle', project: 'planter' as const };
    const p = reduceProjectProgress(createProjectsProgress(), e);
    expect(p.projects.planter.supplies).toBe('available');
    expect(commit(p)).toBe(p); expect(p.knowledge.pip).toEqual({});
    expect(reduceProjectProgress(p, e)).toBe(p);
  });
  it('accepts only one supply bundle even when later deliveries use distinct IDs', () => {
    const p = readyProgress();
    expect(reduceProjectProgress(p, { type: 'materials', id: 'second', project: 'planter' })).toBe(p);
  });
});

describe('ordered planter construction and read-only geometry', () => {
  it.each([[0, 'empty'], [1, 'base'], [2, 'base'], [3, 'frame'], [4, 'frame'], [5, 'soil'], [6, 'planted']] as const)(
    'projects %s completed steps into %s geometry without changing progress', (completedSteps, stage) => {
      const p = readyProgress(); p.projects.planter.completedSteps = completedSteps;
      const before = structuredClone(p);
      expect(projectPlanter(p)).toEqual({ stage, book: true, supplies: 'available' });
      expect(p).toEqual(before);
      expect(nextRecipeStep(p, 'planter') === null).toBe(completedSteps === 6);
    });
  it('commits the one available bundle only for a resident with building knowledge', () => {
    const ready = readyProgress();
    const rejected = reduceProjectProgress(ready, { type: 'commit', id: 'commit', project: 'planter', resident: 'fern' });
    expect(rejected).toBe(ready);
    const committed = commit(rejected);
    expect(committed.projects.planter.supplies).toBe('committed'); expect(committed.processed).toContain('commit');
    expect(ready.projects.planter.supplies).toBe('available'); expect(ready.processed).not.toContain('commit');
    expect(reduceProjectProgress(committed, { type: 'commit', id: 'again', project: 'planter', resident: 'pip' })).toBe(committed);
  });
  it('delivers only the exact next step and does not consume a rejected event ID', () => {
    const p = commit(); expect(deliver(p, 1, 'delivery')).toBe(p);
    const delivered = deliver(p, 0, 'delivery');
    expect(delivered.projects.planter).toMatchObject({ completedSteps: 0, deliveredForStep: 0 });
    expect(delivered.processed).toContain('delivery'); expect(p.projects.planter.deliveredForStep).toBeNull();
    expect(p.processed).not.toContain('delivery');
    expect(deliver(delivered, 0, 'delivery')).toBe(delivered);
    expect(deliver(delivered, 0, 'another')).toBe(delivered);
  });
  it('builds each delivered step in order with the required resident ability', () => {
    let p = commit();
    for (const [step, resident] of [[0, 'pip'], [1, 'pip'], [2, 'pip'], [3, 'pip'], [4, 'fern'], [5, 'fern']] as const) {
      p = complete(deliver(p, step), step, resident);
      expect(p.projects.planter).toMatchObject({ completedSteps: step + 1, deliveredForStep: null });
    }
    expect(p.projects.planter.supplies).toBe('used'); expect(nextRecipeStep(p, 'planter')).toBeNull();
  });
  it('rejects wrong-step, untrained and repeated completion without mutating prior states', () => {
    const committed = commit(), delivered = deliver(committed, 0);
    expect(complete(delivered, 1, 'pip')).toBe(delivered); expect(complete(delivered, 0, 'fern')).toBe(delivered);
    const built = complete(delivered, 0, 'pip');
    expect(built.projects.planter).toMatchObject({ completedSteps: 1, deliveredForStep: null });
    expect(complete(built, 0, 'pip')).toBe(built); expect(complete(built, 0, 'pip', 'again')).toBe(built);
    expect(committed.projects.planter).toMatchObject({ completedSteps: 0, deliveredForStep: null });
    expect(delivered.projects.planter).toMatchObject({ completedSteps: 0, deliveredForStep: 0 });
    expect(delivered.processed).not.toContain('complete-0');
  });
  it('requires growing knowledge for both soil and planted steps', () => {
    let p = commit();
    for (const step of [0, 1, 2, 3]) p = complete(deliver(p, step), step, 'pip');
    p = deliver(p, 4);
    expect(complete(p, 4, 'pip')).toBe(p); expect(complete(p, 4, 'moss')).toBe(p);
    p = complete(p, 4, 'fern'); p = deliver(p, 5);
    expect(complete(p, 5, 'pip')).toBe(p); expect(complete(p, 5, 'moss')).toBe(p);
  });
});
