'use client';

import { useEffect, useRef } from 'react';
import { getDestinationStory, MEMORY_STORIES, RETURN_CHAPTERS, type JourneyState, type Visit } from './journey';
import type { GardenView } from './rewardState';

type Props = {
  state: JourneyState;
  view: GardenView;
  busy: boolean;
  onSimulate: () => void;
  onView: (view: GardenView) => void;
  onReturn: () => void;
  onChoice: () => void;
  onPrivacy: () => void;
  onRestart: () => void;
};

const FIRST_REWARDS = [
  { title: 'The grove is listening.', story: 'Meet Pip and explore at your own pace. Open the simulation controls below to see how three fictional accomplishments change this garden.' },
  { title: 'Something new is blooming.', story: 'A contribution that helped someone succeed brought fresh water to the garden. The starflowers are opening beside the pond.' },
  { title: 'The pavilion feels warmer.', story: 'Progress on important work brought finished shelves, books, and warm lantern light to the reading pavilion.' },
  { title: 'The garden found a possibility.', story: 'An improvement shared with the team revealed a curious seed. Choose a destination now or leave it safely waiting for another visit.' },
];

export default function JourneyJournal({ state, view, busy, onSimulate, onView, onReturn, onChoice, onPrivacy, onRestart }: Props) {
  const chapter = RETURN_CHAPTERS[state.visit];
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLDetailsElement>(null);
  const previousVisit = useRef(state.visit);
  useEffect(() => {
    if (previousVisit.current === state.visit) return;
    previousVisit.current = state.visit;
    if (panel.current) {
      panel.current.open = true;
      panel.current.scrollTop = 0;
    }
    heading.current?.focus({ preventScroll: true });
  }, [state.visit]);
  const firstReward = FIRST_REWARDS[state.rewardStage];
  return (
    <details ref={panel} className="garden-guide journey-journal" open>
      <summary><span>Garden journal</span><b aria-hidden="true">+</b></summary>
      <div className="garden-guide-content">
        <ol className="return-trail" aria-label="Your four-return journey">
          {([1, 2, 3, 4] as Visit[]).map((visit) => (
            <li key={visit} aria-current={visit === state.visit ? 'step' : undefined} className={visit <= state.visit ? 'reached' : ''}>
              <span>{visit}</span><small>{['Beginning', 'Taking root', 'Yours', 'Established'][visit - 1]}</small>
            </li>
          ))}
        </ol>
        <p className="overline">Return {state.visit} of 4 · {chapter.time}</p>
        <h1 ref={heading} tabIndex={-1}>{state.visit === 1 ? firstReward.title : chapter.title}</h1>
        <p>{state.visit === 1 ? firstReward.story : chapter.summary}</p>
        {view === 'before' && state.rewardStage > 0 && <p className="comparison-notice" role="status">Viewing {state.visit === 1 ? 'the garden before its latest change' : `the garden on return ${state.visit - 1}`}. Pip is paused while you compare. Choose Now to rejoin him.</p>}

        {state.rewardStage > 0 && (
          <div className="moment-toggle journey-comparison" aria-label="Compare garden growth">
            <button type="button" disabled={busy} aria-pressed={view === 'before'} className={view === 'before' ? 'active' : ''} onClick={() => onView('before')}>{state.visit === 1 ? 'Before' : 'Last return'}</button>
            <button type="button" aria-pressed={view === 'now'} className={view === 'now' ? 'active' : ''} onClick={() => onView('now')}>Now</button>
          </div>
        )}

        <div className="garden-moments">
          <span className={state.rewardStage >= 1 ? 'arrived' : 'waiting'}><i className="moment-flower" />{state.rewardStage === 0 ? 'A quiet flower bed' : state.visit === 1 ? 'Starflowers bloomed' : state.visit === 2 ? 'The flower bed is spreading' : 'A flourishing starflower border'}</span>
          <span className={state.rewardStage >= 2 ? 'arrived pavilion-arrived' : 'waiting'}><i className="moment-pavilion" />{state.rewardStage < 2 ? 'A quiet reading pavilion' : state.visit === 1 ? 'The reading pavilion grew' : 'Pip’s familiar reading corner'}</span>
          {state.rewardStage === 3 && <span className="arrived seed-arrived"><i className="moment-seed" />{state.choice ? state.choice === 'orchard' ? 'Your Lantern Orchard' : 'Your Tinker Workshop' : 'A seed for whenever you’re ready'}</span>}
        </div>

        {state.visit > 1 && (
          <section className="journey-memory" aria-label="A moment with Pip">
            <span className="overline">A moment with Pip</span>
            <h2>{state.returnMemory ? MEMORY_STORIES[state.returnMemory].title : 'Finding his own rhythm'}</h2>
            <p>{state.returnMemory ? MEMORY_STORIES[state.returnMemory].story : 'Pip has been exploring the grove and finding places he likes. You can simply enjoy being here; he needs nothing from you.'}</p>
          </section>
        )}

        {state.rewardStage === 3 && (
          <section className="chosen-path" aria-label="Your garden’s direction">
            <span>{state.choice ? 'The path you chose' : 'An unhurried possibility'}</span>
            <strong>{state.choice === 'orchard' ? 'The Lantern Orchard' : state.choice === 'workshop' ? 'The Tinker Workshop' : 'The curious seed'}</strong>
            <p>{getDestinationStory(state.visit, state.choice)}</p>
            {!state.choice && <button type="button" onClick={onChoice}>Choose where the seed leads →</button>}
          </section>
        )}

        {state.rewardStage > 0 && (
          <details className="journey-causes">
            <summary>What helped this grow?</summary>
            <p>{state.visit === 1 ? firstReward.story : 'In this simulated interval, helping someone succeed supported the flowers; moving work forward supplied the shared spaces; and a reusable team improvement supported new discoveries. Different jobs can bring comparable growth.'}</p>
            <small>Fictional examples. Work details stay private. Time away never removes progress.</small>
          </details>
        )}

        {state.rewardStage === 3 && state.visit < 4 && (
          <div className="next-return">
            <button type="button" onClick={onReturn} disabled={busy}>{chapter.next} <span aria-hidden="true">→</span></button>
            <small>{busy ? 'Finish the interaction or set down what you’re carrying first.' : 'Preview the next visit. Your choice and shared moments carry forward.'}</small>
          </div>
        )}
        {state.visit === 4 && (
          <section className="journey-outlook">
            <h2>This is where it leads.</h2>
            <p>Accomplishments give Pip opportunities to shape this place. Occasional choices make it yours. Future returns would bring new garden projects and familiar moments together.</p>
            <p>Stay and explore, or come back another time. Nothing fades while you’re away.</p>
          </section>
        )}

        <details className="journey-simulation" open={state.visit === 1 && state.rewardStage < 3}>
          <summary>Simulation controls</summary>
          <p>Four fictional visits compressed into one session. The timing is illustrative; nothing is connected to workplace systems. Refresh starts over.</p>
          {state.visit === 1 && <button type="button" className="simulate-return-reward" onClick={onSimulate} disabled={state.rewardStage === 3}>{state.rewardStage === 3 ? 'Three accomplishments received' : state.rewardStage === 0 ? 'Simulate accomplishment' : 'Simulate next accomplishment'}</button>}
          {state.rewardStage === 3 && <button type="button" className="restart-prototype" onClick={onPrivacy}>Preview visit privacy</button>}
          <button type="button" className="restart-prototype" onClick={onRestart}>Restart journey</button>
        </details>
        <small>No scores. No upkeep. Just progress.</small>
      </div>
    </details>
  );
}
