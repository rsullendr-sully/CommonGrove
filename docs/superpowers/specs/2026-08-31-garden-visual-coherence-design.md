# Common Grove Visual Coherence Pass

Date: 2026-08-31
Status: Approved direction

## Goal

Make the first-person garden feel like one warm, authored sanctuary at first glance. The target is the approachable readability and playful environmental cohesion of a small companion garden, without copying Sonic Adventure 2 assets, layouts, characters, or trademarks.

The pass prioritizes visible world quality over new mechanics. It preserves the approved 40 × 40 meter footprint, four-meter-per-second employee movement, Pip scale and behavior, reward sequence, privacy flow, navigation coordinates, collision footprints, reduced-motion semantics, and local-only prototype boundary.

## Browser baseline

The current opening view communicates the layout but exposes several prototype artifacts:

- the high-frequency nearest-filtered grass texture reads as visual noise;
- stepping stones dominate the foreground and feel stamped onto the lawn;
- boundary shrubs collapse into near-black blobs at common viewing distances;
- the circular pond reads as a flat disc rather than water held by a garden bank;
- the pavilion, sanctuary, and rock backdrop use disconnected color and silhouette languages;
- Pip is small by design but lacks enough local contrast to remain an emotional focal point;
- the garden journal competes with the world when open, although its welcome story must remain immediately available.

## Design principles

1. **Broad shapes before detail.** Large color fields, silhouettes, and landmark relationships must read before procedural texture or small props.
2. **Warm middle values.** Avoid crushed greens and black shrub masses. Reserve the darkest values for contact shadows and Pip's facial features.
3. **Organic repetition.** Deterministic variation should feel hand-placed, not noisy or random.
4. **Readable landmarks.** The pond, sanctuary, pavilion, and Pip need distinct palettes while still sharing the same warm storybook material language.
5. **No gameplay drift.** Visual geometry may change only where it does not alter navigation, collision, reward logic, or interaction coordinates.

## Pass 1 — World foundation

### Ground surface

Move procedural grass generation from `GardenWorld.tsx` into a focused, pure surface module. Generate a deterministic multi-frequency texture with broad color patches and subtle fine grain. Use linear filtering and a lower repeat count so the ground reads as soft turf instead of pixel noise.

The surface generator will expose deterministic metadata or pixel data for tests. Texture ownership remains in a hook and the GPU texture is disposed on unmount.

### Terrain dressing

Retune terrain materials toward a warmer spring palette. Reduce stepping-stone footprint and regularity while keeping every stone top within the existing walkable-height limit and leaving stones out of collision data. Add a thin, low-contrast path-bed layer beneath stepping stones so paths read as garden routes rather than disconnected coins.

Boundary hedges will use smaller overlapping lobes, brighter green variants, and less vertical mass. Their authored boundary positions remain outside the walkable area.

### Foliage

Brighten shrubs and tree canopies, soften extreme flat-shaded contrast, and give canopies a more rounded clustered silhouette. Preserve deterministic instance positions and all canonical tree roots. Grass tufts and flowers remain lightweight instanced geometry.

## Pass 2 — Landmark integration

### Pond

Keep the approved pond scale and collision radius. Replace the perfect visual-disc edge with deterministic scalloped bank and water outlines built from pure radial geometry. Layer a shallow warm bank, darker depth rim, and softer water highlights. Existing reeds, shoreline stones, glow state, ripple motion, and reduced-motion behavior remain intact.

### Sanctuary and rock backdrop

Reduce the backdrop's visual dominance through lighter moss-stone values, more varied scale, and layered base planting. Warm the sanctuary stonework and strengthen the portal's depth with inset trim and a soft localized glow. Do not move the sanctuary or alter its interaction meaning.

### Pavilion

Unify the deck, posts, roof, benches, and shelf under a warm wood-and-clay palette. Add thin roof trim and small non-colliding details to break the blockout silhouette. The shared furniture dimensions and collision samples remain authoritative and unchanged.

## Pass 3 — Pip and composition

Improve Pip's environmental separation without changing his approved scale: lighten nearby ground contact, strengthen the soft blob shadow edge, and add a restrained warm fill/rim contribution local to Pip. Preserve the original clay body, one listening ear, freckles, asymmetrical smile, locomotion, and interaction behavior.

Tune sky, fog, hemisphere light, and sun color as one palette. The opening composition should keep the pond as the central anchor, show the pavilion and sanctuary as secondary destinations, and avoid crushing foliage into the horizon.

The welcome journal remains open on first load because it carries the return story. Its chrome may become slightly lighter and more translucent, but its content, keyboard behavior, controls, and responsive bounds remain unchanged.

## Component boundaries

- `gardenSurface.ts` owns deterministic grass pixel generation and texture configuration constants.
- `StorybookTerrain.tsx` owns ground meshes, path beds, stepping stones, and boundary hedges.
- `StorybookFoliage.tsx` owns shrub, grass, flower, and tree rendering.
- `EnchantedPond.tsx` owns pond shape, bank, surface, shore dressing, and pond-local light.
- `StorybookGardenEnvironment.tsx` owns pavilion, sanctuary, and rock-backdrop rendering.
- `MagicalAtmosphere.tsx` owns sky, fog, global light, clouds, and motes.
- `GardenWorld.tsx` consumes the surface texture and retains all game/controller behavior.
- `PipCharacter.tsx` and Pip's wrapper may receive only presentation changes that do not affect scale, transforms used by interaction, or locomotion state.

## Testing and verification

Automated checks will cover:

- deterministic grass generation and bounded color variation;
- texture filtering and repeat constants;
- stepping-stone top-height and reduced-footprint invariants;
- deterministic pond-outline geometry with radii inside the approved visual bank and outside the water surface;
- unchanged environment layout, canonical tree roots, navigation, pavilion collision identity, reward mapping, and reduced-motion presentation.

Each implementation pass must run focused tests before the full suite. The final tree must pass the full Vitest suite, ESLint, production build, and `git diff --check`.

Browser review will compare the same views after each pass:

1. opening view with the journal open;
2. opening view with the journal collapsed;
3. pond edge at walking distance;
4. pavilion approach and interior;
5. Pip at conversational distance;
6. all three reward states and both destination previews;
7. desktop and narrow responsive sizes;
8. error-level console output.

## Acceptance criteria

- The opening view reads as a calm authored garden rather than a collection of procedural primitives.
- Grass supports the scene without visible high-frequency pixel noise.
- Paths guide the eye without oversized foreground stones.
- Shrubs and trees retain readable green detail instead of collapsing into black masses.
- The pond has visible bank depth and an organic outline while preserving its gameplay boundary.
- Pavilion and sanctuary share a coherent warm material language and remain fully accessible.
- Pip remains easy to locate at common walking distances without changing his scale.
- No existing interaction, navigation, reward, privacy, responsive, or reduced-motion behavior regresses.

## Non-goals

- custom GLTF assets;
- terrain height-following or physics;
- post-processing, bloom, or advanced shaders;
- audio;
- persistent state, hosting, real integrations, or social features;
- changes to the approved garden footprint, employee speed, or Pip size.
