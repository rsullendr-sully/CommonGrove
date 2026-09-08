# Crafted garden finish implementation plan

**Goal:** Extend the user-approved cliff's warm, tactile, softened style across the existing garden without making everything block-shaped.

**Architecture:** Keep the existing Three/R3F scene and interaction systems. Add reusable rounded geometry and warm matte material helpers, use them on existing props and planting, and reduce grass/water surface contrast. No new assets or dependencies are needed. Implement inline because the parent owns this local Site checkout.

**Spec:** `docs/superpowers/specs/2026-09-04-connected-sanctuary.md`; latest user clarification: “Not necessarily turning them blocky but the look is perfect.”

## Constraints

- Preserve the exact restored cliff geometry, texture, dimensions, placement and light rig. Preserve its existing treetop rendering via the default tree finish.
- Preserve Pip, garden bounds, movement, obstacle footprints, raised terrace, four-return rewards, privacy and reduced-motion behavior.
- Reuse the current checkout and live preview. No publication or source upload.

## Tasks

- [x] Add `gardenCraft.test.ts` covering real rounded geometry: `createSoftBoxGeometry(2,.1,1)` retains bounds ±1, ±.05, ±.5 and valid normals; `createSoftLeafGeometry()` stays in its authored footprint and has thickness. Five tests failed before implementation, then passed. Independent review additionally verified positive volume across eight prop dimensions.
- [x] Add a garden-only soft leaf finish to `CraftedTree.tsx`; use it from `StorybookFoliage.tsx`. Keep cliff trees on the original default. Replace sharp cone tufts and faceted flower dots with softly modeled planting within existing radii. Verify deterministic instance layout and geometry bounds.
- [x] Apply rounded-edge geometry and warm matte materials to pavilion furniture, books, destination/workshop props and journey growth. Make ground/soil/shore materials quieter and coordinate the snack, ring toy and pond with the same warm finish. Keep meshes inside current authored dimensions. Existing geometry and state tests remain green.
- [x] Inspect the actual local garden and a simulated reward state. Run all tests, lint and production build; get an independent read-only review; check locked cliff hashes. Record gaps rather than claim full-project completion.

## Verification — 2026-09-04

- Full Vitest suite: 275 tests across 27 files passed. ESLint passed. Vinext production build passed (existing chunk-size and route-classification notices remain).
- Browser: inspected the garden, flower/pavilion rewards and chosen workshop through the real journal controls. Camera dragging remained functional; no quantified frame-rate benchmark was performed.
- Independent read-only review: no Important/Critical findings. Geometry/material ownership, original bounds, shader integration and unchanged reward transforms/reduced-motion conditions verified.
- Exact SHA-256 matches for locked `SanctuaryArchitecture.tsx`, `sanctuaryGeometry.ts` and `sanctuary-limestone-v1.png`.
- Scope limits: no Pip redesign, cliff or light-rig edits, gameplay changes, new dependencies, publication or source upload. Softer leaves use fewer instances but more triangles; low-end performance still needs a dedicated hardware check. Standalone TypeScript checking remains outside the passing checks due to pre-existing missing Three declarations and older fixture typing errors.
