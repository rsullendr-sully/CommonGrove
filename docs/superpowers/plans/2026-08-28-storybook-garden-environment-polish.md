# Storybook Garden Environment Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing flat garden into the approved Soft Storybook Grove with organic terrain dressing, deterministic foliage, an enchanted pond, warm atmospheric lighting, and overt but calm magic without changing gameplay geometry or interaction behavior.

**Architecture:** Keep `GardenWorld.tsx` responsible for input, Pip, interactions, and reward state. Move presentation-only world geometry into a `StorybookGardenEnvironment` composition layer backed by deterministic layout data and pure presentation/animation helpers. Repeated foliage and motes use shared or instanced geometry, while all locomotion continues on the unchanged `y = 0` plane and existing navigation constants remain authoritative.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, React Three Fiber 9.7, Vitest 3, ESLint 9, vinext/Vite 8

**Spec:** `docs/superpowers/specs/2026-08-28-storybook-garden-environment-polish-design.md`

## Global Constraints

- Preserve the 40 × 40 meter garden, `SAFE_GARDEN_HALF_SIZE`, `SAFE_POND_RADIUS`, `GARDEN_OBSTACLES`, employee speed, Pip locomotion, first-person camera, reward logic, privacy semantics, and object coordinates.
- The navigable surface remains flat at `y = 0`; berms are visual perimeter framing outside the safe square, not walkable terrain.
- Use original primitive geometry and generated data only. Do not add downloaded textures, models, copied Sonic/Chao assets, custom GLSL, post-processing, audio, persistence, or network access.
- Do not use `Math.random()` in layout or render paths. Every repeated placement must come from checked-in deterministic data.
- Keep essential state readable without animation. With reduced motion, drifting, bobbing, rotation, and pulsing stop, but geometry, glow, color, and reward/destination distinctions remain.
- Prefer shared geometries/materials and instancing for repeated props. Do not create React state or allocate arrays, colors, vectors, geometries, or materials inside `useFrame`.
- Keep dynamic point lights local and few. Emissive materials and transparent glow meshes provide most of the magic.
- Do not move interaction roots or add new collision obstacles as part of this pass.
- Make a small commit after every completed task. Never stage root `node_modules/`, `.pnpm-store/`, or unrelated user changes.

---

### Task 1: Define and validate the deterministic environment model

**Files:**
- Create: `prototype/app/garden/environmentLayout.ts`
- Create: `prototype/app/garden/environmentLayout.test.ts`

**Interfaces:**
- Produces: `EnvironmentInstance`, `EnvironmentDisc`, `GardenCorridor`, `StorybookEnvironmentLayout`, `createStorybookEnvironmentLayout`, `validateEnvironmentLayout`, `EnvironmentPresentationInput`, `EnvironmentPresentation`, and `getEnvironmentPresentation`.
- Consumes: `GardenChoice`, `GardenPoint`, `SAFE_GARDEN_HALF_SIZE`, and `SAFE_POND_RADIUS`.

- [ ] **Step 1: Write failing deterministic-layout and presentation tests**

Create `environmentLayout.test.ts` with these cases:

