# Garden Visual Coherence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current functional garden into a visually coherent, warm companion sanctuary without changing gameplay geometry, behavior, or product flow.

**Architecture:** Isolate deterministic surface and pond-shape generation in pure modules with direct tests. Keep terrain, foliage, landmark, atmosphere, and Pip presentation in their existing render components, consuming the pure data and preserving all layout/navigation producers.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, React Three Fiber 9.7, Vitest 3.2, Vinext 1.0 beta.

**Spec:** `docs/superpowers/specs/2026-08-31-garden-visual-coherence-design.md`

## Global Constraints

- Preserve the approved 40 × 40 meter footprint and four-meter-per-second employee movement.
- Preserve Pip scale, behavior, interaction transforms, and locomotion.
- Preserve reward sequence, privacy flow, navigation coordinates, collision footprints, and reduced-motion semantics.
- Do not add GLTF assets, physics, post-processing, advanced shaders, audio, persistence, hosting, integrations, or social capability.
- Use deterministic visual generation and dispose all created Three.js GPU resources.
- Use `apply_patch` for source edits and commit each independently reviewable task.

## File map

- Create `prototype/app/garden/gardenSurface.ts`: deterministic grass pixels and texture construction.
- Create `prototype/app/garden/gardenSurface.test.ts`: deterministic/color/filter coverage.
- Modify `prototype/app/GardenWorld.tsx`: consume the extracted texture factory only.
- Modify `prototype/app/garden/StorybookTerrain.tsx`: path beds, smaller stones, lighter hedges.
- Modify `prototype/app/garden/StorybookTerrain.test.ts`: stone and path-bed invariants.
- Modify `prototype/app/garden/StorybookFoliage.tsx`: lighter shrubs and rounded tree palette.
- Create `prototype/app/garden/pondShape.ts`: deterministic organic radial outlines.
- Create `prototype/app/garden/pondShape.test.ts`: determinism and bounded-radius coverage.
- Modify `prototype/app/garden/EnchantedPond.tsx`: layered organic bank and water meshes.
- Modify `prototype/app/garden/StorybookGardenEnvironment.tsx`: cohesive rock, sanctuary, and pavilion presentation.
- Modify `prototype/app/garden/MagicalAtmosphere.tsx`: unified sky, fog, and light palette.
- Modify `prototype/app/GardenWorld.tsx`: Pip-local presentation light and shadow tuning.
- Modify `prototype/app/globals.css`: lighter journal chrome without structural or responsive changes.

---

### Task 1: Soft deterministic garden surface

**Files:**
- Create: `prototype/app/garden/gardenSurface.ts`
- Create: `prototype/app/garden/gardenSurface.test.ts`
- Modify: `prototype/app/GardenWorld.tsx:92-117`

**Interfaces:**
- Produces: `GARDEN_SURFACE_SIZE`, `GARDEN_SURFACE_REPEAT`, `generateGardenSurfacePixels(seed?: number): Uint8Array`, and `createGardenSurfaceTexture(seed?: number): THREE.DataTexture`.
- Consumes: no earlier task interface.

- [ ] **Step 1: Write the failing surface tests**

```ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GARDEN_SURFACE_REPEAT,
  GARDEN_SURFACE_SIZE,
  createGardenSurfaceTexture,
  generateGardenSurfacePixels,
} from './gardenSurface';

describe('garden surface', () => {
  it('generates deterministic opaque pixels with restrained spring colors', () => {
    const first = generateGardenSurfacePixels(731);
    const second = generateGardenSurfacePixels(731);
    expect(first).toEqual(second);
    expect(first).toHaveLength(GARDEN_SURFACE_SIZE * GARDEN_SURFACE_SIZE * 4);
    for (let offset = 0; offset < first.length; offset += 4) {
      expect(first[offset]).toBeGreaterThanOrEqual(92);
      expect(first[offset]).toBeLessThanOrEqual(132);
      expect(first[offset + 1]).toBeGreaterThanOrEqual(136);
      expect(first[offset + 1]).toBeLessThanOrEqual(176);
      expect(first[offset + 2]).toBeGreaterThanOrEqual(72);
      expect(first[offset + 2]).toBeLessThanOrEqual(112);
      expect(first[offset + 3]).toBe(255);
    }
  });

  it('uses softened filtering and a lower repeat count', () => {
    const texture = createGardenSurfaceTexture();
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.repeat.toArray()).toEqual([GARDEN_SURFACE_REPEAT, GARDEN_SURFACE_REPEAT]);
    expect(GARDEN_SURFACE_REPEAT).toBeLessThanOrEqual(12);
    texture.dispose();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node node_modules/vitest/vitest.mjs run app/garden/gardenSurface.test.ts`

