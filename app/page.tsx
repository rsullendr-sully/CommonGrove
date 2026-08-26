'use client';

import { useEffect, useState } from 'react';

const changes = [
  {
    id: 'flower',
    eyebrow: 'Helped someone succeed',
    title: 'A starflower bloomed',
    detail: 'Fresh water reached the garden after a contribution that helped someone move forward.',
    color: 'lilac',
  },
  {
    id: 'nook',
    eyebrow: 'Moved important work forward',
    title: 'The reading nook grew',
    detail: 'Pip gathered smooth timber while an important piece of work made meaningful progress.',
    color: 'honey',
  },
  {
    id: 'seed',
    eyebrow: 'Strengthened the team',
    title: 'A curious seed appeared',
    detail: 'A reusable improvement revealed something new. This discovery will wait until you are ready.',
    color: 'sage',
  },
];

const roleEvents = {
  support: {
    label: 'Support Desk',
    flower: "Restored a user's ability to work after a complex issue.",
    nook: 'Moved a difficult case forward through a thoughtful follow-up.',
    seed: 'Documented a solution the whole team can reuse.',
  },
  projects: {
    label: 'Project Team',
    flower: 'Helped a customer adopt a newly delivered capability.',
    nook: 'Completed and validated an important project milestone.',
    seed: 'Created a reusable deployment standard for future work.',
  },
  vcio: {
    label: 'vCIO / Strategic Advisor',
    flower: 'Helped a client clarify priorities and make a sound decision.',
    nook: 'Delivered an agreed strategic roadmap milestone.',
    seed: 'Shared guidance that can strengthen future client planning.',
  },
  managers: {
    label: 'Service & Project Managers',
    flower: 'Removed a delivery blocker so someone else could succeed.',
    nook: 'Brought an important delivery commitment back on track.',
    seed: 'Improved a process that helps the team work more clearly.',
  },
};

type RoleKey = keyof typeof roleEvents;

type CameraPosition = { x: number; y: number };

const initialCameraPosition: CameraPosition = { x: 0, y: 0 };

