# Garden Visual Direction

Status: Approved direction; owner visual approval of the environment polish remains pending
Date: 2026-08-29

## Reference

The approved spatial inspiration is saved as `garden-inspiration.png` in this folder.

The reference guides spatial feeling and composition. It is not a request to reproduce another game's art, structures, or assets.

## Qualities to preserve

- First-person eye-level view from inside the garden
- A broad lawn with enough open ground to feel walkable
- Large landmarks that organize the space from a distance
- A central water feature as the main visual anchor
- Raised paths, stairs, bridges, and structures that suggest destinations
- Rock and terrain boundaries that make the garden feel enclosed but expansive
- A visible sky and distant horizon that create openness
- Pip shown at a nearby character scale, not as a tiny map object
- A bright, calm, slightly fantastical atmosphere

## Common Grove interpretation

Common Grove should retain its softer natural palette, original architecture, and Pip's approved character design. The next spatial pass should translate the reference into an original garden with:

1. A large central pond or spring
2. A substantial rock formation behind it
3. A raised reading pavilion reached by a short stair or bridge
4. Open foreground lawn for first-person movement
5. A few clearly separated discovery destinations around the perimeter

## Scope boundary

The next slice changes garden composition and apparent scale only. It does not add a game engine, physics, collision, multiplayer, persistence, or production systems.

## Approved spatial shell

- Square garden footprint: 40 × 40 meters
- Calm walking speed: 4 meters per second
- Expected uninterrupted edge-to-edge walk: approximately 10 seconds
- Eye-level first-person camera
- Smooth forward, backward, and side movement
- Bounded perimeter with no jumping or sprinting in the first test
- Initial shell contains only ground, sky, boundaries, and a center marker so scale can be judged before landmarks are added

Product-owner review on 2026-08-26 confirmed that this footprint feels like a good size. Treat the garden dimensions and walking pace as locked for Release 0 unless later landmark placement reveals a specific problem.

## Procedural 3D Pip

Pip is an original compact pear-shaped clay character built from simple procedural primitives, with uneven listening ears, dot eyes, three freckles, a quiet asymmetrical smile, and articulated limbs and feet. Movement is grounded through a visible foot cycle, natural facing, acceleration, arrival braking, and a restrained shadow; reduced-motion treatment is included. This construction is an approved prototype direction only: a future renderer may replace its implementation while preserving Pip’s original character traits, grounded movement, and the approved behavioral feel.

## Central pond test

- Twelve-meter overall diameter, including the stone rim
- Centered in the garden as the primary orientation landmark
- Low stone edge with a calm blue-green water surface
- A simple circular walking exclusion keeps the first-person camera out of the water without introducing a general physics system
- Preserve generous walking routes on all four sides

Product-owner review on 2026-08-26 described the pond as a decent start. Keep its current scale and placement provisionally while the surrounding composition develops. Its final shape, water treatment, and stone materials remain open for refinement.

## Integrated garden composition

The first complete spatial composition uses the approved reference as a structural template while keeping Common Grove original:

- Full-screen first-person presentation instead of a split-screen diorama
- Central pond and spring sanctuary as the primary orientation landmark
- Large layered rock backdrop that closes the far edge and creates vertical scale
- Raised reading pavilion on the back-left side
- Three tree placements that frame the open lawn without crowding movement
- Small flower patches that connect visible growth to contribution outcomes
- Pip placed at approximately one meter tall, clearly smaller than the employee's eye-level viewpoint
- Compact collapsible garden journal so the product story remains available without reducing the explorable space

The 40 × 40 meter footprint and walking speed remain unchanged.

Product-owner review on 2026-08-26 described the integrated composition as a solid start. The follow-up finish pass preserves the composition while adding procedural grass variation, natural boundary shrubs, stepping-stone wayfinding, fountain and pavilion lighting, small rock variation, distant clouds, and a restrained idle motion for Pip.

## Soft Storybook Grove environment polish

The implemented environment pass preserves the established composition while making the garden read as a layered, overtly magical grove:

- Deterministic foreground, midground, and perimeter foliage frame the view with varied trees, shrubs, grasses, flowers, roots, and warm stone accents.
- The central pond uses an irregular stone rim, layered blue-green water, reeds, broad leaves, luminous ripples, and a restrained central glow.
- Warm morning key and fill lighting, localized pond, sanctuary, pavilion, and plant accents, layered clouds, fog, and pooled motes add depth without changing product state.
- Reward stages add local starflower, pavilion, and discovery-seed presentation. Lantern Orchard and Tinker Workshop use different accent palettes while retaining the same destination footprint and scale.
- The presentation is composed through a dedicated deterministic environment layer rather than adding product behavior to `GardenWorld.tsx`.

The navigation contract is unchanged: the garden remains a bounded 40 × 40 meter square, employee movement remains 4 meters per second on the `y = 0` ground plane, and the existing pond exclusion, boundary, canonical obstacles, Pip interests, interactions, reward locations, snack, toy, and destination coordinates remain authoritative. Decorative relief stays outside declared travel corridors and does not add terrain height-following, jumping, physics, or general collision.

## Environment verification record

On 2026-08-29, the integrated garden was reviewed in the isolated local prototype at `http://localhost:3001/`. The starting view read as a layered magical garden, and browser traversal covered both directions around the pond plus the pavilion, sanctuary, three canonical trees, starflower area, seed and destination area, snack, and toy. The pond remained legible near and far, main routes stayed visually open, snack and toy prompts were readable, toy pickup/place completed, all three reward transformations remained distinct, and both destination outcomes rendered at equal scale and prominence. Mobile `390 × 844` and tablet `768 × 800` views retained usable controls, journal content, garden presentation, and Pip status without observed clipping. No application console errors appeared; the existing `THREE.Clock` deprecation warning appeared once per fresh session.

The complete automated gate passed 201 tests in 16 files, lint, and the production build. Pure layout and motion tests cover deterministic placement, boundaries and corridors, reward and destination mappings, and static reduced-motion presentation. The in-app browser did not expose reduced-motion emulation or exact frame-time/FPS telemetry, so no manual reduced-motion or measured-performance claim is recorded. Direct browser completion of Pip pet/carry/place and offering snack or toy was also not obtained because autonomous Pip repeatedly moved outside the fine reticle range; the passing interaction regressions remain automated evidence, not a substitute for the pending owner walkthrough.

This record does not complete the environment slice. Owner visual approval is still required before the prototype is described as ready for staff sessions or distribution.

## Pip behavior slice

- Pip follows a slow autonomous route around the pond and between garden destinations.
- Pip pauses naturally at waypoints instead of pacing continuously.
- When the employee comes within conversational distance, Pip stops and offers one short warm greeting.
- Later approaches receive a quiet attentive reaction rather than repeated dialogue.
- Pip resumes exploring after the employee moves away.
- The behavior requires no feeding, maintenance, commands, or response from the employee.

## Acceptance check

At the starting viewpoint, the employee should immediately feel that they are standing inside a place they could explore. The pond, rock formation, pavilion, and Pip should read as distinct destinations or presences without needing the story panel to explain them.
