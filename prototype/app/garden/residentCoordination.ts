import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenPoint, isSafeGardenSegment, nearestSafePoint, type GardenObstacle, type GardenPoint } from './navigation';
import type { ResidentId } from './residents';

export type ResidentSnapshot = { id: ResidentId; position: GardenPoint; available: boolean; carried?: boolean };
export type CommunityDirective = { key: string; kind: 'play' | 'watch' | 'greet'; target: GardenPoint; lookAt: GardenPoint; performing: boolean };
export type ToyMotion = { point: GardenPoint; end: GardenPoint; roll: number; remaining: number };
type PlayClaim = { owner: ResidentId; observer: ResidentId | null; spot: GardenPoint; watchSpot: GardenPoint | null;
  stage: 'approach' | 'anticipate' | 'roll' | 'follow' | 'pause'; started: number; since: number };
type SocialClaim = { a: ResidentId; b: ResidentId; spot: GardenPoint; anchor: GardenPoint; since: number; started: number; greeting: boolean };
export type CommunityState = { toy: ToyMotion; play: PlayClaim | null; social: SocialClaim | null; nextPlay: number; nextSocial: number;
  lastOwner: ResidentId | null; waitingTurn: ResidentId | null; turns: number };
export type CommunityInput = { now: number; delta: number; actors: readonly ResidentSnapshot[]; toyFree: boolean; paused: boolean; reducedMotion?: boolean; extraObstacles?: readonly GardenObstacle[] };
const distance = (a: GardenPoint, b: GardenPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const peerCircles = (id: ResidentId | null, actors: readonly ResidentSnapshot[]) => actors.filter(a => a.id !== id && !a.carried).map(a => ({ ...a.position, radius: .5 }));

/** Apply placement decisions to the frame snapshot before any actor is stepped. */
export function reservePlacements(
  actors: readonly ResidentSnapshot[],
  placements: Partial<Record<ResidentId, GardenPoint>>,
): ResidentSnapshot[] {
  return actors.map(actor => placements[actor.id]
    ? { ...actor, position: { ...placements[actor.id]! }, carried: false }
    : { ...actor, position: { ...actor.position } });
}

export function residentObstacles(id: ResidentId | null, actors: readonly ResidentSnapshot[], extra: readonly GardenObstacle[] = []): GardenObstacle[] {
  return [...GARDEN_OBSTACLES, ...extra, ...peerCircles(id, actors)];
}
export function selectVisitorAttention(actors: readonly ResidentSnapshot[], visitor: GardenPoint, focused: ResidentId | null): ResidentId | null {
  const available = actors.filter(a => a.available);
  if (focused && available.some(a => a.id === focused)) return focused;
  return available.filter(a => distance(a.position, visitor) < 3.2).sort((a, b) => distance(a.position, visitor) - distance(b.position, visitor))[0]?.id ?? null;
}
export function safeToyNudge(start: GardenPoint, direction: GardenPoint, peers: readonly GardenObstacle[], reducedMotion = false, extra: readonly GardenObstacle[] = []): GardenPoint {
  const length = Math.hypot(direction.x, direction.z);
  if (length < .0001) return { ...start };
  const amount = reducedMotion ? .45 : .85;
  const end = { x: start.x + direction.x / length * amount, z: start.z + direction.z / length * amount };
  // Navigation already includes .35 body clearance. Add .1 for the ring's .45 footprint,
  // including pond/boundaries, and validate the entire path, not only the endpoint.
  const obstacles = [...GARDEN_OBSTACLES, ...extra, ...peers].map(o => ({ ...o, radius: o.radius + .1 }));
  obstacles.push({ x: 0, z: 0, radius: 6.85 });
  return Math.abs(end.x) <= 18.6 && Math.abs(end.z) <= 18.6 && isSafeGardenSegment(start, end, obstacles) ? end : { ...start };
}
function reachableSpot(actor: ResidentSnapshot, center: GardenPoint, radius: number, actors: readonly ResidentSnapshot[], extra: readonly GardenObstacle[] = []): GardenPoint | null {
  const obstacles = [...residentObstacles(actor.id, actors), ...extra];
  const angle = Math.atan2(actor.position.z - center.z, actor.position.x - center.x);
  for (const offset of [0, .65, -.65, 1.3, -1.3, Math.PI]) {
    const point = { x: center.x + Math.cos(angle + offset) * radius, z: center.z + Math.sin(angle + offset) * radius };
    if (!isSafeGardenPoint(point, obstacles)) continue;
    try { createSafeGardenRoute(actor.position, point, obstacles); return point; } catch { /* Next safe approach. */ }
  }
  return null;
}
export function createCommunity(point: GardenPoint): CommunityState {
  const safe = nearestSafePoint(point, GARDEN_OBSTACLES.map(o => ({ ...o, radius: o.radius + .16 })));
  return { toy: { point: safe, end: safe, roll: 0, remaining: 0 }, play: null, social: null, nextPlay: 4, nextSocial: 13, lastOwner: null, waitingTurn: null, turns: 0 };
}
export function nudgeToy(toy: ToyMotion, actor: ResidentSnapshot, actors: readonly ResidentSnapshot[], reducedMotion = false, extra: readonly GardenObstacle[] = []): ToyMotion {
  const end = safeToyNudge(toy.point, { x: toy.point.x - actor.position.x, z: toy.point.z - actor.position.z }, peerCircles(actor.id, actors), reducedMotion, extra);
  return { ...toy, end, remaining: distance(toy.point, end) > .001 ? 1.2 : 0 };
}
export function stepToy(toy: ToyMotion, delta: number, actors: readonly ResidentSnapshot[], extra: readonly GardenObstacle[] = []): ToyMotion {
  if (toy.remaining <= 0) return toy;
  const dt = Math.min(Math.max(delta, 0), .05, toy.remaining);
  const fraction = dt / toy.remaining;
  const point = { x: toy.point.x + (toy.end.x - toy.point.x) * fraction, z: toy.point.z + (toy.end.z - toy.point.z) * fraction };
  // A resident may enter the planned sweep after the nudge. Stop at the last safe point.
  const obstacles = peerCircles(null, actors).map(o => ({ ...o, radius: o.radius + .05 }));
  if (!isSafeGardenSegment(toy.point, point, [...GARDEN_OBSTACLES, ...extra.map(o => ({ ...o, radius: o.radius + .1 })), ...obstacles])) return { ...toy, end: toy.point, remaining: 0 };
  return { point, end: toy.end, remaining: Math.max(0, toy.remaining - dt), roll: toy.roll + distance(toy.point, point) / .255 };
}
function releasePlay(state: CommunityState, now: number, completed = false): CommunityState {
  return { ...state, play: null, nextPlay: now + 4, lastOwner: state.play?.owner ?? state.lastOwner,
    waitingTurn: state.play?.observer ?? null, turns: state.turns + Number(completed) };
}
export function stepCommunity(previous: CommunityState, input: CommunityInput): CommunityState {
  const { now, actors, toyFree, paused, extraObstacles = [] } = input;
  if (paused) return { ...previous, play: null, social: null, nextPlay: now + 4, nextSocial: now + 8, toy: { ...previous.toy, end: previous.toy.point, remaining: 0 } };
  let state = { ...previous, toy: stepToy(previous.toy, input.delta, actors, extraObstacles) };
  const available = (id: ResidentId) => actors.find(a => a.id === id && a.available);
  if (state.play) {
    const claim = state.play;
    const owner = available(claim.owner);
    if (!owner || !toyFree || now - claim.started > 18) state = releasePlay(state, now);
    else {
      if (claim.observer && !available(claim.observer)) state.play = { ...claim, observer: null, watchSpot: null };
      if (claim.stage === 'approach' && distance(owner.position, claim.spot) < .18) state.play = { ...state.play!, stage: 'anticipate', since: now };
      else if (claim.stage === 'anticipate' && now - claim.since > .65) {
        state.toy = nudgeToy(state.toy, owner, actors, input.reducedMotion, extraObstacles);
        state.play = { ...state.play!, stage: 'roll', since: now };
      } else if (claim.stage === 'roll' && state.toy.remaining <= 0) {
        const spot = reachableSpot(owner, state.toy.point, 1, actors, extraObstacles);
        state.play = { ...state.play!, stage: spot ? 'follow' : 'pause', spot: spot ?? claim.spot, since: now };
      } else if (claim.stage === 'follow' && (distance(owner.position, claim.spot) < .18 || now - claim.since > 4)) state.play = { ...state.play!, stage: 'pause', since: now };
      else if (claim.stage === 'pause' && now - claim.since > 1.6) state = releasePlay(state, now, true);
    }
  }
  if (state.social) {
    const pair = state.social;
    const a = available(pair.a), b = available(pair.b);
    if (!a || !b || now - pair.started > 10 || (pair.greeting && now - pair.since > 2.2)) state = { ...state, social: null, nextSocial: now + 16 };
    else if (!pair.greeting && distance(a.position, pair.spot) < .18 && distance(b.position, pair.anchor) < .18) state.social = { ...pair, greeting: true, since: now };
  }
  const reserved = (id: ResidentId) => state.play?.owner === id || state.play?.observer === id || state.social?.a === id || state.social?.b === id;
  if (!state.play && toyFree && now >= state.nextPlay) {
    state.nextPlay = now + 3;
    const candidates = actors.filter(a => a.available && !reserved(a.id) && distance(a.position, state.toy.point) < 13)
      .sort((a, b) => Number(b.id === state.waitingTurn) - Number(a.id === state.waitingTurn) || Number(a.id === state.lastOwner) - Number(b.id === state.lastOwner) || distance(a.position, state.toy.point) - distance(b.position, state.toy.point));
    for (const owner of candidates) {
      const spot = reachableSpot(owner, state.toy.point, 1, actors, extraObstacles);
      if (!spot) continue;
      let observer: ResidentId | null = null, watchSpot: GardenPoint | null = null;
      for (const other of candidates.filter(a => a.id !== owner.id && distance(a.position, state.toy.point) < 8)) {
        watchSpot = reachableSpot(other, state.toy.point, 2.1, actors, [...extraObstacles, { ...spot, radius: .65 }]);
        if (watchSpot) { observer = other.id; break; }
      }
      state.play = { owner: owner.id, observer, spot, watchSpot, stage: 'approach', started: now, since: now };
      break;
    }
  }
  if (!state.social && now >= state.nextSocial) {
    state.nextSocial = now + 5;
    const free = actors.filter(a => a.available && !reserved(a.id));
    for (const a of free) {
      const b = free.find(other => other.id !== a.id && distance(a.position, other.position) < 6);
      if (!b) continue;
      const spot = reachableSpot(a, b.position, 1.45, actors, extraObstacles);
      if (!spot) continue;
      state.social = { a: a.id, b: b.id, spot, anchor: { ...b.position }, started: now, since: now, greeting: false };
      break;
    }
  }
  return state;
}
export function communityDirectives(state: CommunityState): Partial<Record<ResidentId, CommunityDirective>> {
  const result: Partial<Record<ResidentId, CommunityDirective>> = {};
  if (state.play) {
    const play = state.play;
    result[play.owner] = { key: `play:${play.started}:${play.stage}`, kind: 'play', target: play.spot, lookAt: state.toy.point, performing: !['approach', 'follow'].includes(play.stage) };
    if (play.observer && play.watchSpot) result[play.observer] = { key: `watch:${play.started}`, kind: 'watch', target: play.watchSpot, lookAt: state.toy.point, performing: false };
  }
  if (state.social) {
    const pair = state.social;
    result[pair.a] = { key: `greet:${pair.started}`, kind: 'greet', target: pair.spot, lookAt: pair.anchor, performing: pair.greeting };
    result[pair.b] = { key: `greet:${pair.started}`, kind: 'greet', target: pair.anchor, lookAt: pair.spot, performing: pair.greeting };
  }
  return result;
}
