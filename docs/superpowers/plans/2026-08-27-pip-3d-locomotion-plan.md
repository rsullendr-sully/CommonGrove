# Pip 3D Locomotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sprite Pip with an original articulated 3D character, give him grounded locomotion, double employee movement speed, and finish the known seed/privacy transitions.

**Architecture:** Extract deterministic motion math into a pure module tested with Vitest. Render Pip through a focused procedural component that consumes locomotion state, while `GardenWorld` retains scene composition and coordinates. Preserve current reward behavior in this increment; autonomous activity selection arrives in the next plan.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, React Three Fiber 9.7, Vitest 3, ESLint 9, vinext/Vite 8

**Spec:** `docs/superpowers/specs/2026-08-27-pip-exploration-expansion-design.md`

## Global Constraints

- The garden remains exactly 40 by 40 meters.
- Employee movement changes from exactly 2 meters per second to exactly 4 meters per second.
- Pip remains an original compact pear-shaped clay character with uneven listening ears, dot eyes, three cheek freckles, and an asymmetrical smile.
- Do not copy Chao characters, anatomy, colors, assets, sounds, names, environments, or progression mechanics.
- No hunger, sickness, decay, neglect penalty, scores, inventory, accounts, database, networking, or persistence.
- Essential garden progression continues to come only from simulated accomplishments.
- Reduced motion removes secondary motion without hiding locomotion intent or state changes.

---

### Task 1: Add the deterministic unit-test harness

**Files:**
- Modify: `prototype/package.json`
- Modify: `prototype/package-lock.json`
- Create: `prototype/vitest.config.ts`
- Create: `prototype/app/garden/locomotion.test.ts`

**Interfaces:**
- Consumes: the existing Vite/TypeScript configuration.
- Produces: `npm test` and `npm run test:watch`; Vitest discovers `app/**/*.test.ts` in the Node environment.

- [ ] **Step 1: Add a failing smoke test**

```ts
// prototype/app/garden/locomotion.test.ts
import { describe, expect, it } from 'vitest';
import { EMPLOYEE_WALK_SPEED } from './locomotion';

describe('locomotion constants', () => {
  it('sets employee travel to four meters per second', () => {
    expect(EMPLOYEE_WALK_SPEED).toBe(4);
  });
});
```

- [ ] **Step 2: Install and configure Vitest**

Run: `npm install --save-dev vitest@^3.2.4`

Add these scripts to `prototype/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `prototype/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Run the test and verify the intended failure**

Run: `npm test -- --run app/garden/locomotion.test.ts`

Expected: FAIL because `./locomotion` does not exist.

- [ ] **Step 4: Create the minimal constant module**

```ts
// prototype/app/garden/locomotion.ts
export const EMPLOYEE_WALK_SPEED = 4;
```

- [ ] **Step 5: Run the test and verification commands**

Run: `npm test -- --run app/garden/locomotion.test.ts`

