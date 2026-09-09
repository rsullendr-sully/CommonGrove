# Spirit abilities demo — five connected paths

Date: 2026-09-08

Status: Owner selected the middle approach: reusable learning with authored projects, rather than disconnected demonstrations or an open-ended crafting simulation. The owner approved proceeding with the first milestone on 2026-09-08. Implementation planning follows this contract; later batches still require focused designs. None of the new abilities below is claimed implemented.

## Outcome and boundaries

Demonstrate 20 abilities across five connected paths. The viewer should understand what each spirit knows, where that knowledge came from, what it enables, and how it changes life in the garden. Learning must produce visible actions and useful or playful results, not only journal badges.

Keep Pip, Moss and Fern, their approved small cartoon appearance, grounded movement, and the existing warm garden style. Pause environment polish. New project props and action animations are in scope; landscape redesign, human hands, worker uniforms and classroom presentation are not.

Spirits choose activities. The player supplies opportunities through explicitly fictional accomplishment controls and watches. No assigned professions, needs, neglect, decay, tool breakage, expiring materials, employee scores or compulsory care. Ordinary resting, exploring and social behavior remain part of the experience.

Use local deterministic simulation, not network AI. Persistence, real workplace integrations, multiplayer, football, public deployment and additional residents are outside this demo. Football remains a long-term application of learned construction, play and cooperation.

## Why this approach

- Disconnected scenarios would be quicker initially but would not demonstrate knowledge transferring between projects.
- **Selected:** a small shared ability/project system with authored actions and fixed safe project sites. It supports meaningful combinations while keeping results testable.
- An open-ended crafting economy or general planner would add inventory, placement and planning complexity before the underlying experience is proven.

This is a program-level design plus a detailed first milestone. Later batches require their own focused designs and implementation plans; listing them here does not mean their geometry, animation or acceptance work is complete.

## The learning loop

Opportunity → discover knowledge → try an action → complete something → use it or share the knowledge.

Per-spirit knowledge has three descriptive states: **unfamiliar**, **familiar**, and **practiced**. A completed book encounter or valid nearby observation makes an ability familiar, permitting its authored action. The first successful use makes it practiced. These are explanatory states, not numerical levels or speed bonuses. Reading alone never marks an ability practiced.

An action with prerequisites requires the actor to be familiar or practiced in every prerequisite. Reading can expose later abilities, but their actions wait for prerequisites. The journal explains the missing prerequisite. Interruptions grant no partial completion or learning credit; they do not remove already earned knowledge.

All spirits can read, observe, carry small supplies and attempt basic movement. These baseline behaviors do not count toward the 20 abilities. Observing a qualified spirit remains a universal way to learn; the later demonstration ability adds proactive teaching rather than being required for every observation. No teaching deadlock is allowed.

Appearances never lock abilities. Seeded interests may influence what a spirit chooses first, but all three can learn all abilities. Solo-compatible projects must not depend on finding a second spirit. Explicit cooperative actions wait safely for two available participants and explain why they are waiting.

## Ability catalog

Prerequisites below apply to performing an action, not merely seeing its book. All rows are planned. Existing assembly, planting and watering provide implementation foundations, not evidence that this expanded catalog is finished.

