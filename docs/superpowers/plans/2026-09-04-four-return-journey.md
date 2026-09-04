# Four-return journey implementation plan

**Goal:** Deliver the approved four-visit garden simulation, with visible accumulation, both destination paths, and truthful interaction memories.

**Architecture:** A pure journey reducer owns authored visits, accomplishments, choice and memory. It projects historical/current scene state into the existing garden, and supplies chapter-specific Pip behavior. The renderer remains responsible for navigation and transient interactions.

**Tech stack:** Existing React, TypeScript, Three.js/React Three Fiber and Vitest; no new dependencies.

**Spec:** `docs/reviews/project-review-2026-09-04.md`, the approved four-return design in conversation, and the user's instruction to continue autonomously.

## Constraints and decisions

- Local fictional simulation, no network features or persistence. Refresh/restart clears the journey.
- Four visits: beginning, one week later, several weeks later, one season later.
- No absence penalties, scores, care requirements or expiring choices. Choice and interaction are optional.
- Keep the 40 × 40 metre footprint, movement and safe placement.
- Memories are emitted from completed interactions, never from merely pressing an action or carrying an object.
- Existing rewards and choice survive return transitions. Before compares the previous return on visits 2–4; first-visit comparison keeps its original behavior.
- Late choice remains available on all visits. Repeated advance at visit 4 is harmless.
- Work on a feature branch in the existing checkout to preserve its installed runtime. Do not upload or deploy.
- Implement the coupled scene/state/UI work locally, then request an independent read-only review.

## Tasks

- [x] 1. Journey model and coverage (`journey.ts`, `journey.test.ts`): pure reducer for simulate, choose, remember, return and reset; current/previous scene projection; chapter and Pip profile content. Test both branches, deferred choices, no-interaction progression, memory snapshots, history and terminal/reset behavior.

  ```ts
  type JourneyEvent = { type: 'accomplishment' } | { type: 'choose'; choice: GardenChoice }
    | { type: 'remember'; interaction: MemoryKind } | { type: 'return' } | { type: 'reset' };
  // Return becomes available after the three opening accomplishments.
  // Prior choice and last completed interaction are snapshotted on return.
  ```

- [x] 2. Completion memory and Pip behavior (`pipInteractionScene.ts`, `behavior.ts`, `usePipBehavior.ts`, covering tests): store a monotonically increasing completed-memory event in the interaction reducer; publish it to the journey once. Let behavior consume an optional greeting/preferred activity profile while retaining safe routing, cooldowns and reward ordering.

  ```ts
  // Only accepted completion events produce memory.
  const after = pipInteractionSceneReducer(before, { type: 'pet-complete' });
  // Ignored/stale completion events leave sequence unchanged.
  ```

- [x] 3. Playable chapter integration (`page.tsx`, `JourneyJournal.tsx`, `GardenWorld.tsx`, CSS): replace top-level reward/choice ownership with journey state; remount transient scene on return/restart; forward completion memory; suppress replay of already-seen rewards on later returns. Present chapter story, private causes, remembered moment, next return, historical comparison and existing optional choice/privacy flows. Keep direct controls accessible, and prevent return while carrying/reacting.

- [x] 4. Accumulating garden presentation (`JourneyGrowth.tsx`, `journeyLayout.ts`, `StorybookGardenEnvironment.tsx`, layout tests): add bounded flower growth and pavilion signs of use, then visibly develop Orchard canopies/lanterns and Workshop exterior inventions. Put solid detail within excluded footprints; preserve the routes and footprint. Keep animation restrained and reduced-motion safe.

- [x] 5. Verify and align docs: run focused tests during implementation, full suite/lint/typecheck/build at integration; walk both branches and deferred-choice flow in browser; update charter/status/backlog/README and report known limits. Request independent review and fix material findings. Keep the local feature branch for review; no merge or publication required.

## Verification commands

Run installed executables from `prototype/`, avoiding automatic package-manager installation:

```powershell
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vinext.cmd build
```

## Progress

Baseline: unchanged code at `b8d61b6` passed 239 tests, lint and build during the preceding review. Feature branch created successfully. No new dependency install is needed.

## Final verification — 2026-09-04

- 261 tests / 24 files passed on the final implementation. ESLint and production build exit 0. `git diff --check` reports no whitespace errors.
- The standalone typecheck was run and is **not clean**: missing Three.js declarations and older tuple/literal test-fixture typing remain. Recorded as the next technical debt item; no dependency changes or `any` stubs conceal it.
- Browser pass at `http://127.0.0.1:3001/`: direct greet/pet completed; Return 2 remembered the pet and displayed the matching greeting; deferred choice remained available through Return 3; late Workshop choice followed by Last return showed the earlier seed and no live Pip commentary; Return 4 rendered the Workshop. A fresh no-interaction run selected Orchard on Return 1 and reached Return 4 with neutral memory text. Refresh and Restart journey cleared all progress. Chapter heading and panel scroll reset on return.
- Close-up visual corrections: Workshop roof now meets at a ridge with a closed attic, inventions are scaled and separated, bunting attaches to the front; Orchard lanterns hang below the mature crowns. Geometry/clearance regressions were demonstrated failing and then passing.
- Independent read-only review identified arrival greeting starvation, historical behavior mismatch and replaying retained reveals. All were fixed and re-reviewed with no remaining material finding in that scope.
- Deliberate comparison behavior: Pip and direct interactions pause while you compare; activity timers still advance, so an ordinary activity may expire when Now resumes. Historical views are inspection, not a rewind of live simulation.
- Navigation adds a permanent visible stone-edged destination plot at (-13, 11), radius 2.4, with canonical navigation clearance. Its solid decoration stays within the plot/clearance area; routes and the 40 × 40 metre world remain covered by the full regression suite.
- No fresh mobile viewport, OS reduced-motion, full snack/toy offer, unsafe placement browser pass or hardware FPS measurement is claimed. Those remain before owner acceptance, along with broader art/material polish.
- Local-only feature branch is retained. No merge, upload, hosted access or invitations. The browser is left at a clean first return for the owner.