Expected: 1 test passes.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add prototype/package.json prototype/package-lock.json prototype/vitest.config.ts prototype/app/garden/locomotion.ts prototype/app/garden/locomotion.test.ts
git commit -m "test: add garden locomotion harness"
```

---

### Task 2: Implement frame-rate-independent grounded locomotion math

**Files:**
- Modify: `prototype/app/garden/locomotion.ts`
- Modify: `prototype/app/garden/locomotion.test.ts`

**Interfaces:**
- Consumes: `THREE.Vector3`, current position, target position, facing angle, speed, and frame delta.
- Produces: `LocomotionState`, `LocomotionConfig`, `stepLocomotion(state, target, delta, config)`, and `shortestAngleDelta(from, to)`.

- [ ] **Step 1: Write failing tests for acceleration, braking, and facing**

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_WALK_SPEED,
  shortestAngleDelta,
  stepLocomotion,
  type LocomotionConfig,
  type LocomotionState,
} from './locomotion';

const config: LocomotionConfig = {
  maxSpeed: 1.2,
  acceleration: 3,
  deceleration: 4,
  turnSpeed: Math.PI * 2,
  arrivalRadius: 0.12,
  brakingRadius: 0.9,
};

const idle = (): LocomotionState => ({
  position: new THREE.Vector3(0, 0, 0),
  facing: 0,
  speed: 0,
  distanceTravelled: 0,
  moving: false,
});

describe('grounded locomotion', () => {
  it('accelerates without exceeding max speed', () => {
    let state = idle();
    for (let index = 0; index < 120; index += 1) {
      state = stepLocomotion(state, new THREE.Vector3(0, 0, -10), 1 / 60, config);
    }
    expect(state.speed).toBeCloseTo(1.2, 5);
    expect(state.position.z).toBeLessThan(-1);
  });

  it('brakes to a stop inside the arrival radius', () => {
    let state = { ...idle(), speed: 1.2 };
    const target = new THREE.Vector3(0, 0, -0.5);
    for (let index = 0; index < 120; index += 1) state = stepLocomotion(state, target, 1 / 60, config);
    expect(state.position.distanceTo(target)).toBeLessThanOrEqual(config.arrivalRadius);
    expect(state.speed).toBe(0);
    expect(state.moving).toBe(false);
  });

  it('uses the shortest turn across the pi boundary', () => {
    expect(shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2, 5);
  });

  it('keeps the employee speed at four meters per second', () => {
    expect(EMPLOYEE_WALK_SPEED).toBe(4);
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --run app/garden/locomotion.test.ts`

Expected: FAIL because the types and functions are not exported.

- [ ] **Step 3: Implement the deterministic motion step**

```ts
// prototype/app/garden/locomotion.ts
import * as THREE from 'three';

export const EMPLOYEE_WALK_SPEED = 4;

export type LocomotionConfig = {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  arrivalRadius: number;
  brakingRadius: number;
};

export type LocomotionState = {
  position: THREE.Vector3;
  facing: number;
  speed: number;
  distanceTravelled: number;
  moving: boolean;
};

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function stepLocomotion(
  state: LocomotionState,
  target: THREE.Vector3,
  delta: number,
  config: LocomotionConfig,
): LocomotionState {
  const dt = Math.min(delta, 0.05);
  const offset = target.clone().sub(state.position);
  offset.y = 0;
  const distance = offset.length();
  if (distance <= config.arrivalRadius) {
    return { ...state, position: target.clone(), speed: 0, moving: false };
  }
  const desiredFacing = Math.atan2(offset.x, offset.z);
  const turn = THREE.MathUtils.clamp(
    shortestAngleDelta(state.facing, desiredFacing),
    -config.turnSpeed * dt,
    config.turnSpeed * dt,
  );
  const facing = state.facing + turn;
  const desiredSpeed = config.maxSpeed * THREE.MathUtils.smoothstep(distance, config.arrivalRadius, config.brakingRadius);
  const rate = desiredSpeed > state.speed ? config.acceleration : config.deceleration;
  const speed = THREE.MathUtils.lerp(state.speed, desiredSpeed, Math.min(1, rate * dt));
  const stepDistance = Math.min(distance, speed * dt);
  const position = state.position.clone().addScaledVector(offset.normalize(), stepDistance);
  return {
    position,
    facing,
    speed,
    distanceTravelled: state.distanceTravelled + stepDistance,
    moving: stepDistance > 0.0001,
  };
}
```

- [ ] **Step 4: Run tests and correct only mathematical discrepancies**

Run: `npm test -- --run app/garden/locomotion.test.ts`

Expected: all locomotion tests pass.

- [ ] **Step 5: Commit**

```bash
git add prototype/app/garden/locomotion.ts prototype/app/garden/locomotion.test.ts
git commit -m "feat: add grounded locomotion math"
```

---

### Task 3: Build the procedural articulated 3D Pip renderer

**Files:**
- Create: `prototype/app/garden/PipCharacter.tsx`
- Create: `prototype/app/garden/pipPose.ts`
- Create: `prototype/app/garden/pipPose.test.ts`
- Modify: `prototype/app/GardenWorld.tsx`

**Interfaces:**
- Consumes: `speed`, `distanceTravelled`, `moving`, `attentive`, and `reducedMotion`.
- Produces: `getPipPose(input: PipPoseInput): PipPose` and `<PipCharacter pose={pose} />`.

