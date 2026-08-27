# Pip and Exploration Expansion — Design

Date: 2026-08-27  
Status: Approved for implementation planning
Scope: Local Common Grove prototype

## Objective

Deepen the owner-reviewed prototype before staff validation by making Pip feel like a grounded, autonomous 3D creature and making the existing garden more enjoyable to explore.

The expansion uses the Chao Garden from *Sonic Adventure 2: Battle* as behavioral inspiration: a compact revisitable space becomes emotionally interesting because a small creature wanders, notices, rests, plays, and responds without waiting for commands. Common Grove will not copy Sega characters, artwork, names, sounds, models, environments, progression systems, or other protected assets. Pip, the garden, and all interactions remain original.

## Product boundaries

This work preserves the existing product principles:

- Pip remains autonomous and never becomes another responsibility.
- Absence causes no hunger, sadness, sickness, decay, or lost progress.
- Accomplishments remain the source of essential garden progression.
- Direct interactions create temporary delight, not scores or required resources.
- The prototype remains local-only and uses simulated state.
- There is one employee, one garden, and one companion.
- No production integrations, accounts, database, multiplayer, breeding, competition, or persistent inventory are introduced.

## Recommended delivery approach

Build a procedural articulated 3D Pip now, then allow a professionally rigged GLTF character to replace the renderer later without replacing the behavior system.

The procedural character is the right validation asset because it makes proportions, locomotion, interaction, and behavior tunable inside the existing Three.js codebase. It avoids blocking behavioral validation on a Blender modeling and rigging pipeline. The later GLTF asset is a visual-fidelity upgrade, not a prerequisite for testing the experience.

## Architecture

Separate the expansion into four responsibilities:

1. **Character renderer** — draws Pip's articulated 3D clay form and poses it from animation inputs.
2. **Locomotion controller** — owns grounded movement, facing, acceleration, arrival, and obstacle-safe targets.
3. **Behavior selector** — chooses autonomous activities from garden state, proximity, priorities, repetition limits, and cooldowns.
4. **Interaction controller** — resolves the employee's current first-person target and manages greeting, petting, carrying, placement, food, and toys.

These units communicate through explicit states rather than reaching into one another's animation refs. A future GLTF renderer should consume the same locomotion and activity states as the procedural renderer.

## 3D Pip character

Pip will be assembled from original smooth, matte clay-style forms. The design preserves the approved compact pear silhouette, small stature, uneven listening ears, dot eyes, three cheek freckles, and gently asymmetrical smile.

The procedural model includes:

- Pear-shaped torso and head mass
- Two distinct ears, with one listening ear
- Very short articulated legs and visible feet
- Small articulated arms
- Face and freckles integrated into the 3D form
- A soft grounded contact shadow

The model must read as Pip at the existing conversational scale. It must not imitate Chao anatomy, coloring, head ornaments, facial design, or evolution forms.

## Natural locomotion

Pip will no longer move through direct position interpolation. His locomotion will provide:

- Acceleration from rest
- Deceleration and arrival braking
- Rotation toward the intended direction before and during movement
- No sideways sliding toward a target
- Alternating planted feet derived from actual distance traveled
- Restrained vertical body motion
- Subtle body lean and counter-swinging arms
- Smooth transitions among idle, turn, walk, and arrival poses
- A shadow that remains attached to ground contact

Walking speed may vary by activity, but ordinary wandering remains calm. Urgent garden-change investigations may use a quicker trot without becoming frantic.

Reduced-motion mode retains readable foot changes and turning while removing secondary bounce, ear sway, exaggerated lean, and decorative motion.

## Employee exploration

The garden remains the approved 40 by 40 meter bounded space. Employee movement changes from 2 meters per second to 4 meters per second. The camera height, first-person viewpoint, garden boundary, pond constraint, and scenery collision remain intact.

The faster movement must preserve diagonal normalization and frame-rate independence. Subtle environmental composition and Pip's own activity should guide the employee toward points of interest; the prototype will not add quest arrows, objective markers, a minimap, or an open-world navigation system.

## Autonomous behavior

Pip chooses from a compact set of observable activities:

- Wander to a safe garden interest point
- Pause and look around
- Inspect flowers
- Watch or approach the pond edge
- Visit the reading pavilion
- Inspect the discovery seed or selected destination
- Sit or rest briefly
- Notice and greet the nearby employee
- Investigate newly created garden changes
- Resume ordinary activity after a reaction

The selector uses priorities rather than a fixed patrol loop. Garden-change reactions override ordinary activities. Employee proximity can interrupt an ordinary activity but does not cancel a higher-priority scripted reward reaction.

Each ordinary behavior has an eligibility rule, duration or completion condition, cooldown, and recent-action penalty. Pip will not select the same ordinary activity twice in succession when another eligible action exists.

If Pip cannot reach a target within a short timeout, he abandons that target and selects another. He must never cross the pond, garden boundary, or known scenery obstacles to complete an activity.

This layer creates variety without simulating needs. There are no hunger, sleep, hygiene, health, affection, or neglect meters.

## First-person interaction

The employee interacts from the existing first-person view. No external camera or visible employee avatar is added.

When the center reticle rests on Pip or an interactable object within range, the interface displays one clear contextual action. Keyboard users press **E**; touch and pointer users receive an on-screen action button.

Supported interactions are:

- **Greet Pip** — Pip turns toward the employee, approaches slightly when safe, and gives a brief response.
- **Pet Pip** — Pip pauses, leans into the interaction, and gives a short pleased reaction.
- **Pick up Pip** — Pip moves to a stable lower-camera carrying pose.
- **Place Pip** — Pip is gently placed at the nearest valid ground position in front of the employee.
- **Pick up an object** — the selected food or toy moves into the carrying pose.
- **Place an object** — the object is placed at a valid nearby ground position.
- **Offer an object** — Pip receives an eligible carried food or toy when close enough.

The employee may continue moving while carrying Pip, but movement slows modestly to keep the pose readable. Pressing Escape cancels carrying and safely places the held character or object.

Placement validates the garden boundary, pond edge, and scenery obstacles. If the requested position is invalid, the system chooses the nearest safe position. If no nearby safe position is available, it returns the held item to its last safe position and explains the result without an error dialog.

## Food and toy interactions

The first slice adds one original food item and one original toy placed naturally within the garden.

Food triggers a short eating sequence and a temporary positive reaction. The toy triggers a short play sequence. These interactions do not:

- Create hunger or feeding schedules
- Grant points or essential progress
- Add an inventory or currency
- Unlock statistical advantages
- Penalize the employee for ignoring them
- Persist after refresh

Pip may temporarily prefer one object through animation and copy, but persistent preference learning is deferred.

## Existing reward and choice flow

The three simulated accomplishment reactions remain higher priority than ordinary autonomous behavior. Pip turns and travels naturally to each garden change, investigates it, pauses, and returns to autonomous activity.

After the employee confirms Lantern Orchard or Tinker Workshop, the discovery seed fades or sinks into the ground while the chosen destination grows into view. The seed remains visible in the historical **Before** comparison where appropriate but is consumed in the selected path's current state.

## Privacy-preview clarification

The coworker-visit comfort prompt will explicitly state that it is a temporary research question. Selecting **Comfortable**, **Unsure**, or **Invasive** does not enable a visit, contact another person, or save a response outside the current prototype session.

The visible/private boundary remains unchanged: a hypothetical visitor may see garden appearance and companion activity but never work events, explanations, totals, comparisons, or activity history.

## State and persistence

All new behavior and interaction state is local to the active prototype session. Refresh and **Restart prototype** restore the authored opening state.

This is deliberate. Reliable persistence would require product decisions about identity, ownership, deletion, schema migration, privacy, and recovery. Those belong to later releases and are not needed to validate locomotion, exploration, or interaction quality.

## Accessibility and input

- Keyboard and on-screen movement controls remain available.
- The contextual action is available through keyboard, pointer, and touch.
- Interaction prompts expose clear accessible names.
- Dialog focus containment and Escape dismissal remain intact.
- Carrying can always be canceled without losing the held character or object.
- Reduced-motion settings affect secondary animation without hiding state changes or locomotion intent.
- No essential information is communicated only through animation or color.

## Error handling and safe recovery

- Unreachable behavior targets time out and are replaced by another eligible activity.
- Invalid placements resolve to the nearest safe point or the last safe position.
- Interrupted reward reactions resume or complete deterministically rather than leaving Pip stuck between states.
- Restart resets behavior, carried items, interaction prompts, reward state, choice state, and camera position.
- Missing optional character detail does not prevent the garden from rendering.

## Testing and acceptance criteria

### Character and locomotion

- Pip is visibly 3D and retains the approved original character traits.
- His feet alternate according to distance traveled and visibly contact the ground.
- Pip turns toward targets and does not slide sideways.
- Starting, stopping, and arriving do not produce abrupt position jumps.
- The contact shadow stays grounded during walking, turning, and idle states.

### Exploration

- Employee movement is exactly twice the previous authored speed: 4 meters per second.
- Diagonal travel is not faster than cardinal travel.
- Pond, scenery, and boundary constraints still prevent invalid movement.
- The garden remains legible and comfortable to cross at the faster speed.

### Autonomous behavior

- Pip demonstrates at least four distinct ordinary activities during an extended observation run.
- He does not immediately repeat an ordinary activity when alternatives are eligible.
- Reward reactions interrupt ordinary activities and complete correctly.
- Unreachable targets recover without Pip walking in place or crossing scenery.

### Interaction

- Greet, pet, pick up, carry, place, offer food, and offer toy work with keyboard and on-screen controls.
- Pip and objects cannot be placed inside the pond, outside the garden, or inside known scenery.
- Escape safely ends every carrying state.
- Interaction never creates a score, upkeep requirement, or persistent penalty.

### Existing flow

- All three reward loops still complete in order.
- Before/Now comparison remains coherent after each change.
- Confirming a path consumes the current-state seed and reveals the selected destination.
- The privacy prompt clearly explains the temporary, non-operative feedback buttons.
- Refresh and restart restore the opening state.
- Keyboard-contained dialogs and reduced-motion behavior continue to work.

### Technical verification

- Lint passes.
- Production build passes.
- The prototype opens without application console errors.
- The 3D scene remains responsive on the GPU workstation at the normal review viewport.

## Deferred work

- Rigged GLTF production character
- Persistent preferences, memories, or personality development
- Needs, care schedules, health, breeding, evolution, or competition
- Multiple companions
- Expanded garden footprint or new biomes
- Inventory, currencies, or resource economy
- Accounts, databases, synchronization, hosted access, or production integrations
- Real coworker visits or multiplayer
