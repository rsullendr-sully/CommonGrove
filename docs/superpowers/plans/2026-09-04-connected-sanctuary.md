# Connected sanctuary implementation plan

**Goal:** First substantive 3D rebuild toward the approved sanctuary concept.

**Architecture:** Existing React Three Fiber scene, no new dependencies. Shared deterministic elevation and geometry helpers; environment-only rendering components; unchanged reward state and persistence.

**Execution:** Inline in the existing checkout on `codex/connected-sanctuary`. Parent owns code changes and integration; an asset-only subagent supplies three generated albedo maps. Preserve unrelated untracked dependency folders.

## 1. Ground the reading terrace

- Add `app/garden/gardenElevation.test.ts`; demonstrate missing implementation (red).
- Assert `getGardenElevation(-12.2, -12.4) === 1.5`, `getGardenElevation(0, 0) === 0`, and continuous ascent from z=-3.4 to -9.1.
- Implement sampler and conforming terrain geometry. Use the same sampler for camera, Pip, object and foliage transforms. Raise existing pavilion furniture with its deck.
- Run focused elevation/navigation/interaction tests before continuing.

## 2. Rebuild the sanctuary silhouette and materials

- Test deterministic sculpted cliff geometry and roof bounds before implementation.
- Build stratified limestone cliffs, arched spring/cascade, connected terrace approach, crafted teal roof, branching leaf canopies, sky and pond shading.
- Integrate versioned grass/limestone/wood images and record provenance. Do not overwrite old assets.
- Keep rewards and accessibility/reduced-motion controls functional.

## 3. Inspect and verify

- Inspect actual browser at `http://127.0.0.1:3001/`, including the first view, water, approach and pavilion. Iterate on visible problems.
- Run all Vitest tests, ESLint and vinext production build using installed local binaries.
- Review changed files for resource disposal, route regressions, object elevation and reduced-motion behavior. Standalone TypeScript currently has pre-existing missing Three types; do not claim it passes.
- Record results and remaining visual work; hand off actual scene, not concept image.

## Implementation checkpoint — 2026-09-04

- Shared elevation is integrated into terrain, first-person movement, Pip, objects, planting and pavilion rewards. The raised approach is stone-paved; a separate staircase has not been built.
- Versioned generated material assets, rounded-block cliff, stone spring arch/cascade, teal roof, branching foliage, new water/sky and collapsed opening journal are integrated.
- User explicitly preferred the first rounded-block cliff and requested restoring it after a reshaping experiment. That exact earlier rounding, column proportions, stagger, texture strength and tree heights were restored. This live style now supersedes the concept's realism. Do not reshape it again without user direction.
- Browser screenshots verified the live scene and restored cliff. User was actively exploring; no camera reset or automated movement was imposed during their exploration. Full manual terrace/reward walkthrough remains to be completed; automated route/elevation tests passed.
- Independent read-only review identified world/local toy-height accumulation and a sky sphere beyond the camera far plane. Both were fixed with new regression cases. Pavilion floor uses a depth offset to separate its coplanar surface from the terrain.
- Final regression run: 270 tests in 26 files passed. Asset provenance is recorded in `docs/design/sanctuary-materials-2026-09-04.md`. No publishing or source upload.
