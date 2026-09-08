import type { AbilityId } from './abilities';
import type { GardenPoint } from './navigation';
import type { ProjectId, WorkAction } from './projectDefinitions';
import type { ProjectEvent, ProjectsProgress } from './projectProgress';
import { createProjectsProgress, nextRecipeStep, projectComplete, reduceProjectProgress } from './projectProgress';
import { PROJECT_LAYOUTS, toolRestAnchor, type ReusableTool } from './projectLayout';
import { PLANTER_LAYOUT } from './planterLayout';
import { canPerform } from './spiritKnowledge';
import type { ResidentSnapshot } from './residentCoordination';
import type { ResidentId } from './residents';

export type ProjectAction = WorkAction | 'read' | 'carry' | 'observe' | 'water' | 'inspect' | 'store-tool' | 'retrieve-tool';
export type ProjectDirective = {
  key: string; actor: ResidentId; action: ProjectAction; phase: 'approach' | 'perform';
  target: GardenPoint; lookAt: GardenPoint; tool: 'piece' | 'soil' | 'seeds' | ReusableTool | null;
  elapsed: number; project: ProjectId | null; step: number | null; ability: AbilityId | null;
};
export type ProjectClaim = {
  id: string; directive: ProjectDirective; elapsed: number; stalled: number; lastPosition: GardenPoint;
  leg: 'pickup' | 'drop' | 'action'; teacher: ResidentId | null; teacherKey: string | null;
  resource: ReusableTool | null;
};
export type ProjectRuntime = {
  claims: Partial<Record<ResidentId, ProjectClaim>>;
  toolClaims: Partial<Record<ReusableTool, { actor: ResidentId; key: string }>>;
  toolAnchors: Record<ReusableTool, GardenPoint>;
  serial: number; seed: number; elapsed: number; epoch: number; nextTaskAt: number;
  cooldowns: Partial<Record<ResidentId, number>>;
};
export type ProjectInput = {
  delta: number; paused: boolean; epoch: number; progress: ProjectsProgress;
  /** Community must mark player/reward-owned residents unavailable before scheduling. */
  actors: readonly ResidentSnapshot[];
  reachable: (actor: ResidentId, target: GardenPoint) => boolean;
  footprintClear: Record<ProjectId, boolean>;
  activated?: readonly ProjectId[];
};
export type ProjectStep = { runtime: ProjectRuntime; events: ProjectEvent[]; directives: Partial<Record<ResidentId, ProjectDirective>> };
export function createProjectRuntime(seed: number, epoch: number): ProjectRuntime {
  const p = createProjectsProgress();
  return { claims: {}, toolClaims: {}, toolAnchors: { mallet: toolRestAnchor(p, 'mallet', null), can: toolRestAnchor(p, 'can', null) }, serial: 0, seed, epoch, elapsed: 0, nextTaskAt: 15, cooldowns: {} };
}

