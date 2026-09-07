import { describe, expect, it } from 'vitest';
import { GardenCommunity, type ProjectCommunityFrame } from './CommunityCoordinator';
import { createPlanterProgress, reducePlanterProgress, type PlanterEvent } from './planterProgress';
import { PLANTER_LAYOUT } from './planterLayout';
import { type CommunityInput } from './residentCoordination';
import { nudgeToy, stepToy, stepCommunity, createCommunity, residentObstacles } from './residentCoordination';
import { isSafeGardenPoint } from './navigation';
import { resolveFirstPersonGardenMove } from './firstPersonMovement';
import { RESIDENTS } from './residents';
import { stepProjectTravel, type ProjectTravel } from './projectActivity';
import * as THREE from 'three';

const frame = (): ProjectCommunityFrame => ({ progress: { ...createPlanterProgress(), book: true }, epoch: 1, playerPosition: { x: 0, z: 17 } });
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
    f.progress = { ...f.progress, supplies: 'available' };
    c.advance(i, null, f);
    expect(c.projectDirective('pip')!.key).not.toBe(first);
  });
  it('builds from real spawn routes while preventing tool and ordinary-activity double ownership', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.progress = { ...f.progress, supplies: 'available' };
    const travel = new Map<string, ProjectTravel>();
    i.actors = RESIDENTS.map(r => {
      travel.set(r.id, { motion: { position: new THREE.Vector3(...r.spawn), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
        key: null, waypoints: [], waypointIndex: 0, planned: false });
      return { id: r.id, available: true, position: { x: r.spawn[0], z: r.spawn[2] } };
    });
    i.toyFree = true;
    for (let n = 0; n < 7000 && f.progress.stage !== 'planted'; n++) {
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
      f.progress = events.reduce(reducePlanterProgress, f.progress);
    }
    expect(f.progress.stage).toBe('planted');
    expect(f.progress.supplies).toBe('used');
  }, 30000);
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
    const events: PlanterEvent[] = [];
    for (let n = 0; n < 260; n++) events.push(...c.advance({ ...i, now: n * .05 }, null, f));
    expect(events.filter(e => e.type === 'learn')).toHaveLength(1);
    f.progress = events.reduce(reducePlanterProgress, f.progress);
    expect(c.advance(i, null, f)).toEqual([]);
    expect(c.projectDirective('pip')).toBeNull();
    c.advance(i, null, { ...frame(), epoch: 2 });
    expect(c.projectDirective('pip')?.key).toMatch(/^planter:2:/);
  });
  it('limits stationary passive attention to one four-second grace period per approach', () => {
    const c = new GardenCommunity(), i = input(), f = frame();
    f.playerPosition = { x: i.actors[0].position.x, z: i.actors[0].position.z + 2 };
    const events: PlanterEvent[] = [];
    for (let n = 0; n < 600; n++) events.push(...c.advance({ ...i, now: n * .05 }, 'pip', f));
    expect(events.filter(e => e.type === 'learn')).toHaveLength(1);
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
    f.progress = { ...f.progress, stage: 'soil', supplies: 'committed', delivered: true,
      knowledge: { pip: ['assembly', 'planting'], moss: [], fern: [] } };
    i.actors = [{ ...i.actors[0], position: { ...PLANTER_LAYOUT.slots.work } }];
    f.playerPosition = { ...PLANTER_LAYOUT.planter };
    for (let n = 0; n < 130; n++) expect(c.advance(i, null, f)).toEqual([]);
    f.playerPosition = { x: 0, z: 17 };
    const blocked = { ...i, actors: [...i.actors, { id: 'moss' as const, position: { ...PLANTER_LAYOUT.planter }, available: false }] };
    expect(c.advance(blocked, null, f)).toEqual([]);
    const events = c.advance(i, null, f);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'build', stage: 'planted' });
    f.progress = events.reduce(reducePlanterProgress, f.progress);
    c.advance(i, null, f);
    expect(c.celebration('pip')).not.toBeNull();
    for (let n = 0; n < 60; n++) c.advance(i, null, f);
    expect(c.celebration('pip')).toBeNull();
  });
});
