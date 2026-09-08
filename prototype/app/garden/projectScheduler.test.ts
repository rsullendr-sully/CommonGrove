import { describe, expect, it } from 'vitest';
import { PIP_MOTION_CONFIG, stepSafeRouteLocomotion, type SafeRouteLocomotionProgress } from './locomotion';
import { createSafeGardenRoute, GARDEN_OBSTACLES, type GardenPoint } from './navigation';
import { PLANTER_LAYOUT } from './planterLayout';
import { PROJECT_LAYOUTS, projectObstacles, toolRestAnchor } from './projectLayout';
import { createProjectsProgress, reduceProjectProgress, type ProjectEvent, type ProjectsProgress } from './projectProgress';
import { createProjectRuntime, stepProject, type ProjectInput } from './projectScheduler';
import { RESIDENTS, type ResidentId } from './residents';
import { learnAbility } from './spiritKnowledge';

// Load the real runtime in this Node test; this checkout does not install Three's declarations.
type TestVector3 = { x: number; y: number; z: number; clone(): TestVector3;
  sub(other: TestVector3): TestVector3; length(): number; normalize(): TestVector3;
  addScaledVector(other: TestVector3, scale: number): TestVector3 };
const { Vector3 }: { Vector3: new (x: number, y: number, z: number) => TestVector3 } = require('three');

function prepared(project: 'planter' | 'tool-rack' = 'planter', step = 0) {
  const p = createProjectsProgress();
  for (const ability of ['B1', 'B2', 'G1', 'G2'] as const) p.knowledge = learnAbility(p.knowledge, 'pip', ability, { kind: 'preview', id: 'explicit-test-seed' });
  p.projects[project] = { supplies: 'committed', completedSteps: step, deliveredForStep: null };
  p.active = project;
  return p;
}

