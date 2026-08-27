# Pip Autonomous Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Pip's fixed patrol with varied, recoverable, needs-free autonomous garden activities.

**Architecture:** Implement the selector and safe-target rules as deterministic pure TypeScript, then connect them to the grounded controller from Increment 1. Scene components declare interest points; the behavior layer selects activities but does not render or mutate React state directly.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, React Three Fiber 9.7, Vitest 3

**Spec:** `docs/superpowers/specs/2026-08-27-pip-exploration-expansion-design.md`

## Global Constraints

- Complete `docs/superpowers/plans/2026-08-27-pip-3d-locomotion-plan.md` first.
- Pip has no simulated needs, neglect penalties, scores, or required employee input.
- Reward investigations override ordinary behavior.
- Pip never crosses the pond, garden boundary, or declared scenery obstacles.
- Ordinary activities do not repeat immediately when another eligible activity exists.
- Reduced motion changes animation presentation, not activity selection.

---

### Task 1: Define deterministic activities and selection

**Files:**
- Create: `prototype/app/garden/behavior.ts`
- Create: `prototype/app/garden/behavior.test.ts`

**Interfaces:**
- Produces: `PipActivityKind`, `PipActivity`, `BehaviorContext`, `chooseNextActivity(context, randomValue)`, and `activityDefinitions`.

- [ ] **Step 1: Write failing selector tests**

```ts
import { describe, expect, it } from 'vitest';
import { chooseNextActivity, type BehaviorContext } from './behavior';

const context: BehaviorContext = {
  now: 20,
  recentKind: 'inspect-flowers',
  employeeNearby: false,
  availableInterestIds: ['flowers', 'pond', 'pavilion'],
  cooldownUntil: {},
};

describe('Pip behavior selection', () => {
  it('does not immediately repeat an ordinary activity', () => {
    expect(chooseNextActivity(context, 0).kind).not.toBe('inspect-flowers');
  });

  it('chooses greeting when the employee is nearby', () => {
    expect(chooseNextActivity({ ...context, employeeNearby: true }, 0.5).kind).toBe('greet');
  });

  it('excludes activities still on cooldown', () => {
    const next = chooseNextActivity({ ...context, cooldownUntil: { 'watch-pond': 40 } }, 0);
    expect(next.kind).not.toBe('watch-pond');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/behavior.test.ts`

Expected: FAIL because `behavior.ts` does not exist.

- [ ] **Step 3: Implement weighted eligible selection**

Define these activity kinds exactly:

```ts
export type PipActivityKind =
  | 'wander'
  | 'look-around'
  | 'inspect-flowers'
  | 'watch-pond'
  | 'visit-pavilion'
  | 'inspect-destination'
  | 'rest'
  | 'greet';
```

Each definition contains `weight`, `durationSeconds`, `cooldownSeconds`, and optional `interestId`. Filter unavailable interests, active cooldowns, and `recentKind`; make `greet` the sole eligible activity when `employeeNearby` is true. Select from cumulative weights using the injected `randomValue` in `[0, 1)`.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --run app/garden/behavior.test.ts`

Expected: all selector tests pass.

```bash
git add prototype/app/garden/behavior.ts prototype/app/garden/behavior.test.ts
git commit -m "feat: add Pip autonomous behavior selector"
```

---

### Task 2: Add safe interest points and reachability recovery

**Files:**
- Create: `prototype/app/garden/navigation.ts`
- Create: `prototype/app/garden/navigation.test.ts`
- Modify: `prototype/app/GardenWorld.tsx`

**Interfaces:**
- Produces: `GardenInterest`, `isSafeGardenPoint(point, obstacles)`, `nearestSafePoint(point, obstacles)`, and `hasActivityTimedOut(startedAt, now, timeoutSeconds)`.

- [ ] **Step 1: Write failing navigation tests**

Test that points inside the 12-meter pond boundary, outside `[-19, 19]`, and inside a scenery obstacle are unsafe; test that `nearestSafePoint` returns an in-bounds point outside all three; test that a 9-second activity exceeds an 8-second timeout.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/navigation.test.ts`

