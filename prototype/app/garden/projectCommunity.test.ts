import { describe, expect, it } from 'vitest';
import { GardenCommunity, type ProjectCommunityFrame } from './CommunityCoordinator';
import { createPlanterProgress } from './planterProgress';
import { createProjectsProgress, migrateLegacyPlanter, reduceProjectProgress, type ProjectEvent } from './projectProgress';
import { PLANTER_LAYOUT } from './planterLayout';
import { type CommunityInput } from './residentCoordination';
import { nudgeToy, stepToy, stepCommunity, createCommunity, residentObstacles } from './residentCoordination';
import { isSafeGardenPoint } from './navigation';
import { resolveFirstPersonGardenMove } from './firstPersonMovement';
import { RESIDENTS } from './residents';
import { stepProjectTravel, type ProjectTravel } from './projectActivity';
import * as THREE from 'three';

const frame = (): ProjectCommunityFrame => ({ progress: { ...createProjectsProgress(), book: true }, epoch: 1, playerPosition: { x: 0, z: 17 } });
const input = (): CommunityInput => ({ now: 0, delta: .05, toyFree: false, paused: false,
  actors: [{ id: 'pip', available: true, position: { ...PLANTER_LAYOUT.slots.read } }] });

describe('project and community arbitration', () => {
  it('preserves task IDs across pauses and rejected batches within the same epoch', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    c.advance(i, null, f);
    const first = c.projectDirective('pip')!.key;
    c.advance({ ...i, paused: true }, null, f);
    c.advance(i, null, f);
    expect(c.projectDirective('pip')!.key).not.toBe(first);
    for (let n = 0; n < 125; n++) c.advance(i, null, f);
    f.progress = reduceProjectProgress(f.progress, { type: 'materials', id: 'bundle', project: 'planter' });
    c.advance(i, null, f);
    for (let n = 0; n < 40; n++) c.advance(i, null, f);
    expect(c.projectDirective('pip')!.key).not.toBe(first);
  });
  it('builds from real spawn routes while preventing tool and ordinary-activity double ownership', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.progress = reduceProjectProgress(f.progress, { type: 'materials', id: 'bundle', project: 'planter' });
    const travel = new Map<string, ProjectTravel>();
    i.actors = RESIDENTS.map(r => {
      travel.set(r.id, { motion: { position: new THREE.Vector3(...r.spawn), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
        key: null, waypoints: [], waypointIndex: 0, planned: false });
      return { id: r.id, available: true, position: { x: r.spawn[0], z: r.spawn[2] } };
    });
    i.toyFree = true;
    for (let n = 0; n < 7000 && f.progress.projects.planter.completedSteps !== 6; n++) {
      i.now = n * .05;
      const events = c.advance(i, null, f);
      const tools = new Set<string>();
      for (const a of i.actors) {
        const d = c.projectDirective(a.id);
        if (!d) continue;
        expect(c.directive(a.id)).toBeNull();
        if (d.tool) { expect(tools.has(d.tool)).toBe(false); tools.add(d.tool); }
        const next = stepProjectTravel(travel.get(a.id)!, d, .05, c.obstacles(a.id));
        travel.set(a.id, next);
        a.position = { x: next.motion.position.x, z: next.motion.position.z };
        c.recordPosition(a.id, a.position);
      }
      f.progress = events.reduce(reduceProjectProgress, f.progress);
    }
    expect(f.progress.projects.planter.completedSteps).toBe(6);
    expect(f.progress.projects.planter.supplies).toBe('used');
  }, 60000);
  it('shares project footprints with social approaches, toy sweeps, placement, and player motion', () => {
    const extra = [{ x: 1, z: 12, radius: .3 }];
    const actor = { id: 'pip' as const, available: true, position: { x: -1, z: 12 } };
    const toy = createCommunity({ x: 0, z: 12 }).toy;
    expect(nudgeToy(toy, actor, [actor], false, extra).end).toEqual(toy.point);
    expect(stepToy({ ...toy, end: { x: 2, z: 12 }, remaining: .1 }, .05, [], extra).point).toEqual(toy.point);
    expect(isSafeGardenPoint({ x: 1, z: 12 }, residentObstacles('pip', [actor], extra))).toBe(false);
    const c = new GardenCommunity();
    c.extraObstacles = extra;
    expect(resolveFirstPersonGardenMove({ x: 0, z: 12 }, { x: 2, z: 0 }, c.playerObstacles())).toEqual({ x: 0, z: 12 });
    const neighbors = [actor, { id: 'moss' as const, available: true, position: { x: 2, z: 12 } }];
    const social = stepCommunity(createCommunity(toy.point), { now: 15, delta: .05, actors: neighbors, paused: false, toyFree: false, extraObstacles: extra });
    expect(social.social).not.toBeNull();
    expect(isSafeGardenPoint(social.social!.spot, residentObstacles('pip', neighbors, extra))).toBe(true);
  });
  it('waits for mount acknowledgement and emits a completion only once before parent reconciliation', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    c.advance(i, null, { ...f, epoch: null });
    expect(c.projectDirective('pip')).toBeNull();
    const events: ProjectEvent[] = [];
    for (let n = 0; n < 260; n++) events.push(...c.advance({ ...i, now: n * .05 }, null, f));
    expect(events.filter(e => e.type === 'learn')).toHaveLength(4);
    f.progress = events.reduce(reduceProjectProgress, f.progress);
    expect(c.advance(i, null, f)).toEqual([]);
    expect(c.projectDirective('pip')).toBeNull();
    c.advance(i, null, { ...frame(), epoch: 2 });
    expect(c.projectDirective('pip')?.key).toMatch(/^project:2:/);
  });
  it('limits stationary passive attention to one four-second grace period per approach', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.playerPosition = { x: i.actors[0].position.x, z: i.actors[0].position.z + 2 };
    const events: ProjectEvent[] = [];
    for (let n = 0; n < 600; n++) events.push(...c.advance({ ...i, now: n * .05 }, 'pip', f));
    expect(events.filter(e => e.type === 'learn')).toHaveLength(4);
    expect(c.attention).toBeNull();
    c.advance(i, null, { ...f, playerPosition: { x: 0, z: 17 } });
    c.advance(i, 'pip', f);
    expect(c.attention).toBe('pip');
  });
  it('releases both sides of an existing greeting before reserving the reader', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    i.actors = [...i.actors, { id: 'moss', available: true, position: { x: -10, z: -.8 } }];
    c.state.social = { a: 'pip', b: 'moss', spot: i.actors[0].position, anchor: i.actors[1].position,
      started: 0, since: 0, greeting: true };
    c.advance(i, null, f);
    expect(c.projectDirective('pip')).not.toBeNull();
    expect(c.directive('pip')).toBeNull();
    expect(c.directive('moss')).toBeNull();
    expect(c.snapshots).toHaveLength(2);
    c.advance({ ...i, actors: i.actors.map(a => ({ ...a, available: false, carried: true })) }, null, f);
    expect(c.projectDirective('pip')).toBeNull();
  });
  it('prevents growth around a player or unavailable resident, then celebrates participants once', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.progress = migrateLegacyPlanter({ ...createPlanterProgress(), book: true, stage: 'soil', supplies: 'committed', delivered: true,
      knowledge: { pip: ['assembly', 'planting'], moss: [], fern: [] } });
    i.actors = [{ ...i.actors[0], position: { ...PLANTER_LAYOUT.slots.pickup } }];
    const follow = () => {
      const directive = c.projectDirective('pip');
      if (directive) i.actors[0].position = { ...directive.target };
    };
    f.playerPosition = { ...PLANTER_LAYOUT.planter };
    for (let n = 0; n < 130; n++) { follow(); expect(c.advance(i, null, f)).toEqual([]); }
    f.playerPosition = { x: 0, z: 17 };
    const blocked = { ...i, actors: [...i.actors, { id: 'moss' as const, position: { ...PLANTER_LAYOUT.planter }, available: false }] };
    expect(c.advance(blocked, null, f)).toEqual([]);
    const events: ProjectEvent[] = [];
    for (let n = 0; n < 100 && !events.length; n++) { follow(); events.push(...c.advance(i, null, f)); }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'complete', project: 'planter', step: 5 });
    f.progress = events.reduce(reduceProjectProgress, f.progress);
    c.advance(i, null, f);
    expect(c.celebration('pip')).not.toBeNull();
    for (let n = 0; n < 60; n++) c.advance(i, null, f);
    expect(c.celebration('pip')).toBeNull();
  });
});

