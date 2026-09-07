import type { GardenPoint } from './navigation';
import type { BuildStage, PlanterEvent, PlanterProgress } from './planterProgress';
import type { ResidentSnapshot } from './residentCoordination';
import type { ResidentId } from './residents';
import { PLANTER_LAYOUT, type PlanterSlot } from './planterLayout';
import { canStartPlanter, nextBuildStage, reducePlanterProgress, type Ability } from './planterProgress';

export type ProjectAction = 'read' | 'carry' | 'assemble' | 'fill' | 'plant' | 'observe' | 'water' | 'inspect';
export type ProjectDirective = {
  key: string; actor: ResidentId; action: ProjectAction; phase: 'approach' | 'perform';
  target: GardenPoint; lookAt: GardenPoint; tool: 'piece' | 'soil' | 'seeds' | 'mallet' | 'can' | null;
  elapsed: number;
};
export type ProjectClaim = {
  directive: ProjectDirective; elapsed: number; stalled: number; lastDistance: number;
  lastPosition: GardenPoint; step: 'pickup' | 'drop' | 'action'; stage: BuildStage | null;
  teacher: ResidentId | null; teacherKey: string | null;
};
export type ProjectRuntime = {
  claims: Partial<Record<ResidentId, ProjectClaim>>; serial: number; seed: number;
  elapsed: number; nextTaskAt: number; epoch: number; cooldowns: Partial<Record<ResidentId, number>>;
};
export type ProjectInput = {
  delta: number; paused: boolean; epoch: number; progress: PlanterProgress;
  actors: readonly ResidentSnapshot[]; reachable: (actor: ResidentId, target: GardenPoint) => boolean;
  footprintClear: boolean;
};
export type ProjectStep = {
  runtime: ProjectRuntime; events: PlanterEvent[]; directives: Partial<Record<ResidentId, ProjectDirective>>;
};

export function createProjectRuntime(seed: number, epoch: number): ProjectRuntime {
  return { claims: {}, serial: 0, seed, elapsed: 0, nextTaskAt: 0, epoch, cooldowns: {} };
}

const requiredAbility = (stage: BuildStage): Ability => stage === 'base' || stage === 'frame' ? 'assembly' : 'planting';
const isWork = (action: ProjectAction) => action === 'assemble' || action === 'fill' || action === 'plant';
const isTeaching = (action: ProjectAction) => action === 'assemble' || action === 'plant';
const isVisit = (action: ProjectAction) => action === 'water' || action === 'inspect';
const bundleTool = (stage: BuildStage): ProjectDirective['tool'] => stage === 'soil' ? 'soil' : stage === 'planted' ? 'seeds' : 'piece';
const distanceBetween = (a: GardenPoint, b: GardenPoint) => Math.hypot(a.x - b.x, a.z - b.z);

