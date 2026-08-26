'use client';

import GardenWorld from './GardenWorld';

export default function Home() {
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
        <GardenWorld />
      </section>

      <details className="garden-guide" open>
        <summary><span>Garden journal</span><b aria-hidden="true">+</b></summary>
        <div className="garden-guide-content">
          <p className="overline">Welcome back</p>
          <h1>The grove remembers.</h1>
          <p>Pip has been wandering near the spring while the garden quietly reflects ways you helped people and moved meaningful work forward.</p>
          <div className="garden-moments">
            <span><i className="moment-flower" />Starflowers bloomed</span>
            <span><i className="moment-pavilion" />The reading pavilion grew</span>
            <span><i className="moment-seed" />A curious path is waiting</span>
          </div>
          <small>No scores. No upkeep. Just progress.</small>
        </div>
      </details>
    </main>
  );
}
