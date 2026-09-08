# Shared Companion Garden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. The existing local Site checkout is owned and edited by the parent; independent reviewers are read-only.

**Goal:** Deliver three individual residents with gradual arrivals, correct direct interactions and memories, coordinated play and the shared-body visual direction.

**Architecture:** Reuse the current actor/behavior/locomotion engine and tested single-recipient interaction reducer. Add a resident-ID adapter around that reducer, extract an instanced actor, and introduce pure shared-toy/social coordination. Compose appearance independently from identity and temperament.

**Tech Stack:** Existing React, React Three Fiber, Three, Vinext, Vitest and TypeScript. No dependency changes.

**Spec:** `docs/superpowers/specs/2026-09-05-shared-companion-garden-design.md` (owner approved with “yeah continue”).

## Global constraints

- Preserve the cliff/lighting, Pip defaults, body proportions, garden dimensions, movement speed, elevated terrace and both destination paths.
- Local only. No new assets, dependencies, storage, publishing, accounts, breeding, needs or absence penalties.
- Continue in the current checkout and preview, preserving all earlier dirty work. No new worktree or source upload.
- Existing baseline: 275 tests pass. Typecheck has known Three declaration and fixture errors; track new diagnostics separately. Exact browser frame telemetry is not available in the current simple browser controls; do not claim a measured performance pass.
- Run commands from `prototype`: `.\node_modules\.bin\vitest.cmd run [files]`, `.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next`, `.\node_modules\.bin\vinext.cmd build`.

## Task 1 — Roster, composed appearance and gradual journey

**Files:** Create `prototype/app/garden/residents.ts` and `residents.test.ts`; modify `journey.ts`, `journey.test.ts`, `PipCharacter.tsx`, `page.tsx`, `JourneyJournal.tsx`.

**Interfaces:** `ResidentId = 'pip' | 'moss' | 'fern'`; `ResidentAppearance = {body: string; accent: string; markings: 'freckles' | 'patches' | 'brow'; ears: 'listening' | 'round' | 'tipped'}`. `RESIDENTS` defines name, appearance, firstVisit, spawn, seed and preferredKind. `residentsForVisit(visit: number): readonly ResidentDefinition[]`. Journey adds optional per-ID current/return memory records (legacy Pip scalar remains compatible). `getResidentJourneyProfile(state: JourneyState, id: ResidentId): PipJourneyProfile`; remember events may carry `residentId`; `preview-community` advances to at least return 3 without fake memories or choice.

- [x] Add failing roster/preview/memory tests. Literal examples:

```ts
expect(residentsForVisit(2).map(r => r.id)).toEqual(['pip', 'moss']);
const next = journeyReducer(createJourney(), {type: 'preview-community'});
expect([next.visit, next.rewardStage, next.choice]).toEqual([3, 3, null]);
const memory = journeyReducer(next, {type: 'remember', residentId: 'moss', interaction: 'pet'});
expect(memory.lastInteraction).toBeNull();
expect(memory.residentMemories?.moss).toBe('pet');
```

- [x] Watch the assertions fail, implement the roster and journey projection, then rerun. Reject memories for residents not yet present; preserve historical roster and independent profile defaults.
- [x] Parameterize the existing model with `appearance = RESIDENTS[0].appearance`; preserve Pip geometry/material output by default. Use shared body, round/tipped ears, cheek patches/brow marks with geometry inside the authored silhouette. Names never select geometry.
- [x] Add named arrival/memory summaries and the explicitly labeled preview button. Guard carrying/reaction/comparison; route through the real reducer and set view to Now.

## Task 2 — Capture the correct resident for each interaction

**Files:** Create `residentInteraction.ts` and `residentInteraction.test.ts`; modify `useInteractionTarget.ts` and its test.

**Interfaces:** `ResidentTarget = ResidentId | 'food' | 'toy'`; `canonicalTarget(target): InteractableId | null`; wrapper state contains the existing scene, focused target, captured resident ID, interaction epoch, per-ID placed positions/resume counters and recipient-tagged memory. Events: `focus`, `activate`, `offer`, `scene` (recipient/epoch checked). Existing reducer remains the single-recipient engine, not three copies.

- [x] Test that greeting then petting Moss credits only Moss, switching focus resets the greeting chain, and stale completion events cannot affect a later interaction. Use real reducer events rather than source-text assertions.

```ts
let state = createResidentInteraction();
state = residentInteractionReducer(state, {type:'focus', target:'moss'});
state = residentInteractionReducer(state, {type:'activate', event:{type:'greet'}});
expect(state.activeId).toBe('moss');
expect(canonicalTarget('fern')).toBe('pip');
```

