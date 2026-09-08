import { describe, expect, it } from 'vitest';
import * as community from './residentCoordination';
import { isSafeGardenPoint, isSafeGardenSegment, GARDEN_OBSTACLES } from './navigation';
import type { ResidentId } from './residents';
import { createToyPlayApproach } from './GardenObjects';

const actors = () => [
  { id: 'pip' as ResidentId, position: { x: -1, z: 12 }, available: true },
  { id: 'moss' as ResidentId, position: { x: 2, z: 12 }, available: true },
  { id: 'fern' as ResidentId, position: { x: 4, z: 14 }, available: true },
];
describe('shared garden life', () => {
  it('reserves a newly placed resident before any neighbor takes a frame step', () => {
    const snapshots = community.reservePlacements(actors(), { moss: { x: -.14, z: 12 } });
    expect(snapshots.find(a => a.id === 'moss')?.position).toEqual({ x: -.14, z: 12 });
    expect(isSafeGardenSegment({ x: -1, z: 12 }, { x: -.97, z: 12 }, community.residentObstacles('pip', snapshots))).toBe(false);
    const carried = community.reservePlacements([{ ...actors()[1], carried: true }], { moss: { x: -.14, z: 12 } });
    expect(carried[0].carried).toBe(false);
  });
  it('rolls after the actual direct-offer standoff without colliding with its nudger', () => {
    const toy = { x: 0, z: 12 };
    const approach = createToyPlayApproach({ x: -2, z: 12 }, toy, GARDEN_OBSTACLES, 1);
    const nudger = { id: 'pip' as const, position: approach.standoff, available: false };
    let motion = community.nudgeToy(community.createCommunity(toy).toy, nudger, [nudger]);
    for (let frame = 0; frame < 30; frame++) motion = community.stepToy(motion, .05, [nudger]);
    expect(motion.point.x).toBeGreaterThan(.8);
    expect(motion.remaining).toBe(0);
    expect(motion.roll).toBeGreaterThan(0);
  });
  it('checks the whole toy sweep, peers and pond edge', () => {
    expect(community.safeToyNudge({ x: 0, z: 7.5 }, { x: 0, z: -1 }, [])).toEqual({ x: 0, z: 7.5 });
    expect(community.safeToyNudge({ x: 0, z: 12 }, { x: 1, z: 0 }, [{ x: .5, z: 12, radius: .1 }])).toEqual({ x: 0, z: 12 });
    const end = community.safeToyNudge({ x: 0, z: 12 }, { x: 1, z: 0 }, []);
    expect(end.x).toBeCloseTo(.85);
    expect(isSafeGardenSegment({ x: 0, z: 12 }, end, GARDEN_OBSTACLES)).toBe(true);
  });
  it('treats peers as real footprints for routes and placement', () => {
    const obstacles = community.residentObstacles('pip', actors());
    expect(isSafeGardenSegment({ x: 0, z: 12 }, { x: 3, z: 12 }, obstacles)).toBe(false);
    expect(isSafeGardenPoint({ x: 2, z: 12 }, obstacles)).toBe(false);
    expect(community.selectVisitorAttention(actors(), { x: -1, z: 13 }, null)).toBe('pip');
    expect(community.selectVisitorAttention(actors(), { x: -1, z: 13 }, 'moss')).toBe('moss');
  });
  it('grants a single reachable owner and a separate watching spot', () => {
    const state = community.stepCommunity(community.createCommunity({ x: 0, z: 12 }), { now: 5, delta: .05, actors: actors(), toyFree: true, paused: false });
    expect(state.play?.owner).toBe('pip');
    expect(state.play?.observer).toBe('moss');
    expect(state.play?.spot).not.toEqual(state.play?.watchSpot);
    expect(Object.values(community.communityDirectives(state)).filter(d => d?.kind === 'play')).toHaveLength(1);
  });
  it('cancels ownership on pickup, participant removal or comparison and times out blocked paths', () => {
    const input = { now: 5, delta: .05, actors: actors(), toyFree: true, paused: false };
    const claim = community.stepCommunity(community.createCommunity({ x: 0, z: 12 }), input);
    for (const changed of [{ toyFree: false }, { actors: actors().slice(1) }, { paused: true }, { now: 30 }]) {
      const next = community.stepCommunity(claim, { ...input, ...changed });
      expect(next.play).toBeNull();
    }
  });
  it('completes real turns and gives the observer the next opportunity', () => {
    let state = community.createCommunity({ x: 0, z: 12 });
    const snapshots = actors();
    const owners = new Set<ResidentId>();
    for (let now = 0; now < 45; now += .05) {
      state = community.stepCommunity(state, { now, delta: .05, actors: snapshots, toyFree: true, paused: false });
      if (state.play) owners.add(state.play.owner);
      const directives = community.communityDirectives(state);
      for (const actor of snapshots) {
        const target = directives[actor.id]?.target;
        if (target) actor.position = { ...target };
      }
      expect(isSafeGardenPoint(state.toy.point, GARDEN_OBSTACLES)).toBe(true);
    }
    expect(owners.has('pip')).toBe(true);
    expect(owners.has('moss')).toBe(true);
    expect(state.turns).toBeGreaterThanOrEqual(2);
    expect(state.toy.point).not.toEqual({ x: 0, z: 12 });
  });
  it('makes finite social pairs and releases both when one becomes unavailable', () => {
    const input = { now: 15, delta: .05, actors: actors(), toyFree: false, paused: false };
    const state = community.stepCommunity(community.createCommunity({ x: 0, z: 12 }), input);
    expect(state.social).not.toBeNull();
    const pair = state.social!;
    expect(Math.hypot(pair.spot.x - pair.anchor.x, pair.spot.z - pair.anchor.z)).toBeGreaterThan(1);
    const unavailable = input.actors.map(a => ({ ...a, available: a.id !== pair.b }));
    expect(community.stepCommunity(state, { ...input, actors: unavailable }).social).toBeNull();
    expect(community.stepCommunity(state, { ...input, now: 40 }).social).toBeNull();
  });
});
