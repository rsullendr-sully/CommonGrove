# Task 3 Report: Procedural Articulated 3D Pip

## Status

Implemented and verified the procedural articulated Pip renderer, distance-driven pose math, and locomotion-facing integration while preserving the existing reward and conversation routing.

## Changes

- Added `getPipPose(input)` and the `PipPoseInput` / `PipPose` contracts.
- Added test-first coverage for opposing distance-driven leg phases and reduced-motion suppression of body bounce and ear sway.
- Added `PipCharacter`, built only from original Three.js clay primitives:
  - two overlapping smooth spheres create the compact pear silhouette;
  - capsule meshes create short articulated arms, legs, and uneven ears;
  - the taller left ear is the named listening ear;
  - dark sphere meshes create two dot eyes;
  - three tan sphere meshes create the cheek freckles;
  - a short `QuadraticBezierCurve3` rendered with `tubeGeometry` creates the gently asymmetrical smile;
  - flattened sphere meshes create short feet that remain close to the ground plane.
- Used the approved artwork's cream, dark-brown, and tan palette with high-roughness `meshStandardMaterial` clay surfaces. No artwork geometry, texture, Chao anatomy, Chao colors, or external character assets are used by the 3D body.
- Replaced the R3F sprite body and texture loader in `GardenWorld` with `<PipCharacter pose={pose} />`.
- Connected the existing waypoint, reward, choice, greeting, and pause routes to the previously implemented `stepLocomotion` state without changing locomotion math.
- Applied locomotion facing to Pip's root group and kept the root grounded.
- Replaced the circular shadow with a named elliptical `blobShadow` mesh fixed at `y=0.025`.
- Kept the existing small `next/image` portrait in the conversation status UI because the task is intentionally limited to replacing the world sprite body and preserving reward/conversation presentation.

## TDD Evidence

1. Added `pipPose.test.ts` before `pipPose.ts` existed.
2. Focused test failed because `./pipPose` could not be resolved.
3. Added the minimal pose function.
4. The brief's proposed `4.5π` gait cadence then failed the required alternation assertion because both supplied distances produce positive sine values.
5. Changed only the cadence to `3.5π`; the focused pose test then passed with all other prescribed amplitudes and branches unchanged.

## Verification

- Focused Vitest: `app/garden/pipPose.test.ts app/garden/locomotion.test.ts` — 2 files, 9 tests passed.
- Full Vitest: 2 files, 9 tests passed.
- ESLint: exit 0.
- Vinext production build: exit 0.
- `git diff --check`: no whitespace errors.
- Renderer scan: no `useLoader`, `TextureLoader`, R3F `<sprite>`, or `spriteMaterial` remains in `GardenWorld` or the garden renderer files.

## Browser Verification

The task's dev server used `http://localhost:3001/` because port 3000 was already occupied by another process.

- Observed Pip across more than one waypoint leg.
- Confirmed the root turns toward travel, the feet remain visually grounded while stance changes, and the elliptical shadow stays on the ground.
- Confirmed the compact pear silhouette, uneven ears, dot eyes, cheek freckles, and articulated short limbs render at approximately the former conversational scale.
- No application console errors appeared. An initial Three.js `Clock` deprecation warning is unrelated to this task; the final console read contained no warnings or errors.

The in-app browser exposes no `prefers-reduced-motion` emulation control, so a live reduced-motion pass could not be performed without changing OS settings or adding a test-only production switch. The deterministic pose test verifies that reduced motion preserves the distance-driven leg values while forcing `bodyLift` and `earSway` to zero.

## Self-Review

- All binding character requirements are represented by original primitive composition.
- The exported component and pose interfaces match the task brief.
- `speed`, `distanceTravelled`, `moving`, `attentive`, and `reducedMotion` all participate in pose generation or gating.
- Reward, choice, greeting, and message routing remain intact.
- The Task 2 25% minimum desired-speed floor was not modified.
- Work is limited to the four task implementation files plus this report.

## Concerns

- The required alternation samples make the brief's `4.5π` cadence internally inconsistent. The approved `3.5π` correction is deterministic and passes the contract, but final live review may choose to retune visual cadence while retaining an alternating sample pair.
- Reduced-motion behavior has automated math coverage but still needs a final live review on a device/browser configured for `prefers-reduced-motion: reduce`.
- The build retains Vinext's existing large-chunk and route-classification warnings; neither is introduced by this task.
