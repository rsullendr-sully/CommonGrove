import { describe, expect, it } from 'vitest';
import { createProjectRuntime, stepProject } from './projectScheduler';
import { reduceProjectProgress } from './projectProgress';
import {
  createGardenMountHandshake,
  createGardenSession,
  gardenSessionReducer,
  visibleProjects,
} from './gardenSession';

describe('garden session project history', () => {
  it('keeps pre-reward project snapshots while the live project receives the reading book', () => {
    let session = createGardenSession();
    session = gardenSessionReducer(session, { type: 'materials', id: 'bundle-1' });
    expect(visibleProjects(session).projects.planter.supplies).toBe('available');

    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'accomplishment' } });
    expect(session.previousProject).toMatchObject({ projects: { planter: { supplies: 'available' } }, book: false });
    expect(visibleProjects(session)).toBe(session.previousProject);

    session = gardenSessionReducer(session, { type: 'view', view: 'now' });
    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'accomplishment' } });
    expect(session.journey.rewardStage).toBe(2);
    expect(session.project).toMatchObject({ projects: { planter: { supplies: 'available' } }, book: true });
    expect(session.previousProject).toMatchObject({ projects: { planter: { supplies: 'available' } }, book: false });
    expect(visibleProjects(session)).toBe(session.project);

    session = gardenSessionReducer(session, { type: 'view', view: 'before' });
    expect(visibleProjects(session)).toBe(session.previousProject);
  });

  it('captures project progress immediately before a successful return', () => {
    let session = createGardenSession();
    for (let index = 0; index < 3; index += 1) {
      session = gardenSessionReducer(session, { type: 'journey', event: { type: 'accomplishment' } });
    }
    session = gardenSessionReducer(session, { type: 'view', view: 'now' });
    session = gardenSessionReducer(session, {
      type: 'project', epoch: session.epoch,
      events: [{ type: 'learn', id: 'pip-read', resident: 'pip', ability: 'B1', source: { kind: 'book', id: 'book' } }],
    });
    const projectBeforeReturn = session.project;

    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'return' } });
    expect(session.journey.visit).toBe(2);
    expect(session.previousProject).toBe(projectBeforeReturn);

    session = gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: [
      { type: 'learn', id: 'moss-read', resident: 'moss', ability: 'B1', source: { kind: 'book', id: 'book' } },
    ] });
    expect(session.project.knowledge.moss).toMatchObject({ B1: { status: 'familiar' } });
    expect(session.previousProject.knowledge.moss).toEqual({});
    session = gardenSessionReducer(session, { type: 'view', view: 'before' });
    expect(visibleProjects(session)).toBe(projectBeforeReturn);
  });

  it('makes preview history coherent with the expanded nook without inventing knowledge', () => {
    let session = createGardenSession();
    session = gardenSessionReducer(session, { type: 'materials', id: 'early-bundle' });
    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'preview-community' } });

    expect(session.journey.visit).toBe(3);
    expect(session.project).toMatchObject({ book: true, projects: { planter: { supplies: 'available' } } });
    expect(session.previousProject).toMatchObject({ book: true, projects: { planter: { supplies: 'available' } } });
    expect(session.project.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
    expect(session.previousProject.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });

    session = gardenSessionReducer(session, { type: 'view', view: 'before' });
    expect(visibleProjects(session)).toBe(session.previousProject);
    expect(visibleProjects(session).book).toBe(true);
  });
});