- [x] Watch failures, implement the adapter and broaden the target registry validator. Keep old interaction tests unchanged.
- [x] Exercise offer recipient capture, held-object exclusivity, target loss, per-ID placement/resume and no memory for autonomous play. Timer/actor callbacks include epoch and recipient; invalid callbacks are ignored.

## Task 3 — Reusable resident actor and scene integration

**Files:** Create `ResidentActor.tsx`; modify `GardenWorld.tsx`, `behavior.ts`, `usePipBehavior.ts`, `page.tsx`, `JourneyJournal.tsx` and targeted tests.

**Interfaces:** Actor takes a resident definition, individual journey profile, spawn, direct reaction phase/target, placement/resume, callbacks and shared coordinator ref. The world holds a stable ref per ID and a single player interaction wrapper. Actor callbacks carry ID, not the singleton Pip label.

- [x] Add a behavior test proving per-resident preference weights and deterministic random streams select independent routines. Existing safe navigation/interaction lifecycle tests protect the extraction.
- [x] Extract the actor through a mechanical patch, retaining reward missions only for Pip, correct initial spawn, and stable callback/ref ownership. Use profile/name data and appearance props for every actor.
- [x] Replace singleton refs in the world with resident registrations. Map player actions to the adapter and apply reaction/placement/resume only to the captured resident. Correct labels and live messages; retain Pip portrait only when Pip speaks.
- [x] Run focused and full tests; compile the route and show the three-resident shortcut in the existing browser before expanding shared play.

## Task 4 — Shared toy motion, claims, social moments and separation

**Files:** Create `residentCoordination.ts`, `residentCoordination.test.ts`, `CommunityCoordinator.tsx`; modify `ResidentActor.tsx`, `GardenObjects.tsx` and `GardenWorld.tsx`.

**Interfaces:** A pure coordinator consumes `now`, `delta`, actor IDs/positions/availability and player-held/offered state. It produces per-ID directives (`play`, `watch`, `greet`), an authoritative toy point/roll and finite exclusive claims. `residentObstacles(id, snapshots)` adds peers to existing static obstacles; `safeToyNudge(start, direction, peers)` validates a swept footprint.

- [x] Write red tests for exclusive ownership, participant cancellation, finite timeouts, fair turns, safe nudge sweeps, peer-aware placement/segments and nonoverlapping social standoffs. Literal safe/unsafe fixtures use south-lawn points clear of the pond.

```ts
expect(safeToyNudge({x:0,z:7.5}, {x:0,z:-1}, [])).toEqual({x:0,z:7.5});
expect(isSafeGardenSegment({x:0,z:12}, {x:2,z:12}, [{x:1,z:12,radius:.5}])).toBe(false);
```

- [x] Implement approach → anticipation → bounded nudge → follow → pause → release. Keep a single toy position authoritative across pickup/offering/autonomy; never snap back after playing. Freeze under comparison and cancel claims under carrying, return or reset.
- [x] Add an optional watching resident and fair next turn. Add finite notice/greet pairs with separate safe spots. Actors can leave or replan; no state-dependent teleporting or unbounded queues.
- [x] Wire frame snapshots and directives to actors; reject unsafe peer-crossing movement before rendering, replan when blocked, avoid simultaneous greetings to the visitor. Reuse existing cadence/material resources.
- [x] Run real lifecycle simulations long enough to see completion, cancellation and another resident taking a turn. Verify reduced-motion visual pose and motion choices.

## Task 5 — Browser, review and handoff

**Files:** Update this plan, `STATUS.md`, `BACKLOG.md`, `README.md` and spec status with only verified outcomes.

- [ ] Browser: gradual arrivals and shortcut; focus/pet/carry/place/offer each resident; shared play and social greeting; independent activity; both destinations; elevated terrace; historical comparison; restart. The three-resident shortcut, distinct residents, shared-play status and visual composition were checked; direct interaction and both destination paths still need a full owner walkthrough.
- [x] Inspect live rendering and messages. Preserve art and verify locked cliff hashes. Record performance/accessibility limits honestly.
- [x] Run all tests, lint and production build. Inspect TypeScript diagnostics for new errors. Get a read-only independent code review and address material findings with regression tests.
- [x] Update completion/remaining-gap records. Keep the local preview alive, mark its tab deliverable, and report actual delivered gameplay without claiming production readiness.

## Plan self-review

The tasks cover roster/appearance, gradual arrivals, person-specific interactions and memories, independent actor behavior, shared play/social life, safety/recovery, history/reset, art preservation and verification. The adapter deliberately retains the current tested reducer while replacing the singleton assumption at the world boundary. No dependency or backend work is required.
