# Spirit learning and the first shared planter

Date: 2026-09-06
Status: Owner approved the planter concept; this written specification awaits review before implementation planning.

## Direction

Accomplishments should expand what the spirits can do, not only the scenery around them. The owner wants to watch autonomous spirits learn practical knowledge, use tools, and build together. Football and spectator multiplayer are long-term goals, not this milestone. This records a future direction beyond the original charter's competitive-system non-goal; it does not authorize implementing multiplayer or employee rankings now.

The approved first project is a shared planter with a starter tool basket. Preserve the current cartoon sprite silhouettes, individual colors, small scale, grounded walking, and warm garden art style. Do not introduce human hands, worker uniforms, childlike lessons, or required care.

## Approach and scope

Use one authored project with real state transitions and autonomous task selection. This is more reusable than a timed construction cutscene, but much smaller than a general crafting economy or open-ended AI planner. A book actually enables learning; learned abilities actually gate construction; supplies are actually committed to the project. Visuals reflect that state rather than merely implying those systems exist.

Included: one making-and-growing book, a basket containing a small mallet and watering can, a delivery of wooden pieces, soil and seeds, one planter, per-resident learned abilities, cooperative task reservations, and occasional use after completion.

Excluded: benches, workbench construction, free placement, recipe trees, trading, numerical skill levels, permanent professions, tool durability, sports, networking, real accomplishment integrations, backend services, offline simulation, and persistence across page refresh. These can be separate milestones after this loop works.

## Experience

1. Expanding the reading nook adds a distinct picture book about making and growing. A nearby available spirit approaches and investigates its diagrams. Completing this encounter teaches simple assembly and planting to that spirit, not instantly to everyone.
2. A fictional material accomplishment delivers a small visible bundle and starter tools. If nobody has learned yet, the supplies remain safely waiting. If knowledge arrives first, the project waits for supplies without repeating a request or creating urgency.
3. An eligible spirit autonomously starts the planter when both prerequisites exist. Other available spirits can help carry supplies. A learner can watch assembly or planting and gain that specific ability after completing a nearby observation encounter.
4. Pieces are carried from the delivery basket to a fixed build site. The planter becomes a base, then a frame, then a soil-filled bed, then a planted bed. Objects appear at completed action boundaries, not on a global reveal timer.
5. The spirits react to the finished planter and resume their ordinary lives. Later visits to it include inspecting sprouts or using the watering can. Watering is ambient play: plants never become unhealthy or demand attention.

With only Pip present, the project can finish sequentially. With multiple spirits, separate carrying and observation positions allow cooperation. Personalities may influence selection, but no appearance or resident identity is permanently assigned a job. Knowledge already learned is retained for the current session.

Aim for a complete unobstructed demonstration within roughly two to four minutes after both unlocks, including travel. This is a prototype pacing target, not a deadline imposed on the player or an offline-growth promise.

## Accomplishment and preview integration

Preserve the existing flower, reading-nook, seed, and destination journey. The reading-nook reward additionally makes the book available. The existing three-resident preview must also expose that book, because its nook is already expanded; it must not silently mark all spirits as trained.

Add a clearly labeled fictional materials event in Simulation controls, available even before the nook is expanded so either arrival order can be demonstrated. These controls simulate external accomplishments, not player-issued work orders. Do not map particular real job roles exclusively to knowledge or materials.

Use unique event IDs and ignore repeated delivery events for the same project. This slice has one complete supply bundle, not a resource shop or infinite material counter. Use the existing Restart journey control to replay; no additional project-reset control is needed.

The journal explains the current cause and effect in plain language: a new book, a spirit discovering assembly, supplies waiting, construction underway, or a planter in use. No employee scores or public reward totals. Keep Find resident available under its current interaction rules.

## State and component boundaries

