# Approved garden beings

Owner approved all three designs in `approved-garden-beings-2026-09-05.png`.

- B / Wisp is the default and should be the most commonly received form in a future arrival system. Pip uses B.
- A / Roundling is represented by Fern.
- C / Pebblekin is represented by Moss.
- Future forms can have different rarity. No numerical probabilities or acquisition rules have been chosen; current arrivals remain the authored three-resident preview.

Shared appearance: distinct large head and compact body, expressive eyes, small side paddles and tucked feet, warm matte ceramic, restrained sage details and amber insets. No animal ears, human hands, boots, armor or visible mechanical joints. Retain the reduced 0.72 world scale.

The saved image is concept art. The first code-native interpretation uses sculpted head geometry, layered eyes, pose-driven brows and mouth, and walking oval feet. It is a starting implementation for visual review, not an exact reproduction of the concept rendering.

## Warmth and expression refinement

### Finding wandering residents

The journal now offers Find for each arrived resident. It closes the journal, returns keyboard focus to the garden, and turns the camera toward that resident's current position without moving the player or interrupting the resident. Repeat requests reacquire a wandering resident; requests expire when the visit, comparison view, or session changes. Find is disabled during busy interactions and historical comparison. Scenery can still obscure the target. Browser checks centered Moss and aimed toward Fern among the flowers. Refresh still restarts the authored simulation with Pip only; Simulation controls → Preview three residents opens the third return with Pip, Moss, and Fern.

### Close-up interaction check

Browser review exercised Pip greeting, petting (closed smiling eyes and brief heart), pickup and placement. Looking away cleared the target prompt. Corrected stale listening-ear captions and the third-return summary to describe the current sprite rather than removed anatomy. Pip's old animal portrait in the status bubble now uses the same color/initial badge as the other residents. No new behavior or silhouette change in this pass. Focused presentation/interaction/journey tests: 44 passed. Full per-resident feeding/play and uneven-terrain visual checks remain outstanding.

### Shared sprite direction approved

Owner preferred the Pip-only cartoon trial and approved extending it to Moss and Fern. Pip remains the reference unchanged. Moss has a slightly wider mint shell and three-leaf tuft; Fern has a slightly narrower rose shell and bud/leaf crest. All three now share the continuous body, broad foot pads and bounded walking squash. Removed the superseded split-torso and clothing-hat renderer. Resident identities, colors, arrivals and behavior stay intact. This supersedes the earlier instruction to preserve Fern's old appearance for comparison.

Verification: 37 focused resident, pose, gait and acting tests passed; the local garden rendered without a blocking overlay.

Follow-up regression review: the sprite renderer had dropped the existing greeting perk when replacing the old body scale. Restored the perk through the volume-preserving squash helper, including floor-height compensation and reduced-motion suppression. Added a failing-then-passing regression test. Full suite: 318 tests passed across 33 files; targeted lint passed. Scene loading checked, but a close-up visual review of every reaction remains outstanding.

### Pip-only cartoon sprite comparison

Owner approved a one-resident trial to move beyond miniature-person cues. Pip now uses one continuous golden bean shell, a two-leaf crest instead of a hat, small paddles and broad foot pads. No distinct torso, head seam or technical side inset. Grounded steps are retained; a bounded, volume-preserving gait squash is disabled at rest and in reduced motion. Moss and Fern remain unchanged for comparison. This is a visual trial, not an approved replacement for all residents.

### Fern as the visual reference — September 6

Owner prefers Fern and still reads Pip/Moss as children. Preserve Fern exactly. Pip and Moss now derive their head shells from Fern's soft squared shape, with subtle width differences, level face placement and low soft hats instead of a brimmed cap or bucket hat. Pip's forehead inset moves to the side, matching Fern's restrained technical accent. Colors, resident identities, arrival rules and independent behavior remain unchanged; B remains the default identity rather than retaining its rejected tapered silhouette.

### Creature, not child

Owner explicitly rejected miniature people and a child-simulator direction. The shared rig now has a low, broad seed body, a flattened head nestled against it, embedded side nubs rather than hanging hands, and wider-set grounded feet. Removed chest-button styling, eyebrows and pink cheek patches. Existing hats, colors and form identities remain. Greeting is a single subtle whole-body perk rather than a hand wave or human nod; reduced motion suppresses it. This changes presentation only: autonomous exploration and resident interactions remain, with no new dependency or parenting mechanics.

Verification: 24 focused acting, pose and grounded-step tests passed; targeted lint passed. The local preview responded successfully and displayed the scene without a blocking error.

### Grounded walking and simpler faces

Owner approved replacing the layered iris eyes with dark ovals and one highlight, a rounder Wisp crown and a smaller head/body gap. Hats, palette, shared forms and world scale are preserved. Feet now use a distance-driven .42-world-unit cycle with 60% stance, canceling straight-line forward travel at the .72 character scale; swing feet lift and return, with double support between steps. Body weight shifts and foot settling ease out when movement ends. Turning and uneven terrain are not full world-space inverse-kinematics foot locking.

Verified 24 focused pose/acting/gait tests and successful production build. Browser preview showed the three residents and updated face with no blocking overlay; full terrain/turning gait review remains a follow-up.

### Proportion and acting review

The initial head width was roughly twice the torso width (even wider for C); tiny torsos exaggerated the separated parts. The refinement widens the torso from .34 to .41 model units and scales the head assembly to .94, preserving small hover gaps and overall world scale. B's crown rise is softened from .115 to .06. Eye spacing is narrowed, depth flattened and the outer eye rim removed.

Presentation now includes staggered blinks, small inspection glances and head turns, a short greeting wave/nod, eased head tilt and subtle stationary breathing. Reduced motion disables these secondary motions while retaining expressions. Icons last at most 2.2 seconds per activity. These are visual cues, not inferred persistent emotions.

Passive proximity pauses expire after four seconds; active reticle targeting still holds a resident for interaction. Leaving the vicinity resets the invitation. This prevents proximity alone from causing indefinite staring.

Verification: 72 focused acting, pose, interaction and behavior tests passed. Targeted lint passed. The visual/acting build passed before the final passive-attention fix; that fix received focused regression tests. Browser review covered the three-resident arrival composition and settled scene; exhaustive manual reaction testing is still pending.

Final preview verification is incomplete: an interim hot-reload ReferenceError was corrected, but subsequent page requests timed out while the Vite client/debug endpoints responded. Restarting the local worker, retrying outside the sandbox, and recoverably renaming `node_modules/.vite` to `.vite-preview-recovery-20260905` did not yet establish a successful page response. No application state was deleted. Resolve this local rendering issue before calling the live handoff verified.

The next owner-directed pass adds a tilted cap to Pip, a bucket hat to Moss, and a beret to Fern. Smaller torsos leave visible gaps beneath the heads and above the stepping feet; side paddles sit apart from the body. Heads and hats share the expression tilt, and existing pose motion coordinates the separated pieces without adding continuous bobbing. The world scale remains 0.72.

Owner found the first implementation too alien and requested colors, facial expressions and expressive icons. Pip now uses honey-gold, Moss mint, and Fern dusty rose, with lighter faces, warm cheeks, smaller dark pupils and softer brows. Rest uses sleepy eyes; petting uses smiling closed eyes and a heart; greeting/eating and play use cheerful expressions with small sparkles. Icons follow the current pose, remain static for motion comfort, and disappear outside the relevant activity. They convey a moment, not a score or need. Existing reduced-motion behavior retains expression readability.
