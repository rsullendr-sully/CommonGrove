# Walkable Stones and Accessible Reading Pavilion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the stepping-stone paths visually walkable and allow both the employee and Pip to enter the reading pavilion without clipping through solid scenery.

**Architecture:** A new `pavilionLayout.ts` module is the single source of truth for the pavilion center, walkable reading point, visual surfaces, posts, benches, and their circular collision footprints. Existing first-person controls and Pip routing continue to share `GARDEN_OBSTACLES`; the scene consumes the same layout data so visible geometry and navigation agree. Stepping stones remain deliberately absent from collision data and are lowered close to the canonical `y = 0` walking plane.

**Tech Stack:** TypeScript 5.9, React 19, Three.js 0.185, React Three Fiber 9, Vitest 3

**Spec:** `docs/superpowers/specs/2026-08-30-walkable-stones-accessible-reading-pavilion-design.md`

## Global Constraints

- The garden's canonical walking surface remains `y = 0`.
- Stepping stones are walkable path markers and must not be added to `GARDEN_OBSTACLES`.
- The pavilion front approach, threshold, center floor, and reading point remain unobstructed.
- Both `FirstPersonControls` and Pip routing continue to consume the same `GARDEN_OBSTACLES` array.
- Do not add terrain height-following, jumping, slopes, rigid-body physics, or a navmesh.
- Do not change pond or boundary exclusions, movement speed, Pip locomotion animation, rewards, or privacy behavior.
- The broader texture overhaul is outside this plan.

---

### Task 1: Accessible pavilion layout, navigation, and geometry

**Files:**
- Create: `prototype/app/garden/pavilionLayout.ts`
- Create: `prototype/app/garden/pavilionLayout.test.ts`
- Modify: `prototype/app/garden/navigation.ts:1-30`
- Modify: `prototype/app/garden/navigation.test.ts:1-175`
- Modify: `prototype/app/GardenWorld.tsx:1-265`
- Modify: `prototype/app/garden/StorybookGardenEnvironment.tsx:140-235`

**Interfaces:**
- Produces: `PAVILION_CENTER`, `PAVILION_LOCAL_POSTS`, `PAVILION_LOCAL_BENCHES`, `PAVILION_READING_POINT`, `PAVILION_OBSTACLES`, and `PAVILION_SURFACE`.
- `PAVILION_OBSTACLES` is structurally compatible with `GardenObstacle[]` without importing `navigation.ts`, avoiding a circular dependency.
- `GardenWorld.tsx` consumes `PAVILION_READING_POINT` for the ordinary pavilion interest and the second reward mission.
- `StorybookGardenEnvironment.tsx` consumes the same local positions and surface profile used to derive collision geometry.

- [ ] **Step 1: Write failing accessibility tests**

Add these behavior tests to `navigation.test.ts`, importing `PAVILION_OBSTACLES` and `PAVILION_READING_POINT` from the not-yet-created `pavilionLayout.ts`:

```ts
it('keeps the pavilion approach and reading point open while blocking its structures', () => {
  const frontApproach = { x: -12.2, z: -8.2 };

  expect(isSafeGardenPoint(frontApproach, GARDEN_OBSTACLES)).toBe(true);
  expect(isSafeGardenPoint(PAVILION_READING_POINT, GARDEN_OBSTACLES)).toBe(true);
  for (const obstacle of PAVILION_OBSTACLES) {
    expect(isSafeGardenPoint(obstacle, GARDEN_OBSTACLES)).toBe(false);
  }
});

it('routes Pip through the pavilion entrance to the reading point', () => {
  const start = { x: -8.1, z: -7.5 };
  const route = createSafeGardenRoute(start, PAVILION_READING_POINT, GARDEN_OBSTACLES);

  expect(route.at(-1)).toEqual(PAVILION_READING_POINT);
  expectSafeRoute(start, route, GARDEN_OBSTACLES);
});
```

Update the existing reward-two and ordinary-interest expectations to use `PAVILION_READING_POINT` instead of `{ x: -8.65, z: -8.1 }`.

