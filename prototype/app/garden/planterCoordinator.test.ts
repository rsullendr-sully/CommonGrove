import { describe, expect, it } from 'vitest';
import { createPlanterProgress, reducePlanterProgress, type PlanterEvent, type PlanterProgress } from './planterProgress';
import { createProjectRuntime, stepProject, type ProjectInput, type ProjectRuntime } from './planterCoordinator';
import { PLANTER_LAYOUT } from './planterLayout';
import type { ResidentSnapshot } from './residentCoordination';

function simulation(progress: PlanterProgress = { ...createPlanterProgress(), book: true }, actors: ResidentSnapshot[] = [
  { id: 'pip', position: { x: 0, z: 0 }, available: true },
]) {
  let runtime: ProjectRuntime = createProjectRuntime(37, 0);
  const events: PlanterEvent[] = [];
  const input: ProjectInput = { delta: .05, paused: false, epoch: 0, progress, actors, reachable: () => true, footprintClear: true };
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
        input.progress = result.events.reduce(reducePlanterProgress, input.progress);
      }
    },
  };
}

describe('planter coordinator', () => {
  it('follows the current roster after the input actors are replaced', () => {
    const sim = simulation();
    sim.input.actors = [{ id: 'moss', position: { x: -5, z: 10 }, available: true }];
    sim.tick(140, true);
    expect(sim.input.progress.knowledge.moss).toEqual(['assembly', 'planting']);
    expect(sim.input.progress.knowledge.pip).toEqual([]);
  });
  it('does not advance time while paused', () => {
    const out = stepProject(createProjectRuntime(37, 0), {
      delta: 60, paused: true, epoch: 0, progress: createPlanterProgress(),
      actors: [], reachable: () => true, footprintClear: true,
    });
    expect(out.events).toEqual([]);
    expect(out.runtime.elapsed).toBe(0);
  });

  it('caps large deltas and ignores negative or non-finite deltas', () => {
    const sim = simulation();
    for (const delta of [60, -4, NaN, Infinity]) { sim.input.delta = delta; sim.tick(); }
    expect(sim.runtime.elapsed).toBe(.05);
  });

  it('learns both abilities only after arrival and six uninterrupted active seconds', () => {
    const sim = simulation();
    sim.tick();
    expect(sim.runtime.claims.pip?.directive.action).toBe('read');
    sim.tick(30);
    expect(sim.events).toEqual([]);
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.read };
    sim.tick(70);
    expect(sim.events).toEqual([]);
    sim.input.actors[0].position = { x: 0, z: 0 };
    sim.tick();
    sim.input.actors[0].position = { ...PLANTER_LAYOUT.slots.read };
    sim.tick(119);
    expect(sim.events).toEqual([]);
    sim.tick();
    expect(sim.input.progress.knowledge.pip).toEqual(['assembly', 'planting']);
  });

  it('reserves one book and uses a seed to rotate among residents', () => {
    const actors: ResidentSnapshot[] = ['pip', 'moss', 'fern'].map(id => ({ id: id as ResidentSnapshot['id'], position: { x: 0, z: 0 }, available: true }));
    const selected = new Set<string>();
    for (const seed of [1, 2, 3]) {
      const out = stepProject(createProjectRuntime(seed, 0), { delta: .05, paused: false, epoch: 0,
        progress: { ...createPlanterProgress(), book: true }, actors, reachable: () => true, footprintClear: true });
      expect(Object.values(out.directives).filter(d => d.action === 'read')).toHaveLength(1);
      selected.add(Object.values(out.directives)[0].actor);
    }
    expect(selected.size).toBe(3);
  });

  it('releases paused claims and resets epoch claims without advancing old actions', () => {
    const sim = simulation();
    sim.tick(80, true);
    const oldKey = sim.runtime.claims.pip!.directive.key;
    const elapsed = sim.runtime.elapsed;
    sim.input.paused = true;
    sim.tick(30);
    expect(sim.runtime.claims).toEqual({});
    expect(sim.runtime.elapsed).toBe(elapsed);
    expect(sim.events).toEqual([]);
    sim.input.paused = false;
    sim.tick();
    expect(sim.runtime.claims.pip!.directive.key).not.toBe(oldKey);
    sim.input.epoch = 1;
    sim.tick();
    expect(sim.runtime.epoch).toBe(1);
    expect(sim.runtime.claims.pip!.elapsed).toBe(0);
    expect(sim.runtime.claims.pip!.directive.key).toContain('1:');
  });

  it('commits supplies before pickup and lets an untrained resident carry', () => {
    const progress = { ...createPlanterProgress(), book: true, supplies: 'available' as const };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress, [
      { id: 'pip', position: { x: 0, z: 0 }, available: true },
      { id: 'moss', position: { x: 0, z: 0 }, available: true },
    ]);
    sim.tick();
    expect(sim.events[0]?.type).toBe('commit');
    expect(sim.runtime.claims.moss?.directive.action).toBe('carry');
    expect(sim.runtime.claims.moss?.step).toBe('pickup');
    expect(sim.runtime.claims.moss?.directive.tool).toBeNull();
    expect(sim.runtime.claims.pip?.directive.tool).toBe('mallet');
    const pickupKey = sim.runtime.claims.moss!.directive.key;
    sim.tick(20);
    expect(sim.input.progress.delivered).toBe(false);
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.pickup };
    sim.tick(12);
    expect(sim.runtime.claims.moss?.step).toBe('drop');
    expect(sim.runtime.claims.moss?.directive.tool).toBe('piece');
    expect(sim.runtime.claims.moss?.directive.key).not.toBe(pickupKey);
    expect(sim.input.progress.delivered).toBe(false);
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.carryDrop };
    sim.tick(12);
    expect(sim.input.progress.delivered).toBe(true);
  });

  it.each([
    ['empty', 'base', 'assemble', 6, 'assembly'],
    ['base', 'frame', 'assemble', 6, 'assembly'],
    ['frame', 'soil', 'fill', 5, 'planting'],
    ['soil', 'planted', 'plant', 5, 'planting'],
  ] as const)('builds %s to %s only after arrival, delivery, and full action time', (stage, next, action, seconds, ability) => {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'committed', stage, delivered: true };
    progress.knowledge.pip = [ability];
    const sim = simulation(progress);
    sim.tick();
    expect(sim.runtime.claims.pip?.directive.action).toBe(action);
    sim.tick(20);
    expect(sim.input.progress.stage).toBe(stage);
    sim.tick(seconds * 20 - 1, true);
    expect(sim.input.progress.stage).toBe(stage);
    sim.input.footprintClear = false;
    sim.tick(20, true);
    expect(sim.input.progress.stage).toBe(stage);
    sim.input.footprintClear = true;
    sim.tick(1, true);
    expect(sim.input.progress.stage).toBe(next);
  });

  it('does not advance a reserved worker before its stage bundle is delivered', () => {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'committed' };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress, [
      { id: 'pip', position: { ...PLANTER_LAYOUT.slots.work }, available: true },
      { id: 'moss', position: { x: 0, z: 0 }, available: true },
    ]);
    sim.tick(50);
    expect(sim.runtime.claims.pip?.elapsed).toBe(0);
    expect(sim.input.progress.stage).toBe('empty');
  });

  it.each([{ roster: ['pip'] }, { roster: ['pip', 'moss', 'fern'] }] as const)('finishes every stage with roster $roster and replay-safe events', ({ roster }) => {
    const initial: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'available' };
    const sim = simulation(initial, roster.map(id => ({ id, position: { x: 0, z: 0 }, available: true })));
    for (let i = 0; i < 1600 && sim.input.progress.stage !== 'planted'; i++) sim.tick(1, true);
    expect(sim.input.progress.stage).toBe('planted');
    expect(sim.input.progress.supplies).toBe('used');
    expect(sim.events.filter(e => e.type === 'deliver').map(e => e.stage)).toEqual(['base', 'frame', 'soil', 'planted']);
    expect(sim.events.filter(e => e.type === 'build').map(e => e.stage)).toEqual(['base', 'frame', 'soil', 'planted']);
    expect(sim.events.reduce(reducePlanterProgress, sim.input.progress)).toEqual(sim.input.progress);
    expect(new Set(sim.events.map(e => e.id)).size).toBe(sim.events.length);
  });

  function observing(stage: 'empty' | 'soil' = 'empty') {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'committed', delivered: true, stage };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress, [
      { id: 'pip', position: { ...PLANTER_LAYOUT.slots.work }, available: true },
      { id: 'moss', position: { x: 0, z: 0 }, available: true },
    ]);
    sim.tick(2);
    expect(sim.runtime.claims.moss?.directive.action).toBe('observe');
    return sim;
  }

  it.each([['empty', 'assembly'], ['soil', 'planting']] as const)('teaches %s via three continuous seconds beside the active worker', (stage, ability) => {
    const sim = observing(stage);
    sim.input.footprintClear = false;
    expect(sim.runtime.claims.moss?.directive.action).toBe('observe');
    expect(sim.runtime.claims.moss?.directive.target).toEqual(PLANTER_LAYOUT.slots.observe);
    sim.tick(10);
    expect(sim.input.progress.knowledge.moss).toEqual([]);
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.observe };
    sim.tick(40);
    sim.input.actors[1].position = { x: 0, z: 0 };
    sim.tick();
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.observe };
    sim.tick(59);
    expect(sim.input.progress.knowledge.moss).toEqual([]);
    sim.tick();
    // Hold the footprint so planting's 5s action remains active during the reset.
    expect(sim.input.progress.knowledge.moss).toContain(ability);
  });

  it('does not accumulate observation while the teacher is away from the work slot', () => {
    const sim = observing();
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.observe };
    sim.tick(40);
    sim.input.actors[0].position = { x: 0, z: 0 };
    sim.tick(30);
    expect(sim.input.progress.knowledge.moss).toEqual([]);
    expect(sim.runtime.claims.moss?.directive.action).not.toBe('observe');
  });

  it('does not accumulate observation across a restarted teacher action', () => {
    const sim = observing();
    sim.input.actors[1].position = { ...PLANTER_LAYOUT.slots.observe };
    sim.tick(40);
    const teacher = sim.runtime.claims.pip!;
    sim.runtime.claims.pip = { ...teacher, directive: { ...teacher.directive, key: `${teacher.directive.key}:retry`, elapsed: 0 }, elapsed: 0 };
    sim.tick(21);
    expect(sim.input.progress.knowledge.moss).toEqual([]);
  });

  it('never waits for a distant observer before finishing the teacher action', () => {
    const sim = observing();
    sim.tick(120);
    expect(sim.input.progress.stage).toBe('base');
    expect(sim.input.progress.knowledge.moss).toEqual([]);
  });

  it('releases stationary approaches after four seconds with a two-second actor cooldown', () => {
    const sim = simulation();
    sim.tick();
    sim.tick(79);
    expect(sim.runtime.claims.pip).toBeDefined();
    sim.tick();
    expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick(39);
    expect(sim.runtime.claims.pip).toBeUndefined();
    sim.tick();
    expect(sim.runtime.claims.pip?.directive.action).toBe('read');
  });

  it('keeps a moving detour even when distance from the destination increases', () => {
    const sim = simulation();
    sim.tick();
    const key = sim.runtime.claims.pip!.directive.key;
    for (let i = 0; i < 120; i++) {
      sim.input.actors[0].position = { x: (i + 1) * .03, z: 0 };
      sim.tick();
    }
    expect(sim.runtime.claims.pip?.directive.key).toBe(key);
    expect(sim.runtime.claims.pip?.stalled).toBe(0);
  });

  it.each(['unavailable', 'carried', 'missing', 'unreachable'] as const)('releases an interrupted carried bundle when actor is %s without delivering it', reason => {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'committed', stage: 'base' };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress);
    sim.tick(13, true);
    expect(sim.runtime.claims.pip?.step).toBe('drop');
    if (reason === 'unavailable') sim.input.actors[0].available = false;
    if (reason === 'carried') sim.input.actors[0].carried = true;
    if (reason === 'missing') sim.input.actors = [];
    if (reason === 'unreachable') sim.input.reachable = () => false;
    sim.tick();
    expect(sim.runtime.claims.pip).toBeUndefined();
    expect(sim.events).toEqual([]);
    expect(sim.input.progress).toEqual(progress);
  });

  it('allows another resident to take over a stalled carrier from the basket', () => {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'committed', stage: 'base' };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress);
    sim.tick(13, true);
    sim.tick(80);
    expect(sim.runtime.claims.pip).toBeUndefined();
    sim.input.actors = [{ id: 'moss', position: { x: 0, z: 0 }, available: true }];
    sim.tick();
    expect(sim.runtime.claims.moss?.step).toBe('pickup');
    expect(sim.input.progress.delivered).toBe(false);
    expect(sim.input.progress.stage).toBe('base');
    expect(sim.input.progress.supplies).toBe('committed');
  });

  it('releases obsolete stage claims when supplied progress changes', () => {
    const sim = observing();
    sim.input.progress = { ...sim.input.progress, stage: 'frame', delivered: false };
    sim.tick();
    expect(Object.values(sim.runtime.claims).every(c => c.stage === null || c.stage === 'soil')).toBe(true);
    expect(sim.events).toEqual([]);
  });

  it('schedules three-second planter visits separated by fifteen quiet seconds without new progression', () => {
    const progress: PlanterProgress = { ...createPlanterProgress(), book: true, supplies: 'used', stage: 'planted' };
    progress.knowledge.pip = ['assembly', 'planting'];
    const sim = simulation(progress);
    sim.tick(300, true);
    expect(sim.runtime.claims).toEqual({});
    sim.tick();
    const first = sim.runtime.claims.pip!.directive.action;
    expect(['water', 'inspect']).toContain(first);
    expect(sim.runtime.claims.pip!.directive.tool).toBe(first === 'water' ? 'can' : null);
    sim.tick(59, true);
    expect(sim.runtime.claims.pip).toBeDefined();
    sim.tick(1, true);
    expect(sim.runtime.claims).toEqual({});
    sim.tick(299, true);
    expect(sim.runtime.claims).toEqual({});
    sim.tick(1, true);
    expect(['water', 'inspect']).toContain(sim.runtime.claims.pip!.directive.action);
    expect(sim.runtime.claims.pip!.directive.action).not.toBe(first);
    expect(sim.events).toEqual([]);
    expect(sim.input.progress).toEqual(progress);
  });

  it('never overlaps reservations for a book, basket, mallet, or can', () => {
    const sim = simulation({ ...createPlanterProgress(), book: true, supplies: 'available' }, ['pip', 'moss', 'fern'].map(id => ({
      id: id as ResidentSnapshot['id'], position: { x: 0, z: 0 }, available: true,
    })));
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      sim.tick(1, true);
      const claims = Object.values(sim.runtime.claims);
      for (const action of ['read', 'carry', 'observe', 'water', 'inspect']) {
        expect(claims.filter(c => c.directive.action === action).length).toBeLessThanOrEqual(1);
      }
      for (const tool of ['mallet', 'can']) expect(claims.filter(c => c.directive.tool === tool).length).toBeLessThanOrEqual(1);
      for (const claim of claims) seen.add(claim.directive.action);
    }
    expect([...seen]).toEqual(expect.arrayContaining(['read', 'carry', 'assemble', 'fill', 'plant', 'water', 'inspect']));
  });
});