export function stepProject(runtime: ProjectRuntime, input: ProjectInput): ProjectStep {
  const r: ProjectRuntime = { ...runtime, claims: {},
    cooldowns: input.epoch === runtime.epoch ? { ...runtime.cooldowns } : {}, epoch: input.epoch };
  if (input.epoch === runtime.epoch && !input.paused) {
    for (const claim of Object.values(runtime.claims)) {
      r.claims[claim.directive.actor] = { ...claim, directive: { ...claim.directive } };
    }
  }
  const events: PlanterEvent[] = [];
  const result = (): ProjectStep => ({ runtime: r, events,
    directives: Object.fromEntries(Object.values(r.claims).map(c => [c.directive.actor, c.directive])) });
  if (input.paused) return result();
  const delta = Number.isFinite(input.delta) ? Math.max(0, Math.min(.05, input.delta)) : 0;
  r.elapsed += delta;
  let progress = input.progress;
  const key = () => `planter:${r.epoch}:${++r.serial}`;
  const emit = (event: PlanterEvent) => {
    events.push(event);
    progress = reducePlanterProgress(progress, event);
  };
  const actors = input.actors.filter(a => a.available && !a.carried);
  const release = (claim: ProjectClaim, cooldown = false) => {
    delete r.claims[claim.directive.actor];
    if (cooldown) r.cooldowns[claim.directive.actor] = r.elapsed + 2;
    if (isVisit(claim.directive.action)) r.nextTaskAt = r.elapsed + 15;
  };
  const activeTeacher = (claim: ProjectClaim) => {
    const actor = actors.find(a => a.id === claim.directive.actor);
    return actor && isTeaching(claim.directive.action) && claim.directive.phase === 'perform'
      && claim.stage === nextBuildStage(progress.stage) && progress.delivered
      && distanceBetween(actor.position, claim.directive.target) <= .28;
  };

  // Observe after workers, so a teacher finishing or leaving cannot teach this frame.
  for (const claim of Object.values(r.claims).sort((a, b) => Number(a.directive.action === 'observe') - Number(b.directive.action === 'observe'))) {
    const d = claim.directive;
    const actor = actors.find(a => a.id === d.actor);
    if (!actor || !input.reachable(d.actor, d.target)
      || (claim.stage !== null && (claim.stage !== nextBuildStage(progress.stage) || progress.supplies !== 'committed'))
      || (d.action === 'read' && !progress.book)
      || (d.action === 'carry' && progress.delivered)
      || (isVisit(d.action) && progress.stage !== 'planted')) {
      release(claim);
      continue;
    }
    if (d.action === 'observe') {
      const teacher = claim.teacher && r.claims[claim.teacher];
      if (!teacher || teacher.directive.key !== claim.teacherKey || !activeTeacher(teacher)) {
        delete r.claims[d.actor];
        continue;
      }
    }
    const distance = Math.hypot(actor.position.x - d.target.x, actor.position.z - d.target.z);
    claim.lastDistance = distance;
    if (distance > .28) {
      claim.elapsed = 0;
      d.phase = 'approach';
      // Track actual movement, not distance to the final target: safe routes can detour away.
      if (distanceBetween(actor.position, claim.lastPosition) >= .02) {
        claim.stalled = 0;
        claim.lastPosition = { ...actor.position };
      } else claim.stalled += delta;
      if (claim.stalled + 1e-9 >= 4) { release(claim, true); continue; }
    } else {
      claim.stalled = 0;
      claim.lastPosition = { ...actor.position };
      d.phase = isWork(d.action) && !progress.delivered ? 'approach' : 'perform';
      if (!isWork(d.action) || progress.delivered) claim.elapsed += delta;
      if (d.action === 'read' && claim.elapsed + 1e-9 >= 6) {
        emit({ type: 'learn', id: key(), resident: d.actor, abilities: ['assembly', 'planting'] });
        delete r.claims[d.actor];
      } else if (d.action === 'observe' && claim.stage && claim.elapsed + 1e-9 >= 3) {
        emit({ type: 'learn', id: key(), resident: d.actor, abilities: [requiredAbility(claim.stage)] });
        delete r.claims[d.actor];
      } else if (d.action === 'carry' && claim.stage && claim.elapsed + 1e-9 >= .6) {
        if (claim.step === 'pickup') {
          claim.step = 'drop';
          claim.elapsed = 0;
          d.key = key();
          d.target = PLANTER_LAYOUT.slots.carryDrop;
          d.lookAt = PLANTER_LAYOUT.planter;
          d.phase = 'approach';
          d.tool = bundleTool(claim.stage);
        } else {
          emit({ type: 'deliver', id: key(), stage: claim.stage });
          delete r.claims[d.actor];
        }
      } else if (isWork(d.action) && claim.stage && progress.delivered && input.footprintClear
        && claim.elapsed + 1e-9 >= (d.action === 'assemble' ? 6 : 5)) {
        emit({ type: 'build', id: key(), resident: d.actor, stage: claim.stage });
        delete r.claims[d.actor];
        if (progress.stage === 'planted') r.nextTaskAt = r.elapsed + 15;
      } else if (isVisit(d.action) && claim.elapsed + 1e-9 >= 3) {
        release(claim);
      }
    }
    d.elapsed = claim.elapsed;
  }

  const choose = (slot: PlanterSlot, eligible: (actor: ResidentSnapshot) => boolean) => {
    const candidates = actors.filter(a => !r.claims[a.id] && (r.cooldowns[a.id] ?? 0) <= r.elapsed + 1e-9
      && eligible(a) && input.reachable(a.id, PLANTER_LAYOUT.slots[slot]))
      .sort((a, b) => a.id.localeCompare(b.id));
    return candidates[(Math.abs(r.seed) + r.serial) % candidates.length];
  };
  const assign = (actor: ResidentSnapshot, action: ProjectAction, slot: PlanterSlot, stage: BuildStage | null = null) => {
    const target = PLANTER_LAYOUT.slots[slot];
    r.claims[actor.id] = {
      directive: { key: key(), actor: actor.id, action,
        phase: distanceBetween(actor.position, target) <= .28 && (!isWork(action) || progress.delivered) ? 'perform' : 'approach', target,
        lookAt: action === 'read' ? PLANTER_LAYOUT.book : action === 'carry' ? PLANTER_LAYOUT.basket : PLANTER_LAYOUT.planter,
        tool: action === 'assemble' ? 'mallet' : action === 'water' ? 'can' : null, elapsed: 0 },
      elapsed: 0, stalled: 0, lastDistance: Math.hypot(actor.position.x - target.x, actor.position.z - target.z),
      lastPosition: { ...actor.position }, step: action === 'carry' ? 'pickup' : 'action', stage, teacher: null, teacherKey: null,
    };
  };
  if (progress.supplies === 'available') {
    const starter = choose('work', a => canStartPlanter(progress, a.id));
    if (starter) emit({ type: 'commit', id: key(), resident: starter.id });
  }
  const stage = nextBuildStage(progress.stage);
  if (progress.supplies === 'committed' && stage) {
    if (!progress.delivered && !Object.values(r.claims).some(c => c.directive.action === 'carry')) {
      // A helper may disappear; free a waiting worker so a solo resident can carry instead.
      for (const claim of Object.values(r.claims)) if (isWork(claim.directive.action)) release(claim);
    }
    if (!progress.delivered && !Object.values(r.claims).some(c => c.directive.action === 'carry')) {
      // Prefer an untrained helper, leaving a trained resident free to work.
      const canCarry = (a: ResidentSnapshot) => input.reachable(a.id, PLANTER_LAYOUT.slots.carryDrop);
      const carrier = choose('pickup', a => canCarry(a) && !progress.knowledge[a.id].includes(requiredAbility(stage)))
        ?? choose('pickup', canCarry);
      if (carrier) assign(carrier, 'carry', 'pickup', stage);
    }
    if ((progress.delivered || Object.values(r.claims).some(c => c.directive.action === 'carry'))
      && !Object.values(r.claims).some(c => isWork(c.directive.action))) {
      const worker = choose('work', a => progress.knowledge[a.id].includes(requiredAbility(stage)));
      if (worker) assign(worker, stage === 'soil' ? 'fill' : stage === 'planted' ? 'plant' : 'assemble', 'work', stage);
    }
  }
  if (progress.stage === 'planted') {
    if (r.nextTaskAt === 0) r.nextTaskAt = r.elapsed + 15;
    if (r.elapsed + 1e-9 >= r.nextTaskAt && !Object.values(r.claims).some(c => isVisit(c.directive.action))) {
      const visitor = choose('water', () => true);
      if (visitor) assign(visitor, (Math.abs(r.seed) + r.serial) % 2 === 0 ? 'water' : 'inspect', 'water');
    }
  }
  const teacher = Object.values(r.claims).find(activeTeacher);
  if (teacher?.stage && !Object.values(r.claims).some(c => c.directive.action === 'observe')) {
    const ability = requiredAbility(teacher.stage);
    const observer = choose('observe', a => !progress.knowledge[a.id].includes(ability));
    if (observer) {
      assign(observer, 'observe', 'observe', teacher.stage);
      const claim = r.claims[observer.id]!;
      claim.teacher = teacher.directive.actor;
      claim.teacherKey = teacher.directive.key;
      claim.directive.lookAt = teacher.directive.target;
    }
  }
  if (progress.book && !Object.values(r.claims).some(c => c.directive.action === 'read')) {
    const reader = choose('read', a => progress.knowledge[a.id].length < 2);
    if (reader) assign(reader, 'read', 'read');
  }
  return result();
}