describe('shared-tool immediate release', () => {
  function claimedTool() {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.progress = migrateLegacyPlanter({ ...createPlanterProgress(), book: true, supplies: 'committed', knowledge: { pip: ['assembly'], moss: [], fern: [] } });
    f.progress.projects.planter.completedSteps = 1;
    c.advance(i, null, f);
    expect(c.projectRuntime?.toolClaims.mallet?.actor).toBe('pip');
    return { c, i, f };
  }
  it.each(['direct', 'pause', 'unavailable'] as const)('releases tool reservation immediately on %s without resetting anchors/serial', reason => {
    const { c, i, f } = claimedTool();
    const anchors = structuredClone(c.projectRuntime!.toolAnchors), serial = c.projectRuntime!.serial;
    if (reason === 'direct') c.releaseProject('pip');
    else c.advance({ ...i, paused: reason === 'pause', actors: i.actors.map(a => ({ ...a, available: false })) }, null, f);
    expect(c.projectDirective('pip')).toBeNull();
    expect(c.projectRuntime?.toolClaims).toEqual({});
    expect(c.projectRuntime?.toolAnchors).toEqual(anchors);
    expect(c.projectRuntime?.serial).toBeGreaterThanOrEqual(serial);
  });
  it('releases a tool and dependent observer when a pending delivery is rejected, then retries with a fresh claim', () => {
    const { c, i, f } = claimedTool();
    i.actors = [...i.actors, { id: 'moss', available: true, position: { ...PLANTER_LAYOUT.slots.observe } }];
    const events: ProjectEvent[] = [];
    for (let n = 0; n < 30 && !events.length; n++) {
      const d = c.projectDirective('pip');
      if (d) i.actors[0].position = { ...d.target };
      events.push(...c.advance(i, null, f));
    }
    expect(events).toEqual([expect.objectContaining({ type: 'deliver', step: 1 })]);
    const serial = c.projectRuntime!.serial, anchors = structuredClone(c.projectRuntime!.toolAnchors);
    const original = c.projectRuntime!.claims.pip!.id;
    expect(c.projectDirective('moss')?.action).toBe('observe');
    f.progress = { ...f.progress, processed: [...f.progress.processed] }; // New authoritative state omits the pending batch.
    expect(c.advance(i, null, f)).toEqual([]);
    expect(c.projectDirective('pip')).toBeNull();
    expect(c.projectDirective('moss')).toBeNull();
    expect(c.projectRuntime!.toolClaims).toEqual({});
    expect(c.projectRuntime!.toolAnchors).toEqual(anchors);
    expect(c.projectRuntime!.serial).toBe(serial);
    for (let n = 0; n < 40; n++) c.advance(i, null, f);
    expect(c.projectRuntime!.claims.pip?.id).not.toBe(original);
    expect(c.projectRuntime!.toolClaims.mallet?.actor).toBe('pip');
  });
});
