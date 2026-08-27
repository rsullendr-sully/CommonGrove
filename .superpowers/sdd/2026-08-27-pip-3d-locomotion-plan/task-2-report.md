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