Expected: FAIL because `navigation.ts` does not exist.

- [ ] **Step 3: Implement safe-point rules**

Use these exact constants:

```ts
export const SAFE_GARDEN_HALF_SIZE = 18.7;
export const SAFE_POND_RADIUS = 7.1;
export const PIP_ACTIVITY_TIMEOUT_SECONDS = 8;
```

`nearestSafePoint` clamps to the square boundary, pushes radially outside the pond radius, and then pushes outside each circular scenery obstacle by its radius plus `0.35` meters.

- [ ] **Step 4: Declare scene interest points**

Replace `pipWaypoints` with named interests for flowers, pond, pavilion, seed, chosen destination, and three neutral wander points. Pass only interests that exist in current reward/choice state to the behavior selector.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --run app/garden/navigation.test.ts app/garden/behavior.test.ts`

Expected: all tests pass.

```bash
git add prototype/app/garden/navigation.ts prototype/app/garden/navigation.test.ts prototype/app/GardenWorld.tsx
git commit -m "feat: add safe garden interests for Pip"
```

---

### Task 3: Connect autonomous activities to Pip

**Files:**
- Create: `prototype/app/garden/usePipBehavior.ts`
- Modify: `prototype/app/GardenWorld.tsx`
- Modify: `prototype/app/garden/PipCharacter.tsx`
- Modify: `prototype/app/garden/pipPose.ts`
- Modify: `prototype/app/garden/pipPose.test.ts`

**Interfaces:**
- Consumes: current interests, employee distance, reward mission, choice mission, and locomotion completion.
- Produces: `{ activity, target, message, poseKind, completeActivity, interruptWithReward }` from `usePipBehavior`.

- [ ] **Step 1: Extend pose tests for rest and inspection**

Add `poseKind: 'idle' | 'walk' | 'inspect' | 'rest' | 'greet'` to `PipPoseInput`. Verify rest lowers the body by `0.12`, inspect tilts the head by `0.16`, and greet raises the listening ear without moving the feet.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/pipPose.test.ts`

Expected: FAIL because `poseKind` is not implemented.

- [ ] **Step 3: Implement the behavior hook**

The hook selects with `chooseNextActivity`, sets the matching named interest target, records start time and cooldown, and completes timed stationary activities. It abandons travel when `hasActivityTimedOut` returns true. `interruptWithReward` stores the current ordinary activity, selects the reward target immediately, and returns to a fresh ordinary selection after the reward pause.

- [ ] **Step 4: Replace waypoint refs in `Pip`**

Delete `waypointIndex` and the fixed patrol branch. Drive the grounded locomotion target from `usePipBehavior`. Map arrival at stationary activities to the correct `poseKind`. Keep the existing proximity messages and reward copy.

- [ ] **Step 5: Verify an extended observation run**

Run: `npm test && npm run lint && npm run build`

Expected: all checks pass.

Observe for five minutes at localhost and record the sequence. Acceptance requires at least four distinct ordinary activity kinds, no immediate duplicate when alternatives exist, one successful employee greeting, one reward interruption, and no walking in place longer than eight seconds.

- [ ] **Step 6: Commit**

```bash
git add prototype/app/garden/usePipBehavior.ts prototype/app/garden/PipCharacter.tsx prototype/app/garden/pipPose.ts prototype/app/garden/pipPose.test.ts prototype/app/GardenWorld.tsx
git commit -m "feat: give Pip autonomous garden activities"
```

---

### Task 4: Record Increment 2 completion

**Files:**
- Modify: `STATUS.md`
- Modify: `BACKLOG.md`

- [ ] **Step 1: Update status from verified evidence**

Record the activity kinds observed, recovery behavior, and reward interruption result. Set the resume point to `docs/superpowers/plans/2026-08-27-pip-interactions-plan.md`.

- [ ] **Step 2: Update the active backlog**

Mark autonomous activity selection complete and make first-person interaction the only active expansion outcome. Staff invitations remain paused.

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run lint && npm run build && git diff --check`

Expected: all checks exit 0.

```bash
git add STATUS.md BACKLOG.md
git commit -m "docs: record Pip autonomy increment"
```

