# Final fix report — 3D Pip locomotion increment

Date: 2026-08-27
Scope: Consolidated final-review fix wave for the two Important findings
Worktree: `C:\Users\rsull\Documents\Codex\Common Grove\.worktrees\pip-exploration`

## Outcome

Both Important findings are fixed without adding autonomy or direct interactions.

1. Materially misaligned turn-in-place frames now request zero speed. The same alignment decision gates both desired speed and translation, so stationary turns cannot accumulate velocity and the first eligible translated frame accelerates from rest.
2. `GardenVisibility` now derives the visible destination together with the seed and other reward objects. The derived destination value is routed through `page.tsx` and `GardenWorld.tsx` into `ChoiceDestination`; raw `gardenChoice` no longer determines destination rendering. The complete Before/Now × unchosen/orchard/workshop matrix is covered.

## Root causes

- `stepLocomotion` advanced `speed` toward its distance-based desired speed before independently withholding translation for poor alignment. Rotation-only frames therefore accumulated up to 0.70 m/s for a 90° turn and 1.20 m/s for a 180° turn in the focused reproduction.
- `deriveGardenVisibility` modeled only `seedVisible`. `ChoiceDestination` instead rendered from `gardenChoice`, which ignored `gardenView`; the seed rule also treated any unchosen stage-3 view as visible, including historical Before.

## TDD evidence

The shell did not expose `npm`, so the commands below invoke the repository's installed CLIs with the bundled Node 22 runtime. The first sandboxed direct run could not load `vitest.config.ts` due filesystem restrictions; all recorded test evidence is from the successful approved reruns outside that sandbox boundary.

### Reward visibility RED

Command:

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vitest\vitest.mjs' run app/garden/rewardState.test.ts
```

Output summary: exit 1; 1 test file failed, 6 tests failed. Historical Before with no choice received `seedVisible: true` instead of `false`; every matrix case received `destinationVisible: undefined` instead of the expected `null`, `orchard`, or `workshop`.

### Reward visibility GREEN

Same command. Output summary: exit 0; 1 test file passed, 6 tests passed.

### Turn-in-place RED

Command:

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vitest\vitest.mjs' run app/garden/locomotion.test.ts
```

Output summary: exit 1; 1 test file failed, 2 of 10 tests failed. The maximum speed accumulated while stationary was 0.7000000000000001 m/s for the 90° turn and 1.2 m/s for the 180° turn; both expected 0.

### Turn-in-place GREEN

Same command. Output summary: exit 0; 1 test file passed, 10 tests passed. Both turns remain at zero speed while stationary, then launch at the acceleration-limited 0.05 m/s first-frame speed.

### Combined focused GREEN

Command:

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vitest\vitest.mjs' run app/garden/locomotion.test.ts app/garden/rewardState.test.ts
```

Output summary: exit 0; 2 test files passed, 16 tests passed.

## Required full verification

Run once after focused GREEN:

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vitest\vitest.mjs' run
```

Output summary: exit 0; 3 test files passed, 18 tests passed.

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\eslint\bin\eslint.js' . --ignore-pattern dist --ignore-pattern .next
```

Output summary: exit 0; no lint output.

```powershell
& 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vinext\dist\cli.js' build
```

Output summary: exit 0; all five vinext build phases completed and the `/` app route was produced. The build emitted its existing advisory that some minified chunks exceed 500 kB and its informational note that vinext could not statically classify every route.

```powershell
git diff --check
```

Output summary: exit 0; no whitespace errors. Git printed only its configured LF-to-CRLF working-copy notices.

## Files changed

- `prototype/app/garden/locomotion.test.ts`
- `prototype/app/garden/locomotion.ts`
- `prototype/app/garden/rewardState.test.ts`
- `prototype/app/garden/rewardState.ts`
- `prototype/app/page.tsx`
- `prototype/app/GardenWorld.tsx`
- `.superpowers/sdd/2026-08-27-pip-3d-locomotion-plan/final-fix-report.md`

## Self-review

- Confirmed all six stage-3 visibility states against the exact ruling: Before/Now crossed with unchosen, orchard, and workshop.
- Confirmed `ChoiceDestination` receives only the derived `destinationVisible` value. `gardenChoice` remains separately available only where current session behavior still needs the remembered selection, including Pip's already-completed reward reaction.
- Confirmed the locomotion fix uses one `aligned` decision for both desired-speed calculation and translation eligibility, preventing threshold drift.
- Confirmed the two new locomotion tests exercise real `stepLocomotion` behavior and separately prove 90° and 180° stationary turns do not bank launch speed.
- Reviewed the complete diff for unintended scope. No autonomous selector, direct interaction, persistence, network, inventory, score, or upkeep behavior was added.

## Concerns

No functional concerns identified in the fix. The production build retains the non-blocking chunk-size and route-classification advisories noted above; this wave did not broaden scope to optimize bundling or alter routing.