| ID | Path / ability | Action prerequisites | Visible proof in the demo |
|---|---|---|---|
| B1 | Building: fit pieces | None | Rotate and seat a wooden part into a matching joint |
| B2 | Building: use a mallet | B1 | Tap a seated joint; fastening visibly completes |
| B3 | Building: brace structures | B2 | Attach a diagonal brace to a small workbench |
| B4 | Building: assemble mechanisms | B3 | Fit an axle and wheel; the completed rolling toy moves |
| G1 | Growing: prepare soil | None | Tip soil into a bed and level its surface |
| G2 | Growing: plant seeds | G1 | Place seeds in prepared soil; the planted stage appears |
| G3 | Growing: use a watering can | G2 | Carry and tilt the can with a readable pour, then put it away |
| G4 | Growing: gather mature plants | G2 | Gather a flower from a ready bed and place it in a basket |
| C1 | Crafting: shape clay | None | Press a clay lump into a small pot |
| C2 | Crafting: weave fibers | None | Alternate strands until a basket takes shape |
| C3 | Crafting: mix pigments | None | Combine colored ingredients into a visibly mixed pigment |
| C4 | Crafting: decorate objects | C3 | Apply marks to a finished pot, basket or toy |
| S1 | Cooperation: carry together | None | Two spirits lift, travel with and set down one shared piece |
| S2 | Cooperation: hold parts steady | B1 | One steadies a part while another qualified spirit fastens it |
| S3 | Cooperation: pass tools | None | One offers a tool and the other receives it, without duplicate ownership |
| S4 | Cooperation: demonstrate a skill | None; a practiced target skill | A spirit invites an unfamiliar observer and demonstrates that specific action |
| P1 | Play: balance | None | Step across a low balance prop with grounded corrective poses |
| P2 | Play: roll toward a target | None | Aim and roll a ball toward a marker; approach and retrieve it |
| P3 | Play: catch | P2 | Anticipate and receive a gentle authored toss |
| P4 | Play: pass to a partner | P3 | Two spirits take turns sending and receiving the ball |

Practice setups are safe, non-punitive and repeatable. A catch has a solo practice source as well as a partner version so learning does not require a second trained catcher. Rolling, catching and mechanism motion use bounded authored trajectories initially, not a general sports physics engine.

Growing does not introduce upkeep. A planted bed becomes ready after a defined amount of active simulation time independent of watering; readiness persists while absent. Gathering is optional and does not destroy a project or create mandatory replenishment. Exact growth pacing and regrowth presentation belong in the growing batch design.

## Authored projects and reuse

The same skill must work outside the object on which it was learned. First demonstrate this with B1/B2 on both the planter and tool rack.

- **Planter:** fit and fasten its frame, prepare soil, plant. Preserve the existing materials-first and knowledge-first behavior.
- **Tool rack:** fit the base and upright, fasten joints, install a crossbar. Afterward, spirits place and retrieve the shared tools from it. It must not require itself to provide the first mallet.
- **Small workbench:** combine fitting, fastening and bracing, with optional shared carrying/steadying. A solo-compatible alternative remains possible for construction; the cooperative ability demonstration itself requires two.
- **Pot, basket and decorated objects:** give growing and crafting results somewhere to go without adding a resource economy.
- **Rolling toy and compact play props:** connect construction to voluntary play rather than construction being an end in itself.

Material deliveries are finite, project-specific bundles. No trading or generic crafting inventory is needed. Each project has its own idempotent delivery ID and stage progress. Tools are reusable shared resources. Pigment, soil and other consumable inputs are allocated once to their project; interruption cannot spend them again.

The completed rack becomes the storage anchor for existing tools only after their current claims end. This changes their resting location, not their identity or count. Tool use must remain possible from the starter basket before a rack exists.

Keep the number of large active build sites bounded: one new construction project at a time in the first milestone, while completed props remain usable. Future scenarios may load different project sets rather than cramming every prop into the garden. Site selection must preserve the existing reading approach and player/resident paths.

## Demo controls and comprehension

Add a clearly styled **Learning demo** entry next to the existing garden journal access; do not bury it below simulation controls.

The panel offers:

- **Learn from scratch:** launch a named scenario with unfamiliar spirits and explicit knowledge/material events. This is the real causal demo.
- **Preview learned abilities:** launch a labeled test fixture with named prelearned skills and available materials. It is a visual inspection shortcut, not earned progression.
- **Watch project:** show its location and turn the first-person view toward the active work without teleporting the player or forcing continuous camera movement. Provide a directional cue if the work is obscured.
- **Replay scenario:** explicitly explain that it resets this local demo, require confirmation, then create a fresh session epoch. Cancel must preserve the session. Do not silently erase the ordinary garden journey.
- **Spirit knowledge:** show each resident's familiar/practiced abilities and how they learned them. Also show useful waiting reasons such as no book, no materials, occupied tool or partner unavailable.

