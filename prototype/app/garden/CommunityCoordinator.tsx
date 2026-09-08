'use client';

import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type * as THREE from 'three';
import { communityDirectives, createCommunity, nudgeToy, residentObstacles, reservePlacements, selectVisitorAttention, stepCommunity, type CommunityInput, type ResidentSnapshot } from './residentCoordination';
import { GARDEN_TOY_AUTHORED_POSITION } from './GardenObjects';
import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenPoint, nearestSafePoint, type GardenObstacle, type GardenPoint } from './navigation';
import type { ResidentDefinition, ResidentId, ResidentTarget } from './residents';
import { residentPhase, type ResidentInteractionState } from './residentInteraction';
import { createProjectRuntime, stepProject, type ProjectRuntime } from './planterCoordinator';
import { createPlanterProgress, nextBuildStage, reducePlanterProgress, type PlanterEvent, type PlanterProgress } from './planterProgress';
import { planterObstacles, PLANTER_LAYOUT } from './planterLayout';

export type ProjectCommunityFrame = { progress: PlanterProgress; projection?: PlanterProgress; epoch: number | null; playerPosition: GardenPoint };

// This instance owns transient frame data. React only receives discrete interaction events.
export class GardenCommunity {
  state = createCommunity({ x: GARDEN_TOY_AUTHORED_POSITION[0], z: GARDEN_TOY_AUTHORED_POSITION[2] });
  snapshots: ResidentSnapshot[] = [];
  pendingPlacements: Partial<Record<ResidentId, GardenPoint>> = {};
  attention: ResidentId | null = null;
  reducedMotion = false;
  projectRuntime: ProjectRuntime | null = null;
  projectProgress = createPlanterProgress();
  extraObstacles: readonly GardenObstacle[] = [];
  private pendingEvents: PlanterEvent[] = [];
  private authoritative: PlanterProgress | null = null;
  private passiveEpisodes: Partial<Record<ResidentId, number>> = {};
  private participants = new Set<ResidentId>();
  private celebrations: Partial<Record<ResidentId, number>> = {};
  private activeTime = 0;
  advance(input: CommunityInput, attention: ResidentId | null, project?: ProjectCommunityFrame): PlanterEvent[] {
    const applied = Object.keys(this.pendingPlacements).filter(id => {
      const actor = input.actors.find(snapshot => snapshot.id === id);
      const point = this.pendingPlacements[id as ResidentId];
      return actor && point && !actor.carried && Math.hypot(actor.position.x - point.x, actor.position.z - point.z) < .22;
    });
    for (const id of applied) delete this.pendingPlacements[id as ResidentId];
    this.snapshots = reservePlacements(input.actors, this.pendingPlacements);
    this.reducedMotion = input.reducedMotion ?? false;
    const dt = input.paused ? 0 : Math.max(0, Math.min(.05, Number.isFinite(input.delta) ? input.delta : 0));
    this.activeTime += dt;
    if (project) for (const actor of this.snapshots) {
      const distance = Math.hypot(actor.position.x - project.playerPosition.x, actor.position.z - project.playerPosition.z);
      if (distance > 4.1) delete this.passiveEpisodes[actor.id];
      else if (distance <= 3.6 || this.passiveEpisodes[actor.id] !== undefined) {
        this.passiveEpisodes[actor.id] = (this.passiveEpisodes[actor.id] ?? 0) + dt;
      }
    }
    this.attention = attention && (this.passiveEpisodes[attention] ?? 0) < 4 ? attention : null;
    const events = this.advanceProject(input, project);
    this.state = stepCommunity(this.state, { ...input, extraObstacles: this.extraObstacles,
      actors: this.snapshots.map(a => ({ ...a, available: a.available && a.id !== this.attention
        && !this.projectDirective(a.id) && this.celebration(a.id) === null })) });
    return events;
  }
  private advanceProject(input: CommunityInput, frame?: ProjectCommunityFrame): PlanterEvent[] {
    this.extraObstacles = frame ? planterObstacles(frame.projection ?? frame.progress) : [];
    if (!frame || frame.epoch === null) {
      this.projectRuntime = null;
      this.pendingEvents = [];
      this.celebrations = {};
      this.participants.clear();
      return [];
    }
    if (!this.projectRuntime || this.projectRuntime.epoch !== frame.epoch) {
      this.projectRuntime = createProjectRuntime(17, frame.epoch);
      this.pendingEvents = [];
      this.participants.clear();
      this.celebrations = {};
      this.authoritative = null;
    }
    if (input.paused) {
      // Keep the epoch's serial namespace through hidden-tab and comparison pauses.
      this.projectRuntime = { ...this.projectRuntime, claims: {} };
      this.celebrations = {};
      return [];
    }
    const actors = this.snapshots.map(a => ({ ...a, available: a.available && a.id !== this.attention && this.celebration(a.id) === null }));
    // Interactions invalidate claims even while awaiting a discrete parent acknowledgement.
    for (const claim of Object.values(this.projectRuntime.claims)) {
      if (!actors.some(a => a.id === claim.directive.actor && a.available && !a.carried)) this.releaseProject(claim.directive.actor);
    }
    if (this.pendingEvents.length) {
      if (this.pendingEvents.every(e => frame.progress.processed.includes(e.id))) {
        if (this.pendingEvents.some(e => e.type === 'build' && e.stage === 'planted')) {
          for (const id of this.participants) if (actors.some(a => a.id === id && a.available && !a.carried)) this.celebrations[id] = this.activeTime;
        }
        this.pendingEvents = [];
      } else if (frame.progress === this.authoritative) {
        this.extraObstacles = planterObstacles(this.pendingEvents.reduce(reducePlanterProgress, frame.progress));
        return [];
      }
      else {
        // A changed authoritative projection that omitted the batch rejected it.
        this.projectRuntime = { ...this.projectRuntime, claims: {} };
        this.pendingEvents = [];
        this.participants.clear();
      }
    }
    this.authoritative = frame.progress;
    this.projectProgress = frame.progress;
    const footprintClear = !nextBuildStage(frame.progress.stage) || (
      this.snapshots.every(a => a.carried || Math.hypot(a.position.x - PLANTER_LAYOUT.planter.x, a.position.z - PLANTER_LAYOUT.planter.z) >= PLANTER_LAYOUT.planterRadius + .35)
      && Math.hypot(frame.playerPosition.x - PLANTER_LAYOUT.planter.x, frame.playerPosition.z - PLANTER_LAYOUT.planter.z) >= PLANTER_LAYOUT.planterRadius + .35);
    const step = stepProject(this.projectRuntime, { delta: input.delta, paused: false, epoch: frame.epoch,
      progress: frame.progress, actors: actors.map(a => ({ ...a, available: a.available && this.celebration(a.id) === null })), footprintClear,
      reachable: (id, target) => {
        const actor = this.snapshots.find(a => a.id === id);
        if (!actor) return false;
        try { createSafeGardenRoute(actor.position, target, this.obstacles(id)); return true; } catch { return false; }
      } });
    this.projectRuntime = step.runtime;
    for (const d of Object.values(step.directives)) {
      if (d.action !== 'read' && d.action !== 'inspect' && d.action !== 'water') this.participants.add(d.actor);
    }
    this.pendingEvents = step.events;
    // Reserve newly accepted geometry during the parent-render gap as well.
    if (step.events.length) this.extraObstacles = planterObstacles(step.events.reduce(reducePlanterProgress, frame.progress));
    return step.events;
  }
  projectDirective(id: ResidentId) { return this.projectRuntime?.claims[id]?.directive ?? null; }
  releaseProject(id: ResidentId) {
    if (this.projectRuntime) {
      delete this.projectRuntime.claims[id];
      for (const claim of Object.values(this.projectRuntime.claims)) if (claim.teacher === id) delete this.projectRuntime.claims[claim.directive.actor];
    }
    delete this.celebrations[id];
  }
  celebration(id: ResidentId): number | null {
    const started = this.celebrations[id];
    return started !== undefined && this.activeTime - started < 2 ? this.activeTime - started : null;
  }
  directive(id: ResidentId) { return communityDirectives(this.state)[id] ?? null; }
  obstacles(id: ResidentId | null) { return residentObstacles(id, this.snapshots, this.extraObstacles); }
  playerObstacles() { return [...GARDEN_OBSTACLES, ...this.extraObstacles.map(o => ({ ...o, radius: o.radius + .35 }))]; }
  recordPosition(id: ResidentId, point: GardenPoint) {
    this.snapshots = this.snapshots.map(a => a.id === id ? { ...a, position: { ...point } } : a);
  }
  reservePlacement(id: ResidentId, point: GardenPoint) {
    this.pendingPlacements[id] = { ...point };
    this.snapshots = reservePlacements(this.snapshots, this.pendingPlacements);
  }
  spawnPoint(id: ResidentId, requested: readonly [number, number, number]): readonly [number, number, number] {
    const obstacles = this.obstacles(id);
    const point = isSafeGardenPoint({ x: requested[0], z: requested[2] }, obstacles)
      ? { x: requested[0], z: requested[2] }
      : nearestSafePoint({ x: requested[0], z: requested[2] }, obstacles);
    return [point.x, requested[1], point.z];
  }
  placeToy(point: GardenPoint) {
    this.state = { ...this.state, play: null, toy: { point: { ...point }, end: { ...point }, remaining: 0, roll: 0 } };
  }
  nudge(id: ResidentId) {
    const actor = this.snapshots.find(a => a.id === id);
    if (actor) this.state = { ...this.state, toy: nudgeToy(this.state.toy, actor, this.snapshots, this.reducedMotion, this.extraObstacles) };
  }
}