Expected: FAIL because `gardenSurface.ts` does not exist.

- [ ] **Step 3: Implement multi-frequency pixel generation and texture construction**

Use a 96 × 96 texture. Generate a deterministic 12 × 12 coarse field with the existing Park–Miller sequence, bilinearly sample it for each pixel, add at most four points of deterministic fine grain, and clamp the three channels to the tested ranges around `[112, 156, 91]`. Configure repeat wrapping, sRGB, `LinearFilter`, `LinearMipmapLinearFilter`, repeat `10`, and `needsUpdate = true`.

Replace `useGrassTexture` internals with `useMemo(() => createGardenSurfaceTexture(), [])`; retain the existing disposal effect.

- [ ] **Step 4: Run focused and full tests**

Run: `node node_modules/vitest/vitest.mjs run app/garden/gardenSurface.test.ts`

Expected: 2 tests pass.

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- prototype/app/garden/gardenSurface.ts prototype/app/garden/gardenSurface.test.ts prototype/app/GardenWorld.tsx
git commit -m "feat: soften the garden ground surface"
```

---

### Task 2: Authored paths, stones, hedges, and foliage

**Files:**
- Modify: `prototype/app/garden/StorybookTerrain.tsx`
- Modify: `prototype/app/garden/StorybookTerrain.test.ts`
- Modify: `prototype/app/garden/StorybookFoliage.tsx`

**Interfaces:**
- Produces: `GardenPathBed` and `createGardenPathBeds(corridors: readonly GardenCorridor[]): GardenPathBed[]`.
- Consumes: existing `GardenCorridor`, `StorybookEnvironmentLayout`, and canonical foliage instances.

- [ ] **Step 1: Extend terrain tests before production edits**

```ts
import {
  STEPPING_STONE_HEIGHT,
  createGardenPathBeds,
  createSteppingStones,
} from './StorybookTerrain';

it('keeps the inset stones subordinate to the walking path', () => {
  const stones = createSteppingStones(createStorybookEnvironmentLayout().corridors);
  expect(Math.max(...stones.map((stone) => stone.scale[0]))).toBeLessThanOrEqual(0.68);
  expect(Math.max(...stones.map((stone) => stone.scale[2]))).toBeLessThanOrEqual(0.48);
  for (const stone of stones) {
    const top = stone.position[1] + (STEPPING_STONE_HEIGHT * stone.scale[1]) / 2;
    expect(top).toBeLessThan(0.03);
  }
});

it('creates one deterministic soft path bed per corridor', () => {
  const corridors = createStorybookEnvironmentLayout().corridors;
  const beds = createGardenPathBeds(corridors);
  expect(beds).toHaveLength(corridors.length);
  expect(createGardenPathBeds(corridors)).toEqual(beds);
  expect(beds.every((bed) => bed.width >= 0.9 && bed.width <= 1.35)).toBe(true);
});
```

- [ ] **Step 2: Run the terrain test and verify RED**

Run: `node node_modules/vitest/vitest.mjs run app/garden/StorybookTerrain.test.ts`

Expected: FAIL because path-bed exports are missing and current stones exceed the new footprint.

- [ ] **Step 3: Implement the terrain composition**

Create one thin rounded path-bed mesh per corridor at `y = -0.012`, centered between corridor endpoints, rotated with `Math.atan2(dx, dz)`, and scaled to its length plus `0.8`. Use alternating warm muted materials `#aeb487`, `#b7b68b`, and `#a5af7e` with opacity `0.32`, transparency, `depthWrite={false}`, and no collision registration.

Retune stepping stones to X scales `0.54`, `0.61`, `0.66` and Z scales `0.40`, `0.46`, keeping authored center `y = -0.005` and height `0.06`. Lighten the stone palette and reduce saturation.