Starting either scenario mode explicitly warns that it replaces the current local simulation and requires confirmation when a session is underway. Preserve a route back to a fresh ordinary journey. Scenario state is isolated from the ordinary journey; fixtures must not leak knowledge or materials into it. Existing journey comparison continues to use immutable historical state; demo scenarios need not add a new historical timeline.

Use one compact recent-events list and one current-activity line per resident. Announce meaningful transitions, not every frame. Keep full controls keyboard accessible and reserve live-region announcements for milestones. Future, unimplemented scenarios are labeled planned and cannot be launched.

## Architecture and migration

Existing seams are `gardenSession.ts`, `planterProgress.ts`, `planterCoordinator.ts`, `projectActivity.ts`, `ResidentActor.tsx`, `PlanterProject.tsx` and `PlanterJournal.tsx`. Extend these boundaries incrementally, not by copying a new coordinator for each recipe.

1. **Ability catalog and knowledge reducer:** stable IDs, prerequisites, per-resident learning state and source evidence. Validate IDs and catalog acyclicity. No React or scene dependencies.
2. **Project definitions and progress:** typed stage graphs, material requirements, required abilities, action IDs and completion state. Keep visual prop definitions outside the reducer. Validate referenced abilities, reachable stages and no prerequisite cycles.
3. **Shared scheduler/reservations:** select valid project or learning actions through the existing resident arbitration. One resident/tool/slot has one owner. Player interactions and reward missions retain priority; interrupted work resumes safely.
4. **Action adapters and presentation:** existing safe locomotion drives approach, then typed action adapters supply poses/props. Renderer callbacks alone cannot award knowledge or construction; validated simulation events do so.
5. **Session and scenario boundary:** owns durable-in-session knowledge/project progress, scenario fixtures, epochs and ordinary journey snapshots. Keep transient routes/claims separate from completed progress.
6. **Demo panel:** reads selectors and sends explicit scenario/opportunity events. Do not duplicate progression rules in UI components.

Introduce the first four catalog abilities before enabling the rest. Existing session assembly maps to familiar B1/B2 and existing planting maps to familiar G1/G2. Do not invent practice history from the old coarse flags. Retire the old authoritative knowledge fields at the migration boundary rather than maintaining two independently writable stores. Fresh sessions learn through the new encounters. No cross-refresh save migration is needed because the prototype has no persisted saves.

Keep existing appearance and interaction components intact except for small action/prop integration points. Avoid expanding `ResidentActor.tsx` into a recipe registry; put action-specific presentation in focused modules.

## Safety, interruptions and pacing

Progress requires the correct actor, ability, stage, owned resources and valid nearby action position. Observer learning requires proximity throughout a completed observed action. Repeated events, stale epochs and duplicate deliveries must not advance anything twice.

Pickup or explicit interaction releases transient work claims. Completed stages and allocated materials survive. A pending carried prop returns to its supply anchor rather than following a released actor. Joint tasks acquire participants/resources together; losing one participant cancels the unfinished joint action and releases both claims safely. Tool handoffs change ownership once at a validated shared action boundary.

Blocked routes retry within a bound and then release/reassign. No teleport-to-target completion. Preserve the existing documented stopped waypoint correction limit of .16 units; do not claim strict no-snap movement until it is improved separately. Reserve final project footprints and work positions consistently for routing, player collision and scene geometry.

Hidden tabs, historical comparison and inactive scenario sessions do not advance simulation. Restore without accumulated elapsed-time bursts. Pause and reduced motion must retain understandable action states. Tests use fixed seeds and explicit deltas; runtime choices remain deterministic under the same inputs.

New project selection includes bounded breaks and avoids starving ordinary activities. For the first milestone, aim for 2–4 active simulated minutes per scenario after required opportunities are available in an unobstructed seeded run. Player interruptions pause the expectation. Do not claim all 20 abilities fit in that duration.

