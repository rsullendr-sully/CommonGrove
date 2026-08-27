'use client';

import { useEffect, useRef, useState } from 'react';
import GardenWorld from './GardenWorld';
import { deriveGardenVisibility, type GardenChoice, type GardenView } from './garden/rewardState';

export default function Home() {
  const [rewardStage, setRewardStage] = useState<0 | 1 | 2 | 3>(0);
  const [gardenView, setGardenView] = useState<GardenView>('before');
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<GardenChoice | null>(null);
  const [gardenChoice, setGardenChoice] = useState<GardenChoice | null>(null);
  const [visitPreviewOpen, setVisitPreviewOpen] = useState(false);
  const [comfortResponse, setComfortResponse] = useState<'comfortable' | 'unsure' | 'invasive' | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
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
    setRewardStage((current) => Math.min(3, current + 1) as 0 | 1 | 2 | 3);
    setGardenView('now');
  };

  const activeReward = rewardStage === 3 ? 'seed' : rewardStage === 2 ? 'pavilion' : 'starflowers';
  const { starflowersVisible, pavilionImproved, seedVisible } = deriveGardenVisibility({ rewardStage, gardenView, gardenChoice });

  const confirmChoice = () => {
    if (!pendingChoice) return;
    setGardenChoice(pendingChoice);
    setChoiceOpen(false);
    setGardenView('now');
  };

  const restartPrototype = () => {
    setRewardStage(0);
    setGardenView('before');
    setChoiceOpen(false);
    setPendingChoice(null);
    setGardenChoice(null);
    setVisitPreviewOpen(false);
    setComfortResponse(null);
    setSessionKey((current) => current + 1);
  };

  return (
    <main className="garden-app immersive-app">
      <header className="topbar immersive-topbar">
        <a className="brand" href="#garden" aria-label="Common Grove home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Common Grove</span>
        </a>
        <div className="day-label"><span aria-hidden="true">●</span> Friday morning · peaceful</div>
        <div className="profile-button" aria-label="Your private garden">
          <span className="profile-dot">R</span>
          <span className="profile-copy"><strong>Your garden</strong><small>Private · growing</small></span>
        </div>
      </header>

      <section className="world-panel immersive-world" id="garden" aria-label="Explore your first-person Common Grove garden">
        <GardenWorld
          key={sessionKey}
          rewardStage={rewardStage}
          starflowersVisible={starflowersVisible}
          pavilionImproved={pavilionImproved}
          seedVisible={seedVisible}
          gardenChoice={gardenChoice}
        />
      </section>

      <details className="garden-guide" open>
        <summary><span>Garden journal</span><b aria-hidden="true">+</b></summary>
        <div className="garden-guide-content">
          <p className="overline">Welcome back</p>
          <h1>{rewardStage === 3 ? 'The garden found a possibility.' : rewardStage === 2 ? 'The pavilion feels warmer.' : rewardStage === 1 ? 'Something new is blooming.' : 'The grove is listening.'}</h1>
          <p>{rewardStage === 3
            ? 'Something shared with the team revealed a curious seed beside an unopened path. It can wait until you are ready.'
            : rewardStage === 2
              ? 'Progress on important work brought finished shelves, new books, and warm lantern light to the reading pavilion.'
            : rewardStage === 1
              ? 'A recent contribution helped someone move forward. Fresh water reached the garden, and a patch of starflowers opened near the pond.'
              : 'This private prototype control simulates accomplishments so you can see how work becomes calm garden changes.'}</p>

          <div className="reward-controls" aria-label="Reward-loop prototype controls">
            <button type="button" onClick={simulateAchievement} disabled={rewardStage === 3}>
              {rewardStage === 3 ? 'Three accomplishments received' : rewardStage > 0 ? 'Simulate next accomplishment' : 'Simulate accomplishment'}
            </button>
            <div className="moment-toggle" aria-label="Compare the garden before and now">
              <button type="button" className={gardenView === 'before' ? 'active' : ''} onClick={() => setGardenView('before')}>Before</button>
              <button type="button" className={gardenView === 'now' ? 'active' : ''} onClick={() => setGardenView('now')} disabled={rewardStage === 0}>Now</button>
            </div>
          </div>

          <div className="garden-moments">
            <span className={rewardStage >= 1 ? 'arrived' : 'waiting'}><i className="moment-flower" />{rewardStage >= 1 ? 'Starflowers bloomed' : 'A quiet flower bed'}</span>
            <span className={rewardStage >= 2 ? 'arrived pavilion-arrived' : 'waiting'}><i className="moment-pavilion" />{rewardStage >= 2 ? 'The reading pavilion grew' : 'A quiet reading pavilion'}</span>
            <span className={rewardStage >= 3 ? 'arrived seed-arrived' : 'waiting'}><i className="moment-seed" />{rewardStage >= 3 ? 'A curious seed appeared' : 'An unopened garden path'}</span>
          </div>
          {rewardStage > 0 && (
            <div className="private-change" role="status">
              <span>Private explanation</span>
              <p>{activeReward === 'seed'
                ? 'A reusable improvement that strengthened the team revealed a discovery seed beside the unopened path.'
                : activeReward === 'pavilion'
                  ? 'Moving important work forward supplied the finished shelves, books, and lanterns for the pavilion.'
                  : 'A contribution that helped someone succeed brought fresh water to the starflower bed.'}</p>
            </div>
          )}
          {rewardStage === 3 && !gardenChoice && (
            <button type="button" className="seed-choice-button" onClick={() => { setPendingChoice(null); setChoiceOpen(true); }}>Choose where the seed leads <b>→</b></button>
          )}
          {gardenChoice && (
            <div className="chosen-path" role="status">
              <span>Path remembered</span>
              <strong>{gardenChoice === 'orchard' ? 'The Lantern Orchard' : 'The Tinker Workshop'}</strong>
              <p>Pip will keep exploring while this destination grows. Nothing needs your attention.</p>
              <button type="button" onClick={() => setVisitPreviewOpen(true)}>Preview an optional garden visit</button>
            </div>
          )}
          <button type="button" className="restart-prototype" onClick={restartPrototype}>Restart prototype</button>
          <small>No scores. No upkeep. Just progress.</small>
        </div>
      </details>

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
