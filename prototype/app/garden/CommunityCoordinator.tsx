'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type * as THREE from 'three';
import { communityDirectives, createCommunity, nudgeToy, residentObstacles, reservePlacements, selectVisitorAttention, stepCommunity, type CommunityInput, type ResidentSnapshot } from './residentCoordination';
import { GARDEN_TOY_AUTHORED_POSITION } from './GardenObjects';
import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenPoint, nearestSafePoint, type GardenObstacle, type GardenPoint } from './navigation';
import type { ResidentDefinition, ResidentId, ResidentTarget } from './residents';
import { residentPhase, type ResidentInteractionState } from './residentInteraction';
import { createProjectRuntime, stepProject, type ProjectRuntime } from './projectScheduler';
import { createProjectsProgress, projectComplete, reduceProjectProgress, type ProjectEvent, type ProjectsProgress } from './projectProgress';
import type { ProjectId } from './projectDefinitions';
import { projectObstacles, PROJECT_LAYOUTS } from './projectLayout';

export type ProjectCommunityFrame = { progress: ProjectsProgress; projection?: ProjectsProgress; epoch: number | null; activated?: readonly ProjectId[]; playerPosition: GardenPoint };

// This instance owns transient frame data. React only receives discrete interaction events.
export class GardenCommunity {
  state = createCommunity({ x: GARDEN_TOY_AUTHORED_POSITION[0], z: GARDEN_TOY_AUTHORED_POSITION[2] });
  snapshots: ResidentSnapshot[] = [];
  pendingPlacements: Partial<Record<ResidentId, GardenPoint>> = {};
  attention: ResidentId | null = null;
  reducedMotion = false;
  projectRuntime: ProjectRuntime | null = null;
  projectProgress = createProjectsProgress();
  extraObstacles: readonly GardenObstacle[] = [];
  private pendingEvents: ProjectEvent[] = [];
  private authoritative: ProjectsProgress | null = null;
  private passiveEpisodes: Partial<Record<ResidentId, number>> = {};
  private participants = new Set<ResidentId>();
  private celebrations: Partial<Record<ResidentId, number>> = {};
  private activeTime = 0;
  advance(input: CommunityInput, attention: ResidentId | null, project?: ProjectCommunityFrame): ProjectEvent[] {
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
  private advanceProject(input: CommunityInput, frame?: ProjectCommunityFrame): ProjectEvent[] {
    if (frame?.epoch !== null && frame?.epoch !== undefined && this.projectRuntime && frame.epoch < this.projectRuntime.epoch) return [];
    this.extraObstacles = frame ? projectObstacles(frame.projection ?? frame.progress, frame.activated) : [];
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
      this.projectRuntime = { ...this.projectRuntime, claims: {}, toolClaims: {} };
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
        if (this.pendingEvents.some(e => e.type === 'complete' && projectComplete(frame.progress, e.project))) {
          for (const id of this.participants) if (actors.some(a => a.id === id && a.available && !a.carried)) this.celebrations[id] = this.activeTime;
        }
        this.pendingEvents = [];
      } else if (frame.progress === this.authoritative) {
        this.extraObstacles = projectObstacles(this.pendingEvents.reduce(reduceProjectProgress, frame.progress), frame.activated);
        return [];
      }
      else {
        // A changed authoritative projection that omitted the batch rejected it.
        for (const claim of Object.values(this.projectRuntime.claims)) this.releaseProject(claim.directive.actor);
        this.projectRuntime = { ...this.projectRuntime, claims: {}, toolClaims: {} };
        this.pendingEvents = [];
        this.participants.clear();
      }
    }
    this.authoritative = frame.progress;
    this.projectProgress = frame.progress;
    const footprintClear = Object.fromEntries((['planter', 'tool-rack'] as const).map(id => {
      const layout = PROJECT_LAYOUTS[id];
      const clear = projectComplete(frame.progress, id) || (
        this.snapshots.every(a => a.carried || Math.hypot(a.position.x - layout.center.x, a.position.z - layout.center.z) >= layout.radius + .35)
        && Math.hypot(frame.playerPosition.x - layout.center.x, frame.playerPosition.z - layout.center.z) >= layout.radius + .35);
      return [id, clear];
    })) as Record<ProjectId, boolean>;
    const step = stepProject(this.projectRuntime, { delta: input.delta, paused: false, epoch: frame.epoch,
      progress: frame.progress, activated: frame.activated, actors: actors.map(a => ({ ...a, available: a.available && this.celebration(a.id) === null })), footprintClear,
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
    if (step.events.length) this.extraObstacles = projectObstacles(step.events.reduce(reduceProjectProgress, frame.progress), frame.activated);
    return step.events;
  }
  projectDirective(id: ResidentId) { return this.projectRuntime?.claims[id]?.directive ?? null; }
  releaseProject(id: ResidentId) {
    if (this.projectRuntime) {
      for (const claim of Object.values(this.projectRuntime.claims)) {
        if (claim.directive.actor !== id && claim.teacher !== id) continue;
        if (claim.resource && this.projectRuntime.toolClaims[claim.resource]?.key === claim.id) delete this.projectRuntime.toolClaims[claim.resource];
        this.projectRuntime.cooldowns[claim.directive.actor] = this.projectRuntime.elapsed + 2;
        delete this.projectRuntime.claims[claim.directive.actor];
      }
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

export default function CommunityCoordinator({ community, roster, actors, player, focused, priorities, comparing, reducedMotion, project, projection, activated, epoch, onProjectEvents, onActivities }: {
  community: GardenCommunity; roster: readonly ResidentDefinition[];
  actors: Record<ResidentId, MutableRefObject<THREE.Group | null>>;
  player: ResidentInteractionState; focused: ResidentTarget | null; priorities: Record<ResidentId, boolean>;
  comparing: boolean; reducedMotion: boolean;
  activated?: readonly ProjectId[];
  onActivities?: (activities: Partial<Record<ResidentId, string>>) => void;
  project: ProjectsProgress; projection: ProjectsProgress; epoch: number | null; onProjectEvents: (events: ProjectEvent[]) => void;
}) {
  const activityKey = useRef('');
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
    { progress: project, projection, activated, epoch, playerPosition: camera.position });
    if (events.length) onProjectEvents(events);
    if (onActivities) {
      const activities = Object.fromEntries(roster.map(({ id }) => {
        const d = community.projectDirective(id);
        return [id, d ? `${d.action} · ${d.phase}` : 'Exploring at their own pace'];
      }));
      const key = JSON.stringify(activities);
      if (key !== activityKey.current) { activityKey.current = key; onActivities(activities); }
    }
  }, -.5);
  return null;
}