export default function Home() {
  const [selectedChange, setSelectedChange] = useState(changes[0].id);
  const [selectedRole, setSelectedRole] = useState<RoleKey>('support');
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [gardenChoice, setGardenChoice] = useState<'orchard' | 'workshop' | null>(null);
  const [gardenView, setGardenView] = useState<'before' | 'now'>('now');
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(initialCameraPosition);
  const activeChange = changes.find((change) => change.id === selectedChange) ?? changes[0];
  const role = roleEvents[selectedRole];

  const resetSession = () => {
    setSelectedChange(changes[0].id);
    setSelectedRole('support');
    setChoiceOpen(false);
    setGardenChoice(null);
    setGardenView('now');
    setCameraPosition(initialCameraPosition);
  };

  const moveCamera = (deltaX: number, deltaY: number) => {
    setCameraPosition((current) => ({
      x: Math.min(18, Math.max(-18, current.x + deltaX)),
      y: Math.min(10, Math.max(-10, current.y + deltaY)),
    }));
  };

  useEffect(() => {
    const handleMovement = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea, button')) return;

      const movements: Record<string, [number, number]> = {
        ArrowUp: [0, 3], w: [0, 3], W: [0, 3],
        ArrowDown: [0, -3], s: [0, -3], S: [0, -3],
        ArrowLeft: [-3, 0], a: [-3, 0], A: [-3, 0],
        ArrowRight: [3, 0], d: [3, 0], D: [3, 0],
      };
      const movement = movements[event.key];
      if (!movement) return;
      event.preventDefault();
      moveCamera(...movement);
    };

    window.addEventListener('keydown', handleMovement);
    return () => window.removeEventListener('keydown', handleMovement);
  }, []);

  return (
    <main className="garden-app">
      <header className="topbar">
        <a className="brand" href="#garden" aria-label="Common Grove home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Common Grove</span>
        </a>
        <div className="day-label"><span aria-hidden="true">●</span> Friday morning</div>
        <button className="profile-button" type="button" aria-label="Open your profile">
          <span className="profile-dot">R</span>
          <span className="profile-copy"><strong>Your garden</strong><small>Peaceful · thriving</small></span>
        </button>
      </header>

      <section className={`scene ${gardenView} focus-${selectedChange}`} id="garden" aria-label={`Your garden ${gardenView === 'before' ? 'before the recent changes' : 'now, after the recent changes'}`}>
        <div className="scene-toolbar" aria-label="Prototype controls">
          <span>Garden comparison</span>
          <div className="view-toggle">
            <button type="button" className={gardenView === 'before' ? 'active' : ''} onClick={() => setGardenView('before')}>Before</button>
            <button type="button" className={gardenView === 'now' ? 'active' : ''} onClick={() => setGardenView('now')}>Now</button>
          </div>
          <button type="button" className="reset-button" onClick={resetSession}>Reset session</button>
        </div>
        <div className="sun" />
        <div className="cloud cloud-one" /><div className="cloud cloud-two" />
        <div className="hill hill-back" /><div className="hill hill-front" />
        <div
          className="garden-ground"
          style={{
            transform: `translate3d(${-cameraPosition.x}%, ${cameraPosition.y}%, 0) scale(${1.18 + cameraPosition.y / 180})`,
          }}
        >
          <div className="island-edge" aria-hidden="true" />
          <div className="island-top" aria-hidden="true" />
          <div className="terrain-stones" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="path path-one" /><div className="path path-two" /><div className="path path-three" />
          <div className="pond"><span /><span /><span /></div>
          <div className="reading-nook">
            <div className="nook-roof" /><div className="nook-post left" /><div className="nook-post right" />
            <div className="bench"><i /><i /></div>
            <div className="book">✦</div>
          </div>
          <div className="tree tree-left"><span /><i /><i /></div>
          <div className="tree tree-right"><span /><i /><i /></div>
          <div className="flowers flower-a">✦ <i>✦</i> ✦</div>
          <div className="flowers flower-b">✦ <i>✦</i></div>
          <div className="seed-pod"><span>?</span></div>
          <button className="garden-focus flower-focus" type="button" aria-label="Inspect the blooming starflowers" onClick={() => setSelectedChange('flower')}><span /></button>
          <button className="garden-focus nook-focus" type="button" aria-label="Inspect the reading nook" onClick={() => setSelectedChange('nook')}><span /></button>
          <button className="garden-focus seed-focus" type="button" aria-label="Inspect the discovery seed" onClick={() => setSelectedChange('seed')}><span /></button>
          <div className="companion detailed" aria-label="Pip, your companion">
            <img src="/pip-detailed-v2.png" alt="Pip, a smooth cream companion with one listening ear, cheek freckles, and a quiet smile" />
            <div className="companion-shadow" />
          </div>
        </div>
        <div className="foreground-leaves leaves-left" aria-hidden="true"><i /><i /><i /></div>
        <div className="foreground-leaves leaves-right" aria-hidden="true"><i /><i /><i /></div>
        <div className="first-person-marker" aria-hidden="true"><i /></div>
        <div className="scene-caption"><span className="pulse" /> {gardenView === 'before' ? 'You are standing in the quiet garden from a few days earlier' : 'You are standing near Pip and the new starflowers'}</div>
        <div className="movement-controls" aria-label="Move through the garden in first person">
          <span className="movement-title">Walk <small>First-person view · Arrow keys or WASD</small></span>
          <div className="movement-pad">
            <button type="button" className="move-up" aria-label="Walk forward" onClick={() => moveCamera(0, 3)}>↑</button>
            <button type="button" className="move-left" aria-label="Look left" onClick={() => moveCamera(-3, 0)}>←</button>
            <button type="button" className="move-down" aria-label="Step backward" onClick={() => moveCamera(0, -3)}>↓</button>
            <button type="button" className="move-right" aria-label="Look right" onClick={() => moveCamera(3, 0)}>→</button>
          </div>
        </div>
      </section>

      <aside className="story-panel" aria-labelledby="welcome-title">
        <div className="panel-kicker">
          <p className="overline">Welcome back</p>
          <label className="role-preview">
            <span>Prototype lens</span>
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as RoleKey)}>
              {Object.entries(roleEvents).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <h1 id="welcome-title">The garden kept growing.</h1>
        <p className="story-lede">While you were away, Pip helped a starflower bloom, gathered materials for a quiet reading nook, and discovered a curious new seed.</p>

        <div className="change-list" aria-label="Garden changes">
          {changes.map((change, index) => (
            <button
              type="button"
              className={`change-row ${selectedChange === change.id ? 'active' : ''}`}
              onClick={() => setSelectedChange(change.id)}
              key={change.id}
            >
              <span className={`change-number ${change.color}`}>0{index + 1}</span>
              <span><small>{change.eyebrow}</small><strong>{change.title}</strong></span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>

        <div className={`change-detail ${activeChange.color}`} aria-live="polite">
          <span>Private example · {role.label}</span>
          <p>{role[selectedChange as 'flower' | 'nook' | 'seed']}</p>
          <small>{activeChange.detail}</small>
        </div>

        <div className="panel-footer">
          <span>No scores. No upkeep. Just progress.</span>
          <button type="button" onClick={() => setChoiceOpen(true)}>See what is waiting <b>→</b></button>
        </div>
      </aside>

      {choiceOpen && (
        <section className="choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="choice-title">
          <div className="choice-card">
            <button type="button" className="choice-close" onClick={() => setChoiceOpen(false)} aria-label="Close garden choice">×</button>
            <p className="overline">A discovery for whenever you’re ready</p>
            <h2 id="choice-title">Where should the curious seed lead?</h2>
            <p>Pip found two possibilities. Nothing expires, and the garden will keep growing while you decide.</p>
            <div className="choice-options">
              <button type="button" className={gardenChoice === 'orchard' ? 'chosen' : ''} onClick={() => setGardenChoice('orchard')}>
                <span className="choice-art orchard"><i /><i /><i /></span>
                <strong>The Lantern Orchard</strong>
                <small>A quiet grove for gathering, stories, and soft evening light.</small>
              </button>
              <button type="button" className={gardenChoice === 'workshop' ? 'chosen' : ''} onClick={() => setGardenChoice('workshop')}>
                <span className="choice-art workshop"><i /><i /><i /></span>
                <strong>The Tinker Workshop</strong>
                <small>A cheerful place for making, experimenting, and useful discoveries.</small>
              </button>
            </div>
            <div className="choice-footer">
              <span>{gardenChoice ? `Pip will remember your ${gardenChoice} idea.` : 'You can come back to this choice any time.'}</span>
              <button type="button" disabled={!gardenChoice} onClick={() => setChoiceOpen(false)}>Keep this path</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
