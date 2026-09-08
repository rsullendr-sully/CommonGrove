import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LearningDemoPanel, { acceptedMilestones, nextMilestoneHistory, projectWaiting } from './LearningDemoPanel';
import { createGardenSession, gardenSessionReducer, type GardenSession } from './gardenSession';
import { requiresDemoConfirmation, type DemoScenarioId } from './learningDemo';
import { createProjectsProgress, reduceProjectProgress } from './projectProgress';

const start = (id: DemoScenarioId) => gardenSessionReducer(createGardenSession(), { type: 'start-demo', scenario: { id, residents: 1 } });
const render = (session = createGardenSession(), busy = false) => renderToStaticMarkup(createElement(LearningDemoPanel, {
  session, busy, activities: {}, onStart() {}, onExit() {}, onBook() {}, onMaterials() {}, onWatch() {},
}));
describe('learning demo controls', () => {
  it('exposes a named launcher and all five selectable scenarios', () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*>Learning demo<\/button>/);
    for (const label of ['Materials before knowledge', 'Knowledge before materials', 'Tool rack from scratch', 'Tool rack preview', 'Planter to tool rack']) expect(html).toContain(label);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('hidden=""');
  });
  it('disables opportunities outside demos and inappropriate materials within them', () => {
    expect(render()).toMatch(/<button[^>]*disabled=""[^>]*>Add book/);
    expect(render(start('planter-materials-first'))).toMatch(/<button(?![^>]*disabled)[^>]*>Add book/);
    expect(render(start('planter-knowledge-first'))).toMatch(/<button[^>]*disabled=""[^>]*>Add planter materials/);
    expect(render(start('rack-from-scratch'))).toMatch(/<button(?![^>]*disabled)[^>]*>Add tool rack materials/);
    expect(render(start('rack-from-scratch'), true)).toMatch(/<button[^>]*disabled=""[^>]*>Add tool rack materials/);
  });
  it('labels seeded preview knowledge and limits available abilities to four', () => {
    const html = render(start('rack-preview'));
    expect(html).toContain('Preview seed');
    expect(html.match(/data-enabled-ability=/g)).toHaveLength(4);
    expect(html).toContain('unfamiliar');
    expect(html).toContain('familiar');
    expect(html).toContain('Planned');
  });
  it('confirms demos and every kind of ordinary progress, but ignores mount epochs', () => {
    const initial = createGardenSession();
    expect(requiresDemoConfirmation(initial)).toBe(false);
    expect(requiresDemoConfirmation({ ...initial, epoch: 7 })).toBe(false);
    expect(requiresDemoConfirmation(start('rack-from-scratch'))).toBe(true);
    for (const event of [{ type: 'accomplishment' }, { type: 'remember', interaction: 'pet' }] as const) {
      expect(requiresDemoConfirmation(gardenSessionReducer(initial, { type: 'journey', event }))).toBe(true);
    }
    expect(requiresDemoConfirmation(gardenSessionReducer(initial, { type: 'materials', id: 'supplies' }))).toBe(true);
    const history: GardenSession = { ...initial, previousProject: reduceProjectProgress(initial.project, { type: 'book', id: 'old-book' }) };
    expect(requiresDemoConfirmation(history)).toBe(true);
  });
  it('describes missing book, skill and project bundle without assigning a worker', () => {
    expect(projectWaiting(start('planter-materials-first'), 'planter', {}, false)).toContain('book');
    expect(projectWaiting(start('planter-knowledge-first'), 'planter', {}, false)).toContain('B1');
    expect(projectWaiting(start('rack-preview'), 'tool-rack', {}, true)).toContain('interaction');
  });
  it('records only accepted changes, distinguishing familiarity from practice', () => {
    const p = createProjectsProgress();
    const rejected = reduceProjectProgress(p, { type: 'learn', id: 'rejected', resident: 'pip', ability: 'B1', source: { kind: 'book', id: 'book' } });
    expect(acceptedMilestones(p, rejected)).toEqual([]);
    const book = reduceProjectProgress(p, { type: 'book', id: 'book' });
    const learned = reduceProjectProgress(book, { type: 'learn', id: 'learn', resident: 'pip', ability: 'B1', source: { kind: 'book', id: 'book' } });
    expect(acceptedMilestones(book, learned)).toEqual(['Pip: fit pieces became familiar (Book).']);
    expect(acceptedMilestones(learned, learned)).toEqual([]);
  });
  it('retains the newest twelve milestones and ignores comparison snapshots', () => {
    const session = createGardenSession();
    const history = { scope: null, progress: session.project, entries: Array.from({ length: 12 }, (_, i) => `earlier ${i}`) };
    const updated = gardenSessionReducer(session, { type: 'materials', id: 'bundle' });
    const next = nextMilestoneHistory(history, updated);
    expect(next.entries).toHaveLength(12);
    expect(next.entries[0]).toBe('earlier 1');
    expect(next.entries.at(-1)).toBe('Planter materials arrived.');
    expect(nextMilestoneHistory(next, { ...updated, view: 'before', journey: { ...updated.journey, rewardStage: 1 } })).toBe(next);
    expect(nextMilestoneHistory(next, createGardenSession()).entries).toEqual([]);
  });
});
