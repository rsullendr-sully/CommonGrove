import { describe, expect, it } from 'vitest';
import { createPlanterProgress, type BuildStage } from './planterProgress';
import { createProjectsProgress, migrateLegacyPlanter, reduceProjectProgress, type ProjectEvent, type ProjectsProgress } from './projectProgress';
import { createProjectRuntime, stepProject, type ProjectInput, type ProjectRuntime } from './projectScheduler';
import { PLANTER_LAYOUT } from './planterLayout';
import type { ResidentSnapshot } from './residentCoordination';

function ready(stage: BuildStage = 'empty', delivered = false) {
  return migrateLegacyPlanter({ ...createPlanterProgress(), supplies: stage === 'planted' ? 'used' : 'committed', stage, delivered,
    knowledge: { pip: ['assembly', 'planting'], moss: [], fern: [] } });
}
// Unit boundary fixtures may explicitly move actors; full completion/navigation lives in planterIntegration.
function simulation(progress: ProjectsProgress = { ...createProjectsProgress(), book: true }, actors: ResidentSnapshot[] = [
  { id: 'pip', position: { x: 0, z: 0 }, available: true },
]) {
  let runtime: ProjectRuntime = createProjectRuntime(37, 0);
  const events: ProjectEvent[] = [];
  const input: ProjectInput = { delta: .05, paused: false, epoch: 0, progress, actors, reachable: () => true,
    footprintClear: { planter: true, 'tool-rack': true } };
  return {
    input, events,
    get runtime() { return runtime; },
    tick(frames = 1, follow = false) {
      for (let i = 0; i < frames; i++) {
        if (follow) for (const actor of input.actors) {
          const directive = runtime.claims[actor.id]?.directive;
          if (directive) actor.position = { ...directive.target };
        }
        const result = stepProject(runtime, input);
        runtime = result.runtime;
        events.push(...result.events);
        input.progress = result.events.reduce(reduceProjectProgress, input.progress);
      }
    },
    until(done: () => boolean, frames = 4800, follow = true) {
      for (let n = 0; n < frames && !done(); n++) this.tick(1, follow);
      expect(done()).toBe(true);
    },
  };
}
type Simulation = ReturnType<typeof simulation>;
const steps = (sim: Simulation) => sim.input.progress.projects.planter.completedSteps;