## Delivery stages

### First milestone — reusable foundations and two projects

Implement B1, B2, G1 and G2; migrate the planter; add the tool rack; add the accessible demo panel and per-spirit knowledge explanations. Preserve existing watering as ambient behavior without counting it as the finished G3 skill.

Scenarios: planter with materials first; planter with knowledge first; tool rack from scratch; a clearly labeled learned-skills tool-rack preview; and a planter-to-tool-rack transfer scenario. Exercise Pip alone and all three residents. The transfer scenario retains earned knowledge from the completed planter and offers tool-rack supplies in the same scenario session, without a second book award. Each project receives its own supplies.

The expanded nook's existing making-and-growing book teaches familiar B1/B2/G1/G2 on a completed encounter. Observation teaches only the particular performed action's ability. A tool-rack scenario can use this same book; learning growing knowledge does not automatically create a planter or its supplies.

This milestone does not add cooperative lifts, crafting, growth harvesting, mechanisms or ball physics. It proves a new recipe can reuse the same knowledge, scheduling and validation boundaries.

### Second milestone — cooperative building

Add B3 and S1–S4 (nine catalog abilities total). Build a small workbench; demonstrate shared carrying, steadying, tool handoff and proactive teaching. Design/test joint reservations and participant interruption explicitly before shipping these actions.

### Third milestone — growing, crafting and mechanisms

Add G3–G4, C1–C4 and B4 (16 abilities total). Deliver pots, baskets, pigment/decorating and a rolling toy, with actual post-construction use. Define safe sites, active-time growth pacing and resource ownership in the focused batch design.

### Fourth milestone — play and integrated demonstration

Add P1–P4 (20 abilities total). Show balance, aimed rolling, catching and passing in small original play setups. Add mixed-knowledge scenarios where spirits learn from one another and use completed creations. No competitive scoring or football implementation.

## Acceptance and evidence

For the first milestone:

1. Books, knowledge and materials are independent gates. Both arrival orders progress only after prerequisites exist.
2. A valid encounter teaches only its participant; successful action changes familiar to practiced. Interrupted reading/observation cannot award learning.
3. Planter and tool rack use the same B1/B2 definitions. Retained earned skills enable the second project without relearning.
4. Only the enabled first four abilities are counted as implemented; existing ambient animations do not inflate the count.
5. Tools, residents and slots have exclusive ownership; duplicate and stale events are harmless.
6. Each project in solo and three-resident normal-navigation scenarios finishes within 240 active simulated seconds after its prerequisites are available, without overlapping work positions or blocking the nook. The two-project transfer scenario has a separate budget per project, not a 240-second total.
7. Pickup, route blockage, unavailable residents, remount, comparison and hidden-tab pause preserve correct progress and recover safely. Canceling scenario replacement preserves current state.
8. Preview mode clearly states which knowledge was seeded. Reset produces a fresh epoch; no demo state leaks into the ordinary journey.
9. Browser review at normal camera height shows reading, fitting, tapping, soil preparation, planting and tool-rack use. Review actual visual results separately from automated contracts.
10. Keyboard navigation, focus restoration, camera comfort and reduced-motion presentation are checked; unverified platform checks remain explicitly open.

Each later ability must have a source encounter, prerequisite test, distinct visible action, usable outcome, replayable scenario and recorded visual review before it counts toward the 20. Cooperative rows also require partner-unavailable and interruption tests. Record implementation, automated verification, visual verification and owner acceptance separately.

Run focused catalog/reducer/coordinator/session/navigation tests, then the full regression suite, lint and production build per milestone. Report standalone TypeScript's existing diagnostics separately and do not treat old failures as permission to introduce new ones. Do not claim automated tests establish emotional quality, performance or owner approval.

## Review decision

The first milestone is approved for implementation planning. Implement it with verification, then use its results to refine subsequent batches. Implementation, visual verification and owner acceptance remain separate gates.