- A pure project-state module owns book availability, processed accomplishment IDs, per-resident assembly/planting knowledge, supply status, and completed construction stages. Supply status is absent, available, committed, or used. Commit once when building begins; interruption keeps it committed to this project.
- A separate pure project coordinator selects eligible available residents, reserves the basket/tool/work/observation slots, and produces approach/action directives. Only actions performed at a valid reserved position advance state. Carrying requires no learned construction ability. Assembly requires assembly knowledge; planting requires planting knowledge.
- Extend the existing community coordination boundary to arbitrate project directives against toy play and greetings. A resident and a tool may have only one owner at a time. Direct player interactions and reward missions take priority, followed by an already-reserved project action, followed by new project tasks and ordinary autonomous activity. Release any conflicting social/toy claim before granting a project reservation.
- ResidentActor consumes the selected directive through existing safe route locomotion. New poses and attached props express reading, carrying, gentle mallet taps, soil placement, planting, and watering. Rendering must not award knowledge or materials.
- A project scene component renders the book, basket, supplies, and staged planter from project state. Use one layout definition for visible footprints, player collisions, resident obstacles, and approach points. Validate a fixed level site near the nook without obstructing its entrance, established routes, or existing destinations.
- Page/journey integration owns project progress for the session so a scene remount or later return does not discard it. Transient reservations are recreated safely. Capture a project snapshot before each reward change during the first visit and before each later return. Historical comparison pauses the coordinator and renders the corresponding snapshot; live learned abilities and supplies cannot change from that view. Returning to Now restores the current project.

Use seeded selection and explicit delta input for repeatable tests, not wall-clock time or a network AI service. Progress advances only during active simulation, with capped frame delta. Hidden tabs and historical comparison do not fast-forward construction.

## Interruption and recovery

Picking up a participant releases their task and tool reservation. An unfinished carried piece returns to the project supply area; completed stages and committed materials remain intact. Placement allows the coordinator to offer a task again. Other available spirits can continue eligible work.

A blocked route triggers a bounded retry or releases the task for reassignment. It never teleports a spirit, completes an unreachable task, spends another bundle, or advances learning from a distance. A stationary observer must be nearby throughout the observation action to learn. Repeated completion callbacks are idempotent.

Construction creates collision geometry only at its defined stage boundaries. Work slots remain outside the final footprint so assembly cannot trap a spirit or the player. If all spirits are unavailable, progress simply waits. Passive visitor attention must expire so merely watching does not indefinitely starve the project; explicit interaction can pause the affected participant.

Restart journey clears the project alongside existing journey state. Refresh also starts over, with the prototype's reset behavior plainly stated. No loss from in-world neglect, failure to water, or a quiet period is introduced.

## Acceptance and verification

1. Knowledge without materials and materials without knowledge both wait safely. Adding the missing prerequisite allows autonomous progress.
2. A spirit learns only from a completed book or valid observation encounter. Untrained spirits can carry but cannot independently assemble or plant.
3. One spirit can complete the project; three can cooperate without double claims, overlapping work slots, or mandatory player instructions.
4. Duplicate deliveries and action callbacks cannot duplicate supplies, consume them twice, or skip build stages.
5. Pickup, blocked paths, temporary participant unavailability, comparison, return, and scene remount preserve completed progress and recover transient work safely. Explicit resets clear it.
6. Browser review shows visible book investigation, grounded carrying, tool use, staged assembly, planting, and subsequent voluntary use. Check from the player's normal camera height, not only a close-up debug view.
7. Reduced-motion mode retains readable actions without pronounced bouncing or rapid effects. Journal controls remain keyboard accessible.
8. Existing resident finding, direct interactions, paths, reading-nook access, rewards, and destination choices still work. Run focused reducer/coordinator/navigation tests, the full suite, lint, and production build; visually verify the complete loop before claiming completion.

## Later milestones

After the planter is understandable and enjoyable: more practical recipes, reusable tool knowledge, varied interests and practice, persistent local progression, then larger cooperative projects. Autonomous sports and cross-garden spectator matches require their own design, fairness rules, and multiplayer implementation. None is represented as already supported by this first project.
