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
- An original procedural 3D Pip with grounded locomotion and autonomous garden activities
- Optional first-person greeting, petting, carrying, and safe placement
- One session-local snack and one session-local toy with temporary reactions and no needs or scores
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

- Restart the prototype and confirm the camera, garden, Pip, journal, interaction prompt, carried items, object positions, and responses return to their authored opening state.
- Complete all three simulated accomplishments in order. After each reward, switch to **Before** and **Now** and verify the comparison stays coherent while Pip completes the corresponding priority reaction.
- In separate restarted sessions, confirm Lantern Orchard and Tinker Workshop. For each path, verify the discovery seed remains in historical **Before**, is consumed in **Now**, and the selected destination appears without a deadline or upkeep message.
- Open the privacy preview and confirm the visible/private boundary is unambiguous. Select **Comfortable**, **Unsure**, and **Invasive** in turn and verify the copy says the response is temporary, enables no visit, contacts nobody, and leaves no state after refresh.
- Approach Pip without entering his closest proximity radius and use **Greet Pip**. Confirm Pip safely steps slightly closer, turns toward you, and gives the short greeting response; then use **Pet Pip**, followed by **Pick up Pip**, one contextual action at a time. In a separate restart, approach without targeting Pip and observe the autonomous close-proximity greeting without an immediate duplicate direct greeting. Move while carrying and place him on open ground. Repeat placement toward the pond edge and garden boundary; confirm Pip finishes grounded at a valid point. Press Escape while carrying and confirm placement happens before any unrelated dialog dismissal.
- Pick up the snack and wooden-ring toy separately. For each object, carry it, place it on safe ground, offer it to Pip, and verify the eating or single-nudge play reaction is narrated in text. Press Escape during each carrying state and confirm safe placement. Refresh and confirm the snack and toy return to their authored opening positions.
- Navigate each dialog by keyboard only with Tab and Shift+Tab, activate controls with Enter, trigger eligible contextual actions with **E**, and verify held targets place with Escape. Confirm **E** never activates from input, select, textarea, button, or summary controls and a held key does not repeat the action.
- Repeat the reward, placement, and interaction checks with reduced motion enabled at the operating-system level. Confirm secondary bounce, sway, and decorative transitions are subdued while foot changes, turning, prompts, status copy, and every outcome remain readable.
- Refresh and confirm the opening reward state, choice, comfort response, interaction state, camera, Pip, snack, and toy are restored. Confirm no network-backed product feature or persistence is implied.
- Inspect the console throughout. Require zero application errors; record the known `THREE.Clock` deprecation warning separately as non-blocking technical debt.

## Current verification record — 2026-08-27

- **Automated:** 182 tests pass across the full suite. Coverage includes prompt input suppression and repeat-key handling, accessible/visible prompt label parity, the direct greet/pet/pick-up reducer and post-arrival timer sequence, real safe-route arrival at maximum range and around scenery, duplicate-greeting suppression, Escape placement ordering, canonical safe placement, opening interaction state, and readable text for greet/pet/eat/play outcomes. Lint and the production build pass.
- **Short live smoke:** the three reward controls advanced; each choice path was confirmed in a separately restarted session; privacy copy and a local comfort selection rendered; restart and refresh restored the opening journal and disabled **Now** control. No error-level console entries appeared. The existing `THREE.Clock` deprecation warning remains; deliberate refresh also emitted a WebGL context-lost log.
- **Owner walkthrough:** not yet complete. The detailed Before/Now, direct interaction, keyboard-only, unsafe-placement, and operating-system reduced-motion checks above still require owner observation before staff invitations resume.

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