```ts
import { describe, expect, it } from 'vitest';
import {
  createStorybookEnvironmentLayout,
  getEnvironmentPresentation,
  validateEnvironmentLayout,
} from './environmentLayout';

describe('storybook environment layout', () => {
  it('recreates exactly the same authored placement data', () => {
    expect(createStorybookEnvironmentLayout()).toEqual(createStorybookEnvironmentLayout());
  });

  it('keeps the approved layout inside its safety contract', () => {
    expect(validateEnvironmentLayout(createStorybookEnvironmentLayout())).toEqual([]);
  });

  it('reports duplicate ids, blocked corridors, and an escaped pond stone', () => {
    const layout = createStorybookEnvironmentLayout();
    const invalid = {
      ...layout,
      trees: [...layout.trees, { ...layout.trees[0] }],
      plantingBeds: [
        ...layout.plantingBeds,
        { id: 'blocked-spawn', center: { x: 0, z: 14 }, radius: 2 },
      ],
      pondStones: [
        ...layout.pondStones,
        { id: 'escaped-stone', position: [7.2, 0, 0], scale: [1, 1, 1], rotationY: 0, variant: 0 },
      ],
    };

    expect(validateEnvironmentLayout(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate id'),
      expect.stringContaining('blocked-spawn'),
      expect.stringContaining('escaped-stone'),
    ]));
  });
});

describe('storybook environment presentation', () => {
  it('raises only declared local accents as rewards appear', () => {
    expect(getEnvironmentPresentation({
      rewardStage: 3,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: null,
      reducedMotion: false,
    })).toMatchObject({ pondGlow: 1, sanctuaryGlow: 1.25, pavilionGlow: 1.35, starflowerGlow: 1.4 });
  });

  it.each(['orchard', 'workshop'] as const)('gives %s an equal-strength destination accent', (choice) => {
    const presentation = getEnvironmentPresentation({
      rewardStage: 3,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: choice,
      reducedMotion: false,
    });
    expect(presentation.destinationAccent).toBe(choice);
    expect(presentation.destinationGlow).toBe(1.5);
  });

  it('retains static magic but disables continuous motion when reduced motion is requested', () => {
    expect(getEnvironmentPresentation({
      rewardStage: 2,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: null,
      reducedMotion: true,
    })).toMatchObject({ moteMotion: false, rippleMotion: false, cloudMotion: false, pondGlow: 0.9 });
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `prototype`:

```powershell
npm test -- --run app/garden/environmentLayout.test.ts
```

Expected: FAIL because `environmentLayout.ts` does not exist.

- [ ] **Step 3: Implement the public types and pure presentation mapping**

Use readonly tuples and explicit variants so render components never invent placement at runtime:

```ts
import { SAFE_GARDEN_HALF_SIZE, SAFE_POND_RADIUS, type GardenPoint } from './navigation';
import type { GardenChoice } from './rewardState';