- [ ] **Step 1: Write failing pose tests**

```ts
// prototype/app/garden/pipPose.test.ts
import { describe, expect, it } from 'vitest';
import { getPipPose } from './pipPose';

describe('Pip pose', () => {
  it('alternates feet from distance travelled', () => {
    const first = getPipPose({ speed: 1, distanceTravelled: 0.1, attentive: false, reducedMotion: false });
    const second = getPipPose({ speed: 1, distanceTravelled: 0.55, attentive: false, reducedMotion: false });
    expect(Math.sign(first.leftLeg)).not.toBe(Math.sign(second.leftLeg));
    expect(first.leftLeg).toBeCloseTo(-first.rightLeg, 5);
  });

  it('removes secondary bounce in reduced motion', () => {
    const pose = getPipPose({ speed: 1, distanceTravelled: 0.3, attentive: false, reducedMotion: true });
    expect(pose.bodyLift).toBe(0);
    expect(pose.earSway).toBe(0);
  });
});
```

- [ ] **Step 2: Run the pose tests and confirm failure**

Run: `npm test -- --run app/garden/pipPose.test.ts`

Expected: FAIL because `pipPose.ts` does not exist.

- [ ] **Step 3: Implement distance-driven poses**

```ts
// prototype/app/garden/pipPose.ts
export type PipPoseInput = {
  speed: number;
  distanceTravelled: number;
  attentive: boolean;
  reducedMotion: boolean;
};

export type PipPose = {
  leftLeg: number;
  rightLeg: number;
  leftArm: number;
  rightArm: number;
  bodyLift: number;
  bodyLean: number;
  earSway: number;
};

export function getPipPose(input: PipPoseInput): PipPose {
  const stride = Math.sin(input.distanceTravelled * Math.PI * 4.5);
  const weight = Math.min(1, input.speed / 1.2);
  return {
    leftLeg: stride * 0.48 * weight,
    rightLeg: -stride * 0.48 * weight,
    leftArm: -stride * 0.2 * weight,
    rightArm: stride * 0.2 * weight,
    bodyLift: input.reducedMotion ? 0 : Math.abs(stride) * 0.025 * weight,
    bodyLean: input.speed * 0.035,
    earSway: input.reducedMotion ? 0 : stride * 0.045 * weight + (input.attentive ? 0.08 : 0),
  };
}
```

- [ ] **Step 4: Implement `PipCharacter` from original clay primitives**

Create `PipCharacter.tsx` with named refs for torso, arms, legs, feet, and listening ear. Use `sphereGeometry`, `capsuleGeometry`, and matte `meshStandardMaterial` colors already present in Pip's approved artwork. Apply `PipPose` rotations to limb groups, keep both feet near y=0, render dot eyes and three small freckle meshes, and use a curved mouth made from a small `tubeGeometry` path. Do not load either `pip-detailed.png` sprite.

The exported interface must be:

```ts
export default function PipCharacter({ pose }: { pose: PipPose }): React.JSX.Element;
```

- [ ] **Step 5: Replace only the sprite body in `GardenWorld.tsx`**

Keep the existing `Pip` state and reward routing temporarily. Replace the `<sprite>` and texture loader with `<PipCharacter pose={getPipPose(...)} />`. Rotate the root group using the locomotion facing value. Replace the flat circle with a `blobShadow` mesh that stays at y=0.025.

- [ ] **Step 6: Verify tests, lint, and build**

Run: `npm test -- --run app/garden/pipPose.test.ts app/garden/locomotion.test.ts`

Expected: all tests pass.

Run: `npm run lint && npm run build`

Expected: exit 0; no unused sprite texture code remains.

- [ ] **Step 7: Browser verification**

At `http://localhost:3000/`, observe Pip for one complete waypoint leg and verify: visible feet alternate, the torso turns toward travel, the shadow remains grounded, and no application console errors appear. Repeat with `prefers-reduced-motion: reduce` and verify foot alternation remains while bounce and ear sway stop.

- [ ] **Step 8: Commit**

