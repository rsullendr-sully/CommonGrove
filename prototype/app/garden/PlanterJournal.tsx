'use client';

import type { PlanterProgress } from './planterProgress';
import { residentDefinition, type ResidentId } from './residents';

function projectCopy(progress: PlanterProgress): string {
  const learned = Object.values(progress.knowledge).some(abilities => abilities.length > 0);
  if (progress.stage === 'planted') return 'Their planter is part of the grove now.';
  if (progress.supplies === 'committed') return 'The spirits are making a planter together.';
  if (!progress.book) return 'A making-and-growing book can arrive with the reading nook.';
  if (!learned) return 'A new book is waiting to be explored.';
  if (progress.supplies === 'absent') return 'An idea is ready. Materials can arrive whenever.';
  return 'An idea and materials are ready in the grove.';
}

function learnedCopy(id: ResidentId, abilities: PlanterProgress['knowledge'][ResidentId]): string {
  const words = abilities.map(ability => ability === 'assembly' ? 'simple assembly' : 'planting');
  const list = words.length === 2 ? `${words[0]} and ${words[1]}` : words[0];
  return `${residentDefinition(id).name} learned ${list}.`;
}

export default function PlanterJournal({ progress, busy, comparing, onMaterials }: {
  progress: PlanterProgress;
  busy: boolean;
  comparing: boolean;
  onMaterials: () => void;
}): React.JSX.Element {
  const learned = (Object.entries(progress.knowledge) as [ResidentId, PlanterProgress['knowledge'][ResidentId]][])
    .filter(([, abilities]) => abilities.length > 0);
  const supplied = progress.supplies !== 'absent';
  return <section className="planter-journal" aria-label="Shared planter">
    <span className="overline">Shared planter</span>
    <p>{projectCopy(progress)}</p>
    {!progress.book && progress.supplies === 'available' && <p className="planter-delivery-status" role="status">The materials are waiting safely in their basket.</p>}
    {learned.length > 0 && <ul aria-label="What the spirits have learned">
      {learned.map(([id, abilities]) => <li key={id}>{learnedCopy(id, abilities)}</li>)}
    </ul>}
    <button type="button" className="simulate-material-delivery" onClick={onMaterials}
      disabled={busy || comparing || supplied}>Simulate material delivery</button>
    <small>Fictional supplies. Refresh starts over.</small>
  </section>;
}