export type EnvironmentInstance = Readonly<{
  id: string;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

export type EnvironmentDisc = Readonly<{ id: string; center: GardenPoint; radius: number }>;
export type GardenCorridor = Readonly<{ id: string; start: GardenPoint; end: GardenPoint; halfWidth: number }>;

export type StorybookEnvironmentLayout = Readonly<{
  berms: readonly EnvironmentDisc[];
  plantingBeds: readonly EnvironmentDisc[];
  corridors: readonly GardenCorridor[];
  trees: readonly EnvironmentInstance[];
  shrubs: readonly EnvironmentInstance[];
  grassTufts: readonly EnvironmentInstance[];
  flowers: readonly EnvironmentInstance[];
  pondStones: readonly EnvironmentInstance[];
  reeds: readonly EnvironmentInstance[];
  motes: readonly EnvironmentInstance[];
}>;

export type EnvironmentPresentationInput = Readonly<{
  rewardStage: number;
  pavilionImproved: boolean;
  starflowersVisible: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
  reducedMotion: boolean;
}>;

export type EnvironmentPresentation = Readonly<{
  moteMotion: boolean;
  rippleMotion: boolean;
  cloudMotion: boolean;
  pondGlow: number;
  sanctuaryGlow: number;
  pavilionGlow: number;
  starflowerGlow: number;
  seedGlow: number;
  destinationGlow: number;
  destinationAccent: GardenChoice | null;
}>;

export function getEnvironmentPresentation(input: EnvironmentPresentationInput): EnvironmentPresentation {
  return {
    moteMotion: !input.reducedMotion,
    rippleMotion: !input.reducedMotion,
    cloudMotion: !input.reducedMotion,
    pondGlow: input.rewardStage >= 3 ? 1 : input.rewardStage >= 1 ? 0.9 : 0.78,
    sanctuaryGlow: input.rewardStage >= 3 ? 1.25 : 1,
    pavilionGlow: input.pavilionImproved ? 1.35 : 0.55,
    starflowerGlow: input.starflowersVisible ? 1.4 : 0.2,
    seedGlow: input.seedVisible ? 1.45 : 0.15,
    destinationGlow: input.destinationVisible ? 1.5 : 0,
    destinationAccent: input.destinationVisible,
  };
}
```

- [ ] **Step 4: Add exact authored data and validation**

`createStorybookEnvironmentLayout()` must return fresh arrays containing checked-in values. Start from the current canonical trees and add perimeter framing, pond dressing, and low planting clusters. Use at least these corridors and canonical tree entries:

```ts
const corridors: readonly GardenCorridor[] = [
  { id: 'spawn-to-pond', start: { x: 0, z: 18 }, end: { x: 0, z: 7.55 }, halfWidth: 1.35 },
  { id: 'pond-to-pavilion', start: { x: -5.8, z: -4.2 }, end: { x: -10.4, z: -9.5 }, halfWidth: 1.2 },
  { id: 'pond-east-loop', start: { x: 6.9, z: 2.5 }, end: { x: 13.5, z: 5.8 }, halfWidth: 1.15 },
  { id: 'pond-west-loop', start: { x: -6.9, z: 2.5 }, end: { x: -13.5, z: 5.8 }, halfWidth: 1.15 },
];

const trees: readonly EnvironmentInstance[] = [
  { id: 'tree-east-north', position: [11.8, 0, -9.2], scale: [1.05, 1.05, 1.05], rotationY: 0.18, variant: 0 },
  { id: 'tree-east-south', position: [14.4, 0, 5.8], scale: [0.88, 0.88, 0.88], rotationY: -0.42, variant: 1 },
  { id: 'tree-west-south', position: [-14.8, 0, 4.5], scale: [0.94, 0.94, 0.94], rotationY: 0.66, variant: 2 },
];
```

Validation rules must be pure and produce stable, human-readable strings:

- every instance/disc/corridor id is unique across the whole layout;
- berm centers remain outside `SAFE_GARDEN_HALF_SIZE` on at least one axis and inside the visible 20-meter boundary;
- planting beds stay outside the pond exclusion and do not intersect any declared corridor capsule;
- tree roots equal the three existing canonical tree obstacle centers; no new tree collision is implied;
- pond stones and reeds stay at or inside `SAFE_POND_RADIUS - 0.05` after their horizontal scale allowance;
- all other instances remain inside the visible 20-meter boundary;
- no function calls `Math.random()` or uses current time.

Use a point-to-segment distance helper for corridor clearance. Keep the helper private unless another task has a demonstrated need for it.

- [ ] **Step 5: Run the focused test and full regression suite**

Run from `prototype`:

```powershell
npm test -- --run app/garden/environmentLayout.test.ts
npm test
```

Expected: the new tests and all existing tests pass.

- [ ] **Step 6: Commit the deterministic model**

```powershell
git add prototype/app/garden/environmentLayout.ts prototype/app/garden/environmentLayout.test.ts
git commit -m "feat: define deterministic storybook garden layout"
```

---

### Task 2: Extract the existing environment behind a stable component boundary

**Files:**
- Create: `prototype/app/garden/StorybookGardenEnvironment.tsx`
- Modify: `prototype/app/GardenWorld.tsx`

**Interfaces:**
- Produces: `StorybookGardenEnvironmentProps` and `<StorybookGardenEnvironment />`.
- Consumes: the exact reward visibility props already supplied to `GardenWorldScene` and the generated grass texture.

- [ ] **Step 1: Record the green extraction baseline**

Run from `prototype` before moving code:

```powershell
npm test
npm run lint
npm run build
```

Expected: all existing checks pass. If they do not, stop and distinguish the pre-existing failure from this task before editing.

- [ ] **Step 2: Create the explicit environment prop contract**

Use this interface; do not pass Pip refs, input refs, reducers, callbacks, interaction targets, or navigation state into the environment:

```ts
import type { Texture } from 'three';
import type { GardenChoice } from './rewardState';

export type StorybookGardenEnvironmentProps = Readonly<{
  grassTexture: Texture;
  rewardStage: number;
  starflowersVisible: boolean;
  pavilionImproved: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
  reducedMotion: boolean;
}>;
```

`StorybookGardenEnvironment` calls `createStorybookEnvironmentLayout()` once with `useMemo` and derives `getEnvironmentPresentation(...)` from its props. It owns only scene color/fog/lights and environment geometry.

- [ ] **Step 3: Move presentation components without intentional visual changes**

Move these existing functions and their static data from `GardenWorld.tsx` into `StorybookGardenEnvironment.tsx` first:

- `HedgeBoundary`, `BoundaryPlanting`, `GardenPaths`, `SkyClouds`
- `CentralPond`, `RockBackdrop`, `SpringSanctuary`, `Pavilion`
- `GardenTree`, `FlowerPatch`, `StarflowerPatch`, `CuriousSeed`, `ChoiceDestination`
- `rockData`

Also move the background color, fog, hemisphere/key lights, ground planes, hedge placement, static flower patch, and environment-only reward objects. Preserve current coordinates and materials during this extraction; later tasks deliberately change their look.

The replacement inside `GardenWorldScene` should be one call before gameplay objects:

```tsx
<StorybookGardenEnvironment
  grassTexture={grassTexture}
  rewardStage={rewardStage}
  starflowersVisible={starflowersVisible}
  pavilionImproved={pavilionImproved}
  seedVisible={seedVisible}
  destinationVisible={destinationVisible}
  reducedMotion={reducedMotion}
/>
```

Keep `<FrameCadence />`, `<GardenSnack />`, `<GardenToy />`, `<Pip />`, `<FirstPersonControls />`, and `<InteractionTargetTracker />` in `GardenWorldScene`.

- [ ] **Step 4: Verify the behavior-preserving extraction**

Run from `prototype`:

```powershell
npm test
npm run lint
npm run build
```

Expected: all checks pass with no change to test counts other than Task 1 additions.

Browser check at `http://localhost:3000/`: load the garden, dismiss or minimize the journal enough to inspect the view, walk around the pond, focus Pip/snack/toy, and verify the scene still looks and behaves as it did before the extraction. Check the console for new errors.

- [ ] **Step 5: Commit the extraction**

```powershell
git add prototype/app/GardenWorld.tsx prototype/app/garden/StorybookGardenEnvironment.tsx
git commit -m "refactor: isolate garden environment rendering"
```

---

### Task 3: Build storybook terrain, paths, and deterministic foliage

**Files:**
- Create: `prototype/app/garden/StorybookTerrain.tsx`
- Create: `prototype/app/garden/StorybookFoliage.tsx`
- Modify: `prototype/app/garden/StorybookGardenEnvironment.tsx`
- Modify: `prototype/app/garden/environmentLayout.ts`
- Modify: `prototype/app/garden/environmentLayout.test.ts`

**Interfaces:**
- Produces: `<StorybookTerrain grassTexture layout />` and `<StorybookFoliage layout />`.
- Consumes: only `StorybookEnvironmentLayout` plus `Texture` for the terrain.

- [ ] **Step 1: Add failing density, identity, and corridor tests**

Extend `environmentLayout.test.ts` before render work:

```ts
it('provides layered deterministic planting without turning it into collision geometry', () => {
  const layout = createStorybookEnvironmentLayout();
  expect(layout.trees).toHaveLength(3);
  expect(layout.shrubs.length).toBeGreaterThanOrEqual(28);
  expect(layout.grassTufts.length).toBeGreaterThanOrEqual(72);
  expect(layout.flowers.length).toBeGreaterThanOrEqual(36);
  expect(layout.berms.length).toBeGreaterThanOrEqual(6);
  expect(layout.plantingBeds.length).toBeGreaterThanOrEqual(8);
  expect(new Set([
    ...layout.shrubs,
    ...layout.grassTufts,
    ...layout.flowers,
  ].map(({ id }) => id)).size).toBe(layout.shrubs.length + layout.grassTufts.length + layout.flowers.length);
  expect(validateEnvironmentLayout(layout)).toEqual([]);
});
```

Run:

```powershell
npm test -- --run app/garden/environmentLayout.test.ts
```

Expected: FAIL until the checked-in layout reaches the required density while remaining valid.

- [ ] **Step 2: Complete deterministic terrain and foliage placement**

Populate the arrays with explicit data or a fixed seeded integer generator invoked only by `createStorybookEnvironmentLayout`. If a generator is used, define and test it locally; it must accept a numeric seed and never touch global randomness. Favor authored clusters around these zones:

- west pavilion framing, outside `pond-to-pavilion`;
- east and west pond banks, inside the pond exclusion only for reeds/shore stones;
- foreground corners, leaving `spawn-to-pond` open;
- back sanctuary shoulders, without expanding the existing rock obstacle;
- boundary pockets that disguise the square edge.

Use `variant` to select from a small fixed palette/shape set. Instance roots remain at `y = 0`; only child geometry changes height.

- [ ] **Step 3: Implement `StorybookTerrain`**

Render:

- the unchanged 120 × 120 outer plane at `y = -0.26`;
- the unchanged 40 × 40 playable plane at `y = 0` using `grassTexture`;
- six or more flattened low-poly berm meshes centered outside the safe square;
- irregular low planting-bed discs or overlapping ellipses from `layout.plantingBeds`;
- warm, varied stepping stones following the current authored routes;
- boundary hedge masses as staggered rounded clusters instead of four perfectly uniform boxes.

Keep berm/bed tops visually below `y = 0.55`; they are scenery, not platforms. Reuse module-level geometries/material parameters and dispose only resources created by the component.

- [ ] **Step 4: Implement `StorybookFoliage` with shared geometry**

Use one `instancedMesh` per repeated family: shrubs, grass tufts, and flower heads. Populate instance matrices in `useLayoutEffect` or `useMemo` from `layout`; mark `instanceMatrix.needsUpdate = true` once after writes. Do not animate individual instances.

Trees remain three readable component groups rooted at the canonical obstacle centers. Each tree has:

- a tapered trunk;
- four to six asymmetric rounded canopy clusters selected by `variant`;
- one root-stone cluster inside its existing obstacle radius;
- coordinated leaf colors `#426b4c`, `#587d50`, `#72905c`, and luminous tip accents no brighter than emissive intensity `0.25` at rest.

Use this matrix pattern instead of allocating in `useFrame`:

```tsx
const matrix = useMemo(() => new THREE.Matrix4(), []);
const position = useMemo(() => new THREE.Vector3(), []);
const quaternion = useMemo(() => new THREE.Quaternion(), []);
const scale = useMemo(() => new THREE.Vector3(), []);

useLayoutEffect(() => {
  instances.forEach((item, index) => {
    position.set(...item.position);
    quaternion.setFromAxisAngle(UP, item.rotationY);
    scale.set(...item.scale);
    matrix.compose(position, quaternion, scale);
    mesh.current?.setMatrixAt(index, matrix);
  });
  if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
}, [instances, matrix, position, quaternion, scale]);
```

- [ ] **Step 5: Replace the extracted ground, path, boundary, tree, and ordinary flower rendering**

In `StorybookGardenEnvironment`, render the two new components and remove the superseded extracted helpers. Do not remove reward flowers, seed, destination, pond, pavilion, sanctuary, or rock backdrop yet.

- [ ] **Step 6: Verify terrain and foliage**

Run from `prototype`:

```powershell
npm test -- --run app/garden/environmentLayout.test.ts
npm test
npm run lint
npm run build
```

Expected: all checks pass.

Browser checks: from the spawn view, the central pond, Pip, pavilion, and sanctuary remain unobscured. Walk both sides of every canonical tree, the full pond loop, the pavilion path, and the snack/toy locations. No visible raised surface should appear walkable while blocking movement, and no foliage should cover the reticle prompt at interaction distance.

- [ ] **Step 7: Commit terrain and foliage**

```powershell
git add prototype/app/garden/environmentLayout.ts prototype/app/garden/environmentLayout.test.ts prototype/app/garden/StorybookTerrain.tsx prototype/app/garden/StorybookFoliage.tsx prototype/app/garden/StorybookGardenEnvironment.tsx
git commit -m "feat: layer storybook terrain and foliage"
```

---

### Task 4: Replace the procedural disc with an enchanted organic pond

**Files:**
- Create: `prototype/app/garden/environmentMotion.ts`
- Create: `prototype/app/garden/environmentMotion.test.ts`
- Create: `prototype/app/garden/EnchantedPond.tsx`
- Modify: `prototype/app/garden/StorybookGardenEnvironment.tsx`
- Modify: `prototype/app/garden/environmentLayout.ts`
- Modify: `prototype/app/garden/environmentLayout.test.ts`

**Interfaces:**
- Produces: `getPondMotionFrame`, `PondMotionFrame`, and `<EnchantedPond layout presentation />`.
- Consumes: `pondStones`, `reeds`, and the pond/reduced-motion fields of `EnvironmentPresentation`.

- [ ] **Step 1: Write failing pure pond-motion tests**

Create `environmentMotion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPondMotionFrame } from './environmentMotion';

describe('enchanted pond motion', () => {
  it('returns bounded calm motion', () => {
    const frame = getPondMotionFrame(12.5, true);
    expect(frame.rippleRotation).toBeGreaterThanOrEqual(0);
    expect(frame.rippleRotation).toBeLessThan(Math.PI * 2);
    expect(frame.highlightOffset).toBeGreaterThanOrEqual(-0.08);
    expect(frame.highlightOffset).toBeLessThanOrEqual(0.08);
    expect(frame.glowPulse).toBeGreaterThanOrEqual(0.92);
    expect(frame.glowPulse).toBeLessThanOrEqual(1.08);
  });

  it('returns the exact static frame for reduced motion', () => {
    expect(getPondMotionFrame(999, false)).toEqual({
      rippleRotation: 0,
      highlightOffset: 0,
      glowPulse: 1,
    });
  });
});
```

The second argument is `motionEnabled`, not `reducedMotion`, to avoid inverted call sites.

- [ ] **Step 2: Run and confirm failure**

Run:

```powershell
npm test -- --run app/garden/environmentMotion.test.ts
```

Expected: FAIL because `environmentMotion.ts` does not exist.

- [ ] **Step 3: Implement the pure pond frame**

```ts
export type PondMotionFrame = Readonly<{
  rippleRotation: number;
  highlightOffset: number;
  glowPulse: number;
}>;

export function getPondMotionFrame(elapsedSeconds: number, motionEnabled: boolean): PondMotionFrame {
  if (!motionEnabled) return { rippleRotation: 0, highlightOffset: 0, glowPulse: 1 };
  return {
    rippleRotation: (elapsedSeconds * 0.045) % (Math.PI * 2),
    highlightOffset: Math.sin(elapsedSeconds * 0.38) * 0.08,
    glowPulse: 1 + Math.sin(elapsedSeconds * 0.8) * 0.08,
  };
}
```

- [ ] **Step 4: Complete the pond-edge layout and safety test**

Ensure the deterministic layout has at least 24 varied pond stones and 18 reed instances. Extend the test:

```ts
it('keeps all pond dressing inside the canonical safety exclusion', () => {
  const layout = createStorybookEnvironmentLayout();
  expect(layout.pondStones.length).toBeGreaterThanOrEqual(24);
  expect(layout.reeds.length).toBeGreaterThanOrEqual(18);
  expect(validateEnvironmentLayout(layout)).toEqual([]);
});
```

The visible stone ring may be irregular, but no stone/reed horizontal extent may exceed `SAFE_POND_RADIUS - 0.05`.

- [ ] **Step 5: Implement the pond from layered primitive geometry**

`EnchantedPond` renders, from bottom to top:

1. dark water/earth base at `y = -0.16`, radius about `6.35`;
2. translucent deep-water disc at `y = 0.025`, radius about `5.9`, color `#3f858c`;
3. translucent sky surface at `y = 0.055`, radius about `5.78`, color `#78c6c3`, opacity about `0.72`;
4. two off-center translucent highlight patches that use `highlightOffset`;
5. three fine emissive ripple rings that share one rotating group;
6. a soft center glow disc whose opacity uses `presentation.pondGlow * frame.glowPulse`;
7. deterministic shoreline stones, reeds, broad leaves, and low bank flowers.

Use one `useFrame` for the whole pond. Write only to existing refs and material fields; allocate nothing in that callback. For reduced motion, call `getPondMotionFrame(elapsed, presentation.rippleMotion)` and retain the static glow.

Do not add a collision mesh, custom shader, or new light for every stone/plant. One subtle cyan point light near the center is the maximum pond dynamic light.

- [ ] **Step 6: Replace `CentralPond` and verify**

Remove the extracted `CentralPond`, render `<EnchantedPond layout={layout} presentation={presentation} />`, and run:

```powershell
npm test -- --run app/garden/environmentMotion.test.ts app/garden/environmentLayout.test.ts
npm test
npm run lint
npm run build
```

Expected: all checks pass.

Browser checks: walk the full pond perimeter, looking down at near-bank stones and across the water. The surface must not z-fight, appear opaque black, cross the invisible safety edge, or suggest that the employee can enter it. Toggle OS/browser reduced motion and confirm the ripples stop while the luminous pond remains readable.

- [ ] **Step 7: Commit the enchanted pond**

```powershell
git add prototype/app/garden/environmentMotion.ts prototype/app/garden/environmentMotion.test.ts prototype/app/garden/EnchantedPond.tsx prototype/app/garden/environmentLayout.ts prototype/app/garden/environmentLayout.test.ts prototype/app/garden/StorybookGardenEnvironment.tsx
git commit -m "feat: create an enchanted organic pond"
```

---

### Task 5: Add warm lighting, pooled motes, clouds, and state-driven magic

**Files:**
- Create: `prototype/app/garden/MagicalAtmosphere.tsx`
- Modify: `prototype/app/garden/environmentMotion.ts`
- Modify: `prototype/app/garden/environmentMotion.test.ts`
- Modify: `prototype/app/garden/StorybookGardenEnvironment.tsx`

**Interfaces:**
- Produces: `getAtmosphereMotionFrame`, `AtmosphereMotionFrame`, and `<MagicalAtmosphere layout presentation />`.
- Consumes: deterministic mote positions and `EnvironmentPresentation`.

- [ ] **Step 1: Add failing atmosphere and reduced-motion tests**

Append to `environmentMotion.test.ts`:

```ts
import { getAtmosphereMotionFrame, getPondMotionFrame } from './environmentMotion';

describe('magical atmosphere motion', () => {
  it('keeps cloud and mote offsets small and repeatable', () => {
    expect(getAtmosphereMotionFrame(8, true)).toEqual(getAtmosphereMotionFrame(8, true));
    const frame = getAtmosphereMotionFrame(8, true);
    expect(Math.abs(frame.moteDriftX)).toBeLessThanOrEqual(0.18);
    expect(Math.abs(frame.moteDriftY)).toBeLessThanOrEqual(0.12);
    expect(Math.abs(frame.cloudDriftX)).toBeLessThanOrEqual(1.2);
  });

  it('freezes ambient movement while retaining full static opacity', () => {
    expect(getAtmosphereMotionFrame(8, false)).toEqual({
      moteDriftX: 0,
      moteDriftY: 0,
      cloudDriftX: 0,
      moteOpacity: 1,
    });
  });
});
```

Run:

```powershell
npm test -- --run app/garden/environmentMotion.test.ts
```

Expected: FAIL because `getAtmosphereMotionFrame` is not exported.

- [ ] **Step 2: Implement the pure atmosphere frame**

```ts
export type AtmosphereMotionFrame = Readonly<{
  moteDriftX: number;
  moteDriftY: number;
  cloudDriftX: number;
  moteOpacity: number;
}>;

export function getAtmosphereMotionFrame(elapsedSeconds: number, motionEnabled: boolean): AtmosphereMotionFrame {
  if (!motionEnabled) return { moteDriftX: 0, moteDriftY: 0, cloudDriftX: 0, moteOpacity: 1 };
  return {
    moteDriftX: Math.sin(elapsedSeconds * 0.23) * 0.18,
    moteDriftY: Math.sin(elapsedSeconds * 0.41) * 0.12,
    cloudDriftX: Math.sin(elapsedSeconds * 0.035) * 1.2,
    moteOpacity: 0.82 + Math.sin(elapsedSeconds * 0.7) * 0.12,
  };
}
```

- [ ] **Step 3: Implement the atmosphere with one pooled points system**

`MagicalAtmosphere` renders:

- background `#b9e2df`;
- fog `#c6ddd1`, near `34`, far `72`;
- hemisphere light sky `#e5f6ef`, ground `#4d6646`, intensity about `1.45`;
- one warm directional key at `[13, 24, 10]`, color `#ffe4a8`, intensity about `2.3`, with shadows bounded to the playable garden;
- three layered cloud groups using shared puff geometry/material;
- one `THREE.Points` mote field created from `layout.motes`, with no more than 96 points;
- no more than four simultaneously active local point lights across pond, sanctuary, pavilion, and destination.

Create the points `BufferGeometry` once from the deterministic positions. One `useFrame` applies the shared cloud/mote group offsets and opacity from `getAtmosphereMotionFrame`. With motion disabled, the same points remain visible at authored positions.

Set the directional shadow camera bounds to approximately ±24 meters and use a 1024 or 2048 shadow map only after browser comparison. If the current renderer does not enable shadows, enable them on `<Canvas shadows>` and verify Pip/interaction performance before keeping them.

- [ ] **Step 4: Apply local state-driven accents**

Use `EnvironmentPresentation` as the only mapping from product state to environment effects:

- sanctuary emissive intensity = `presentation.sanctuaryGlow`;
- pavilion lantern emissive intensity = `presentation.pavilionGlow`;
- reward flowers and seed use `starflowerGlow` and `seedGlow` while their existing appearance transitions remain;
- destination accent uses orchard colors `#d7b85a`/`#7fa65b` or workshop colors `#8ca5cf`/`#c58b65`, both at `presentation.destinationGlow`;
- do not use a global flash or change visibility semantics.

Remove any superseded standalone sky/cloud/light code from `StorybookGardenEnvironment`, then render `<MagicalAtmosphere layout={layout} presentation={presentation} />` once.

- [ ] **Step 5: Verify atmosphere, rewards, and motion preference**

Run from `prototype`:

```powershell
npm test -- --run app/garden/environmentMotion.test.ts app/garden/environmentLayout.test.ts
npm test
npm run lint
npm run build
```

Expected: all checks pass.

Browser checks:

- compare spawn view, near pond, behind pond, pavilion, and both garden sides;
- verify Pip’s silhouette and interaction prompt remain easy to find in sun and shade;
- step through every reward stage and confirm pond, starflowers, pavilion, seed, and chosen destination change locally;
- verify orchard and workshop accents have equal visual strength;
- enable reduced motion and confirm clouds, motes, pond ripples, seed bob/rotation, and ambient pulses stop while all states remain visible;
- watch the console and performance monitor while walking and interacting; reduce mote/foliage density before accepting sustained frame stalls.

- [ ] **Step 6: Commit lighting and overt magic**

```powershell
git add prototype/app/garden/MagicalAtmosphere.tsx prototype/app/garden/environmentMotion.ts prototype/app/garden/environmentMotion.test.ts prototype/app/garden/StorybookGardenEnvironment.tsx
git commit -m "feat: add magical garden atmosphere"
```

---

### Task 6: Complete integrated regression, visual review, and project documentation

**Files:**
- Modify only if evidence requires it: `prototype/app/GardenWorld.tsx`
- Modify: `docs/design/garden-visual-direction.md`
- Modify: `STATUS.md`
- Modify: `BACKLOG.md`

**Interfaces:**
- No new runtime interface. This task verifies the approved slice and records only results actually observed.

- [ ] **Step 1: Inspect the final diff before testing**

Run from repository root:

```powershell
git status --short
git diff --stat
git diff --check
git diff -- prototype/app/GardenWorld.tsx prototype/app/garden
```

Expected: no whitespace errors, no generated/cache directories staged, no interaction or navigation constants changed, and no unplanned assets/dependencies added.

- [ ] **Step 2: Run the complete automated gate**

Run from `prototype`:

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint exits 0, and the production build exits 0. Record the actual test count and any non-failing third-party warning; do not call a warning fixed unless it was addressed and rerun.

- [ ] **Step 3: Perform the full browser route and interaction regression**

At `http://localhost:3000/`:

1. Load a fresh session and inspect the first-person spawn composition.
2. Walk clockwise and counter-clockwise around the pond.
3. Visit the pavilion, sanctuary, all three canonical trees, starflower patch, seed/destination location, snack, and toy.
4. Greet, pet, carry, and place Pip; offer the snack and toy; verify prompts stay legible.
5. Complete the reward sequence and inspect every local magical change.
6. Inspect both orchard and workshop destination outcomes, resetting only through the app’s existing safe flow.
7. Repeat representative views with reduced motion enabled.
8. Inspect the browser console for application errors.

Expected: no visual collision, unreachable object, obscured landmark, interaction regression, z-fighting, clipped boundary, new console error, or essential state conveyed only by motion.

- [ ] **Step 4: Compare against every acceptance criterion**

Use the spec’s Acceptance Criteria as a literal checklist. If an item fails, return to the smallest owning task, write or extend a regression test when possible, fix it, and rerun the complete automated and browser gates. Do not waive failed criteria as “polish.”

- [ ] **Step 5: Update documentation with verified facts only**

Update `docs/design/garden-visual-direction.md` to record the implemented Soft Storybook Grove choices and the unchanged navigation contract. Update `STATUS.md` with the actual automated/browser results and mark the environment slice complete only after owner visual approval. Update `BACKLOG.md` by checking off only delivered environment items; leave GLTF assets, custom shaders, post-processing, audio, terrain height-following, and prototype distribution deferred.

- [ ] **Step 6: Run final checks after documentation edits**

From repository root and `prototype` as appropriate:

```powershell
git diff --check
cd prototype
npm test
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 7: Commit the verified slice**

```powershell
git add docs/design/garden-visual-direction.md STATUS.md BACKLOG.md
git commit -m "docs: record storybook garden polish verification"
```

Do not stage unrelated files. If `GardenWorld.tsx` required a final evidence-driven correction, include it and its targeted regression test in a separate fix commit before the documentation commit.

- [ ] **Step 8: Request final owner visual approval**

Present the running garden to the owner and summarize the verified checks. Do not describe the prototype as ready to show staff or distribute; that decision remains explicitly outside this environment-polish slice.