Create `pavilionLayout.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { PAVILION_OBSTACLES, PAVILION_READING_POINT, PAVILION_SURFACE } from './pavilionLayout';

describe('pavilion layout', () => {
  it('keeps the reading point clear of every pavilion structure', () => {
    for (const obstacle of PAVILION_OBSTACLES) {
      expect(Math.hypot(
        PAVILION_READING_POINT.x - obstacle.x,
        PAVILION_READING_POINT.z - obstacle.z,
      )).toBeGreaterThanOrEqual(obstacle.radius + 0.35);
    }
  });

  it('uses a shallow deck reached by four small visual rises', () => {
    const stepTops = PAVILION_SURFACE.approachSteps.map(({ centerY, height }) => centerY + height / 2);
    const deckTop = PAVILION_SURFACE.deck.centerY + PAVILION_SURFACE.deck.height / 2;

    expect(stepTops).toEqual([0.04, 0.08, 0.12, 0.16]);
    expect(deckTop).toBe(0.16);
    expect(Math.max(...stepTops.map((top, index) => top - (stepTops[index - 1] ?? 0)))).toBeLessThanOrEqual(0.04);
  });
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run from `prototype`:

```powershell
pnpm test -- app/garden/pavilionLayout.test.ts app/garden/navigation.test.ts
```

Expected: FAIL because `./pavilionLayout` and its exports do not exist.

- [ ] **Step 3: Add the shared pavilion layout**

Create `pavilionLayout.ts` with these authored values:

```ts
export const PAVILION_CENTER = { x: -12.2, z: -12.4 } as const;

export const PAVILION_LOCAL_POSTS = [
  { x: -2, z: -2 }, { x: 2, z: -2 },
  { x: -2, z: 2 }, { x: 2, z: 2 },
] as const;

export const PAVILION_LOCAL_BENCHES = [
  { x: -1.9, z: 0.15 }, { x: 1.9, z: 0.15 },
] as const;

export const PAVILION_READING_POINT = {
  x: PAVILION_CENTER.x,
  z: PAVILION_CENTER.z + 0.55,
} as const;

const localObstacle = (x: number, z: number, radius: number) => ({
  x: PAVILION_CENTER.x + x,
  z: PAVILION_CENTER.z + z,
  radius,
});

export const PAVILION_OBSTACLES = [
  ...PAVILION_LOCAL_POSTS.map(({ x, z }) => localObstacle(x, z, 0.45)),
  ...PAVILION_LOCAL_BENCHES.map(({ x, z }) => localObstacle(x, z, 0.62)),
  localObstacle(-1.05, -1.55, 0.52),
  localObstacle(0, -1.55, 0.52),
  localObstacle(1.05, -1.55, 0.52),
] as const;

export const PAVILION_SURFACE = {
  deck: { centerY: 0.08, height: 0.16, radiusTop: 3.1, radiusBottom: 3.2 },
  approachSteps: [
    { z: 4.2, centerY: 0.02, height: 0.04, width: 2.6, depth: 0.62 },
    { z: 3.82, centerY: 0.04, height: 0.08, width: 2.6, depth: 0.62 },
    { z: 3.44, centerY: 0.06, height: 0.12, width: 2.6, depth: 0.62 },
    { z: 3.06, centerY: 0.08, height: 0.16, width: 2.6, depth: 0.62 },
  ],
} as const;
```

- [ ] **Step 4: Replace the monolithic collider and target the reading point**

In `navigation.ts`, import `PAVILION_OBSTACLES` and replace only `{ x: -12.2, z: -12.4, radius: 3.2 }` with `...PAVILION_OBSTACLES`. Leave the pond, sanctuary, tree obstacles, boundary, and scenery clearance unchanged.

In `GardenWorld.tsx`, import `PAVILION_READING_POINT`, replace the `pavilion` interest position with `{ ...PAVILION_READING_POINT }`, and use `{ ...PAVILION_READING_POINT }` as the reward-stage-two mission target.

- [ ] **Step 5: Rebuild the pavilion from the shared layout**

In `StorybookGardenEnvironment.tsx`, import `PAVILION_CENTER`, `PAVILION_LOCAL_BENCHES`, `PAVILION_LOCAL_POSTS`, and `PAVILION_SURFACE`, then make these exact changes:

- Set the root group to `[PAVILION_CENTER.x, 0, PAVILION_CENTER.z]`.
- Render the deck from `PAVILION_SURFACE.deck` with cylinder args `[radiusTop, radiusBottom, height, 12]` and `position.y = centerY`.
- Render approach steps from `PAVILION_SURFACE.approachSteps` with box args `[width, height, depth]` and positions `[0, centerY, z]`.
- Render posts from `PAVILION_LOCAL_POSTS` at `[x, 2.66, z]` with height `5` so their bottoms meet the `0.16`-meter deck top.
- Place the roof at `y = 5.31`.
- Replace the central bench with two side benches from `PAVILION_LOCAL_BENCHES`, each at `[x, 0.385, z]` with box args `[0.65, 0.45, 2.1]`.
- Place the improved-state orb at `y = 2.86`, bookshelf center at `y = 1.185`, books at `y = 1.32`, lantern groups at `y = 2.71`, and point light at `y = 2.86`.
- Keep reward-driven scale animation, glow values, colors, materials, and reduced-motion behavior unchanged.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run from `prototype`:

```powershell
pnpm test -- app/garden/pavilionLayout.test.ts app/garden/navigation.test.ts app/garden/usePipBehavior.test.ts app/garden/locomotion.test.ts app/garden/environmentLayout.test.ts
```

Expected: all selected test files pass with no warnings.

- [ ] **Step 7: Run the full suite, lint, and commit**

Run from `prototype`:

```powershell
pnpm test
pnpm lint
```

Expected: all tests pass with no warnings and lint exits `0`. Then commit only the Task 1 files:

```powershell
git add prototype/app/garden/pavilionLayout.ts prototype/app/garden/pavilionLayout.test.ts prototype/app/garden/navigation.ts prototype/app/garden/navigation.test.ts prototype/app/GardenWorld.tsx prototype/app/garden/StorybookGardenEnvironment.tsx
git commit -m "fix: make the reading pavilion accessible"
```

---

### Task 2: Inset walkable stepping stones and integrated verification

**Files:**
- Create: `prototype/app/garden/StorybookTerrain.test.ts`
- Modify: `prototype/app/garden/StorybookTerrain.tsx:15-40,118-130,183-210`

**Interfaces:**
- Produces: exported `STEPPING_STONE_HEIGHT` and `createSteppingStones()` used by the component and its real-data test.
- The existing `SteppingStone` records retain `id`, `position`, `scale`, `rotationY`, and `variant`.
- No navigation module consumes stepping-stone data.

- [ ] **Step 1: Write the failing embedded-stone test**

Create `StorybookTerrain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { GardenCorridor } from './environmentLayout';
import { createSteppingStones, STEPPING_STONE_HEIGHT } from './StorybookTerrain';

