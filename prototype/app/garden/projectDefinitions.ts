import { abilityDefinition, type AbilityId } from './abilities';

export type ProjectId = 'planter' | 'tool-rack';
export type WorkAction = 'fit' | 'tap' | 'fill' | 'plant';
export type RecipeStep = {
  id: string;
  action: WorkAction;
  ability: AbilityId;
  tool: 'piece' | 'mallet' | 'soil' | 'seeds';
  seconds: number;
  reveal: string;
};

export const PROJECT_RECIPES: Record<ProjectId, readonly RecipeStep[]> = {
  planter: [
    { id: 'fit-base', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'planter-base-seated' },
    { id: 'tap-base', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'planter-base-fastened' },
    { id: 'fit-frame', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'planter-frame-seated' },
    { id: 'tap-frame', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'planter-frame-fastened' },
    { id: 'fill', action: 'fill', ability: 'G1', tool: 'soil', seconds: 4, reveal: 'planter-soil-filled' },
    { id: 'plant', action: 'plant', ability: 'G2', tool: 'seeds', seconds: 4, reveal: 'planter-seeds-planted' },
  ],
  'tool-rack': [
    { id: 'fit-base', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-base-seated' },
    { id: 'tap-base', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-base-fastened' },
    { id: 'fit-upright', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-upright-seated' },
    { id: 'tap-upright', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-upright-fastened' },
    { id: 'fit-crossbar', action: 'fit', ability: 'B1', tool: 'piece', seconds: 3, reveal: 'tool-rack-crossbar-seated' },
    { id: 'tap-crossbar', action: 'tap', ability: 'B2', tool: 'mallet', seconds: 3, reveal: 'tool-rack-crossbar-fastened' },
  ],
};

export function validateProjectRecipes(
  recipes: Record<ProjectId, readonly RecipeStep[]> = PROJECT_RECIPES,
): string[] {
  const errors: string[] = [];

  for (const project of ['planter', 'tool-rack'] as const) {
    const ids = new Set<string>();
    recipes[project].forEach((step, index) => {
      if (step.id.trim().length === 0) {
        errors.push(`Invalid step id for ${project} at index ${index}`);
      } else if (ids.has(step.id)) {
        errors.push(`Duplicate step id for ${project}: ${step.id}`);
      } else {
        ids.add(step.id);
      }

      if (!Number.isFinite(step.seconds) || step.seconds <= 0) {
        errors.push(`Invalid duration for ${project}/${step.id}: ${step.seconds}`);
      }

      if (!abilityDefinition(step.ability)?.enabled) {
        errors.push(`Disabled or unknown ability for ${project}/${step.id}: ${step.ability}`);
      }
    });
  }

  return errors;
}
