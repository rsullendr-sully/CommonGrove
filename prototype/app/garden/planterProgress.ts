import type { ResidentId } from './residents';
import type { ProjectsProgress } from './projectProgress';

/** Read-only compatibility projection for the existing planter geometry. */
export type PlanterProjection = Readonly<{ book: boolean; supplies: SupplyState; stage: BuildStage }>;
export function projectPlanter(progress: ProjectsProgress): PlanterProjection {
  const state = progress.projects.planter;
  const stage: BuildStage = state.completedSteps >= 6 ? 'planted' : state.completedSteps >= 5 ? 'soil'
    : state.completedSteps >= 3 ? 'frame' : state.completedSteps >= 1 ? 'base' : 'empty';
  return { book: progress.book, supplies: state.supplies, stage };
}

/** Legacy fixture schema only; all runtime changes use projectProgress.ts. */
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
