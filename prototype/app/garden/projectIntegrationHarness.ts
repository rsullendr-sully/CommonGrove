import { expect } from 'vitest';
import { createRequire } from 'node:module';
import { GardenCommunity } from './CommunityCoordinator';
import { createProjectsProgress, reduceProjectProgress, type ProjectEvent, type ProjectsProgress } from './projectProgress';
import { RESIDENTS, type ResidentId } from './residents';
import type { ResidentSnapshot } from './residentCoordination';
import { stepProjectTravel, type ProjectTravel } from './projectActivity';
import { isSafeGardenSegment } from './navigation';
import { PIP_MOTION_CONFIG } from './locomotion';
import type { GardenPoint } from './navigation';
import type { ProjectId } from './projectDefinitions';
import { PROJECT_LAYOUTS } from './projectLayout';
import { reusableToolInstances } from './LearningProjects';

// Real Three runtime, following the scheduler test's typed Node loading boundary.
type TestVector3 = { x: number; y: number; z: number; clone(): TestVector3;
  sub(other: TestVector3): TestVector3; length(): number; normalize(): TestVector3;
  addScaledVector(other: TestVector3, scale: number): TestVector3;
  distanceTo(other: TestVector3): number };
const loadTestRuntime = createRequire(import.meta.url);
const { Vector3 }: { Vector3: new (x: number, y: number, z: number) => TestVector3 } = loadTestRuntime('three');

const DT = .05;

/** Full loops use authored spawns; teaching fixtures declare their initial positions. */
export function createProjectHarness(count: 1 | 3, initial: ProjectsProgress = createProjectsProgress(), options: { activated?: readonly ProjectId[] } = {}) {
  return createTeachingHarness(count, initial, {}, options.activated);
}

/** The old two-actor observation fixture alone may specify starting positions. */
export function createTeachingHarness(count: 1 | 2 | 3, initial: ProjectsProgress, fixtures: Partial<Record<ResidentId, GardenPoint>> = {}, activated: readonly ProjectId[] = ['planter']) {
  const community = new GardenCommunity();
  const actors: ResidentSnapshot[] = RESIDENTS.slice(0, count).map(r => ({
    id: r.id, available: true, position: { ...fixtures[r.id] ?? { x: r.spawn[0], z: r.spawn[2] } },
  }));
  const travel = new Map<ResidentId, ProjectTravel>(RESIDENTS.slice(0, count).map(r => [r.id, {
    motion: { position: new Vector3(fixtures[r.id]?.x ?? r.spawn[0], r.spawn[1], fixtures[r.id]?.z ?? r.spawn[2]), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
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
      { progress, activated, epoch: sim.epoch, playerPosition: { x: 0, z: 17 } });
      for (const project of activated) {
        const layout = PROJECT_LAYOUTS[project];
        expect(community.extraObstacles.filter(o => o.x === layout.center.x && o.z === layout.center.z
          && o.radius === layout.radius)).toHaveLength(1);
      }
      const directives = Object.fromEntries(actors.flatMap(a => {
        const d = community.projectDirective(a.id);
        return d ? [[a.id, d]] : [];
      }));
      for (const tool of ['mallet', 'can'] as const) {
        const holders = Object.values(directives).filter(d => d.tool === tool);
        expect(holders.length).toBeLessThanOrEqual(1);
        if (holders.length) expect(community.projectRuntime!.toolClaims[tool]?.actor).toBe(holders[0].actor);
        const instances = reusableToolInstances(progress, directives, community.projectRuntime?.toolAnchors).filter(i => i.tool === tool);
        if (Object.values(progress.projects).some(p => p.supplies !== 'absent')) {
          expect(instances).toHaveLength(1);
          expect(instances[0].kind).toBe(holders.length ? 'held' : 'resting');
        } else expect(instances).toEqual([]);
      }
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
      expect(done(), `timed out at ${activeSeconds.toFixed(2)} active seconds; planter=${progress.projects.planter.completedSteps}; rack=${progress.projects['tool-rack'].completedSteps}; actors=${JSON.stringify(actors)}; claims=${JSON.stringify(community.projectRuntime?.claims)}`).toBe(true);
    },
  };
  return sim;
}