describe('migrated planter scheduler regression contracts', () => {
  it('follows the current roster after the input actors are replaced', () => {
    const sim = simulation();
    sim.input.actors = [{ id: 'moss', position: { x: -5, z: 10 }, available: true }];
    sim.tick(140, true);
    expect(Object.keys(sim.input.progress.knowledge.moss)).toEqual(['B1', 'B2', 'G1', 'G2']);
    expect(sim.input.progress.knowledge.pip).toEqual({});
  });
  it('does not advance time while paused', () => {
    const sim = simulation(); sim.input.paused = true; sim.input.delta = 60; sim.tick();
    expect(sim.events).toEqual([]);
    expect(sim.runtime.elapsed).toBe(0);
  });
  it('caps large deltas and ignores negative or non-finite deltas', () => {
    const sim = simulation();
    for (const delta of [60, -4, NaN, Infinity]) { sim.input.delta = delta; sim.tick(); }
    expect(sim.runtime.elapsed).toBe(.05);
  });
  it('learns four abilities only after arrival and six uninterrupted active seconds', () => {
    const sim = simulation(); sim.tick();
    expect(sim.runtime.claims.pip?.directive.action).toBe('read');
    sim.tick(30); expect(sim.events).toEqual([]);
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.read };
    sim.tick(70); expect(sim.events).toEqual([]);
    sim.input.actors[0].position = { x: 0, z: 0 }; sim.tick();
    expect(sim.runtime.claims.pip).toBeUndefined();
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.read };
    sim.tick(40); // New reservation after the two-second break.
    sim.tick(119); expect(sim.events).toEqual([]);
    sim.tick();
    expect(Object.keys(sim.input.progress.knowledge.pip)).toEqual(['B1', 'B2', 'G1', 'G2']);
    expect(Object.values(sim.input.progress.knowledge.pip).every(k => k.status === 'familiar')).toBe(true);
  });
  it('reserves one book and uses a seed to rotate among residents', () => {
    const actors = ['pip', 'moss', 'fern'].map(id => ({ id: id as ResidentSnapshot['id'], position: { x: 0, z: 0 }, available: true }));
    const selected = new Set<string>();
    for (const seed of [1, 2, 3]) {
      const out = stepProject(createProjectRuntime(seed, 0), { ...simulation().input, actors });
      expect(Object.values(out.directives).filter(d => d.action === 'read')).toHaveLength(1);
      selected.add(Object.values(out.directives)[0].actor);
    }
    expect(selected.size).toBe(3);
  });
  it('releases paused claims and resets epoch claims without advancing old actions', () => {
    const sim = simulation(); sim.tick(80, true);
    const oldKey = sim.runtime.claims.pip!.directive.key, elapsed = sim.runtime.elapsed;
    sim.input.paused = true; sim.tick(30);
    expect(sim.runtime.claims).toEqual({}); expect(sim.runtime.toolClaims).toEqual({});
    expect(sim.runtime.elapsed).toBe(elapsed); expect(sim.events).toEqual([]);
    sim.input.paused = false; sim.tick();
    expect(sim.runtime.claims.pip!.directive.key).not.toBe(oldKey);
    sim.input.epoch = 1; sim.tick();
    expect(sim.runtime.epoch).toBe(1); expect(sim.runtime.claims).toEqual({});
    sim.tick();
    expect(sim.runtime.claims.pip!.elapsed).toBe(0);
    expect(sim.runtime.claims.pip!.directive.key).toContain('1:');
  });
  it('commits supplies before pickup and keeps the input with one qualified actor', () => {
    const progress = ready(); progress.active = null; progress.projects.planter.supplies = 'available';
    const sim = simulation(progress, [
      { id: 'pip', position: { x: 0, z: 0 }, available: true },
      { id: 'moss', position: { x: 0, z: 0 }, available: true },
    ]);
    sim.tick();
    expect(sim.events[0]?.type).toBe('commit');
    expect(sim.runtime.claims.pip?.directive.action).toBe('carry');
    expect(sim.runtime.claims.pip?.leg).toBe('pickup');
    expect(sim.runtime.claims.pip?.directive.tool).toBeNull();
    expect(sim.runtime.claims.moss?.directive.action).toBe('observe');
    const key = sim.runtime.claims.pip!.directive.key;
    sim.tick(20); expect(sim.input.progress.projects.planter.deliveredForStep).toBeNull();
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.pickup }; sim.tick(12);
    expect(sim.runtime.claims.pip?.leg).toBe('drop');
    expect(sim.runtime.claims.pip?.directive.tool).toBe('piece');
    expect(sim.runtime.claims.pip?.directive.key).not.toBe(key);
    expect(sim.input.progress.projects.planter.deliveredForStep).toBeNull();
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.carryDrop }; sim.tick(12);
    expect(sim.input.progress.projects.planter.deliveredForStep).toBe(0);
  });
  it.each([[0, 'fit', 3], [1, 'tap', 3], [2, 'fit', 3], [3, 'tap', 3], [4, 'fill', 4], [5, 'plant', 4]] as const)(
    'completes step %s only after owned pickup, delivery, arrival and full %s action', (step, action, seconds) => {
      const progress = ready(); progress.projects.planter.completedSteps = step;
      const sim = simulation(progress); sim.tick();
      expect(steps(sim)).toBe(step);
      sim.tick(20); expect(steps(sim)).toBe(step);
      sim.until(() => sim.runtime.claims.pip?.directive.action === action && sim.runtime.claims.pip.leg === 'action');
      expect(sim.input.progress.projects.planter.deliveredForStep).toBe(step);
      sim.tick(seconds * 20 - 1, true); expect(steps(sim)).toBe(step);
      sim.input.footprintClear.planter = false; sim.tick(20, true); expect(steps(sim)).toBe(step);
      expect(sim.runtime.claims.pip).toBeUndefined();
      sim.input.footprintClear.planter = true;
      sim.until(() => steps(sim) === step + 1);
      expect(sim.events.filter(e => e.type === 'complete')).toHaveLength(1);
    });
  it('does not advance a reserved worker before its recipe input is delivered', () => {
    const sim = simulation(ready(), [{ id: 'pip', position: { ...PLANTER_LAYOUT.slots.work }, available: true }]);
    sim.tick(50);
    expect(sim.runtime.claims.pip?.elapsed).toBe(0);
    expect(steps(sim)).toBe(0);
    expect(sim.input.progress.projects.planter.deliveredForStep).toBeNull();
  });
  it.each([{ roster: ['pip'] }, { roster: ['pip', 'moss', 'fern'] }] as const)(
    'finishes every step with roster $roster and replay-safe events', ({ roster }) => {
      const progress = createProjectsProgress(); progress.book = true; progress.projects.planter.supplies = 'available';
      const sim = simulation(progress, roster.map(id => ({ id, position: { x: 0, z: 0 }, available: true })));
      sim.until(() => steps(sim) === 6);
      expect(sim.runtime.elapsed).toBeLessThanOrEqual(240);
      expect(sim.input.progress.projects.planter.supplies).toBe('used');
      expect(sim.events.filter(e => e.type === 'deliver').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(sim.events.filter(e => e.type === 'complete').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(sim.events.reduce(reduceProjectProgress, sim.input.progress)).toBe(sim.input.progress);
      expect(new Set(sim.events.map(e => e.id)).size).toBe(sim.events.length);
    });
  function observing(stage: 'empty' | 'soil' = 'empty') {
    const sim = simulation(ready(stage), [
      { id: 'pip', position: { ...PLANTER_LAYOUT.slots.pickup }, available: true },
      { id: 'moss', position: { ...PLANTER_LAYOUT.slots.observe }, available: true },
    ]);
    sim.until(() => sim.runtime.claims.pip?.leg === 'action');
    expect(sim.runtime.claims.moss?.directive.action).toBe('observe');
    return sim;
  }
  it.each([['empty', 'B1'], ['soil', 'G2']] as const)(
    'teaches %s only after three continuous seconds and accepted action completion', (stage, ability) => {
      const sim = observing(stage), start = steps(sim);
      expect(sim.runtime.claims.moss?.directive.target).toEqual(PLANTER_LAYOUT.slots.observe);
      sim.input.footprintClear.planter = false; sim.tick(70, true);
      expect(sim.input.progress.knowledge.moss).toEqual({});
      expect(steps(sim)).toBe(start);
      sim.input.footprintClear.planter = true;
      sim.tick(59, true); expect(sim.input.progress.knowledge.moss).toEqual({});
      sim.until(() => steps(sim) === start + 1);
      expect(sim.input.progress.knowledge.moss[ability]?.source.kind).toBe('observation');
      expect(Object.keys(sim.input.progress.knowledge.moss)).toEqual([ability]);
    });
  it('does not accumulate observation while the teacher is away from the work slot', () => {
    const sim = observing(); sim.tick(40, true);
    sim.input.actors[0].position = { x: 0, z: 0 }; sim.tick(30);
    expect(sim.input.progress.knowledge.moss).toEqual({});
    expect(sim.runtime.claims.moss?.directive.action).not.toBe('observe');
  });
  it('does not accumulate observation across a restarted teacher action', () => {
    const sim = observing(); sim.tick(40, true);
    const teacher = sim.runtime.claims.pip!;
    sim.runtime.claims.pip = { ...teacher, id: teacher.id + ':retry', directive: { ...teacher.directive, elapsed: 0 }, elapsed: 0 };
    sim.tick(21, true);
    expect(sim.input.progress.knowledge.moss).toEqual({});
  });
  it('never waits for a distant observer before finishing the teacher action', () => {
    const sim = observing();
    sim.input.actors[1].position = { x: 0, z: 0 };
    for (let i = 0; i < 61; i++) {
      const teacher = sim.runtime.claims.pip?.directive;
      if (teacher) sim.input.actors[0].position = { ...teacher.target };
      sim.tick();
    }
    expect(steps(sim)).toBe(1); expect(sim.input.progress.knowledge.moss).toEqual({});
  });
  it('releases stationary approaches after four seconds with a two-second actor cooldown', () => {
    const sim = simulation(); sim.tick(); sim.tick(79); expect(sim.runtime.claims.pip).toBeDefined();
    sim.tick(); expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick(39); expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick(); expect(sim.runtime.claims.pip?.directive.action).toBe('read');
  });
  it('keeps a moving detour even when distance from the destination increases', () => {
    const sim = simulation(); sim.tick(); const key = sim.runtime.claims.pip!.directive.key;
    for (let i = 0; i < 120; i++) { sim.input.actors[0].position = { x: (i + 1) * .03, z: 0 }; sim.tick(); }
    expect(sim.runtime.claims.pip?.directive.key).toBe(key); expect(sim.runtime.claims.pip?.stalled).toBe(0);
  });
  it.each(['unavailable', 'carried', 'missing', 'unreachable'] as const)(
    'releases an interrupted carried bundle when actor is %s without delivering it', reason => {
      const progress = ready('base'), sim = simulation(progress); sim.tick(13, true);
      expect(sim.runtime.claims.pip?.leg).toBe('drop');
      if (reason === 'unavailable') sim.input.actors[0].available = false;
      if (reason === 'carried') sim.input.actors[0].carried = true;
      if (reason === 'missing') sim.input.actors = [];
      if (reason === 'unreachable') sim.input.reachable = () => false;
      sim.tick(); expect(sim.runtime.claims.pip).toBeUndefined();
      expect(sim.events).toEqual([]); expect(sim.input.progress).toBe(progress);
    });
  it('allows another qualified resident to take over a stalled carrier from the basket', () => {
    const progress = ready('base'); progress.knowledge.moss = { ...progress.knowledge.pip };
    const sim = simulation(progress); sim.tick(13, true); sim.tick(80);
    expect(sim.runtime.claims.pip).toBeUndefined();
    sim.input.actors = [{ id: 'moss', position: { x: 0, z: 0 }, available: true }]; sim.tick();
    expect(sim.runtime.claims.moss?.leg).toBe('pickup');
    expect(sim.input.progress.projects.planter).toEqual({ supplies: 'committed', completedSteps: 2, deliveredForStep: null });
  });
  it('releases obsolete step claims when supplied progress changes', () => {
    const sim = observing();
    sim.input.progress = { ...sim.input.progress, projects: { ...sim.input.progress.projects,
      planter: { ...sim.input.progress.projects.planter, completedSteps: 4, deliveredForStep: null } } };
    sim.events.length = 0; sim.tick();
    expect(Object.values(sim.runtime.claims).every(c => c.directive.step === null || c.directive.step === 4)).toBe(true);
    expect(sim.events).toEqual([]);
  });
  it('schedules three-second planter visits separated by fifteen quiet seconds without new progression', () => {
    const progress = ready('planted'), sim = simulation(progress);
    sim.tick(299, true); expect(sim.runtime.claims).toEqual({});
    sim.tick(); expect(sim.runtime.claims.pip).toBeDefined();
    sim.until(() => ['water', 'inspect'].includes(sim.runtime.claims.pip?.directive.action ?? ''));
    const first = sim.runtime.claims.pip!.directive.action;
    if (first === 'water') expect(sim.runtime.claims.pip!.directive.tool).toBe('can');
    else expect(sim.runtime.claims.pip!.directive.tool).toBeNull();
    sim.tick(59, true); expect(sim.runtime.claims.pip).toBeDefined();
    sim.tick(1, true); expect(sim.runtime.claims).toEqual({});
    sim.tick(299, true); expect(sim.runtime.claims).toEqual({});
    sim.tick(); expect(sim.runtime.claims.pip).toBeDefined();
    expect(['inspect', 'retrieve-tool']).toContain(sim.runtime.claims.pip!.directive.action);
    expect(sim.runtime.claims.pip!.directive.action === 'retrieve-tool' ? 'water' : 'inspect').not.toBe(first);
    expect(sim.events).toEqual([]); expect(sim.input.progress).toBe(progress);
  });
  it('never overlaps reservations for a book, basket, mallet, or can', () => {
    const progress = createProjectsProgress(); progress.book = true; progress.projects.planter.supplies = 'available';
    const sim = simulation(progress, ['pip', 'moss', 'fern'].map(id => ({
      id: id as ResidentSnapshot['id'], position: { x: 0, z: 0 }, available: true,
    })));
    const seen = new Set<string>();
    for (let i = 0; i < 2400; i++) {
      sim.tick(1, true); const claims = Object.values(sim.runtime.claims);
      for (const action of ['read', 'carry', 'observe', 'water', 'inspect']) expect(claims.filter(c => c.directive.action === action).length).toBeLessThanOrEqual(1);
      for (const tool of ['mallet', 'can']) expect(claims.filter(c => c.directive.tool === tool).length).toBeLessThanOrEqual(1);
      for (const claim of claims) seen.add(claim.directive.action);
    }
    expect([...seen]).toEqual(expect.arrayContaining(['read', 'carry', 'fit', 'tap', 'fill', 'plant', 'water', 'inspect']));
  });
});
