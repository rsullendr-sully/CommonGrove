'use client';
import { useEffect, useRef, useState } from 'react';
import { ABILITY_CATALOG, abilityDefinition } from './abilities';
import { sessionResidents, visibleProjects, type GardenSession } from './gardenSession';
import { demoBookAvailable, demoMaterialsAvailable, demoProjects, requiresDemoConfirmation, type DemoScenario, type DemoScenarioId } from './learningDemo';
import { PROJECT_RECIPES, type ProjectId } from './projectDefinitions';
import { nextRecipeStep, type ProjectsProgress } from './projectProgress';
import { RESIDENTS, residentDefinition, type ResidentId } from './residents';
import { canPerform } from './spiritKnowledge';
import { projectWatchDestination } from './watchProject';
import type { DemoAvailability } from './CommunityCoordinator';

export type DemoPanelProps = {
  session: GardenSession; busy: boolean; activities: Partial<Record<ResidentId, string>>;
  availability?: DemoAvailability;
  onStart: (scenario: DemoScenario) => void; onExit: () => void; onBook: () => void;
  onMaterials: (project: ProjectId) => void; onWatch: (project: ProjectId) => void;
  onOpenChange?: (open: boolean) => void;
};
const SCENARIOS: { id: DemoScenarioId; label: string; description: string }[] = [
  { id: 'planter-materials-first', label: 'Materials before knowledge', description: 'Planter materials wait safely. Add the book when ready; residents discover its ideas themselves.' },
  { id: 'planter-knowledge-first', label: 'Knowledge before materials', description: 'A book is waiting. After a resident learns, you can add planter materials.' },
  { id: 'rack-from-scratch', label: 'Tool rack from scratch', description: 'A book is waiting. Add rack materials and watch building learned through real encounters.' },
  { id: 'rack-preview', label: 'Tool rack preview', description: 'Preview seed: the selected residents start familiar with B1 fit pieces and B2 use a mallet. Rack materials are ready. No growing knowledge is seeded.' },
  { id: 'planter-to-rack', label: 'Planter to tool rack', description: 'Book and planter materials are ready. Finishing the planter opens rack materials; learned building carries across projects.' },
];
const sourceLabels = { book: 'Book', observation: 'Observed action', preview: 'Preview seed', legacy: 'Legacy knowledge' };
type MilestoneHistory = { scope: DemoScenario | null; progress: ProjectsProgress; entries: string[] };
export function nextMilestoneHistory(history: MilestoneHistory, session: GardenSession): MilestoneHistory {
  const progress = session.demo?.progress ?? session.project, scope = session.demo?.scenario ?? null;
  if (history.progress === progress && history.scope === scope) return history;
  const reset = history.scope !== scope || progress.processed.length < history.progress.processed.length;
  return { scope, progress, entries: reset ? [] : [...history.entries, ...acceptedMilestones(history.progress, progress)].slice(-12) };
}

export function acceptedMilestones(before: ProjectsProgress, after: ProjectsProgress): string[] {
  if (before === after) return [];
  const entries: string[] = [];
  if (!before.book && after.book) entries.push('The book arrived.');
  for (const resident of RESIDENTS) for (const ability of ABILITY_CATALOG.filter(a => a.enabled)) {
    const old = before.knowledge[resident.id][ability.id], next = after.knowledge[resident.id][ability.id];
    if (next && (old?.status !== next.status || old?.source.kind !== next.source.kind)) {
      entries.push(`${resident.name}: ${ability.name} became ${next.status} (${sourceLabels[next.source.kind]}).`);
    }
  }
  for (const project of ['planter', 'tool-rack'] as const) {
    const old = before.projects[project], next = after.projects[project], name = projectWatchDestination(project).name;
    if (old.supplies === 'absent' && next.supplies !== 'absent') entries.push(`${name} materials arrived.`);
    for (let index = old.completedSteps; index < next.completedSteps; index++) entries.push(`${name}: ${PROJECT_RECIPES[project][index].id.replaceAll('-', ' ')} completed.`);
  }
  return entries;
}