Reduce hedge X/Z scales by roughly 15%, vary height between `0.72` and `0.94`, and replace the emissive-heavy material with brighter vertex colors spanning `#668d5f` through `#8ba871`.

In `StorybookFoliage.tsx`, brighten shrub colors, reduce emissive intensity, use `DodecahedronGeometry(..., 2)` for shrubs and canopies, warm trunks, and keep every instance position, scale, root stone, and count unchanged.

- [ ] **Step 4: Run focused and full tests**

Run: `node node_modules/vitest/vitest.mjs run app/garden/StorybookTerrain.test.ts app/garden/environmentLayout.test.ts`

Expected: both files pass.

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- prototype/app/garden/StorybookTerrain.tsx prototype/app/garden/StorybookTerrain.test.ts prototype/app/garden/StorybookFoliage.tsx
git commit -m "feat: compose softer garden paths and foliage"
```

---

### Task 3: Organic layered pond bank

**Files:**
- Create: `prototype/app/garden/pondShape.ts`
- Create: `prototype/app/garden/pondShape.test.ts`
- Modify: `prototype/app/garden/EnchantedPond.tsx`

**Interfaces:**
- Produces: `PondOutlinePoint` and `createPondOutline(baseRadius: number, variation: number, segments?: number, phase?: number): PondOutlinePoint[]`.
- Consumes: existing pond presentation and dressing layout; does not consume navigation data.

- [ ] **Step 1: Write deterministic outline tests**

```ts
import { describe, expect, it } from 'vitest';
import { createPondOutline } from './pondShape';

describe('organic pond outline', () => {
  it('is deterministic, centered, and bounded', () => {
    const points = createPondOutline(6.15, 0.18, 64, 0.7);
    expect(createPondOutline(6.15, 0.18, 64, 0.7)).toEqual(points);
    expect(points).toHaveLength(64);
    for (const point of points) {
      const radius = Math.hypot(point.x, point.z);
      expect(radius).toBeGreaterThanOrEqual(5.97);
      expect(radius).toBeLessThanOrEqual(6.33);
    }
  });

  it('keeps the visual bank inside the existing 6.7 meter collision radius', () => {
    const bank = createPondOutline(6.35, 0.2, 64, 1.2);
    expect(Math.max(...bank.map((point) => Math.hypot(point.x, point.z)))).toBeLessThan(6.7);
  });
});
```

- [ ] **Step 2: Run the pond-shape test and verify RED**

Run: `node node_modules/vitest/vitest.mjs run app/garden/pondShape.test.ts`

Expected: FAIL because `pondShape.ts` does not exist.

- [ ] **Step 3: Implement pure outlines and layered meshes**

Calculate each radius as `baseRadius + variation * (0.58 * sin(angle * 5 + phase) + 0.42 * sin(angle * 9 - phase * 0.7))`, then convert to X/Z points.

In `EnchantedPond.tsx`, memoize Three.js `ShapeGeometry` instances for a 6.35-meter bank, 6.04-meter depth layer, and 5.78-meter water surface. Render them as horizontal meshes with warm bank `#87956f`, depth `#365e5d`, and water `#71bbb5`. Keep existing ripples, highlights, shoreline dressing, local light, motion, and all presentation inputs. Dispose memoized geometry on unmount.

- [ ] **Step 4: Run focused and full tests**

Run: `node node_modules/vitest/vitest.mjs run app/garden/pondShape.test.ts app/garden/environmentMotion.test.ts app/garden/navigation.test.ts`