function simulation(progress = createProjectsProgress(), roster: readonly ResidentId[] = ['pip'], positions?: GardenPoint[]) {
  const actors = roster.map((id, index) => {
    const resident = RESIDENTS.find(r => r.id === id)!;
    return { id, available: true, carried: false, position: positions?.[index] ?? { x: resident.spawn[0], z: resident.spawn[2] } };
  });
  const sim = {
    runtime: createProjectRuntime(37, 1), events: [] as ProjectEvent[],
    input: { delta: .05, paused: false, epoch: 1, progress, actors, reachable: () => true, footprintClear: { planter: true, 'tool-rack': true } } as ProjectInput & { actors: typeof actors },
    travel: {} as Partial<Record<ResidentId, { key: string; route: GardenPoint[]; state: SafeRouteLocomotionProgress }>>,
    tick(count = 1, move = false) {
      for (let i = 0; i < count; i++) {
        const out = stepProject(sim.runtime, sim.input);
        sim.runtime = out.runtime;
        sim.events.push(...out.events);
        sim.input.progress = out.events.reduce(reduceProjectProgress, sim.input.progress);
        if (!move || sim.input.paused) continue;
        const obstacles = [...GARDEN_OBSTACLES, ...projectObstacles(sim.input.progress)];
        for (const actor of sim.input.actors) {
          const directive = out.directives[actor.id];
          if (!directive) { delete sim.travel[actor.id]; continue; }
          let travel = sim.travel[actor.id];
          if (!travel || travel.key !== directive.key) {
            travel = { key: directive.key, route: createSafeGardenRoute(actor.position, directive.target, obstacles), state: {
              motion: { position: new Vector3(actor.position.x, 0, actor.position.z), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
              waypointIndex: 0, complete: false,
            } };
          }
          travel.state = stepSafeRouteLocomotion(travel.state, travel.route, .05, PIP_MOTION_CONFIG, obstacles);
          actor.position = { x: travel.state.motion.position.x, z: travel.state.motion.position.z };
          sim.travel[actor.id] = travel;
        }
      }
    },
  };
  return sim;
}

describe('recipe scheduler', () => {
  it('does not progress a paused project', () => {
    const out = stepProject(createProjectRuntime(37, 1), { delta: .05, paused: true, epoch: 1,
      progress: createProjectsProgress(), actors: [], reachable: () => true, footprintClear: { planter: true, 'tool-rack': true } });
    expect(out.events).toEqual([]);
    expect(out.directives).toEqual({});
  });

  it('requires six uninterrupted seconds inside the .28 reading tolerance and emits four familiar abilities', () => {
    const p = createProjectsProgress(); p.book = true;
    const target = PLANTER_LAYOUT.slots.read;
    const sim = simulation(p, ['pip'], [{ x: target.x, z: target.z + .28 }]);
    sim.tick(61);
    expect(sim.runtime.claims.pip?.elapsed).toBeCloseTo(3);
    sim.input.actors[0].position.z = target.z + .2801;
    sim.tick();
    sim.input.actors[0].position.z = target.z + .28;
    sim.tick(159);
    expect(sim.input.progress.knowledge.pip).toEqual({});
    sim.tick(2);
    expect(Object.keys(sim.input.progress.knowledge.pip)).toEqual(['B1', 'B2', 'G1', 'G2']);
    const learned = Object.values(sim.input.progress.knowledge.pip);
    expect(learned.every(k => k.status === 'familiar')).toBe(true);
    expect(new Set(learned.map(k => k.source.id)).size).toBe(1);
  });

  it('retries a stationary approach after four seconds and a two second break', () => {
    const p = createProjectsProgress(); p.book = true;
    const sim = simulation(p);
    sim.tick();
    const first = sim.runtime.claims.pip?.directive.key;
    expect(first).toBeDefined();
    sim.tick(79); expect(sim.runtime.claims.pip).toBeDefined();
    sim.tick(); expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick(39); expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick(); expect(sim.runtime.claims.pip?.directive.key).not.toBe(first);
    expect(sim.runtime.claims.pip?.directive.action).toBe('read');
  });

  it.each(['carried', 'unavailable', 'unreachable', 'missing'] as const)('returns an interrupted mallet pickup to its anchor when %s', reason => {
    const sim = simulation(prepared('planter', 1), ['pip'], [{ ...PLANTER_LAYOUT.slots.carryDrop }]);
    sim.tick(13);
    expect(sim.runtime.claims.pip?.leg).toBe('drop');
    expect(sim.runtime.claims.pip?.directive.tool).toBe('mallet');
    const anchor = sim.runtime.toolAnchors.mallet;
    if (reason === 'carried') sim.input.actors[0].carried = true;
    if (reason === 'unavailable') sim.input.actors[0].available = false;
    if (reason === 'unreachable') sim.input.reachable = () => false;
    if (reason === 'missing') sim.input.actors = [];
    sim.tick();
    expect(sim.runtime.claims).toEqual({});
    expect(sim.runtime.toolClaims).toEqual({});
    expect(sim.runtime.toolAnchors.mallet).toEqual(anchor);
    expect(sim.events).toEqual([]);
    expect(sim.input.progress.projects.planter.deliveredForStep).toBeNull();
  });

  it('releases tools on pause and invalidates old epoch work without accepting a stale frame', () => {
    const sim = simulation(prepared('planter', 1));
    sim.tick(); expect(sim.runtime.toolClaims.mallet).toBeDefined();
    const oldKey = sim.runtime.claims.pip!.id;
    sim.input.paused = true; sim.tick();
    expect(sim.runtime.toolClaims).toEqual({});
    expect(sim.runtime.claims).toEqual({});
    sim.input.paused = false; sim.input.epoch = 2; sim.tick();
    expect(sim.events).toEqual([]);
    sim.tick(); expect(sim.runtime.claims.pip!.id).not.toBe(oldKey);
    sim.input.epoch = 1; sim.tick(200);
    expect(sim.events).toEqual([]);
    expect(sim.runtime.epoch).toBe(2);
  });

  it.each([NaN, Infinity, -.05, 0])('rejects nonpositive/nonfinite delta %s without progress', delta => {
    const sim = simulation(prepared()); sim.input.delta = delta; sim.tick(200);
    expect(sim.runtime.elapsed).toBe(0); expect(sim.events).toEqual([]);
  });

  it('caps a large delta and never accrues work while the final footprint is occupied', () => {
    const sim = simulation(prepared()); sim.input.delta = 30; sim.tick();
    expect(sim.runtime.elapsed).toBe(.05);
    sim.input.footprintClear.planter = false;
    sim.tick(250, true);
    expect(sim.input.progress.projects.planter.completedSteps).toBe(0);
    expect(Object.values(sim.runtime.claims).every(c => c.directive.action !== 'fit' || c.elapsed === 0)).toBe(true);
  });

  it.each(['planter', 'tool-rack'] as const)('finishes %s within 240 seconds using safe locomotion and separate per-step deliveries', project => {
    const sim = simulation(prepared(project));
    for (let i = 0; i < 4800 && sim.input.progress.projects[project].completedSteps < 6; i++) sim.tick(1, true);
    expect(sim.input.progress.projects[project].completedSteps).toBe(6);
    expect(sim.events.filter(e => e.type === 'deliver').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sim.events.filter(e => e.type === 'complete').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sim.events.reduce(reduceProjectProgress, sim.input.progress)).toEqual(sim.input.progress);
    expect(sim.runtime.elapsed).toBeLessThanOrEqual(240);
  });

  it('chooses only one project and reserves each actor, role and reusable tool once', () => {
    const p = prepared(); p.active = null;
    p.projects.planter.supplies = p.projects['tool-rack'].supplies = 'available'; p.book = true;
    const sim = simulation(p, ['pip', 'moss', 'fern']);
    for (let i = 0; i < 4800 && sim.input.progress.projects['tool-rack'].completedSteps < 6; i++) {
      sim.tick(1, true);
      const claims = Object.values(sim.runtime.claims);
      const work = claims.filter(c => c.directive.project !== null && c.directive.action !== 'observe' && c.directive.action !== 'read');
      expect(new Set(work.map(c => c.directive.project)).size).toBeLessThanOrEqual(1);
      expect(new Set(claims.map(c => c.directive.actor)).size).toBe(claims.length);
      expect(new Set(claims.map(c => `${c.directive.target.x}:${c.directive.target.z}`)).size).toBe(claims.length);
      for (const tool of ['mallet', 'can'] as const) {
        expect(claims.filter(c => c.resource === tool).length).toBeLessThanOrEqual(1);
        const owner = sim.runtime.toolClaims[tool];
        if (owner) expect(sim.runtime.claims[owner.actor]?.id).toBe(owner.key);
      }
    }
    expect(sim.input.progress.projects.planter.completedSteps).toBe(6);
    expect(sim.input.progress.projects['tool-rack'].completedSteps).toBe(6);
  });

  it('observes only the witnessed action for three continuous seconds without needing a book', () => {
    // A four-second soil action gives the nearby learner time to witness three seconds.
    const sim = simulation(prepared('planter', 4), ['pip', 'moss'], [
      PROJECT_LAYOUTS.planter.slots.pickup, PROJECT_LAYOUTS.planter.slots.observe,
    ]);
    for (let i = 0; i < 1600 && !sim.input.progress.knowledge.moss.G1; i++) sim.tick(1, true);
    expect(sim.input.progress.book).toBe(false);
    expect(sim.input.progress.knowledge.moss).toEqual({ G1: { status: 'familiar', source: { kind: 'observation', id: expect.any(String) } } });
    expect(sim.input.progress.knowledge.pip.G1?.status).toBe('familiar');
  });

  it('does not combine observation time across a teacher interruption', () => {
    const sim = simulation(prepared('planter', 4), ['pip', 'moss'], [PROJECT_LAYOUTS.planter.slots.pickup, PROJECT_LAYOUTS.planter.slots.observe]);
    for (let i = 0; i < 1200 && (sim.runtime.claims.moss?.elapsed ?? 0) < 2; i++) sim.tick(1, true);
    expect(sim.runtime.claims.moss?.elapsed).toBeGreaterThanOrEqual(2);
    sim.input.actors[0].available = false; sim.tick();
    expect(sim.runtime.claims.moss).toBeUndefined();
    expect(sim.input.progress.knowledge.moss).toEqual({});
    sim.input.actors[0].available = true;
    for (let i = 0; i < 1200 && (sim.runtime.claims.moss?.elapsed ?? 0) < 1.1; i++) sim.tick(1, true);
    expect(sim.runtime.claims.moss?.elapsed).toBeLessThan(1.2);
    expect(sim.input.progress.knowledge.moss).toEqual({});
  });

  it('releases a running action if its delivered input is withdrawn and requires a fresh pickup', () => {
    const sim = simulation(prepared('planter', 1));
    for (let i = 0; i < 1200 && (sim.runtime.claims.pip?.directive.action !== 'tap' || sim.runtime.claims.pip.elapsed < 1); i++) sim.tick(1, true);
    expect(sim.runtime.claims.pip?.directive.action).toBe('tap');
    const old = sim.runtime.claims.pip!.id;
    sim.input.progress.projects.planter.deliveredForStep = null;
    sim.tick();
    expect(sim.runtime.claims.pip).toBeUndefined();
    expect(sim.runtime.toolClaims).toEqual({});
    sim.tick(40);
    expect(sim.runtime.claims.pip?.id).not.toBe(old);
    expect(sim.runtime.claims.pip?.leg).toBe('pickup');
    expect(sim.input.progress.projects.planter.completedSteps).toBe(1);
  });

  it('releases a partly performed action when its actor leaves and reclaims the mallet before resuming', () => {
    const sim = simulation(prepared('planter', 1));
    for (let i = 0; i < 1200 && (sim.runtime.claims.pip?.directive.action !== 'tap' || sim.runtime.claims.pip.elapsed < 2); i++) sim.tick(1, true);
    expect(sim.runtime.claims.pip?.elapsed).toBeGreaterThanOrEqual(2);
    const old = sim.runtime.claims.pip!.id;
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.read };
    sim.tick();
    expect(sim.runtime.toolClaims).toEqual({});
    sim.tick(40);
    expect(sim.runtime.claims.pip?.id).not.toBe(old);
    expect(sim.runtime.claims.pip?.leg).toBe('pickup');
    expect(sim.input.progress.projects.planter.completedSteps).toBe(1);
  });

  it('retains a moving detour rather than timing out because destination distance increases', () => {
    const p = createProjectsProgress(); p.book = true;
    const sim = simulation(p, ['pip'], [{ x: 8, z: 0 }]); sim.tick();
    const id = sim.runtime.claims.pip!.id;
    for (let i = 0; i < 120; i++) { sim.input.actors[0].position.x += .03; sim.tick(); }
    expect(sim.runtime.claims.pip?.id).toBe(id);
    expect(sim.runtime.claims.pip?.stalled).toBe(0);
  });

  it('preempts tool storage before it can finish when construction becomes active', () => {
    const p = prepared('tool-rack'); p.active = null; p.projects['tool-rack'] = { supplies: 'used', completedSteps: 6, deliveredForStep: null };
    const sim = simulation(p);
    for (let i = 0; i < 1800 && !(sim.runtime.claims.pip?.directive.action === 'store-tool' && sim.runtime.claims.pip.leg === 'drop' && sim.runtime.claims.pip.elapsed >= .55 - 1e-8); i++) sim.tick(1, true);
    expect(sim.runtime.claims.pip?.directive.action).toBe('store-tool');
    const anchor = { ...sim.runtime.toolAnchors.mallet };
    sim.input.progress.active = 'planter'; sim.input.progress.projects.planter = { supplies: 'committed', completedSteps: 1, deliveredForStep: null };
    sim.tick();
    expect(sim.runtime.toolAnchors.mallet).toEqual(anchor);
    expect(sim.runtime.claims.pip).toBeUndefined();
  });

  it('separates every ambient tool visit by fifteen seconds even during retrieval', () => {
    const p = prepared(); p.active = null; p.projects.planter = { supplies: 'used', completedSteps: 6, deliveredForStep: null };
    for (const who of ['pip', 'moss', 'fern'] as const) for (const ability of ['B1', 'B2', 'G1', 'G2'] as const) {
      p.knowledge = learnAbility(p.knowledge, who, ability, { kind: 'preview', id: 'ambient-test' });
    }
    const sim = simulation(p, ['pip', 'moss', 'fern']);
    let previous = new Set<string>(); let endedAt = 0; let visits = 0;
    for (let i = 0; i < 2000; i++) {
      sim.tick(1, true);
      const claims = Object.values(sim.runtime.claims);
      expect(claims.length).toBeLessThanOrEqual(1);
      const current = new Set(claims.map(c => c.id));
      if (previous.size && !current.size) endedAt = sim.runtime.elapsed;
      for (const id of current) if (!previous.has(id)) {
        visits++;
        expect(sim.runtime.elapsed - endedAt).toBeGreaterThanOrEqual(15 - 1e-8);
      }
      previous = current;
    }
    expect(visits).toBeGreaterThanOrEqual(2);
    expect(sim.events).toEqual([]);
  });

  it.each(['planter', 'tool-rack'] as const)('learns from the book then completes %s from untrained real spawns', project => {
    const p = createProjectsProgress(); p.book = true; p.projects[project].supplies = 'available';
    const sim = simulation(p, ['pip', 'moss', 'fern']);
    for (let i = 0; i < 4800 && sim.input.progress.projects[project].completedSteps < 6; i++) sim.tick(1, true);
    expect(sim.input.progress.projects[project].completedSteps).toBe(6);
    expect(sim.events.some(e => e.type === 'learn' && e.source.kind === 'book')).toBe(true);
    expect(sim.runtime.elapsed).toBeLessThanOrEqual(240);
  });

  it('stores idle tools at a completed rack and retrieves the same mallet for later construction', () => {
    const p = prepared('tool-rack'); p.active = null; p.projects['tool-rack'] = { supplies: 'used', completedSteps: 6, deliveredForStep: null };
    const sim = simulation(p);
    for (let i = 0; i < 2200 && sim.runtime.toolAnchors.mallet.x !== -16.25; i++) sim.tick(1, true);
    expect(sim.runtime.toolAnchors.mallet).toEqual(toolRestAnchor(p, 'mallet', null));
    const stored = { ...sim.runtime.toolAnchors.mallet };
    sim.input.progress.active = 'planter'; sim.input.progress.projects.planter = { supplies: 'committed', completedSteps: 1, deliveredForStep: null };
    for (let i = 0; i < 100 && !sim.runtime.toolClaims.mallet; i++) sim.tick(1, true);
    expect(sim.runtime.claims.pip?.directive.action).toBe('retrieve-tool');
    expect(sim.runtime.toolAnchors.mallet).toEqual(stored);
    for (let i = 0; i < 1800 && sim.input.progress.projects.planter.completedSteps === 1; i++) sim.tick(1, true);
    expect(sim.input.progress.projects.planter.completedSteps).toBeGreaterThan(1);
  });
});
