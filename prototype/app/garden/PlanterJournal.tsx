'use client';

import { projectComplete, type ProjectsProgress } from './projectProgress';
import { ABILITY_CATALOG } from './abilities';
import { residentDefinition, type ResidentId } from './residents';

function projectCopy(progress: ProjectsProgress): string {
  const learned = Object.values(progress.knowledge).some(abilities => Object.keys(abilities).length > 0);
  if (projectComplete(progress, 'planter')) return 'Their planter is part of the grove now.';
  if (progress.projects.planter.supplies === 'committed') return 'The spirits are making a planter together.';
  if (!progress.book) return 'A making-and-growing book can arrive with the reading nook.';
  if (!learned) return 'A new book is waiting to be explored.';
  if (progress.projects.planter.supplies === 'absent') return 'An idea is ready. Materials can arrive whenever.';
  return 'An idea and materials are ready in the grove.';
}

function learnedCopy(id: ResidentId, abilities: ProjectsProgress['knowledge'][ResidentId]): string {
  const words = ABILITY_CATALOG.flatMap(ability => abilities[ability.id]
    ? [`${ability.name} (${abilities[ability.id]!.status})`] : []);
  return `${residentDefinition(id).name}: ${words.join(', ')}.`;
}

export default function PlanterJournal({ progress, busy, comparing, onMaterials }: {
  progress: ProjectsProgress;
  busy: boolean;
  comparing: boolean;
  onMaterials: () => void;
}): React.JSX.Element {
  const learned = (Object.entries(progress.knowledge) as [ResidentId, ProjectsProgress['knowledge'][ResidentId]][])
    .filter(([, abilities]) => Object.keys(abilities).length > 0);
  const supplied = progress.projects.planter.supplies !== 'absent';
  return <section className="planter-journal" aria-label="Shared planter">
    <span className="overline">Shared planter</span>
    <p>{projectCopy(progress)}</p>
    {!progress.book && progress.projects.planter.supplies === 'available' && <p className="planter-delivery-status" role="status">The materials are waiting safely in their basket.</p>}
    {learned.length > 0 && <ul aria-label="What the spirits have learned">
      {learned.map(([id, abilities]) => <li key={id}>{learnedCopy(id, abilities)}
        {Object.values(abilities).some(a => a.source.kind === 'legacy') && <small>Legacy knowledge</small>}
        {Object.values(abilities).some(a => a.source.kind === 'preview') && <small>Preview knowledge</small>}
      </li>)}
    </ul>}
    {learned.length > 0 && <small>Familiar means encountered. Practiced means successfully used.</small>}
    <button type="button" className="simulate-material-delivery" onClick={onMaterials}
      disabled={busy || comparing || supplied}>Simulate material delivery</button>
    <small>Fictional supplies. Refresh starts over.</small>
  </section>;
}
