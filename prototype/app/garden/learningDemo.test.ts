import { describe, expect, it } from 'vitest';
import { createDemoProgress, demoBookAvailable, demoMaterialsAvailable } from './learningDemo';
import { createGardenSession, gardenSessionReducer, visibleProjects, sessionResidents } from './gardenSession';

describe('isolated learning scenarios', () => {
  it.each([
    ['planter-materials-first', false, 'available', 'absent'],
    ['planter-knowledge-first', true, 'absent', 'absent'],
    ['rack-from-scratch', true, 'absent', 'absent'],
    ['rack-preview', false, 'absent', 'available'],
    ['planter-to-rack', true, 'available', 'absent'],
  ] as const)('starts %s with only its named opportunities', (id, book, planter, rack) => {
    const progress = createDemoProgress({ id, residents: 1 });
    expect(progress.book).toBe(book);
    expect(progress.projects.planter.supplies).toBe(planter);
    expect(progress.projects['tool-rack'].supplies).toBe(rack);
    expect(progress.knowledge.moss).toEqual({});
    expect(progress.knowledge.fern).toEqual({});
    if (id !== 'rack-preview') expect(progress.knowledge.pip).toEqual({});
  });
  it('preview knowledge is explicit, fresh, familiar and never contaminates ordinary progress', () => {
    const before = createGardenSession();
    const next = gardenSessionReducer(before, { type: 'start-demo', scenario: { id: 'rack-preview', residents: 3 } });
    expect(next.project).toBe(before.project);
    expect(next.previousProject).toBe(before.previousProject);
    for (const resident of ['pip', 'moss', 'fern'] as const) {
      expect(next.demo?.progress.knowledge[resident].B1).toMatchObject({ status: 'familiar', source: { kind: 'preview' } });
      expect(next.demo?.progress.knowledge[resident].B2).toMatchObject({ status: 'familiar', source: { kind: 'preview' } });
      expect(next.demo?.progress.knowledge[resident].G1).toBeUndefined();
    }
    expect(next.epoch).toBeGreaterThan(before.epoch);
    const replay = gardenSessionReducer(next, { type: 'start-demo', scenario: next.demo!.scenario });
    expect(replay.demo?.progress).not.toBe(next.demo?.progress);
    expect(replay.epoch).toBe(next.epoch + 1);
    expect(visibleProjects(next)).toBe(next.demo?.progress);
  });
  it('routes only current roster/current epoch batches and preserves demo through remount', () => {
    const start = gardenSessionReducer(createGardenSession(), { type: 'start-demo', scenario: { id: 'planter-knowledge-first', residents: 1 } });
    expect(sessionResidents(start).map(r => r.id)).toEqual(['pip']);
    const events = [{ type: 'learn' as const, id: 'read', resident: 'pip' as const, ability: 'B1' as const, source: { kind: 'book' as const, id: 'book' } }];
    expect(gardenSessionReducer(start, { type: 'project', epoch: start.epoch - 1, events })).toBe(start);
    expect(gardenSessionReducer(start, { type: 'project', epoch: start.epoch, events: [{ ...events[0], resident: 'moss' }] })).toBe(start);
    const learned = gardenSessionReducer(start, { type: 'project', epoch: start.epoch, events });
    expect(learned.project).toBe(start.project);
    expect(learned.demo?.progress.knowledge.pip.B1?.status).toBe('familiar');
    expect(gardenSessionReducer(learned, { type: 'project', epoch: learned.epoch, events })).toBe(learned);
    const remount = gardenSessionReducer(learned, { type: 'remount' });
    expect(remount.demo).toBe(learned.demo);
    expect(remount.epoch).toBe(learned.epoch + 1);
  });
  it('blocks ordinary changes and memories in demos and exits to a fresh ordinary journey', () => {
    const start = gardenSessionReducer(createGardenSession(), { type: 'start-demo', scenario: { id: 'rack-preview', residents: 3 } });
    expect(gardenSessionReducer(start, { type: 'journey', event: { type: 'remember', interaction: 'pet', residentId: 'moss' } })).toBe(start);
    expect(gardenSessionReducer(start, { type: 'journey', event: { type: 'preview-community' } })).toBe(start);
    expect(gardenSessionReducer(start, { type: 'journey', event: { type: 'reset' } })).toBe(start);
    expect(gardenSessionReducer(start, { type: 'view', view: 'before' })).toBe(start);
    expect(gardenSessionReducer(start, { type: 'materials', id: 'ordinary' })).toBe(start);
    const exit = gardenSessionReducer(start, { type: 'exit-demo' });
    expect(exit.demo).toBeNull();
    expect(exit.project).toEqual(createGardenSession().project);
    expect(exit.journey).toEqual(createGardenSession().journey);
    expect(exit.epoch).toBe(start.epoch + 1);
  });
  it('enforces scenario opportunity order in the reducer', () => {
    let s = gardenSessionReducer(createGardenSession(), { type: 'start-demo', scenario: { id: 'planter-knowledge-first', residents: 1 } });
    expect(demoMaterialsAvailable(s.demo!, 'planter')).toBe(false);
    expect(gardenSessionReducer(s, { type: 'demo-materials', id: 'early', project: 'planter' })).toBe(s);
    s = gardenSessionReducer(s, { type: 'project', epoch: s.epoch, events: [{ type: 'learn', id: 'read', resident: 'pip', ability: 'B1', source: { kind: 'book', id: 'book' } }] });
    expect(demoMaterialsAvailable(s.demo!, 'planter')).toBe(true);
    expect(demoMaterialsAvailable(s.demo!, 'tool-rack')).toBe(false);
    s = gardenSessionReducer(s, { type: 'demo-materials', id: 'bundle', project: 'planter' });
    expect(s.demo?.progress.projects.planter.supplies).toBe('available');
    expect(demoMaterialsAvailable(s.demo!, 'planter')).toBe(false);
    const transfer = { scenario: { id: 'planter-to-rack' as const, residents: 1 as const }, progress: createDemoProgress({ id: 'planter-to-rack', residents: 1 }) };
    expect(demoMaterialsAvailable(transfer, 'tool-rack')).toBe(false);
    transfer.progress.projects.planter.completedSteps = 6;
    expect(demoMaterialsAvailable(transfer, 'tool-rack')).toBe(true);
    const materials = gardenSessionReducer(s, { type: 'start-demo', scenario: { id: 'planter-materials-first', residents: 1 } });
    expect(demoBookAvailable(materials.demo!)).toBe(true);
    const book = gardenSessionReducer(materials, { type: 'demo-book', id: 'offered-book' });
    expect(book.demo?.progress.book).toBe(true);
    expect(demoBookAvailable(book.demo!)).toBe(false);
  });
});
