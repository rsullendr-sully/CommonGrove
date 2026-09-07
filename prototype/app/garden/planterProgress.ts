import type { ResidentId } from './residents';

export type Ability = 'assembly' | 'planting';
export type BuildStage = 'empty' | 'base' | 'frame' | 'soil' | 'planted';
export type SupplyState = 'absent' | 'available' | 'committed' | 'used';
export type PlanterProgress = {
  book: boolean;
  knowledge: Record<ResidentId, Ability[]>;
  supplies: SupplyState;
  stage: BuildStage;
  delivered: boolean;
  processed: string[];
};
export type PlanterEvent =
  | { type: 'book'; id: string }
  | { type: 'materials'; id: string }
  | { type: 'learn'; id: string; resident: ResidentId; abilities: Ability[] }
  | { type: 'commit'; id: string; resident: ResidentId }
  | { type: 'deliver'; id: string; stage: BuildStage }
  | { type: 'build'; id: string; resident: ResidentId; stage: BuildStage };

export function createPlanterProgress(): PlanterProgress {
  return {
    book: false,
    knowledge: { pip: [], moss: [], fern: [] },
    supplies: 'absent',
    stage: 'empty',
    delivered: false,
    processed: [],
  };
}

export function reducePlanterProgress(p: PlanterProgress, e: PlanterEvent): PlanterProgress {
  if (p.processed.includes(e.id)) return p;

  if (e.type === 'book') {
    if (p.book) return p;
    return { ...p, book: true, processed: [...p.processed, e.id] };
  }

  if (e.type === 'materials') {
    if (p.supplies !== 'absent') return p;
    return { ...p, supplies: 'available', processed: [...p.processed, e.id] };
  }

  if (e.type === 'learn') {
    if (!p.book) return p;
    const known = p.knowledge[e.resident];
    const learned = e.abilities.filter((ability, index) => (
      !known.includes(ability) && e.abilities.indexOf(ability) === index
    ));
    if (learned.length === 0) return p;
    return {
      ...p,
      knowledge: { ...p.knowledge, [e.resident]: [...known, ...learned] },
      processed: [...p.processed, e.id],
    };
  }

  if (e.type === 'commit') {
    if (!canStartPlanter(p, e.resident)) return p;
    return { ...p, supplies: 'committed', processed: [...p.processed, e.id] };
  }

  const nextStage = nextBuildStage(p.stage);
  if (e.type === 'deliver') {
    if (p.supplies !== 'committed' || p.delivered || e.stage !== nextStage) return p;
    return { ...p, delivered: true, processed: [...p.processed, e.id] };
  }

  if (e.type === 'build') {
    if (p.supplies !== 'committed' || !p.delivered || e.stage !== nextStage) return p;
    const requiredAbility: Ability = e.stage === 'base' || e.stage === 'frame'
      ? 'assembly'
      : 'planting';
    if (!p.knowledge[e.resident].includes(requiredAbility)) return p;
    return {
      ...p,
      stage: e.stage,
      delivered: false,
      supplies: e.stage === 'planted' ? 'used' : p.supplies,
      processed: [...p.processed, e.id],
    };
  }

  return p;
}

const order: BuildStage[] = ['empty', 'base', 'frame', 'soil', 'planted'];

export function nextBuildStage(stage: BuildStage): BuildStage | null {
  return order[order.indexOf(stage) + 1] ?? null;
}

export function canStartPlanter(p: PlanterProgress, resident: ResidentId): boolean {
  return p.book
    && p.supplies === 'available'
    && p.knowledge[resident].includes('assembly');
}