Expected: all focused files pass.

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- prototype/app/garden/pondShape.ts prototype/app/garden/pondShape.test.ts prototype/app/garden/EnchantedPond.tsx
git commit -m "feat: shape an organic layered pond bank"
```

---

### Task 4: Cohesive landmarks, atmosphere, and Pip separation

**Files:**
- Modify: `prototype/app/garden/StorybookGardenEnvironment.tsx`
- Modify: `prototype/app/garden/MagicalAtmosphere.tsx`
- Modify: `prototype/app/GardenWorld.tsx`
- Modify: `prototype/app/globals.css`

**Interfaces:**
- Consumes: all existing presentation values and the unchanged pavilion layout constants.
- Produces: no new public gameplay interface.

- [ ] **Step 1: Record invariant coverage before visual edits**

Run: `node node_modules/vitest/vitest.mjs run app/garden/pavilionLayout.test.ts app/garden/environmentLayout.test.ts app/garden/environmentMotion.test.ts app/garden/pipPose.test.ts`

Expected: all focused invariant tests pass before edits.

- [ ] **Step 2: Retune landmark materials and silhouettes**

In `RockBackdrop`, replace the darkest moss values with `#68765d`, `#758064`, and `#81886d`, reduce the largest upper-rock scales by about 12%, and add small moss-cap meshes only where they remain behind the movement area.

In `SpringSanctuary`, warm structural stone to `#c2b99d`/`#dfd4ad`, deepen the portal inset with a second smaller translucent plane, and keep existing glow inputs and position.

In `Pavilion`, use roof `#8b665c`, posts `#956f55`, deck `#c8b991`, benches `#aa815e`, and shelf `#9b7456`. Add a thin roof-edge cylinder or box trim and small post-cap meshes that do not extend into the walkable interior. Do not change any values imported from `pavilionLayout.ts`.

- [ ] **Step 3: Unify atmosphere and Pip presentation**

Set background to `#b9dedb`, fog to `#c9ded0` with range `36` to `76`, hemisphere sky/ground to `#eef7e7`/`#637858` at intensity `1.65`, and directional light to warm `#ffe1a3` at intensity near `2.05`. Preserve shadow camera coverage.

In Pip's wrapper, brighten the blob shadow from `#34483b` at opacity `0.24` to `#405445` at opacity `0.2`, and add a non-shadow-casting point light at `[0, 1.05, 0.35]`, color `#ffe7b2`, intensity `0.34`, distance `2.8`, decay `2`. Do not change group position, character scale, or any interaction state.

In `.garden-guide`, reduce the open panel background opacity slightly and soften its shadow while preserving width, max-height, keyboard semantics, and responsive rules.

- [ ] **Step 4: Run the full automated gate**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

Run: `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next`

Expected: exit 0 with no errors.

Run: `node node_modules/vinext/dist/cli.js build`

Expected: exit 0; existing chunk-size and route-classification notices are acceptable.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- prototype/app/garden/StorybookGardenEnvironment.tsx prototype/app/garden/MagicalAtmosphere.tsx prototype/app/GardenWorld.tsx prototype/app/globals.css
git commit -m "feat: unify garden landmarks and atmosphere"
```

---

### Task 5: Browser-led polish loop and owner candidate

**Files:**
- Modify only files from Tasks 1–4 when a browser finding has direct visual evidence.
- Add or update the matching focused test whenever a data-producing function changes.

**Interfaces:**
- Consumes: the complete visual-coherence implementation.
- Produces: a browser-verified owner-review candidate.

- [ ] **Step 1: Capture the fixed comparison route**

At `http://localhost:3000/`, capture screenshots of the opening journal, collapsed opening view, pond edge, pavilion approach/interior, and Pip at conversational distance. Advance all rewards and inspect both destination previews in separately restarted sessions. Check a narrow viewport and error-level console output.

- [ ] **Step 2: Rank findings and permit one correction wave**

Fix only Critical or Important visual-coherence findings: unreadable foreground, clipped UI, black foliage masses, visibly repetitive surface, flat pond edge, inaccessible landmark, missing Pip separation, broken reward presentation, or console error. Do not add new mechanics or begin parked backlog work.

- [ ] **Step 3: Re-run focused checks for changed producers**

Run the focused test files associated with every correction. Expected: all pass.

- [ ] **Step 4: Re-run the final gate**

Run full Vitest, ESLint, Vinext build, and `git diff --check`. Expected: all exit 0 aside from documented non-blocking Vinext notices.

- [ ] **Step 5: Commit the correction wave if non-empty**

```powershell
git add -- prototype/app
git commit -m "fix: refine the garden owner-review candidate"
```

- [ ] **Step 6: Present the strongest browser state**

Leave the local preview on the best opening composition, provide the final screenshot, summarize material changes and verification evidence, and identify any remaining visual limitation honestly.
