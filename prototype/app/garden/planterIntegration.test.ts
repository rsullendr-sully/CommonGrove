import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GardenCommunity } from './CommunityCoordinator';
import { createPlanterProgress } from './planterProgress';
import { createProjectsProgress, migrateLegacyPlanter, reduceProjectProgress, type ProjectEvent } from './projectProgress';
import { RESIDENTS, type ResidentId } from './residents';
import type { ResidentSnapshot } from './residentCoordination';
import { stepProjectTravel, type ProjectTravel } from './projectActivity';
import { isSafeGardenPoint, isSafeGardenSegment } from './navigation';
import { PIP_MOTION_CONFIG } from './locomotion';
import { PLANTER_LAYOUT } from './planterLayout';
import type { GardenPoint } from './navigation';
import { createGardenSession, gardenSessionReducer, visibleProjects, type GardenSession } from './gardenSession';

const DT = .05;

/** Full loops use authored spawns; teaching fixtures declare their initial positions. */
function garden(count: number, initial = createProjectsProgress(), fixtures: Partial<Record<ResidentId, GardenPoint>> = {}) {
  const community = new GardenCommunity();
  const actors: ResidentSnapshot[] = RESIDENTS.slice(0, count).map(r => ({
    id: r.id, available: true, position: { ...fixtures[r.id] ?? { x: r.spawn[0], z: r.spawn[2] } },
  }));
  const travel = new Map<ResidentId, ProjectTravel>(RESIDENTS.slice(0, count).map(r => [r.id, {
    motion: { position: new THREE.Vector3(fixtures[r.id]?.x ?? r.spawn[0], r.spawn[1], fixtures[r.id]?.z ?? r.spawn[2]), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
    key: null, waypoints: [], waypointIndex: 0, planned: false,
  }]));
  let progress = initial;
  let activeSeconds = 0;
  const events: ProjectEvent[] = [];
  const sim = {
    community, actors, travel, events, paused: false, epoch: 1, blockers: [] as ResidentSnapshot[],
    get progress() { return progress; },
    get activeSeconds() { return activeSeconds; },
    apply(batch: ProjectEvent[]) { progress = batch.reduce(reduceProjectProgress, progress); },
    tick() {
      const previousClaims = sim.community.projectRuntime?.claims;
      const batch = community.advance({ now: activeSeconds, delta: DT, paused: sim.paused,
        actors: [...actors, ...sim.blockers].map(a => ({ ...a, position: { ...a.position } })), toyFree: false }, null,
      { progress, activated: ['planter'], epoch: sim.epoch, playerPosition: { x: 0, z: 17 } });
      for (const event of batch) if (event.type === 'learn') {
        const claim = previousClaims?.[event.resident];
        const actor = actors.find(a => a.id === event.resident)!;
        expect(claim?.directive.action).toMatch(/^(read|observe)$/);
        expect(Math.hypot(actor.position.x - claim!.directive.target.x, actor.position.z - claim!.directive.target.z)).toBeLessThanOrEqual(.28);
        expect(claim!.elapsed + DT + 1e-8).toBeGreaterThanOrEqual(claim!.directive.action === 'read' ? 6 : 3);
      }
      for (const actor of actors) {
        const directive = community.projectDirective(actor.id);
        if (!directive || sim.paused || actor.carried || !actor.available) continue;
        const previous = travel.get(actor.id)!;
        const obstacles = community.obstacles(actor.id);
        const next = stepProjectTravel(previous, directive, DT, obstacles);
        expect(isSafeGardenSegment(previous.motion.position, next.motion.position, obstacles),
          `${actor.id} unsafe ${directive.action} at ${activeSeconds.toFixed(2)}s`).toBe(true);
        const distance = previous.motion.position.distanceTo(next.motion.position);
        if (distance > PIP_MOTION_CONFIG.maxSpeed * DT + 1e-8) {
          // The established route stepper settles the final <=.16 units onto a safe waypoint.
          expect(next.motion.moving).toBe(false);
          expect(next.motion.speed).toBe(0);
          expect(distance).toBeLessThanOrEqual(.16 + 1e-8);
          expect(next.waypoints.some(p => p.x === next.motion.position.x && p.z === next.motion.position.z)).toBe(true);
        }
        expect(next.motion.distanceTravelled - previous.motion.distanceTravelled).toBeCloseTo(distance, 8);
        if (directive.phase === 'perform') expect(Math.hypot(actor.position.x - directive.target.x,
          actor.position.z - directive.target.z)).toBeLessThanOrEqual(.28);
        travel.set(actor.id, next);
        actor.position = { x: next.motion.position.x, z: next.motion.position.z };
        community.recordPosition(actor.id, actor.position);
      }
      for (const actor of actors) if (!actor.carried) {
        expect(isSafeGardenSegment(actor.position, actor.position, community.obstacles(actor.id)),
          `${actor.id} overlaps a peer or project footprint at ${activeSeconds.toFixed(2)}s`).toBe(true);
      }
      if (!sim.paused) activeSeconds += DT;
      events.push(...batch);
      sim.apply(batch);
      const accepted = progress;
      sim.apply([...batch, ...batch]);
      expect(progress).toBe(accepted);
    },
    async until(done: () => boolean, seconds = 240) {
      const frames = Math.round(seconds / DT);
      for (let n = 0; n < frames && !done(); n++) {
        sim.tick();
        // Keep Vitest worker messages responsive without changing active simulation time.
        if (n % 100 === 99) await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      expect(done(), `timed out at ${activeSeconds.toFixed(2)} active seconds; stage=${progress.projects.planter.completedSteps}`).toBe(true);
    },
  };
  return sim;
}

describe('planter real-navigation lifecycle', () => {
  it.each(['empty', 'planted'] as const)('reserves the final footprint exactly once during %s-stage routing', stage => {
    const sim = garden(1, migrateLegacyPlanter({ ...createPlanterProgress(), stage }));
    sim.tick();
    const obstacles = sim.community.obstacles('pip');
    expect(isSafeGardenPoint(PLANTER_LAYOUT.planter, obstacles)).toBe(false);
    expect(obstacles.filter(o => o.x === PLANTER_LAYOUT.planter.x && o.z === PLANTER_LAYOUT.planter.z
      && o.radius === PLANTER_LAYOUT.planterRadius)).toHaveLength(1);
  });

  for (const count of [1, 3]) for (const order of ['materials-first', 'knowledge-first']) {
    it(`finishes ${order}, ${count} resident(s), within 240 active seconds using safe routes and bounded waypoint settling`, async () => {
      const sim = garden(count);
      if (order === 'materials-first') {
        sim.apply([{ type: 'materials', id: 'supplies', project: 'planter' }]);
        for (let n = 0; n < 20; n++) sim.tick();
        expect(sim.progress.projects.planter.completedSteps).toBe(0);
        expect(Object.values(sim.progress.knowledge).flatMap(a => Object.keys(a))).toEqual([]);
      }
      sim.apply([{ type: 'book', id: 'nook' }]);
      if (order === 'knowledge-first') {
        await sim.until(() => Object.values(sim.progress.knowledge).some(a => a.B1), 100);
        expect(sim.progress.projects.planter.supplies).toBe('absent');
        expect(sim.progress.projects.planter.completedSteps).toBe(0);
        sim.apply([{ type: 'materials', id: 'supplies', project: 'planter' }]);
      }
      await sim.until(() => sim.progress.projects.planter.completedSteps === 6, 240 - sim.activeSeconds);
      expect(sim.activeSeconds).toBeLessThanOrEqual(240);
      expect(sim.progress.projects.planter.completedSteps).toBe(6);
      expect(sim.progress.projects.planter.supplies).toBe('used');
      expect(Object.values(sim.progress.knowledge).some(a => a.B1)).toBe(true);
      expect(new Set(sim.progress.processed).size).toBe(sim.progress.processed.length);
      expect(sim.events.filter(e => e.type === 'complete').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
    }, 60000);
  }

  it('recovers a ten-second carried participant, a blocked basket, pauses and a new epoch using real routes', async () => {
    const sim = garden(1);
    sim.apply([{ type: 'book', id: 'nook' }, { type: 'materials', id: 'supplies', project: 'planter' }]);
    await sim.until(() => sim.community.projectDirective('pip')?.tool === 'piece'
      && Math.hypot(sim.actors[0].position.x - PLANTER_LAYOUT.slots.pickup.x, sim.actors[0].position.z - PLANTER_LAYOUT.slots.pickup.z) > 1.1, 100);
    const oldKey = sim.community.projectDirective('pip')!.key;
    const heldPoint = { ...sim.actors[0].position };
    const committed = sim.progress;
    sim.actors[0].carried = true;
    for (let n = 0; n < 200; n++) sim.tick();
    expect(sim.community.projectDirective('pip')).toBeNull();
    expect(sim.progress).toBe(committed);
    expect(sim.actors[0].position).toEqual(heldPoint);
    sim.actors[0].carried = false;
    sim.blockers = [{ id: 'moss', available: false, position: { ...PLANTER_LAYOUT.slots.pickup } }];
    for (let n = 0; n < 100; n++) sim.tick();
    expect(sim.progress).toBe(committed);
    expect(sim.community.projectDirective('pip')).toBeNull();
    sim.blockers = [];
    sim.tick();
    expect(sim.community.projectDirective('pip')?.key).not.toBe(oldKey);
    expect(sim.community.projectDirective('pip')?.target).toEqual(PLANTER_LAYOUT.slots.pickup);
    const activeBeforePause = sim.activeSeconds;
    const pausedPositions = sim.actors.map(a => ({ ...a.position }));
    sim.paused = true;
    for (let n = 0; n < 1200; n++) sim.tick();
    expect(sim.activeSeconds).toBe(activeBeforePause);
    expect(sim.progress).toBe(committed);
    expect(sim.actors.map(a => a.position)).toEqual(pausedPositions);
    sim.paused = false;
    sim.epoch++;
    sim.tick();
    expect(sim.community.projectDirective('pip')?.key).toMatch(/^project:2:/);
    await sim.until(() => sim.progress.projects.planter.completedSteps === 6, 240 - sim.activeSeconds);
    const completed = sim.progress;
    sim.apply([{ type: 'materials', id: 'another-bundle', project: 'planter' }, ...sim.events, ...sim.events]);
    expect(sim.progress).toBe(completed);
    expect(sim.events.filter(e => e.type === 'complete').map(e => e.step)).toEqual([0, 1, 2, 3, 4, 5]);
    await sim.until(() => ['water', 'inspect'].includes(sim.community.projectDirective('pip')?.action ?? ''), 40);
    expect(sim.progress).toBe(completed);
  }, 60000);

  function lesson(stage: 'empty' | 'soil', distant = false) {
    const progress = migrateLegacyPlanter({ ...createPlanterProgress(), book: false, supplies: 'committed', delivered: true, stage,
      knowledge: { pip: ['assembly', 'planting'], moss: [], fern: [] } });
    // Isolated teaching fixture; subsequent movement still uses the real route adapter.
    return garden(2, progress, { pip: PLANTER_LAYOUT.slots.pickup,
      ...(distant ? {} : { moss: { x: -13.65, z: .1 } }) });
  }

  it.each([['empty', 'B1'], ['soil', 'G2']] as const)(
    'learns %s by uninterrupted observation without reading the book', async (stage, ability) => {
      const sim = lesson(stage);
      await sim.until(() => Object.keys(sim.progress.knowledge.moss).length > 0, 20);
      expect(Object.keys(sim.progress.knowledge.moss)).toEqual([ability]);
      expect(sim.progress.knowledge.moss[ability]?.source.kind).toBe('observation');
      expect(sim.events.filter(e => e.type === 'learn')).toEqual([
        expect.objectContaining({ resident: 'moss', ability }),
      ]);
    });

  it('does not grant observation knowledge from a distance or across interrupted attendance', async () => {
    const far = lesson('empty', true);
    await far.until(() => far.progress.projects.planter.completedSteps === 1, 20);
    expect(far.progress.knowledge.moss).toEqual({});
    const sim = lesson('empty');
    await sim.until(() => (sim.community.projectDirective('moss')?.elapsed ?? 0) >= 2, 20);
    expect(sim.progress.knowledge.moss).toEqual({});
    sim.actors[1].carried = true;
    sim.tick();
    sim.actors[1].carried = false;
    await sim.until(() => sim.progress.projects.planter.completedSteps === 1, 20);
    expect(sim.progress.knowledge.moss).toEqual({});
  });

  it('rejects real completion batches from comparison and previous epochs, preserving session snapshots', async () => {
    const sim = lesson('empty');
    const pending = sim.progress;
    await sim.until(() => sim.progress.projects.planter.completedSteps === 1, 20);
    const session: GardenSession = { ...createGardenSession(), project: pending,
      journey: { ...createGardenSession().journey, visit: 2, rewardStage: 2 as const }, view: 'now' as const, epoch: 1 };
    const before = session.project;
    const comparing = gardenSessionReducer(session, { type: 'view', view: 'before' });
    expect(visibleProjects(comparing)).toBe(session.previousProject);
    expect(gardenSessionReducer(comparing, { type: 'project', epoch: comparing.epoch, events: sim.events })).toBe(comparing);
    const now = gardenSessionReducer(comparing, { type: 'view', view: 'now' });
    expect(visibleProjects(now)).toBe(before);
    const remounted = gardenSessionReducer(now, { type: 'remount' });
    expect(gardenSessionReducer(remounted, { type: 'project', epoch: 1, events: sim.events })).toBe(remounted);
    const accepted = gardenSessionReducer(remounted, { type: 'project', epoch: remounted.epoch, events: [...sim.events, ...sim.events] });
    expect(accepted.project).toEqual(sim.progress);
    expect(gardenSessionReducer(accepted, { type: 'project', epoch: accepted.epoch, events: sim.events })).toBe(accepted);
    const returned = gardenSessionReducer({ ...accepted, journey: { ...accepted.journey, rewardStage: 3 } },
      { type: 'journey', event: { type: 'return' } });
    expect(returned.project).toBe(accepted.project);
    expect(returned.previousProject).toBe(accepted.project);
    expect(returned.epoch).toBeGreaterThan(accepted.epoch);
    expect(gardenSessionReducer(session, { type: 'journey', event: { type: 'reset' } }).project).toEqual(createProjectsProgress());
  });
});
