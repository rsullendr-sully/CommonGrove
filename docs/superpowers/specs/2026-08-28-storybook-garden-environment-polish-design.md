# Storybook Garden Environment Polish Design

Status: Approved design pending implementation planning  
Date: 2026-08-28

## Goal

Transform the current flat prototype garden into an overtly magical Soft Storybook Grove while preserving its proven first-person navigation, Pip behavior, reward flow, interaction geometry, and core landmark layout.

The polished garden should feel appealing while the employee is standing still: layered, luminous, enclosed by nature, easy to read, and inviting to explore. This is an internal presentation-quality pass, not authorization to invite staff or distribute the prototype.

## Approved Direction

The selected art direction combines:

- **Soft Storybook Grove:** warm morning light, rounded natural forms, layered foliage, gentle atmospheric depth, and calm original materials.
- **Layer the Existing Skeleton:** retain the current central pond, back-center rock sanctuary, back-left pavilion, discovery locations, and safe travel routes.
- **Overt Magic:** persistent luminous water, radiant foliage, floating motes, glowing landmarks, and visibly magical reward transformations.

The result may be fantastical and unmistakably magical, but it must remain calm rather than noisy, neon, or effects-heavy.

## Scope

### Included

- Terrain appearance and shallow perimeter relief
- Pond shape, rim, water treatment, reeds, and luminous effects
- Trees, shrubs, flowers, grasses, and planting composition
- Sky, fog, sunlight, fill light, shadows, lanterns, and landmark glow
- Magical particles and state-driven environmental accents
- Path and stepping-stone material and placement polish
- Scene-component extraction needed to keep the environment maintainable
- Automated layout, safety, reduced-motion, and regression tests
- Browser-based visual and performance verification

### Excluded

- Moving the central pond or changing its gameplay exclusion radius
- Changing the 40 × 40 meter footprint or employee movement speed
- Rewriting Pip autonomy, direct interactions, rewards, privacy, or choices
- Terrain height-following, jumping, physics, or general collision systems
- New gameplay mechanics, progression, inventory, needs, scores, or upkeep
- New UI, audio, persistence, multiplayer, staff invitations, or deployment
- Copied game assets, recognizable Sonic or Chao art, or external runtime assets

## Spatial Composition

The current landmark skeleton remains authoritative:

- The pond stays centered as the primary visual anchor.
- The rock sanctuary remains behind the pond and supplies the tallest central mass.
- The pavilion remains on the back-left side.
- Existing Pip interests, reward objects, scene obstacles, and safe routes retain their gameplay coordinates.
- Existing authored food and toy positions remain reachable.

Composition improves through layering rather than relocation:

- Large foreground trees and planting masses frame the starting view without blocking the pond, Pip, pavilion, or sanctuary.
- Midground shrubs, flowers, reeds, stones, and small trees bridge the scale gap between lawn and landmarks.
- Background hedges, canopy layers, fog, and berms soften the square boundary.
- Curved planting beds and stepping-stone groupings lead the eye toward the pond and then branch toward the pavilion and discovery destinations.
- Open walking corridors remain visibly legible on every side of the pond.

## Terrain and Navigation Contract

The navigable ground plane remains at `y = 0`. Pip and the employee continue to use the existing two-dimensional locomotion and safety rules.

Visual relief is created without introducing terrain-following:

- Low berms, mounds, raised beds, and rock bases appear only outside declared walking corridors and interaction placements.
- Their footprints are either decorative beyond the canonical obstacle boundary or represented by existing circular obstacles.
- No decorative mesh may visually invite the player onto a surface the movement model cannot traverse.
- The square garden boundary, `SAFE_GARDEN_HALF_SIZE`, `SAFE_POND_RADIUS`, and canonical scenery obstacles remain unchanged unless a verified visual overlap proves a specific constant is invalid. Such a change requires a separate explicit ruling and test update.

## Enchanted Pond

