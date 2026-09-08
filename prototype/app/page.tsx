'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import GardenWorld from './GardenWorld';
import { type GardenChoice } from './garden/rewardState';
import { createJourney, projectJourneyScene, getPipJourneyProfile, getResidentJourneyProfile, RETURN_CHAPTERS, type JourneyEvent, type MemoryKind } from './garden/journey';
import type { ResidentId } from './garden/residents';
import type { FindResidentRequest } from './garden/findResident';
import { createGardenSession, gardenSessionReducer, visibleProjects } from './garden/gardenSession';
import type { ProjectEvent } from './garden/projectProgress';
import { demoProjects } from './garden/learningDemo';
import JourneyJournal from './garden/JourneyJournal';
import './garden/journey.css';
import './garden/sanctuary.css';

export default function Home() {
  const [session, dispatchSession] = useReducer(gardenSessionReducer, undefined, createGardenSession);
  const { journey, demo, view: gardenView, epoch } = session;
  const dispatchJourney = useCallback((event: JourneyEvent) => dispatchSession({ type: 'journey', event }), []);
  const setGardenView = useCallback((view: typeof gardenView) => dispatchSession({ type: 'view', view }), []);
  const onProjectEvents = useCallback((eventEpoch: number, events: ProjectEvent[]) => {
    dispatchSession({ type: 'project', epoch: eventEpoch, events });
  }, []);
  const onGardenRemount = useCallback(() => dispatchSession({ type: 'remount' }), []);
  const simulateMaterials = useCallback(() => dispatchSession({ type: 'materials', id: 'planter-materials-1' }), []);
  const { rewardStage, choice: gardenChoice } = journey;
  const [interactionBusy, setInteractionBusy] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<GardenChoice | null>(null);
  const [visitPreviewOpen, setVisitPreviewOpen] = useState(false);
  const [comfortResponse, setComfortResponse] = useState<'comfortable' | 'unsure' | 'invasive' | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [findRequest, setFindRequest] = useState<(FindResidentRequest & { scope: string }) | null>(null);
  const findScope = `${sessionKey}-${journey.visit}-${gardenView}`;
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const visitDoneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialogOpen = choiceOpen || visitPreviewOpen;
    if (!dialogOpen) return;

    const focusTimer = window.setTimeout(() => {
      (choiceOpen ? firstChoiceRef.current : visitDoneRef.current)?.focus();
    }, 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setChoiceOpen(false);
        setVisitPreviewOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [choiceOpen, visitPreviewOpen]);

  const simulateAchievement = () => {
    dispatchJourney({ type: 'accomplishment' });
    setGardenView('now');
  };

  // Demo scenery and roster are independent: an expanded nook does not add neighbors.
  const sceneJourney = useMemo(() => demo ? { ...createJourney(), visit: 3 as const, rewardStage: 2 as const } : journey, [demo, journey]);
  const { visit: sceneVisit, ...scene } = projectJourneyScene(sceneJourney, demo ? 'now' : gardenView);
  const comparing = !demo && gardenView === 'before' && rewardStage > 0;
  const worldJourney = useMemo(() => ({ visit: sceneJourney.visit, sceneVisit, comparing, profile: getPipJourneyProfile(sceneJourney),
    profiles: { pip: getResidentJourneyProfile(sceneJourney, 'pip'), moss: getResidentJourneyProfile(sceneJourney, 'moss'), fern: getResidentJourneyProfile(sceneJourney, 'fern') } }), [sceneJourney, sceneVisit, comparing]);
  const rememberInteraction = useCallback((interaction: MemoryKind, residentId: ResidentId) => {
    if (!demo) dispatchJourney({ type: 'remember', interaction, residentId });
  }, [demo, dispatchJourney]);
  const previewCommunity = () => {
    if (interactionBusy || comparing) return;
    dispatchJourney({ type: 'preview-community' });
    setGardenView('now');
  };
  const returnLater = () => {
    if (interactionBusy) return;
    dispatchJourney({ type: 'return' });
    setGardenView('now');
  };

  const confirmChoice = () => {
    if (!pendingChoice) return;
    dispatchJourney({ type: 'choose', choice: pendingChoice });
    setChoiceOpen(false);
    setGardenView('now');
  };

  const restartPrototype = () => {
    dispatchJourney({ type: 'reset' });
    setGardenView('before');
    setChoiceOpen(false);
    setPendingChoice(null);
    setInteractionBusy(false);
    setVisitPreviewOpen(false);
    setComfortResponse(null);
    setSessionKey((current) => current + 1);
  };

  const visibleProject = visibleProjects(session);
  return (
    <main className="garden-app immersive-app sanctuary-app">
      <header className="topbar immersive-topbar">
        <a className="brand" href="#garden" aria-label="Common Grove home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Common Grove</span>
        </a>
        <div className="day-label"><span aria-hidden="true">●</span> {RETURN_CHAPTERS[journey.visit].time} · simulated</div>
        <div className="profile-button" aria-label="Your private garden">
          <span className="profile-dot">R</span>
          <span className="profile-copy"><strong>Your garden</strong><small>Private · growing</small></span>
        </div>
      </header>

      <section className="world-panel immersive-world" id="garden" tabIndex={-1} aria-label="Explore your first-person Common Grove garden">
        <GardenWorld
          key={`${sessionKey}-${journey.visit}`}
          rewardStage={sceneJourney.rewardStage}
          {...scene}
          gardenChoice={gardenChoice}
          journey={worldJourney}
          project={demo?.progress ?? session.project}
          projection={visibleProject}
          demoResidents={demo?.scenario.residents}
          activated={demo ? demoProjects(demo.scenario) : undefined}
          epoch={epoch}
          onProjectEvents={onProjectEvents}
          onRemount={onGardenRemount}
          onMemory={rememberInteraction}
          onBusyChange={setInteractionBusy}
          findRequest={findRequest?.scope === findScope ? findRequest : null}
        />
      </section>

      <JourneyJournal state={journey} view={gardenView} demoResidents={demo?.scenario.residents} busy={interactionBusy} project={visibleProject} onMaterials={simulateMaterials} onSimulate={simulateAchievement} onPreviewCommunity={previewCommunity}
        onFindResident={(id) => {
          setFindRequest(previous => ({ id, sequence: (previous?.sequence ?? 0) + 1, scope: findScope }));
          document.getElementById('garden')?.focus({ preventScroll: true });
        }}
        onView={(view) => { if (view === 'now' || !interactionBusy) setGardenView(view); }} onReturn={returnLater} onChoice={() => { setPendingChoice(null); setChoiceOpen(true); }}
        onPrivacy={() => setVisitPreviewOpen(true)} onRestart={restartPrototype} />

      {choiceOpen && (
        <section className="choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="choice-title">
          <div className="choice-card">
            <button type="button" className="choice-close" onClick={() => setChoiceOpen(false)} aria-label="Close garden choice">×</button>
            <p className="overline">A discovery for whenever you’re ready</p>
            <h2 id="choice-title">Where should the curious seed lead?</h2>
            <p>Both paths continue the same essential garden progress. This choice only shapes the kind of place you would enjoy returning to.</p>
            <div className="choice-options">
              <button ref={firstChoiceRef} type="button" aria-pressed={pendingChoice === 'orchard'} className={pendingChoice === 'orchard' ? 'chosen' : ''} onClick={() => setPendingChoice('orchard')}>
                <span className="choice-art orchard"><i /><i /><i /></span>
                <strong>The Lantern Orchard</strong>
                <small>A quiet grove for gathering, stories, and soft evening light.</small>
              </button>
              <button type="button" aria-pressed={pendingChoice === 'workshop'} className={pendingChoice === 'workshop' ? 'chosen' : ''} onClick={() => setPendingChoice('workshop')}>
                <span className="choice-art workshop"><i /><i /><i /></span>
                <strong>The Tinker Workshop</strong>
                <small>A cheerful place for making, experimenting, and useful discoveries.</small>
              </button>
            </div>
            <div className="choice-footer">
              <span>{pendingChoice ? 'Your choice will begin forming in the garden.' : 'Nothing expires. Choose when you are ready.'}</span>
              <button type="button" disabled={!pendingChoice} onClick={confirmChoice}>Keep this path</button>
            </div>
          </div>
        </section>
      )}

      {visitPreviewOpen && (
        <section className="choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="visit-title">
          <div className="choice-card visit-card">
            <button type="button" className="choice-close" onClick={() => setVisitPreviewOpen(false)} aria-label="Close visit preview">×</button>
            <p className="overline">Static privacy preview · no visit is occurring</p>
            <h2 id="visit-title">What would a teammate see?</h2>
            <p>A garden visit would always be opt-in. The visitor could enjoy the space and meet Pip, but the work behind the garden would remain private.</p>

            <div className="visit-scene" aria-label="Concept preview of an optional coworker garden visit">
              <div className="visit-landscape"><i /><i /><i /><span className="visit-pip">Pip</span></div>
              <div className="visitor-chip"><b aria-hidden="true">T</b><span><strong>A teammate is visiting</strong><small>They see the garden—not your work history.</small></span></div>
            </div>

            <div className="privacy-columns">
              <section>
                <h3>Visible during a visit</h3>
                <ul><li>Garden appearance</li><li>Pip and shared scenery</li><li>The destination you chose</li></ul>
              </section>
              <section>
                <h3>Always private</h3>
                <ul><li>Work events and explanations</li><li>Progress totals or comparisons</li><li>Visit history and activity</li></ul>
              </section>
            </div>

            <div className="comfort-check">
              <span>How would this proposed coworker visit feel? This is temporary research feedback only. Your choice will not enable a visit, contact anyone, or leave this prototype session.</span>
              <div>
                <button type="button" aria-pressed={comfortResponse === 'comfortable'} className={comfortResponse === 'comfortable' ? 'selected' : ''} onClick={() => setComfortResponse('comfortable')}>Comfortable</button>
                <button type="button" aria-pressed={comfortResponse === 'unsure'} className={comfortResponse === 'unsure' ? 'selected' : ''} onClick={() => setComfortResponse('unsure')}>Unsure</button>
                <button type="button" aria-pressed={comfortResponse === 'invasive'} className={comfortResponse === 'invasive' ? 'selected' : ''} onClick={() => setComfortResponse('invasive')}>Invasive</button>
              </div>
              <small>{comfortResponse ? 'Response noted only for this local session.' : 'This response is not saved or sent anywhere.'}</small>
            </div>

            <div className="choice-footer visit-footer">
              <span>You could disable visits at any time.</span>
              <button ref={visitDoneRef} type="button" onClick={() => setVisitPreviewOpen(false)}>Done</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
