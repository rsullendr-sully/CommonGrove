'use client';

import { useState } from 'react';
import GardenWorld from './GardenWorld';

export default function Home() {
  const [rewardStage, setRewardStage] = useState<0 | 1 | 2>(0);
  const [gardenView, setGardenView] = useState<'before' | 'now'>('before');

  const simulateAchievement = () => {
    setRewardStage((current) => Math.min(2, current + 1) as 0 | 1 | 2);
    setGardenView('now');
  };

  const activeReward = rewardStage === 2 ? 'pavilion' : 'starflowers';
  const starflowersVisible = rewardStage > 1 || (rewardStage === 1 && gardenView === 'now');
  const pavilionImproved = rewardStage === 2 && gardenView === 'now';

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
        />
      </section>

      <details className="garden-guide" open>
        <summary><span>Garden journal</span><b aria-hidden="true">+</b></summary>
        <div className="garden-guide-content">
          <p className="overline">Welcome back</p>
          <h1>{rewardStage === 2 ? 'The pavilion feels warmer.' : rewardStage === 1 ? 'Something new is blooming.' : 'The grove is listening.'}</h1>
          <p>{rewardStage === 2
            ? 'Progress on important work brought finished shelves, new books, and warm lantern light to the reading pavilion.'
            : rewardStage === 1
              ? 'A recent contribution helped someone move forward. Fresh water reached the garden, and a patch of starflowers opened near the pond.'
              : 'This private prototype control simulates accomplishments so you can see how work becomes calm garden changes.'}</p>

          <div className="reward-controls" aria-label="Reward-loop prototype controls">
            <button type="button" onClick={simulateAchievement} disabled={rewardStage === 2}>
              {rewardStage === 2 ? 'Two accomplishments received' : rewardStage === 1 ? 'Simulate next accomplishment' : 'Simulate accomplishment'}
            </button>
            <div className="moment-toggle" aria-label="Compare the garden before and now">
              <button type="button" className={gardenView === 'before' ? 'active' : ''} onClick={() => setGardenView('before')}>Before</button>
              <button type="button" className={gardenView === 'now' ? 'active' : ''} onClick={() => setGardenView('now')} disabled={rewardStage === 0}>Now</button>
            </div>
          </div>

          <div className="garden-moments">
            <span className={rewardStage >= 1 ? 'arrived' : 'waiting'}><i className="moment-flower" />{rewardStage >= 1 ? 'Starflowers bloomed' : 'A quiet flower bed'}</span>
            <span className={rewardStage >= 2 ? 'arrived pavilion-arrived' : 'waiting'}><i className="moment-pavilion" />{rewardStage >= 2 ? 'The reading pavilion grew' : 'A quiet reading pavilion'}</span>
            <span><i className="moment-seed" />A curious path is waiting</span>
          </div>
          {rewardStage > 0 && (
            <div className="private-change" role="status">
              <span>Private explanation</span>
              <p>{activeReward === 'pavilion'
                ? 'Moving important work forward supplied the finished shelves, books, and lanterns for the pavilion.'
                : 'A contribution that helped someone succeed brought fresh water to the starflower bed.'}</p>
            </div>
          )}
          <small>No scores. No upkeep. Just progress.</small>
        </div>
      </details>
    </main>
  );
}
