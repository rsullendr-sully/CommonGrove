'use client';

import { useState } from 'react';
import GardenWorld from './GardenWorld';

type GardenChoice = 'orchard' | 'workshop';

export default function Home() {
  const [rewardStage, setRewardStage] = useState<0 | 1 | 2 | 3>(0);
  const [gardenView, setGardenView] = useState<'before' | 'now'>('before');
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<GardenChoice | null>(null);
  const [gardenChoice, setGardenChoice] = useState<GardenChoice | null>(null);

  const simulateAchievement = () => {
    setRewardStage((current) => Math.min(3, current + 1) as 0 | 1 | 2 | 3);
    setGardenView('now');
  };

  const activeReward = rewardStage === 3 ? 'seed' : rewardStage === 2 ? 'pavilion' : 'starflowers';
  const starflowersVisible = rewardStage > 1 || (rewardStage === 1 && gardenView === 'now');
  const pavilionImproved = rewardStage > 2 || (rewardStage === 2 && gardenView === 'now');
  const seedVisible = rewardStage === 3 && gardenView === 'now';

  const confirmChoice = () => {
    if (!pendingChoice) return;
    setGardenChoice(pendingChoice);
    setChoiceOpen(false);
    setGardenView('now');
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
            <button type="button" className="seed-choice-button" onClick={() => setChoiceOpen(true)}>Choose where the seed leads <b>→</b></button>
          )}
          {gardenChoice && (
            <div className="chosen-path" role="status">
              <span>Path remembered</span>
              <strong>{gardenChoice === 'orchard' ? 'The Lantern Orchard' : 'The Tinker Workshop'}</strong>
              <p>Pip will keep exploring while this destination grows. Nothing needs your attention.</p>
            </div>
          )}
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
              <button type="button" className={pendingChoice === 'orchard' ? 'chosen' : ''} onClick={() => setPendingChoice('orchard')}>
                <span className="choice-art orchard"><i /><i /><i /></span>
                <strong>The Lantern Orchard</strong>
                <small>A quiet grove for gathering, stories, and soft evening light.</small>
              </button>
              <button type="button" className={pendingChoice === 'workshop' ? 'chosen' : ''} onClick={() => setPendingChoice('workshop')}>
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
    </main>
  );
}