The pond remains inside the existing safety exclusion but loses its perfect procedural-disc appearance.

- An irregular ring of varied stones creates an organic shoreline while staying within the canonical pond exclusion.
- Two or more shallow water layers create depth: a darker base and a translucent animated surface.
- Luminous ripple rings, soft caustic-like highlights, reflected sky color, and a restrained central glow make the water visibly magical.
- Reeds, broad leaves, low flowers, and small shoreline stones break the edge silhouette without obstructing main routes.
- Permanent effects are readable but calm. Reward moments may temporarily increase ripple light, color, motes, or nearby bloom intensity.
- Reduced motion freezes or substantially slows ripple translation and drifting particles while retaining color, glow, and reward-state readability.

No custom shader is required for the first pass. Layered meshes, texture transforms, opacity, emissive materials, and shared geometry are preferred until a verified limitation justifies GLSL.

## Foliage and Materials

Foliage uses original procedural geometry and the Common Grove palette.

- Trees gain varied trunk taper, clustered canopies, asymmetric silhouettes, root stones, and several deterministic scale variants.
- Shrubs form irregular groups instead of a uniform perimeter wall.
- Grass uses layered color variation plus sparse tuft clusters rather than a single repeating texture alone.
- Flowers occur in curved patches with mixed height, color, and density.
- Magical plant clusters use emissive leaf tips, seed lights, or luminous blossoms. They are concentrated around the pond, sanctuary, pavilion, and reward destinations.
- Paths use warmer stone variation, imperfect rotation and spacing, slight inset shadows, and clearer hierarchy between main approach and secondary routes.
- Rock materials use several coordinated warm-gray and moss-green values rather than uniform flat gray.

Procedural placement must be deterministic. Reloading the prototype must reproduce the same environment, and visual arrays must not use unseeded randomness during render.

## Lighting and Atmosphere

Lighting establishes a warm storybook morning with overt magical accents.

- A warm angled key light defines tree, rock, pavilion, and Pip silhouettes.
- A soft sky or hemisphere fill prevents unlit surfaces from becoming muddy.
- Shadow softness and camera bounds are tuned for the playable garden rather than the entire world.
- Fog color transitions toward the sky and begins beyond the main landmarks, creating depth without hiding destinations.
- Pavilion lanterns, sanctuary light, pond glow, and selected magical plants use localized light or emissive presentation.
- Dynamic lights remain limited; emissive materials and pooled glow geometry provide most magical illumination.
- The sky remains bright and open, with more layered cloud scale and slower motion.

The scene must avoid blown highlights, fully black shadows, excessive bloom-like glare, or so many particles that Pip and interaction targets become difficult to find.

## Magical Atmosphere

Overt magic is persistent and presentation-only.

- A pooled mote field drifts through selected garden volumes rather than spawning per object.
- The pond, sanctuary doorway, pavilion lanterns, and landmark plants remain visibly luminous.
- Reward stages increase specific local effects instead of applying a global flash.
- Destination choice changes the corresponding landmark accent palette while preserving equal importance between choices.
- Motes and pulses never encode essential information by themselves; journal copy, prompts, object visibility, and scene state remain authoritative.
- Reduced motion removes continuous drifting, bobbing, and pulsing while keeping static luminous markers and completed-state color differences.

## Code Structure

`GardenWorld.tsx` currently coordinates input, interactions, Pip, rewards, and rendering. The environment pass must not add another large block of scene primitives to that file.

Create a focused environment layer:

- `garden/environmentLayout.ts` owns deterministic authored layout data, palette tokens, and pure placement helpers.
- `garden/environmentLayout.test.ts` validates deterministic output, landmark clearance, safe corridors, and boundary containment.
- `garden/StorybookGardenEnvironment.tsx` composes terrain, paths, foliage, pond, sanctuary shell, pavilion shell, atmosphere, and lights from the layout data.
- Small component files may be extracted for the pond or foliage only when their implementations would otherwise make the environment component difficult to understand.

