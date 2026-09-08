'use client';

import { groundGardenPosition } from './gardenElevation';
import type { GardenPoint } from './navigation';
import { PROJECT_LAYOUTS } from './projectLayout';
import type { ProjectsProgress } from './projectProgress';
import type { ProjectDirective } from './projectScheduler';
import PlanterProject, { ProjectTool } from './PlanterProject';
import { PLANTER_LAYOUT } from './planterLayout';
import type { ResidentId } from './residents';
import ToolRackProject from './ToolRackProject';

export type ReusableToolInstance =
  | { tool: 'mallet' | 'can'; kind: 'resting'; anchor: GardenPoint }
  | { tool: 'mallet' | 'can'; kind: 'held'; actor: ResidentId };

export function reusableToolInstances(
  progress: ProjectsProgress,
  directives: Partial<Record<ResidentId, ProjectDirective>>,
  toolAnchors?: Readonly<Record<'mallet' | 'can', GardenPoint>>,
): readonly ReusableToolInstance[] {
  const opportunity = Object.values(progress.projects).some(project => project.supplies !== 'absent');
  if (!opportunity || !toolAnchors) return [];
  return (['mallet', 'can'] as const).map(tool => {
    const holder = Object.values(directives).find(directive => directive?.tool === tool);
    return holder
      ? { tool, kind: 'held' as const, actor: holder.actor }
      : { tool, kind: 'resting' as const, anchor: toolAnchors[tool] };
  });
}

export type LearningProjectsProps = {
  progress: ProjectsProgress;
  directives: Partial<Record<ResidentId, ProjectDirective>>;
  /** Actual runtime positions; omitted snapshots never synthesize or teleport tools. */
  toolAnchors?: Readonly<Record<'mallet' | 'can', GardenPoint>>;
};

export default function LearningProjects({ progress, directives, toolAnchors }: LearningProjectsProps): React.JSX.Element {
  const tools = reusableToolInstances(progress, directives, toolAnchors);
  return <group name="learning-projects">
    <PlanterProject progress={progress} layout={PLANTER_LAYOUT} directives={directives} />
    <ToolRackProject state={progress.projects['tool-rack']} layout={PROJECT_LAYOUTS['tool-rack']} />
    {tools.flatMap(instance => instance.kind === 'resting' ? [
      <group key={instance.tool} name={`resting-${instance.tool}`}
        position={groundGardenPosition(instance.anchor.x, instance.anchor.z, instance.tool === 'mallet' ? .2 : .17)}>
        <ProjectTool kind={instance.tool} />
      </group>,
    ] : [])}
  </group>;
}