describe('storybook stepping stones', () => {
  it('keeps every path stone top within three centimeters of walkable ground', () => {
    const corridor: GardenCorridor = {
      id: 'spawn-to-pond',
      start: { x: 0, z: 17 },
      end: { x: 0, z: 7.7 },
      halfWidth: 1.35,
    };

    const stones = createSteppingStones([corridor]);

    expect(stones).toHaveLength(5);
    for (const stone of stones) {
      const top = stone.position[1] + (STEPPING_STONE_HEIGHT * stone.scale[1]) / 2;
      expect(top).toBeLessThanOrEqual(0.03);
    }
  });
});
```

This test catches a regression that raises the actual rendered stone cylinders enough for Pip's ground-level walk to intersect them.

- [ ] **Step 2: Run the focused test and verify RED**

Run from `prototype`:

```powershell
pnpm test -- app/garden/StorybookTerrain.test.ts
```

Expected: FAIL because `createSteppingStones` and `STEPPING_STONE_HEIGHT` are not exported.

- [ ] **Step 3: Lower the rendered stones**

In `StorybookTerrain.tsx`:

- Export `STEPPING_STONE_HEIGHT = 0.06` and construct `STONE_GEOMETRY` with that height.
- Export the `SteppingStone` type and `createSteppingStones()`.
- Change every stone's `position[1]` to `-0.005`, keeping the existing deterministic horizontal placement, rotation, variant, and y scale.
- Keep stones absent from all collision arrays.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run from `prototype`:

```powershell
pnpm test -- app/garden/StorybookTerrain.test.ts app/garden/navigation.test.ts app/garden/pavilionLayout.test.ts
```

Expected: all selected test files pass with no warnings.

- [ ] **Step 5: Run complete automated verification**

Run from `prototype`:

```powershell
pnpm test
pnpm lint
pnpm build
git diff --check
```

Expected: all tests pass, lint reports no errors, the production build exits `0`, and `git diff --check` prints nothing.

- [ ] **Step 6: Verify behavior in the browser**

At `http://localhost:3000/`:

- Walk over approach stones from two angles and confirm they read as inset path markers without foot-level clipping.
- Walk through the pavilion's front steps, threshold, center aisle, and reading point without invisible blocking.
- Confirm the camera cannot pass through posts, side benches, or the rear bookshelf.
- Let Pip visit or route him toward the pavilion and confirm he reaches the reading point without crossing a structural obstacle.
- Confirm the browser console contains no new application errors.

- [ ] **Step 7: Commit the stone work**

```powershell
git add prototype/app/garden/StorybookTerrain.tsx prototype/app/garden/StorybookTerrain.test.ts
git commit -m "fix: inset garden stepping stones"
```