describe('garden session event delivery', () => {
  it('accepts only one materials delivery and leaves duplicate sessions unchanged', () => {
    const fresh = createGardenSession();
    const delivered = gardenSessionReducer(fresh, { type: 'materials', id: 'bundle-1' });
    expect(delivered.project).toMatchObject({ projects: { planter: { supplies: 'available' } }, processed: ['bundle-1'] });
    expect(gardenSessionReducer(delivered, { type: 'materials', id: 'bundle-1' })).toBe(delivered);
    expect(gardenSessionReducer(delivered, { type: 'materials', id: 'bundle-2' })).toBe(delivered);
  });

  it('rejects an event emitted by an old scene', () => {
    const session = createGardenSession();
    expect(gardenSessionReducer(session, { type: 'project', epoch: session.epoch - 1,
      events: [{ type: 'materials', id: 'old', project: 'planter' }] })).toBe(session);
  });

  it('rejects live project changes while comparing and resumes them in Now', () => {
    let session = gardenSessionReducer(createGardenSession(), {
      type: 'journey', event: { type: 'accomplishment' },
    });
    const comparing = session;
    expect(gardenSessionReducer(comparing, { type: 'materials', id: 'hidden-bundle' })).toBe(comparing);
    expect(gardenSessionReducer(comparing, { type: 'project', epoch: comparing.epoch,
      events: [{ type: 'materials', id: 'hidden-project-bundle', project: 'planter' }] })).toBe(comparing);

    session = gardenSessionReducer(session, { type: 'view', view: 'now' });
    session = gardenSessionReducer(session, { type: 'materials', id: 'visible-bundle' });
    expect(session.project.projects.planter.supplies).toBe('available');
  });

  it('accepts resident events only for residents present on the current visit', () => {
    let session = createGardenSession();
    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'accomplishment' } });
    session = gardenSessionReducer(session, { type: 'view', view: 'now' });
    session = gardenSessionReducer(session, { type: 'journey', event: { type: 'accomplishment' } });

    const rejected = gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: [
      { type: 'learn', id: 'moss-too-early', resident: 'moss', ability: 'B1', source: { kind: 'book', id: 'book' } },
    ] });
    expect(rejected).toBe(session);
    expect(rejected.project.processed).not.toContain('moss-too-early');

    const accepted = gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: [
      { type: 'learn', id: 'pip-read', resident: 'pip', ability: 'B1', source: { kind: 'book', id: 'book' } },
    ] });
    expect(accepted.project.knowledge.pip).toMatchObject({ B1: { status: 'familiar' } });
  });

  it('increments epochs only for accepted scene changes, view toggles, reset, and remount', () => {
    const fresh = createGardenSession();
    const ignoredView = gardenSessionReducer(fresh, { type: 'view', view: 'before' });
    expect(ignoredView).toBe(fresh);

    const reward = gardenSessionReducer(fresh, { type: 'journey', event: { type: 'accomplishment' } });
    expect(reward.epoch).toBe(fresh.epoch + 1);
    const remembered = gardenSessionReducer(reward, {
      type: 'journey', event: { type: 'remember', interaction: 'pet', residentId: 'pip' },
    });
    expect(remembered.epoch).toBe(reward.epoch);
    const now = gardenSessionReducer(remembered, { type: 'view', view: 'now' });
    expect(now.epoch).toBe(remembered.epoch + 1);
    const remounted = gardenSessionReducer(now, { type: 'remount' });
    expect(remounted.epoch).toBe(now.epoch + 1);

    const reset = gardenSessionReducer(remounted, { type: 'journey', event: { type: 'reset' } });
    expect(reset.epoch).toBe(remounted.epoch + 1);
    expect(reset.epoch).not.toBe(0);
    expect(reset.project).toEqual(createGardenSession().project);
    expect(reset.view).toBe('before');
  });
});

describe('garden mount handshake', () => {
  it('emits one remount through strict-effect replay and waits for its epoch acknowledgement', () => {
    const handshake = createGardenMountHandshake(7);
    expect(handshake.mount()).toBe(true);
    expect(handshake.acknowledgedEpoch(7)).toBeNull();

    handshake.unmount();
    expect(handshake.acknowledgedEpoch(8)).toBeNull();
    expect(handshake.mount()).toBe(false);
    expect(handshake.acknowledgedEpoch(8)).toBe(8);
  });

  it('uses the acknowledged remount epoch as a fresh task ID namespace', () => {
    const progress = reduceProjectProgress(createGardenSession().project, { type: 'book', id: 'book' });
    const actor = [{ id: 'pip' as const, available: true, position: { x: 0, z: 0 } }];
    const taskFor = (epoch: number) => stepProject(createProjectRuntime(1, epoch), {
      delta: .05, paused: false, epoch, progress, actors: actor, reachable: () => true, footprintClear: { planter: true, 'tool-rack': true },
    }).directives.pip!.key;
    const oldTask = taskFor(4);

    const handshake = createGardenMountHandshake(4);
    expect(handshake.mount()).toBe(true);
    handshake.unmount();
    expect(handshake.mount()).toBe(false);
    const acknowledged = handshake.acknowledgedEpoch(5);

    expect(acknowledged).toBe(5);
    expect(taskFor(acknowledged!)).not.toBe(oldTask);
  });
});