```bash
git add prototype/app/garden/PipCharacter.tsx prototype/app/garden/pipPose.ts prototype/app/garden/pipPose.test.ts prototype/app/GardenWorld.tsx
git commit -m "feat: render Pip as an articulated 3D character"
```

---

### Task 4: Connect grounded locomotion and double employee speed

**Files:**
- Modify: `prototype/app/GardenWorld.tsx`
- Modify: `prototype/app/garden/locomotion.test.ts`

**Interfaces:**
- Consumes: `EMPLOYEE_WALK_SPEED`, `LocomotionState`, `LocomotionConfig`, and `stepLocomotion`.
- Produces: Pip motion driven through the tested controller; employee camera travel at 4 meters per second.

- [ ] **Step 1: Add a failing frame-rate equivalence test**

```ts
it('travels nearly the same distance at 30 and 60 fps', () => {
  const run = (delta: number, frames: number) => {
    let state = idle();
    const target = new THREE.Vector3(0, 0, -20);
    for (let index = 0; index < frames; index += 1) state = stepLocomotion(state, target, delta, config);
    return state.position.z;
  };
  expect(run(1 / 30, 60)).toBeCloseTo(run(1 / 60, 120), 1);
});
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run app/garden/locomotion.test.ts`

Expected: PASS if the controller is frame-rate independent; if it fails, change only `stepLocomotion` until both trajectories agree within 0.1 meters.

- [ ] **Step 3: Use the shared employee speed constant**

Delete `const WALK_SPEED = 2` from `GardenWorld.tsx`, import `EMPLOYEE_WALK_SPEED`, and calculate:

```ts
const frameDistance = EMPLOYEE_WALK_SPEED * Math.min(delta, 0.05);
```

- [ ] **Step 4: Route existing Pip destinations through `stepLocomotion`**

Initialize one `LocomotionState` ref at `[8.4, 0, 1.5]` and one calm configuration:

```ts
const pipMotion = useRef<LocomotionState>({
  position: new THREE.Vector3(8.4, 0, 1.5),
  facing: Math.PI,
  speed: 0,
  distanceTravelled: 0,
  moving: false,
});
const pipMotionConfig: LocomotionConfig = {
  maxSpeed: 1.2,
  acceleration: 3,
  deceleration: 4,
  turnSpeed: Math.PI * 2,
  arrivalRadius: 0.16,
  brakingRadius: 0.9,
};
```

For reward missions, copy the config with `maxSpeed: 1.65`. Each frame, call `stepLocomotion`, copy its position and facing to the root group, and pass speed/distance into `getPipPose`. Remove all three direct `position.lerp` calls.

- [ ] **Step 5: Run all automated checks**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass and both static checks exit 0.

- [ ] **Step 6: Browser movement verification**

Measure a ten-second straight employee walk and verify approximately 40 meters of unconstrained requested travel before boundaries stop the camera. Observe Pip traveling toward an ordinary waypoint and a simulated reward; verify he turns, accelerates, brakes, and arrives without sliding.

- [ ] **Step 7: Commit**

```bash
git add prototype/app/GardenWorld.tsx prototype/app/garden/locomotion.test.ts
git commit -m "feat: ground Pip movement and increase exploration speed"
```

---

### Task 5: Consume the discovery seed and clarify privacy feedback

**Files:**
- Modify: `prototype/app/page.tsx`
- Modify: `prototype/app/GardenWorld.tsx`
- Create: `prototype/app/garden/rewardState.ts`
- Create: `prototype/app/garden/rewardState.test.ts`

**Interfaces:**
- Consumes: reward stage, Before/Now view, and selected garden choice.
- Produces: `deriveGardenVisibility(input): GardenVisibility` and explicit privacy research copy.

- [ ] **Step 1: Write failing seed-visibility tests**

```ts
// prototype/app/garden/rewardState.test.ts
import { describe, expect, it } from 'vitest';
import { deriveGardenVisibility } from './rewardState';

describe('discovery seed state', () => {
  it('shows the seed before a destination is chosen', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'now', gardenChoice: null }).seedVisible).toBe(true);
  });

  it('consumes the current-state seed after a destination is chosen', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'now', gardenChoice: 'orchard' }).seedVisible).toBe(false);
  });

  it('keeps the historical seed visible in the before comparison', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'before', gardenChoice: 'orchard' }).seedVisible).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --run app/garden/rewardState.test.ts`