export function projectWaiting(session: GardenSession, project: ProjectId, activities: Partial<Record<ResidentId, string>>, busy: boolean, availability?: DemoAvailability): string {
  const progress = visibleProjects(session), step = nextRecipeStep(progress, project);
  if (!step) return 'Complete. Shared tools remain reusable.';
  const roster = sessionResidents(session);
  const qualified = roster.filter(r => canPerform(progress.knowledge, r.id, step.ability));
  if (!qualified.length) return !progress.book
    ? 'Waiting for a book opportunity and a resident to discover the missing skill.'
    : `Waiting for ${step.ability} ${abilityDefinition(step.ability)?.name} and its prerequisites. Reading brings familiarity; doing brings practice.`;
  if (progress.projects[project].supplies === 'absent') return 'Waiting for this project’s material bundle.';
  if (availability && qualified.every(r => availability.unavailable.includes(r.id))) return 'Qualified residents are occupied with another interaction or activity. This opportunity can wait.';
  if (busy) return 'An interaction is underway. Residents choose opportunities when available.';
  const owner = step.tool === 'mallet' ? availability?.tools.mallet : undefined;
  if (owner) return `The shared mallet is reserved by ${residentDefinition(owner).name}; it has one owner at a time.`;
  if (roster.some(r => activities[r.id] && !activities[r.id]?.startsWith('Exploring'))) return 'An opportunity is underway. Residents approach, observe and work at their own pace.';
  return 'Ready for a resident to discover. Paths and the work space must be clear.';
}

