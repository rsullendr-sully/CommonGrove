'use client';

import GardenWorld from './GardenWorld';

export default function Home() {
  return (
    <main className="garden-app shell-app">
      <header className="topbar">
        <a className="brand" href="#garden" aria-label="Common Grove home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Common Grove</span>
        </a>
        <div className="day-label"><span aria-hidden="true">●</span> Release 0 spatial test</div>
        <div className="profile-button" aria-label="Local prototype">
          <span className="profile-dot">R0</span>
          <span className="profile-copy"><strong>Garden shell</strong><small>Local prototype</small></span>
        </div>
      </header>

      <section className="world-panel" id="garden" aria-label="First-person garden scale test">
        <GardenWorld />
      </section>

      <aside className="story-panel shell-notes" aria-labelledby="space-title">
        <p className="overline">Release 0 · Space test</p>
        <h1 id="space-title">Does the pond anchor the garden?</h1>
        <p className="story-lede">
          The first landmark is a twelve-meter pond at the center of the approved garden. Walk around it and notice whether it feels important without taking over the space.
        </p>

        <dl className="scale-specs">
          <div><dt>Garden footprint</dt><dd>40 × 40 meters</dd></div>
          <div><dt>Walking pace</dt><dd>2 meters per second</dd></div>
          <div><dt>Edge-to-edge goal</dt><dd>About 20 seconds</dd></div>
          <div><dt>View</dt><dd>First person, eye level</dd></div>
        </dl>

        <div className="shell-scope">
          <span>Testing now</span>
          <p>Pond scale · central placement · room to walk around it</p>
        </div>

        <div className="shell-scope muted">
          <span>Intentionally waiting</span>
          <p>Pavilion · rock landmark · Pip · garden rewards</p>
        </div>

        <p className="shell-reminder">One decision at a time. If the pond feels right, we shape the rock backdrop next.</p>
      </aside>
    </main>
  );
}