Expected: FAIL because `rewardState.ts` does not exist.

- [ ] **Step 3: Implement the visibility derivation**

```ts
// prototype/app/garden/rewardState.ts
export type GardenChoice = 'orchard' | 'workshop';
export type GardenView = 'before' | 'now';

export function deriveGardenVisibility({
  rewardStage,
  gardenView,
  gardenChoice,
}: {
  rewardStage: 0 | 1 | 2 | 3;
  gardenView: GardenView;
  gardenChoice: GardenChoice | null;
}) {
  return {
    starflowersVisible: rewardStage > 1 || (rewardStage === 1 && gardenView === 'now'),
    pavilionImproved: rewardStage > 2 || (rewardStage === 2 && gardenView === 'now'),
    seedVisible: rewardStage === 3 && (gardenView === 'before' || gardenChoice === null),
  };
}
```

- [ ] **Step 4: Use the derivation and improve transition motion**

Import `deriveGardenVisibility` and `GardenChoice` into `page.tsx`; remove its duplicate choice type and inline visibility booleans. In `CuriousSeed`, damp the group scale toward `0.03` and its y position toward `0.08` when hidden so the seed visibly sinks while the destination grows.

- [ ] **Step 5: Replace the privacy prompt with explicit research copy**

Use this exact prompt above the three comfort buttons:

```text
How would this proposed coworker visit feel? This is temporary research feedback only. Your choice will not enable a visit, contact anyone, or leave this prototype session.
```

Keep the existing button labels **Comfortable**, **Unsure**, and **Invasive**.

- [ ] **Step 6: Verify the current flow**

Run: `npm test && npm run lint && npm run build`

Expected: all tests and static checks pass.

In the browser, complete all three rewards, confirm each path in separate restarted sessions, and verify the seed sinks while the selected destination grows. Toggle Before and verify the discovery seed returns as historical state. Open the privacy preview and verify the new explanatory copy is visible before any response button.

- [ ] **Step 7: Commit**

```bash
git add prototype/app/page.tsx prototype/app/GardenWorld.tsx prototype/app/garden/rewardState.ts prototype/app/garden/rewardState.test.ts
git commit -m "fix: complete the seed and privacy prototype transitions"
```

---

### Task 6: Update project control documents for Increment 1

**Files:**
- Modify: `STATUS.md`
- Modify: `BACKLOG.md`
- Modify: `docs/design/garden-visual-direction.md`

**Interfaces:**
- Consumes: verified implementation results from Tasks 1–5.
- Produces: an accurate resume point and an explicit next increment.

- [ ] **Step 1: Record only verified outcomes**

Add the following completed points to `STATUS.md`, adjusting wording only if browser verification found a limitation:

```markdown
- Procedural 3D Pip locomotion pass completed: original clay character, grounded foot cycle, natural facing, acceleration, arrival braking, and reduced-motion treatment.
- Employee garden movement increased from 2 to 4 meters per second while preserving the approved 40 × 40 meter footprint and collision boundaries.
- Discovery-seed transition completed and privacy comfort feedback clarified as temporary local research input.
```

Set the resume point to the autonomous behavior increment in `docs/superpowers/plans/2026-08-27-pip-autonomy-plan.md`.

- [ ] **Step 2: Reconcile the active backlog**

Mark the 3D locomotion increment complete under CG-007 and set autonomous activity selection as the only active implementation outcome. Keep staff invitations paused.

- [ ] **Step 3: Update the visual direction**

Add a short “Procedural 3D Pip” subsection describing the approved original clay construction, grounded movement, and future renderer replacement boundary.

- [ ] **Step 4: Run final verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint exits 0, and the production build completes.

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the three control documents are modified.

- [ ] **Step 5: Commit**

```bash
git add STATUS.md BACKLOG.md docs/design/garden-visual-direction.md
git commit -m "docs: record 3D Pip locomotion increment"
```

