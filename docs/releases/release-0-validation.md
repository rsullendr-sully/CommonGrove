# Release 0 — Concept Validation

Status: Active  
Owner: Product owner  
Audience: Internal staff  
Target participants: 6–10 interview volunteers, with an optional survey for all approximately 14 employees

## Validation question

Do employees understand and care about a garden that visibly changes because of their accomplishments, without feeling monitored, compared, or burdened?

## Prototype boundary

The prototype is a scripted, web-first bounded 3D experience. It is allowed to fake all data and state transitions.

### Included

- One original companion
- One personal garden
- A first-person employee viewpoint with bounded movement
- Keyboard and on-screen directional controls
- Before and after garden states
- Representative accomplishments from all four role groups
- Three visible garden outcomes
- A welcome-back summary
- A private explanation of why each change occurred
- One meaningful development choice with no deadline
- A static concept for a coworker visit, used only to discuss privacy comfort

### Excluded

- Authentication
- Databases and persistent accounts
- Production integrations
- General-purpose reward or simulation engines
- Real coworker visits
- Gifts, rankings, or social feeds
- Open-world navigation
- Physics, collision systems, and multiplayer movement
- Multiple companions

## Storyboard specification

### Scene 1 — Return

The employee opens the garden after several days. The companion greets them warmly without mentioning neglect or absence as a failure.

### Scene 2 — Visible change

The garden now contains a blooming starflower, a partially completed reading nook, and a newly discovered seed. The companion moves between ordinary autonomous activities.

The employee moves through the contained garden in first person with no visible player avatar. Pip appears nearby at a smaller companion scale beneath the employee's eye line and remains autonomous so the prototype can test whether he feels like a companion rather than an avatar.

The interactive prototype implements the first complete simulated loop for “Helped someone succeed”: the employee triggers a private prototype event, starflowers bloom near the pond, Pip notices and investigates, and the garden journal explains the change without a score.

The second sequential loop represents “Moved important work forward”: the reading pavilion gains finished shelves, books, and warm lanterns; Pip travels to the pavilion; and Before/Now compares the new pavilion state while retaining the earlier starflowers.

The third sequential loop represents “Strengthened the team or system”: a glowing discovery seed appears beside an unopened path, Pip investigates it, and the private explanation connects it to a reusable improvement without revealing work details.

### Scene 3 — Welcome-back story

Provisional copy:

> While you were away, your companion helped a starflower bloom, gathered materials for a quiet reading nook, and discovered a curious new seed. These changes grew from ways you helped people, moved work forward, and strengthened the team.

### Scene 4 — Private explanation

The employee can open each change to see a short sanitized reason. The interface shows neither points nor comparisons.

Examples:

- “A recent contribution that helped someone succeed brought fresh water to the garden.”
- “Progress on important work supplied materials for the reading nook.”
- “An improvement shared with the team revealed a discovery seed.”

### Scene 5 — Meaningful choice

The seed can eventually develop toward an orchard or a workshop garden. The decision remains available until the employee is ready, and ordinary progress continues either way.

The interactive prototype now implements this choice. After the discovery seed appears, the employee deliberately confirms either the Lantern Orchard or Tinker Workshop. A small destination preview begins forming in the 3D garden and Pip investigates it. The choice has no deadline, upkeep, or effect on essential progression.

### Scene 6 — Social comfort test

A static preview explains that coworker visits would be opt-in and would never reveal work events, scores, or reward totals. No social feature is implemented during this release.

The interactive prototype now includes this static preview after the seed choice. It explicitly separates visible garden appearance from private work events, totals, comparisons, and activity history. A three-option comfort check remains local to the current session and sends or stores nothing.

## Owner readiness walkthrough

Before inviting staff, complete one uninterrupted local walkthrough:

- Restart the prototype and confirm the camera, garden, Pip, journal, and responses return to their opening state.
- Complete all three simulated accomplishments and compare Before/Now after each one.
- Confirm both seed-choice options are understandable; select one and verify its destination appears.
- Open the privacy preview and confirm the visible/private boundary is unambiguous.
- Navigate each dialog by keyboard only, including Tab, Shift+Tab, Enter, and Escape.
- Repeat with reduced motion enabled at the operating-system level and confirm ambient movement is subdued without hiding garden outcomes.
- Confirm no response persists after refresh and no network-backed product feature is implied.

## Research prompts

- What do you think caused the garden to change?
- How do you feel about the companion?
- Would you want to return? Why or why not?
- Does this feel rewarding, childish, distracting, or like another responsibility?
- Does any part feel like employee monitoring or evaluation?
- Does your role appear able to progress fairly?
- What information should coworkers never see?
- Would an opt-in garden visit feel delightful or invasive?

## Exit gate

Proceed to detailed system design only if:

- Most participants understand the accomplishment-to-garden loop without coaching.
- At least 60% express genuine interest in returning.
- Participants across all represented roles believe they can progress fairly.
- Autonomous growth is preferred over routine maintenance.
- No strong unresolved surveillance or privacy concern emerges.
- At least one original visual direction creates clear emotional interest.

Failure to meet the gate triggers revision or cancellation, not automatic expansion of scope.