export default function CommunityCoordinator({ community, roster, actors, player, focused, priorities, comparing, reducedMotion, project, projection, epoch, onProjectEvents }: {
  community: GardenCommunity; roster: readonly ResidentDefinition[];
  actors: Record<ResidentId, MutableRefObject<THREE.Group | null>>;
  player: ResidentInteractionState; focused: ResidentTarget | null; priorities: Record<ResidentId, boolean>;
  comparing: boolean; reducedMotion: boolean;
  project: PlanterProgress; projection: PlanterProgress; epoch: number | null; onProjectEvents: (events: PlanterEvent[]) => void;
}) {
  useFrame(({ clock, camera }, delta) => {
    const snapshots: ResidentSnapshot[] = roster.flatMap(resident => {
      const node = actors[resident.id].current;
      return node ? [{ id: resident.id, position: { x: node.position.x, z: node.position.z },
        available: residentPhase(player, resident.id) === 'none' && !priorities[resident.id],
        carried: residentPhase(player, resident.id) === 'carried' }] : [];
    });
    const attention = selectVisitorAttention(snapshots, camera.position, focused === 'food' || focused === 'toy' ? null : focused);
    const events = community.advance({ now: clock.elapsedTime, delta, paused: comparing || document.hidden, reducedMotion,
      actors: snapshots,
      toyFree: player.scene.interaction.held !== 'toy' && player.scene.phase !== 'playing' }, attention,
    { progress: project, projection, epoch, playerPosition: camera.position });
    if (events.length) onProjectEvents(events);
  }, -.5);
  return null;
}
