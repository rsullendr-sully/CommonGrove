'use client';

import { useState } from 'react';
import GardenWorld from './GardenWorld';

export default function Home() {
  const [achievementTriggered, setAchievementTriggered] = useState(false);
  const [gardenView, setGardenView] = useState<'before' | 'now'>('before');

  const simulateAchievement = () => {
    setAchievementTriggered(true);
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
          achievementTriggered={achievementTriggered}
          starflowersVisible={achievementTriggered && gardenView === 'now'}
        />
      </section>

      <details className="garden-guide" open>
        <summary><span>Garden journal</span><b aria-hidden="true">+</b></summary>
        <div className="garden-guide-content">
          <p className="overline">Welcome back</p>
          <h1>{achievementTriggered ? 'Something new is blooming.' : 'The grove is listening.'}</h1>
          <p>{achievementTriggered
            ? 'A recent contribution helped someone move forward. Fresh water reached the garden, and a patch of starflowers opened near the pond.'
            : 'This private prototype control simulates one accomplishment so you can see how work becomes a calm garden change.'}</p>

          <div className="reward-controls" aria-label="Reward-loop prototype controls">
            <button type="button" onClick={simulateAchievement} disabled={achievementTriggered}>
              {achievementTriggered ? 'Accomplishment received' : 'Simulate accomplishment'}
            </button>
            <div className="moment-toggle" aria-label="Compare the garden before and now">
              <button type="button" className={gardenView === 'before' ? 'active' : ''} onClick={() => setGardenView('before')}>Before</button>
              <button type="button" className={gardenView === 'now' ? 'active' : ''} onClick={() => setGardenView('now')} disabled={!achievementTriggered}>Now</button>
            </div>
          </div>

          <div className="garden-moments">
            <span className={achievementTriggered ? 'arrived' : 'waiting'}><i className="moment-flower" />{achievementTriggered ? 'Starflowers bloomed' : 'A quiet flower bed'}</span>
            <span><i className="moment-pavilion" />The reading pavilion grew</span>
            <span><i className="moment-seed" />A curious path is waiting</span>
          </div>
          {achievementTriggered && (
            <div className="private-change" role="status">
              <span>Private explanation</span>
              <p>A contribution that helped someone succeed brought fresh water to the starflower bed.</p>
            </div>
          )}
          <small>No scores. No upkeep. Just progress.</small>
        </div>
      </details>
    </main>
  );
}
