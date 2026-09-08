import { describe, expect, it } from 'vitest';
import { createProjectHarness } from './projectIntegrationHarness';
import { createProjectsProgress, projectComplete } from './projectProgress';
import { createDemoProgress, demoProjects } from './learningDemo';
import { PROJECT_LAYOUTS } from './projectLayout';
import { isSafeGardenPoint } from './navigation';
import { createGardenSession, gardenSessionReducer } from './gardenSession';

describe('learning demo with real navigation', () => {
  it('reserves both activated sites before either transfer project has materials or construction', () => {
    const sim = createProjectHarness(3, createProjectsProgress(), { activated: ['planter', 'tool-rack'] });
    sim.tick();
    for (const project of ['planter', 'tool-rack'] as const) {
      const layout = PROJECT_LAYOUTS[project];
      const obstacles = sim.community.obstacles('pip');
      expect(isSafeGardenPoint(layout.center, obstacles)).toBe(false);
      expect(obstacles.filter(o => o.x === layout.center.x && o.z === layout.center.z
        && o.radius === layout.radius)).toHaveLength(1);
      expect(sim.progress.projects[project].completedSteps).toBe(0);
    }
  });

  it('waits for an unavailable roster and suppresses hidden time and the large return delta', () => {
    const scenario = { id: 'planter-to-rack' as const, residents: 3 as const };
    const sim = createProjectHarness(3, createDemoProgress(scenario), { activated: demoProjects(scenario) });
    const initial = sim.progress;
    for (const actor of sim.actors) actor.available = false;
    for (let n = 0; n < 60; n++) sim.tick();
    expect(sim.progress).toBe(initial);
    expect(sim.community.projectRuntime!.claims).toEqual({});
    for (const actor of sim.actors) actor.available = true;
    sim.tick();
    expect(Object.keys(sim.community.projectRuntime!.claims)).toHaveLength(1);
    const elapsed = sim.community.projectRuntime!.elapsed;
    const positions = sim.actors.map(a => ({ ...a.position }));
    const input = { now: 3600, delta: 3600, paused: true, actors: sim.actors, toyFree: false };
    const frame = { progress: sim.progress, activated: demoProjects(scenario), epoch: sim.epoch, playerPosition: { x: 0, z: 17 } };
    // This is the production paused/delta boundary; real document.hidden browser proof is separate.
    expect(sim.community.advance(input, null, frame)).toEqual([]);
    expect(sim.community.projectRuntime!.elapsed).toBe(elapsed);
    expect(sim.community.projectRuntime!.claims).toEqual({});
    expect(sim.community.projectRuntime!.toolClaims).toEqual({});
    expect(sim.community.advance({ ...input, paused: false }, null, frame)).toEqual([]);
    expect(sim.community.projectRuntime!.elapsed - elapsed).toBeCloseTo(.05, 8);
    expect(sim.progress).toBe(initial);
    expect(sim.actors.map(a => a.position)).toEqual(positions);
  });

  // The companion planter file retains all four original gate-order/roster runs.
  for (const count of [1, 3] as const) for (const order of ['materials-first', 'knowledge-first']) {
    it(`earns rack ${order}, ${count} resident(s), within 240 active seconds`, async () => {
      const sim = createProjectHarness(count, createProjectsProgress(), { activated: ['tool-rack'] });
      if (order === 'materials-first') {
        sim.apply([{ type: 'materials', id: 'rack-supplies', project: 'tool-rack' }]);
        for (let n = 0; n < 20; n++) sim.tick();
        expect(sim.progress.projects['tool-rack'].completedSteps).toBe(0);
        expect(sim.progress.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
      }
      sim.apply([{ type: 'book', id: 'real-book' }]);
      if (order === 'knowledge-first') {
        await sim.until(() => Object.values(sim.progress.knowledge).some(k => k.B1), 100);
        expect(sim.progress.projects['tool-rack'].supplies).toBe('absent');
        expect(sim.progress.projects['tool-rack'].completedSteps).toBe(0);
        expect(Object.values(sim.progress.knowledge).flatMap(k => Object.values(k)).every(k => k.status === 'familiar')).toBe(true);
        sim.apply([{ type: 'materials', id: 'rack-supplies', project: 'tool-rack' }]);
      }
      await sim.until(() => projectComplete(sim.progress, 'tool-rack'), 240 - sim.activeSeconds);
      expect(sim.activeSeconds).toBeLessThanOrEqual(240);
      expect(sim.events.filter(e => e.type === 'complete').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(sim.progress.projects['tool-rack'].supplies).toBe('used');
      expect(sim.events.some(e => e.type === 'learn' && e.source.kind === 'book')).toBe(true);
      expect(Object.values(sim.progress.knowledge).flatMap(k => Object.values(k)).some(k => k.source.kind === 'preview')).toBe(false);
      expect(Object.values(sim.progress.knowledge).some(k => k.B1?.status === 'practiced' && k.B2?.status === 'practiced')).toBe(true);
      const completed = sim.progress;
      sim.apply([{ type: 'materials', id: 'duplicate-rack', project: 'tool-rack' }, ...sim.events, ...sim.events]);
      expect(sim.progress).toBe(completed);
      console.info(`rack ${order} roster=${count}: ${sim.activeSeconds.toFixed(2)} active seconds`);
    });
  }

  for (const count of [1, 3] as const) {
    it(`transfers earned planter abilities into rack work, ${count} resident(s), with separate 240-second budgets`, async () => {
      const scenario = { id: 'planter-to-rack' as const, residents: count };
      const sim = createProjectHarness(count, createDemoProgress(scenario), { activated: demoProjects(scenario) });
      expect(sim.progress.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
      await sim.until(() => projectComplete(sim.progress, 'planter'), 240);
      const planterSeconds = sim.activeSeconds;
      const firstBatchCount = sim.events.length;
      const ordinary = createGardenSession();
      let session = gardenSessionReducer(ordinary, { type: 'start-demo', scenario });
      session = gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: [...sim.events, ...sim.events] });
      expect(session.demo!.progress).toEqual(sim.progress);
      expect(session.project).toBe(ordinary.project);
      const oldEpoch = session.epoch;
      const remounted = gardenSessionReducer(session, { type: 'remount' });
      expect(remounted.demo!.progress).toBe(session.demo!.progress);
      expect(gardenSessionReducer(remounted, { type: 'project', epoch: oldEpoch, events: sim.events })).toBe(remounted);
      session = gardenSessionReducer(remounted, { type: 'demo-materials', id: 'second-project', project: 'tool-rack' });
      const earned = structuredClone(sim.progress.knowledge);
      sim.apply([{type:'materials', id:'second-project', project:'tool-rack'}]);
      await sim.until(() => projectComplete(sim.progress, 'tool-rack'), 240);
      for (const resident of ['pip','moss','fern'] as const) {
        for (const ability of ['B1','B2','G1','G2'] as const) {
          const before = earned[resident][ability];
          if (before) expect(sim.progress.knowledge[resident][ability]?.source).toEqual(before.source);
        }
      }
      expect(planterSeconds).toBeLessThanOrEqual(240);
      expect(sim.activeSeconds - planterSeconds).toBeLessThanOrEqual(240);
      expect(sim.progress.projects.planter.supplies).toBe('used');
      expect(sim.progress.projects['tool-rack'].supplies).toBe('used');
      session = gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: sim.events.slice(firstBatchCount) });
      expect(session.demo!.progress).toEqual(sim.progress);
      expect(gardenSessionReducer(session, { type: 'project', epoch: session.epoch, events: sim.events })).toBe(session);
      expect(gardenSessionReducer(session, { type: 'view', view: 'before' })).toBe(session);
      const replay = gardenSessionReducer(session, { type: 'start-demo', scenario });
      expect(replay.demo!.progress.knowledge).toEqual({ pip: {}, moss: {}, fern: {} });
      expect(gardenSessionReducer(replay, { type: 'project', epoch: session.epoch, events: sim.events })).toBe(replay);
      const exited = gardenSessionReducer(replay, { type: 'exit-demo' });
      expect(exited.demo).toBeNull();
      expect(exited.project).toEqual(createProjectsProgress());
      expect(exited.journey.visit).toBe(1);
      expect(sim.events.filter(e => e.type === 'complete').map(e => [e.project, e.step])).toEqual([
        ...[0, 1, 2, 3, 4, 5].map(step => ['planter', step]),
        ...[0, 1, 2, 3, 4, 5].map(step => ['tool-rack', step]),
      ]);
      console.info(`transfer roster=${count}: planter=${planterSeconds.toFixed(2)}, rack=${(sim.activeSeconds - planterSeconds).toFixed(2)} active seconds`);
    });

    it(`labels preview knowledge and completes the rack without claiming book learning, ${count} resident(s)`, async () => {
      const scenario = { id: 'rack-preview' as const, residents: count };
      const sim = createProjectHarness(count, createDemoProgress(scenario), { activated: demoProjects(scenario) });
      expect(sim.progress.book).toBe(false);
      for (const resident of sim.actors) {
        expect(sim.progress.knowledge[resident.id]).toMatchObject({
          B1: { status: 'familiar', source: { kind: 'preview' } },
          B2: { status: 'familiar', source: { kind: 'preview' } },
        });
      }
      await sim.until(() => projectComplete(sim.progress, 'tool-rack'), 240);
      expect(sim.events.some(e => e.type === 'learn' && e.source.kind === 'book')).toBe(false);
      expect(Object.values(sim.progress.knowledge).every(k => !k.G1 && !k.G2)).toBe(true);
      console.info(`rack preview roster=${count}: ${sim.activeSeconds.toFixed(2)} active seconds`);
      if (count === 1) {
        const completed = sim.progress;
        await sim.until(() => sim.community.projectRuntime!.toolAnchors.mallet.x === -16.25
          && sim.community.projectRuntime!.toolAnchors.can.x === -15.75, 100);
        expect(sim.community.projectRuntime!.toolAnchors).toEqual({ mallet: { x: -16.25, z: 1.5 }, can: { x: -15.75, z: 1.5 } });
        expect(sim.community.projectRuntime!.toolClaims).toEqual({});
        expect(sim.progress).toBe(completed);
        // A new real construction opportunity must physically retrieve the stored mallet.
        sim.apply([{ type: 'book', id: 'after-preview-book' }, { type: 'materials', id: 'after-preview-planter', project: 'planter' }]);
        await sim.until(() => sim.community.projectDirective('pip')?.action === 'retrieve-tool'
          && sim.community.projectDirective('pip')?.project === 'planter', 100);
        expect(sim.community.projectDirective('pip')!.lookAt).toEqual({ x: -16.25, z: 1.5 });
        expect(sim.community.projectDirective('pip')!.tool).toBeNull();
        await sim.until(() => sim.community.projectDirective('pip')?.tool === 'mallet', 40);
        expect(sim.community.projectRuntime!.toolClaims.mallet?.actor).toBe('pip');
        expect(sim.community.projectRuntime!.toolAnchors.mallet).toEqual({ x: -16.25, z: 1.5 });
        expect(sim.progress.projects.planter.completedSteps).toBe(1);
      }
    });
  }
});