`GardenWorldScene` continues to own scene state and passes only presentation inputs such as reward stage, visible reward landmarks, destination choice, and reduced-motion state into the environment layer. Environment components do not mutate reward, Pip, employee, or interaction state.

## Data Flow

1. The page owns reward and choice state as it does today.
2. `GardenWorld` passes current presentation state into `GardenWorldScene`.
3. `GardenWorldScene` passes that state into `StorybookGardenEnvironment`.
4. The environment selects deterministic geometry and material variants from `environmentLayout.ts`.
5. Reward and destination state adjust only declared visual accents.
6. Reduced-motion state selects static or restrained presentation without altering geometry, rewards, or navigation.

No environment component reads browser storage, performs network requests, or creates new product state.

## Performance Strategy

- Reuse shared geometries and materials for repeated foliage, stones, flowers, and motes.
- Prefer `InstancedMesh` or merged static groups for high-count repeated objects.
- Use one pooled `Points` system or a small number of shared particle groups for motes.
- Cap renderer pixel ratio and shadow-map coverage to the playable view.
- Avoid per-frame React state updates and per-object animation callbacks.
- Drive continuous environment animation from a small number of frame callbacks using refs and shared time values.
- Avoid allocating vectors, colors, arrays, or materials inside the render loop.
- Preserve a readable static scene if reduced motion is enabled or animation time is unavailable.

The target is smooth first-person exploration on the current GPU workstation with no sustained frame stalls during normal movement, reward transitions, or Pip interactions. Visual density should be reduced before gameplay responsiveness is compromised.

## Failure Handling

- Layout validation fails tests when a new decorative obstacle invades the pond exclusion, main walking corridors, or garden boundary.
- Missing optional refs or animation state leaves the corresponding effect static; it must not crash the scene.
- Material or light enhancement remains local. If an advanced effect is unsupported, the base geometry and color still render coherently.
- No effect depends on an external image, font, model, or network response.

## Verification

### Automated

- Deterministic environment-layout snapshot or exact-data tests
- Boundary, pond, canonical obstacle, and main-corridor clearance tests
- Reduced-motion presentation-selection tests
- Reward-stage and destination-accent mapping tests
- Existing locomotion, autonomy, interaction, reward, privacy, lint, and production-build suites
- `git diff --check`

### Browser

- Compare the starting view before and after the pass.
- Walk every side of the pond and all main paths without visual collision or misleading terrain.
- Verify Pip, snack, toy, prompts, pavilion, sanctuary, and reward landmarks remain easy to find.
- Observe pond, foliage, shadows, lanterns, particles, and fog from near and far distances.
- Complete all rewards and verify local magical changes remain distinct.
- Confirm both destination choices preserve equal visual prominence.
- Repeat with reduced motion and confirm every state remains readable.
- Inspect the console for application errors and record existing third-party warnings separately.

## Acceptance Criteria

- The starting view immediately reads as a layered magical garden rather than a flat procedural field.
- Pond, sanctuary, pavilion, Pip, and open routes remain distinct without relying on the journal.
- The pond looks organic and luminous while remaining inside the existing gameplay exclusion.
- Foreground, midground, and background foliage create depth without blocking interaction targets or routes.
- Lighting separates forms and preserves the warm Common Grove palette.
- Overt magical effects are clearly visible but do not obscure Pip, prompts, or reward changes.
- Reduced motion preserves all essential visual states without continuous ambient movement.
- Existing gameplay behavior and privacy semantics remain unchanged.
- Automated tests, lint, production build, browser console check, and owner visual review pass before the slice is marked complete.

## Deferred Work

- Custom GLTF environment assets
- Advanced water or vegetation shaders
- Post-processing bloom pipeline
- Terrain height-following and physics
- Dynamic weather or time of day
- Audio ambience
- Mobile-specific environment density tiers beyond fixes required for correctness
- Staff invitations or external prototype distribution
