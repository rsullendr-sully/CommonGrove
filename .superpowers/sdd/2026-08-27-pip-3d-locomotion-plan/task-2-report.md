# Task 2 Report: Grounded Locomotion Math

## Status

Implemented and verified frame-rate-independent grounded locomotion math.

## Changes

- Added `LocomotionConfig` and `LocomotionState` types.
- Added shortest signed angular delta calculation across the π boundary.
- Added deterministic `stepLocomotion` with capped delta time, planar movement, bounded acceleration/deceleration, max-speed clamping, braking/arrival handling, facing turn limits, and distance tracking.
- Expanded locomotion tests for acceleration, braking, facing, and the employee speed constant.

## Verification

- Focused Vitest: `app/garden/locomotion.test.ts` — 4 tests passed.
- Full Vitest suite: 1 test file, 4 tests passed.
- `git diff --check` completed without whitespace errors.

## Notes

The brief's interpolation formula approached max speed asymptotically and missed its required precision assertion. The implementation uses bounded per-frame acceleration/deceleration instead, while preserving the configured speed cap. A low-speed near-arrival snap prevents numerical stalling outside the arrival radius.

## Round 1/5 Fixes

- Translation now follows the updated facing direction and only advances once sufficiently aligned with the target, preventing sideways movement while turning.
- Removed the near-arrival teleport snap; arrival retains the current position inside the radius, so no displacement is unaccounted for.
- Arrival preserves the current grounded Y coordinate.
- Added regression tests covering forward-only turning, bounded arrival steps and travel accounting, and grounded Y preservation.

Focused verification command:

```text
$env:Path = 'C:\Users\rsull\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path; & '.\node_modules\.bin\vitest.cmd' run 'app/garden/locomotion.test.ts'
```

Output: `app/garden/locomotion.test.ts` — 7 tests passed.