export default function LearningDemoPanel({ session, busy, activities, availability, onStart, onExit, onBook, onMaterials, onWatch, onOpenChange }: DemoPanelProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DemoScenario>(session.demo?.scenario ?? { id: 'planter-materials-first', residents: 1 });
  const [pending, setPending] = useState<DemoScenario | 'exit' | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLElement>(null);
  const pendingTrigger = useRef<HTMLElement | null>(null);
  const progress = visibleProjects(session);
  // Comparison changes the displayed snapshot, never the accepted milestone stream.
  const acceptedProgress = session.demo?.progress ?? session.project;
  const scope = session.demo?.scenario ?? null;
  const [history, setHistory] = useState({ scope, progress: acceptedProgress, entries: [] as string[] });
  const nextHistory = nextMilestoneHistory(history, session);
  if (nextHistory !== history) setHistory(nextHistory);
  const changeOpen = (value: boolean) => { setOpen(value); onOpenChange?.(value); if (!value) trigger.current?.focus(); };
  const cancelPending = () => { setPending(null); window.setTimeout(() => pendingTrigger.current?.focus(), 0); };
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const timer = window.setTimeout(() => element?.querySelector<HTMLElement>('[data-close]')?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!pending) return;
    const element = dialog.current;
    const timer = window.setTimeout(() => element?.querySelector<HTMLElement>('[data-cancel]')?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [pending]);
  const request = (action: DemoScenario | 'exit', target: HTMLElement) => {
    if (busy) return;
    pendingTrigger.current = target;
    if (action === 'exit' || requiresDemoConfirmation(session)) setPending(action);
    else { onStart(action); changeOpen(false); }
  };
  const scenario = SCENARIOS.find(s => s.id === selected.id)!;
  const projects = session.demo ? demoProjects(session.demo.scenario) : ['planter'] as const;
  return <>
    <button ref={trigger} className="learning-demo-launch" type="button" aria-haspopup="dialog" aria-expanded={open} disabled={busy} onClick={() => changeOpen(true)}>Learning demo</button>
    <section ref={dialog} hidden={!open} className="learning-demo-backdrop" role="dialog" aria-modal="true" aria-labelledby={pending ? 'learning-demo-confirm-title' : 'learning-demo-title'} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (pending) cancelPending(); else changeOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, [tabindex="0"]') ?? []).filter(el => !el.closest('[hidden], [inert]') && (el.tagName === 'SUMMARY' || !el.closest('details:not([open])')));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="learning-demo-card">
        <div hidden={!!pending}>
          <button type="button" data-close className="learning-demo-close" onClick={() => changeOpen(false)}>Close</button>
          <p className="overline">Local deterministic simulation</p><h2 id="learning-demo-title">Learning in the grove</h2>
          <p>20 abilities across five connected paths are planned. Four abilities are available here. No jobs or care are assigned.</p>
          <label className="learning-demo-selector">Scenario<select value={selected.id} disabled={busy} onChange={e => setSelected({ ...selected, id: e.target.value as DemoScenarioId })}>{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <article className="learning-demo-scenario"><h3>{scenario.label}</h3><p>{scenario.description}</p><span className="learning-demo-badge">{selected.id === 'rack-preview' ? 'Preview seed · B1 + B2 familiar' : 'No seeded knowledge'}</span></article>
          <label className="learning-demo-selector">Residents<select value={selected.residents} disabled={busy} onChange={e => setSelected({ ...selected, residents: Number(e.target.value) as 1 | 3 })}><option value="1">Pip · one resident</option><option value="3">Pip, Moss and Fern · three residents</option></select></label>
          <button type="button" disabled={busy} onClick={e => request(selected, e.currentTarget)}>Start selected scenario</button>
          {session.demo && <div className="learning-demo-actions"><button type="button" disabled={busy} onClick={e => request(session.demo!.scenario, e.currentTarget)}>Replay current scenario</button><button type="button" disabled={busy} onClick={e => request('exit', e.currentTarget)}>Return to journey</button></div>}
          <section aria-label="Current opportunities"><h3>{session.demo ? `Running: ${SCENARIOS.find(s => s.id === session.demo?.scenario.id)?.label}` : 'Ordinary journey'}</h3>
            {session.demo?.scenario.id === 'rack-preview' && <p className="learning-demo-badge">Preview seed: selected residents began familiar with B1 and B2.</p>}
            <button type="button" disabled={busy || !session.demo || !demoBookAvailable(session.demo)} onClick={onBook}>Add book</button>
            {(['planter', 'tool-rack'] as const).map(project => <button key={project} type="button" disabled={busy || !session.demo || !demoMaterialsAvailable(session.demo, project)} onClick={() => onMaterials(project)}>Add {project === 'planter' ? 'planter' : 'tool rack'} materials</button>)}
            {!session.demo && <p>Start a scenario to use these opportunities. Journey controls remain in the garden journal.</p>}
            {projects.map(project => <article key={project} className="learning-demo-project"><h4>{projectWatchDestination(project).name}</h4><p>{projectWaiting(session, project, activities, busy, availability)}</p><button type="button" disabled={busy || (!session.demo && session.view === 'before' && session.journey.rewardStage > 0)} onClick={() => { onWatch(project); changeOpen(false); }}>Watch {projectWatchDestination(project).name.toLowerCase()}</button><small>Faces the work point in the west garden once. You stay in place; terrain may block the view.</small></article>)}
          </section>
          <section aria-label="Resident knowledge"><h3>Knowledge and activity</h3><p>Unfamiliar: not encountered. Familiar: encountered in a book or observed action. Practiced: successfully used. Reading alone never counts as practice; observation teaches only the action witnessed.</p>
            {sessionResidents(session).map(resident => <article className="learning-demo-resident" key={resident.id}><h4>{resident.name}</h4><p>{availability?.unavailable.includes(resident.id) ? 'Occupied with another interaction or activity' : activities[resident.id] ?? 'Exploring at their own pace'}</p><ul>{ABILITY_CATALOG.filter(a => a.enabled).map(a => {
              const k = progress.knowledge[resident.id][a.id];
              return <li key={a.id} data-enabled-ability={a.id}><strong>{a.id} · {a.name}</strong><span>{k?.status ?? 'unfamiliar'}{k ? ` · ${sourceLabels[k.source.kind]}` : ''}</span></li>;
            })}</ul></article>)}
            <details><summary>Planned abilities · not available</summary>{(['building', 'growing', 'crafting', 'cooperation', 'play'] as const).map(path => <p key={path}><strong>{path}</strong>: {ABILITY_CATALOG.filter(a => a.path === path && !a.enabled).map(a => `${a.id} ${a.name}`).join(', ')} — Planned</p>)}</details>
          </section>
          <section aria-label="Recent accepted milestones"><h3>Recent milestones</h3>{history.entries.length ? <ol>{history.entries.map((entry, index) => <li key={`${index}:${entry}`}>{entry}</li>)}</ol> : <p>Accepted discoveries and completed steps will appear here.</p>}<span className="learning-demo-sr" aria-live="polite" aria-atomic="true">{open ? history.entries.at(-1) : ''}</span></section>
        </div>
        {pending && <div><h2 id="learning-demo-confirm-title">Reset the local simulation?</h2><p>{pending === 'exit' ? 'Returning to the journey starts a fresh ordinary journey.' : 'Starting or replaying replaces the ongoing simulation.'} The local simulation resets, including current progress. Cancel keeps it.</p><button type="button" data-cancel onClick={cancelPending}>Cancel</button><button type="button" disabled={busy} onClick={() => { if (pending === 'exit') onExit(); else onStart(pending); setPending(null); changeOpen(false); }}>Confirm reset</button></div>}
      </div>
    </section>
  </>;
}
