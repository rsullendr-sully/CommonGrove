import type { AbilityId } from './abilities';
import {
  PROJECT_RECIPES,
  type ProjectId,
  type RecipeStep,
} from './projectDefinitions';
import type { ResidentId } from './residents';
import {
  canPerform,
  createKnowledge,
  learnAbility,
  practiceAbility,
  type KnowledgeSource,
  type SpiritKnowledge,
} from './spiritKnowledge';

export type ProjectState = {
  supplies: 'absent' | 'available' | 'committed' | 'used';
  completedSteps: number;
  deliveredForStep: number | null;
};
export type ProjectsProgress = {
  book: boolean;
  knowledge: SpiritKnowledge;
  projects: Record<ProjectId, ProjectState>;
  active: ProjectId | null;
  processed: string[];
};
export type ProjectEvent =
  | { type: 'book'; id: string }
  | { type: 'materials'; id: string; project: ProjectId }
  | { type: 'learn'; id: string; resident: ResidentId; ability: AbilityId; source: KnowledgeSource }
  | { type: 'commit'; id: string; project: ProjectId; resident: ResidentId }
  | { type: 'deliver'; id: string; project: ProjectId; step: number }
  | { type: 'complete'; id: string; project: ProjectId; step: number; resident: ResidentId };

function createProjectState(): ProjectState {
  return { supplies: 'absent', completedSteps: 0, deliveredForStep: null };
}

export function createProjectsProgress(): ProjectsProgress {
  return {
    book: false,
    knowledge: createKnowledge(),
    projects: {
      planter: createProjectState(),
      'tool-rack': createProjectState(),
    },
    active: null,
    processed: [],
  };
}

export function nextRecipeStep(p: ProjectsProgress, id: ProjectId): RecipeStep | null {
  return PROJECT_RECIPES[id][p.projects[id].completedSteps] ?? null;
}

export function projectComplete(p: ProjectsProgress, id: ProjectId): boolean {
  return p.projects[id].completedSteps === PROJECT_RECIPES[id].length;
}

function accepted(p: ProjectsProgress, e: ProjectEvent): string[] {
  return [...p.processed, e.id];
}

export function reduceProjectProgress(p: ProjectsProgress, e: ProjectEvent): ProjectsProgress {
  if (p.processed.includes(e.id)) return p;

  if (e.type === 'book') {
    if (p.book) return p;
    return { ...p, book: true, processed: accepted(p, e) };
  }

  if (e.type === 'materials') {
    const state = p.projects[e.project];
    if (state.supplies !== 'absent') return p;
    return {
      ...p,
      projects: {
        ...p.projects,
        [e.project]: { ...state, supplies: 'available' },
      },
      processed: accepted(p, e),
    };
  }

  if (e.type === 'learn') {
    if (e.source.kind === 'preview' || e.source.kind === 'legacy') return p;
    if (e.source.kind === 'book' && !p.book) return p;
    const knowledge = learnAbility(p.knowledge, e.resident, e.ability, e.source);
    if (knowledge === p.knowledge) return p;
    return { ...p, knowledge, processed: accepted(p, e) };
  }

  const state = p.projects[e.project];

  if (e.type === 'commit') {
    const step = nextRecipeStep(p, e.project);
    if (!step || p.active !== null || state.supplies !== 'available'
      || !canPerform(p.knowledge, e.resident, step.ability)) return p;
    return {
      ...p,
      projects: {
        ...p.projects,
        [e.project]: { ...state, supplies: 'committed' },
      },
      active: e.project,
      processed: accepted(p, e),
    };
  }

  if (e.type === 'deliver') {
    const step = nextRecipeStep(p, e.project);
    if (!step || p.active !== e.project || state.supplies !== 'committed'
      || e.step !== state.completedSteps || state.deliveredForStep !== null) return p;
    return {
      ...p,
      projects: {
        ...p.projects,
        [e.project]: { ...state, deliveredForStep: e.step },
      },
      processed: accepted(p, e),
    };
  }

  const step = nextRecipeStep(p, e.project);
  if (!step || p.active !== e.project || state.supplies !== 'committed'
    || e.step !== state.completedSteps || state.deliveredForStep !== e.step
    || !canPerform(p.knowledge, e.resident, step.ability)) return p;

  const completedSteps = state.completedSteps + 1;
  const complete = completedSteps === PROJECT_RECIPES[e.project].length;
  return {
    ...p,
    knowledge: practiceAbility(p.knowledge, e.resident, step.ability),
    projects: {
      ...p.projects,
      [e.project]: {
        supplies: complete ? 'used' : 'committed',
        completedSteps,
        deliveredForStep: null,
      },
    },
    active: complete ? null : p.active,
    processed: accepted(p, e),
  };
}