const distance = (a: GardenPoint, b: GardenPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const at = (a: GardenPoint, b: GardenPoint) => distance(a, b) <= .28 + 1e-9;
const isWork = (d: ProjectDirective) => ['fit', 'tap', 'fill', 'plant'].includes(d.action);
const isConstruction = (c: ProjectClaim) => c.directive.step !== null && c.directive.action !== 'observe';
const isAmbient = (c: ProjectClaim) => c.directive.step === null
  && ['water', 'inspect', 'store-tool', 'retrieve-tool'].includes(c.directive.action);
const learnedFromBook = (p: ProjectsProgress, id: ResidentId) => (['B1', 'B2', 'G1', 'G2'] as const)
  .every(ability => p.knowledge[id][ability] && ['book', 'observation'].includes(p.knowledge[id][ability]!.source.kind));

export function stepProject(runtime: ProjectRuntime, input: ProjectInput): ProjectStep {
  // A stale frame cannot rewind the epoch; a new epoch first discards all previous work.
  if (input.epoch !== runtime.epoch) return {
    runtime: input.epoch > runtime.epoch ? createProjectRuntime(runtime.seed, input.epoch) : runtime,
    events: [], directives: {},
  };
  const r: ProjectRuntime = { ...runtime, claims: {}, toolClaims: {},
    toolAnchors: { ...runtime.toolAnchors }, cooldowns: { ...runtime.cooldowns } };
  const events: ProjectEvent[] = [];
  const result = (): ProjectStep => ({ runtime: r, events,
    directives: Object.fromEntries(Object.values(r.claims).map(c => [c.directive.actor, c.directive])) });
  if (input.paused) return result();
  const dt = Number.isFinite(input.delta) ? Math.min(.05, Math.max(0, input.delta)) : 0;
  if (dt === 0) return { runtime, events, directives: {} };
  for (const claim of Object.values(runtime.claims)) {
    r.claims[claim.directive.actor] = { ...claim, directive: { ...claim.directive } };
    if (claim.resource) r.toolClaims[claim.resource] = { actor: claim.directive.actor, key: claim.id };
  }
  r.elapsed += dt;
  let progress = input.progress;
  const key = () => `project:${r.epoch}:${++r.serial}`;
  const emit = (event: ProjectEvent) => {
    const next = reduceProjectProgress(progress, event);
    if (next !== progress) { events.push(event); progress = next; }
  };
  const actors = input.actors.filter(a => a.available && !a.carried);
  const release = (claim: ProjectClaim) => {
    delete r.claims[claim.directive.actor];
    if (claim.resource && r.toolClaims[claim.resource]?.key === claim.id) delete r.toolClaims[claim.resource];
    r.cooldowns[claim.directive.actor] = r.elapsed + 2;
    if (isAmbient(claim)) r.nextTaskAt = r.elapsed + 15;
  };
  const toolApproach = (tool: ReusableTool): GardenPoint => {
    const anchor = r.toolAnchors[tool];
    return distance(anchor, PROJECT_LAYOUTS['tool-rack'].center) < 1
      ? PROJECT_LAYOUTS['tool-rack'].slots.work : PLANTER_LAYOUT.slots.carryDrop;
  };
  const valid = (c: ProjectClaim) => {
    const d = c.directive;
    const actor = actors.find(a => a.id === d.actor);
    if (!actor || !input.reachable(d.actor, d.target)) return false;
    if (c.resource && r.toolClaims[c.resource]?.key !== c.id) return false;
    if (d.action === 'read') return progress.book;
    if (d.step !== null && d.project) {
      const state = progress.projects[d.project];
      if (progress.active !== d.project || state.supplies !== 'committed' || state.completedSteps !== d.step) return false;
      if (isConstruction(c) && (!d.ability || !canPerform(progress.knowledge, d.actor, d.ability))) return false;
      if (isWork(d) && state.deliveredForStep !== d.step) return false;
    }
    if (d.action === 'store-tool') return projectComplete(progress, 'tool-rack');
    if (d.action === 'water' || d.action === 'inspect') return projectComplete(progress, 'planter');
    return true;
  };
  const teaching = (c: ProjectClaim) => {
    const d = c.directive;
    const actor = actors.find(a => a.id === d.actor);
    return valid(c) && actor && isWork(d) && d.project && at(actor.position, d.target)
      && input.footprintClear[d.project] && progress.projects[d.project].deliveredForStep === d.step;
  };
  const transition = (c: ProjectClaim, action: ProjectAction, leg: ProjectClaim['leg'], target: GardenPoint, lookAt: GardenPoint) => {
    c.leg = leg; c.elapsed = 0; c.stalled = 0;
    c.lastPosition = { ...actors.find(a => a.id === c.directive.actor)!.position };
    c.directive = { ...c.directive, key: key(), action, target, lookAt, phase: 'approach', elapsed: 0 };
  };

  const constructionPending = progress.active !== null || (['planter', 'tool-rack'] as const).some(project => {
    const step = nextRecipeStep(progress, project);
    return progress.projects[project].supplies === 'available' && step
      && actors.some(a => canPerform(progress.knowledge, a.id, step.ability));
  });
  if (constructionPending) for (const c of Object.values(r.claims)) if (isAmbient(c)) release(c);

  // Witness the same valid frame the teacher works, including its final fraction of a second.
  // Observers can approach during delivery, but accrue nothing before the actual action.
  for (const c of Object.values(r.claims).sort((a, b) => Number(b.directive.action === 'observe') - Number(a.directive.action === 'observe'))) {
    let d = c.directive;
    if (!valid(c)) { release(c); continue; }
    const actor = actors.find(a => a.id === d.actor)!;
    let teacher: ProjectClaim | undefined;
    if (d.action === 'observe') {
      teacher = c.teacher ? r.claims[c.teacher] : undefined;
      if (!teacher || teacher.id !== c.teacherKey || !valid(teacher)
        || (c.elapsed > 0 && !teaching(teacher))) { release(c); continue; }
    }
    if (!at(actor.position, d.target)) {
      // Once performance is interrupted, completion requires a new reservation and resource pickup.
      if (c.elapsed > 0 && d.phase === 'perform') { release(c); continue; }
      c.elapsed = 0; d.phase = 'approach';
      if (distance(actor.position, c.lastPosition) >= .02) { c.stalled = 0; c.lastPosition = { ...actor.position }; }
      else c.stalled += dt;
      if (c.stalled + 1e-9 >= 4) release(c);
      continue;
    }
    c.stalled = 0; c.lastPosition = { ...actor.position };
    if ((teacher && !teaching(teacher)) || (isWork(d) && d.project && !input.footprintClear[d.project])) {
      if (c.elapsed > 0) release(c);
      else d.phase = 'approach';
      continue;
    }
    d.phase = 'perform'; c.elapsed += dt; d.elapsed = c.elapsed;
    if (d.action === 'read' && c.elapsed + 1e-9 >= 6) {
      const source = { kind: 'book' as const, id: c.id };
      for (const ability of ['B1', 'B2', 'G1', 'G2'] as const) emit({ type: 'learn', id: key(), resident: d.actor, ability, source });
      release(c);
    } else if (d.action === 'observe' && d.ability && c.elapsed + 1e-9 >= 3) {
      emit({ type: 'learn', id: key(), resident: d.actor, ability: d.ability, source: { kind: 'observation', id: c.teacherKey! } });
      release(c);
    } else if (c.leg === 'pickup' && c.elapsed + 1e-9 >= .6) {
      if (isConstruction(c) && d.project) {
        c.directive.tool = nextRecipeStep(progress, d.project)!.tool;
        transition(c, 'carry', 'drop', PROJECT_LAYOUTS[d.project].slots.carryDrop, PROJECT_LAYOUTS[d.project].center);
      } else if (d.action === 'store-tool') {
        c.directive.tool = c.resource;
        transition(c, 'store-tool', 'drop', PROJECT_LAYOUTS['tool-rack'].slots.work, PROJECT_LAYOUTS['tool-rack'].center);
      } else if (d.action === 'retrieve-tool') {
        c.directive.tool = c.resource;
        transition(c, 'water', 'action', PROJECT_LAYOUTS.planter.slots.water, PROJECT_LAYOUTS.planter.center);
      }
    } else if (c.leg === 'drop' && c.elapsed + 1e-9 >= .6) {
      if (isConstruction(c) && d.project && d.step !== null) {
        if (progress.projects[d.project].deliveredForStep === null) emit({ type: 'deliver', id: key(), project: d.project, step: d.step });
        transition(c, nextRecipeStep(progress, d.project)!.action, 'action', PROJECT_LAYOUTS[d.project].slots.work, PROJECT_LAYOUTS[d.project].center);
      } else if (d.action === 'store-tool' && c.resource) {
        // Move the resting anchor only after the carried prop has reached storage and its claim ends.
        const tool = c.resource; release(c); r.toolAnchors[tool] = toolRestAnchor(progress, tool, null);
      }
    } else if (isWork(d) && d.project && d.step !== null && c.elapsed + 1e-9 >= nextRecipeStep(progress, d.project)!.seconds) {
      emit({ type: 'complete', id: key(), project: d.project, step: d.step, resident: d.actor });
      release(c);
      if (projectComplete(progress, d.project)) r.nextTaskAt = r.elapsed + 15;
    } else if ((d.action === 'water' || d.action === 'inspect') && c.elapsed + 1e-9 >= 3) release(c);
    d = c.directive;
    d.elapsed = c.elapsed;
  }
  // Completion invalidates observers in this frame as well as on the next input frame.
  for (const c of Object.values(r.claims)) if (c.directive.action === 'observe'
    && (!valid(c) || !c.teacher || !r.claims[c.teacher] || r.claims[c.teacher]!.id !== c.teacherKey)) release(c);

  const choose = (target: GardenPoint, eligible: (actor: ResidentSnapshot) => boolean) => {
    if (Object.values(r.claims).some(c => distance(c.directive.target, target) < .85)) return undefined;
    const candidates = actors.filter(a => !r.claims[a.id] && (r.cooldowns[a.id] ?? 0) <= r.elapsed + 1e-9 && eligible(a) && input.reachable(a.id, target))
      .sort((a, b) => a.id.localeCompare(b.id));
    return candidates[(Math.abs(Math.trunc(r.seed)) + r.serial) % candidates.length];
  };
  const assign = (actor: ResidentSnapshot, action: ProjectAction, target: GardenPoint, lookAt: GardenPoint,
    project: ProjectId | null = null, step: number | null = null, ability: AbilityId | null = null,
    resource: ReusableTool | null = null, leg: ProjectClaim['leg'] = 'action') => {
    const id = key();
    const c: ProjectClaim = { id, directive: { key: id, actor: actor.id, action, phase: 'approach', target, lookAt,
      tool: null, elapsed: 0, project, step, ability }, elapsed: 0, stalled: 0, lastPosition: { ...actor.position },
      leg, teacher: null, teacherKey: null, resource };
    r.claims[actor.id] = c;
    if (resource) r.toolClaims[resource] = { actor: actor.id, key: id };
    return c;
  };
  if (progress.active === null) for (const project of ['planter', 'tool-rack'] as const) {
    const step = nextRecipeStep(progress, project);
    if (progress.projects[project].supplies !== 'available' || !step) continue;
    const starter = actors.find(a => canPerform(progress.knowledge, a.id, step.ability));
    if (starter) { emit({ type: 'commit', id: key(), project, resident: starter.id }); break; }
  }
  const project = progress.active;
  const step = project && nextRecipeStep(progress, project);
  if (project && step) {
    // Construction takes priority over ambient storage/visits, including a previously reserved tool.
    for (const c of Object.values(r.claims)) if (isAmbient(c)) release(c);
    if (!Object.values(r.claims).some(isConstruction)) {
      const resource = step.tool === 'mallet' ? 'mallet' : null;
      const pickup = resource ? toolApproach(resource) : PROJECT_LAYOUTS[project].slots.pickup;
      const worker = choose(pickup, a => canPerform(progress.knowledge, a.id, step.ability)
        && input.reachable(a.id, PROJECT_LAYOUTS[project].slots.carryDrop) && input.reachable(a.id, PROJECT_LAYOUTS[project].slots.work));
      if (worker && (!resource || !r.toolClaims[resource])) assign(worker, resource ? 'retrieve-tool' : 'carry', pickup,
        resource ? r.toolAnchors[resource] : PLANTER_LAYOUT.basket, project, progress.projects[project].completedSteps, step.ability, resource, 'pickup');
    }
    const teacher = Object.values(r.claims).find(isConstruction);
    if (teacher && !Object.values(r.claims).some(c => c.directive.action === 'observe')) {
      const observer = choose(PROJECT_LAYOUTS[project].slots.observe, a => !progress.knowledge[a.id][step.ability]);
      if (observer) {
        const c = assign(observer, 'observe', PROJECT_LAYOUTS[project].slots.observe, PROJECT_LAYOUTS[project].slots.work,
          project, progress.projects[project].completedSteps, step.ability);
        c.teacher = teacher.directive.actor; c.teacherKey = teacher.id;
      }
    }
  }
  if (progress.book && !Object.values(r.claims).some(c => c.directive.action === 'read')) {
    const reader = choose(PLANTER_LAYOUT.slots.read, a => !learnedFromBook(progress, a.id));
    if (reader) assign(reader, 'read', PLANTER_LAYOUT.slots.read, PLANTER_LAYOUT.book);
  }
  if (!project && r.elapsed + 1e-9 >= r.nextTaskAt && !Object.values(r.claims).some(isAmbient)) {
    const toStore = (['mallet', 'can'] as const).find(tool => !r.toolClaims[tool]
      && distance(r.toolAnchors[tool], toolRestAnchor(progress, tool, null)) > .01);
    if (toStore) {
      const worker = choose(toolApproach(toStore), () => true);
      if (worker && input.reachable(worker.id, PROJECT_LAYOUTS['tool-rack'].slots.work)) assign(worker, 'store-tool', toolApproach(toStore), r.toolAnchors[toStore], 'tool-rack', null, null, toStore, 'pickup');
    } else if (projectComplete(progress, 'planter')) {
      const water = (Math.abs(r.seed) + r.serial) % 2 === 0;
      const target = water ? toolApproach('can') : PROJECT_LAYOUTS.planter.slots.water;
      const visitor = choose(target, () => !water || !r.toolClaims.can);
      if (visitor) assign(visitor, water ? 'retrieve-tool' : 'inspect', target, water ? r.toolAnchors.can : PROJECT_LAYOUTS.planter.center,
        'planter', null, null, water ? 'can' : null, water ? 'pickup' : 'action');
    }
  }
  return result();
}
