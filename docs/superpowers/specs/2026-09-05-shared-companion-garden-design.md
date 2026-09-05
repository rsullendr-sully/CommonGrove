# Shared companion garden — first playable community

Date: 2026-09-05

Status: Direction and gradual arrivals approved; appearance revised after owner feedback and written design awaiting final review. No multi-resident gameplay has been implemented yet.

## Intent and approval

Common Grove is a personal garden with multiple individual creatures, not a permanently single-pet experience. Pip remains its first resident. The owner approved a first milestone with Pip and two additional residents, independent behavior and memories, direct interactions with each, shared play, and gradual arrivals as the garden develops. Three is a testing milestone, not a permanent population limit.

The experience should support five enjoyable minutes of watching or playing without opening simulation controls. Creatures should be distinguishable through what they do as well as how they look. A person who does nothing still receives a lively, welcoming garden.

The 2026-09-04 crafted visual style is locked. Keep the cliff, lighting, Pip's identity and size, first-person view, 40 m garden, 4 m/s player movement, walkable reading terrace, both destination paths and privacy boundaries. No hunger, neglect, decay, rankings, breeding, multiplayer, accounts, persistence, real workplace connections or publication are introduced.

## Approach and trade-offs

Use one reusable resident actor with independent per-resident state, plus a small shared-space coordinator. This extends the tested behavior, locomotion and interaction systems without introducing a new engine.

Duplicating the current Pip component would be quicker to display but would retain hard-coded targeting, shared messages and memory attribution problems. A full artificial-life/physics framework would support a larger simulation but exceeds this milestone. The reusable actor and coordinator provide a focused foundation for later residents.

## Residents and gradual arrivals

Working names for the first roster are Pip, Moss and Fern. These are three example individuals, not three fixed visual classes. Names, appearance and personality are separate data, not special cases in the behavior code.

| Resident | First present | Example appearance combination | Behavioral tendency |
| --- | --- | --- | --- |
| Pip | Return 1 | Existing model and clay finish unchanged | Curious observer; explores landmarks and greets the visitor |
| Moss | Return 2 | Muted sage clay, rounder ears and a subtle original face marking | Quieter; favors resting and watching the pond |
| Fern | Return 3 | Warm apricot clay, a different ear silhouette and face marking | More playful; favors the toy and approaching another resident |

All three remain present on return 4. Neither destination selection nor petting/feeding is required for arrival. These are authored fictional arrivals at existing return milestones, not timed hatchings or additional work quotas. They share the same original base body style, with individual colors and features as specified below; do not import Sega assets or redesign Pip.

The journal briefly identifies a new arrival on its first eligible return. Newcomers use separated, validated ground positions and settle into ordinary behavior; do not spawn all residents at Pip's feet. Arrival copy must not imply a previous meeting. Historical comparison shows only the residents present on the compared return.

Add a discreet simulation control, “Preview three residents,” which advances the existing fictional journey to return 3 with its three initial accomplishment stages. Preserve any existing destination choice and genuinely completed interaction memories. Do not select a destination, invent interactions, regress a later visit or replay an arrival on repeat activation. Disable the shortcut while carrying, reacting, or in historical comparison. Its label/help text explains that it advances the local simulation; Restart journey remains the way back to the beginning.

## Shared body style, individual appearance

Owner clarification: every little guy should have its own style, while sharing a common body style. Colors and features may be common to several residents or distinctive to a particular individual. The shared body, proportions, clay finish and animation rig keep them recognizable as the same creature family. Differences come from a composed appearance profile rather than creating a different species for each resident.

For this milestone, profiles combine body/accent colors, ear shape or tip treatment, and facial/cheek markings. Reuse the original Pip profile unchanged. Common traits, such as a plain coat or rounded ears, may repeat; distinctive markings or an ear combination can give an individual a signature look. Each of the first three must have a different overall combination, including at least one readable non-color feature. Not every trait must be exclusive, and a resident with mostly common features is equally valued.

Keep appearance independent of temperament, arrival order and name: sage coloring must not mean every such creature is quiet, and Moss's name must not select a hard-coded model. Store each explicit appearance profile with its resident definition. It remains identical across rerenders, comparisons and returns. The initial roster is authored and deterministic; no per-frame randomization, rarity tiers, rewards for unusual traits, genetics, procedural population generation, character editor or new persistence is part of this slice. Profiles and feature options should allow later residents to reuse and recombine traits without changing the renderer.

Feature geometry stays within conservative authored interaction/movement bounds, and the common body stays at Pip's approved scale. Preserve warm matte materials and readable expressions; differences must remain visible in the garden, not only in close-up portraits. The table above is an example set built from these options, not a permanent color-to-personality mapping.

## Individual state and direct interaction

Introduce a stable resident ID for each creature. A resident definition contains its name, appearance settings, seeded variation and activity weights. Runtime state contains its own position, facing, activity, cooldowns, current interaction and social/play participation. Memory is keyed by resident ID in the session-local journey state.

Generalize interaction targeting so the creature under the reticle is the actual recipient of a greeting, pet, pickup or offered object. Prompts show that resident's name. Only one object or resident may be held at a time. Petting Moss must not pause Pip or credit Fern with the memory. The selected recipient is captured when an interaction begins; looking away or another creature entering the reticle cannot redirect a completion event.

Keep the existing safe pickup/place behavior, terrain grounding, input support and proximity grace. Only the approached/focused resident waits for a direct interaction; the rest continue their activities. Carried residents do not also navigate, claim toys or join social interactions. Reject missing/removed resident IDs and stale completion events safely.

Store completed pet/snack/toy memories separately for each resident. Autonomous play is not recorded as play with the person. On return, each resident's greeting and activity preference can reflect its own completed experience. Preserve Pip's existing remembered interactions when generalizing the current state. Reset/refresh clears all memories as before. Historical comparison freezes every resident and suppresses live interactions, current memories and chatter.

## Independent life and social moments

Reuse the existing activities and safe landmark routes, varying weights and seeded timing by resident. Temperament is a preference, not a rigid script or a visible statistic. Resident activities should not synchronize on mount or on each return.

Deliver two simple social behaviors in this milestone:

1. **Notice and greet:** an available resident approaches another's safe standoff point; they turn toward one another, make a brief ear/head acknowledgment, then resume independent activity.
2. **Shared play:** a nearby available resident may watch the current toy user, then take a turn after the first releases it. The observer uses a separate safe spot and may leave instead of waiting indefinitely.

Ordinary resting remains available independently; coordinated group resting and a friendship graph are later work. Social moments are optional, finite and subject to cooldowns. User interaction cancels ordinary social/play reservations without penalty. An already-active direct interaction finishes safely before that actor starts any queued reward response. Keep Pip as the lead for existing reward explanations in this milestone; other residents continue living rather than all visiting every reward in formation.

Only one short resident status message is shown at a time. Direct interaction has priority, then Pip's existing reward/arrival story, then a nearby ordinary activity. Identify the speaker accurately, avoid frequent live-region announcements, and do not require reading text to understand the animation.

## Physical toy play and shared-space coordination

Reuse the wooden-ring toy and current pickup/offer flow. An available resident can also notice it on the ground and initiate play without a command. The visible sequence is approach, anticipate, nudge, follow, pause, and either repeat briefly or leave. The toy moves a short, grounded distance with a gentle roll/wobble instead of only tilting in place.

Use bounded kinematic motion with existing surface and obstacle checks, not a new physics dependency. Validate the toy's entire swept footprint, not only its endpoint. It must not move through stones, into the pond, outside the garden or through another resident. If no safe nudge is possible, the resident sniffs/inspects and leaves; do not teleport the toy. Reduced motion keeps the interaction understandable with restrained movement and no decorative bounce.

The shared coordinator grants exclusive toy ownership and social-pair reservations. Check both availability and reachability before a claim. Human pickup cancels autonomous ownership; an explicit offer targets only its recipient. Every claim releases on completion, cancellation, timeout, carrying, comparison, return, restart and unmount. Rotate opportunity after a completed turn so the playful resident cannot permanently monopolize the toy.

Static terrain/obstacle routing remains authoritative. Add resident separation and finite yielding at conflicting movement segments, based on conservative body footprints. Do not push another creature through an obstacle to resolve a collision. A blocked resident waits, replans or selects another activity. Human placement must also avoid other residents. No indefinite waiting, vibrating crowd, or new player-blocking collision wall is acceptable.

## Component boundaries and data flow

- `residents.ts`: roster, IDs, independent composable appearance and temperament definitions, and visit eligibility; no rendering dependencies. Appearance options select shared body features rather than hard-coded resident-specific meshes.
- `journey.ts`: per-resident completed memories and return snapshots; existing garden progression and destination logic remain independent of care.
- `ResidentActor.tsx`: extract the existing actor from `GardenWorld.tsx`; instance-local behavior, navigation, pose and direct reactions. Reuse or parameterize `PipCharacter.tsx` with defaults that preserve Pip.
- `residentCoordination.ts`: pure claim/release, social matching and movement-yield decisions from a shared frame snapshot; no React state mutation per animation frame.
- `GardenObjects.tsx` and a small pure toy-motion module: one authoritative toy position/motion state shared by pickup, autonomous play and rendering.
- Interaction modules: typed resident targets, stable actor registrations, captured recipient IDs and named prompts; use one global player focus/held state with per-resident reactions.
- `GardenWorld.tsx`: compose eligible residents and shared objects; orchestrate the coordinator and route events by ID. Do not copy the current long actor implementation three times.
- `JourneyJournal.tsx`: arrival summary, optional resident memory summaries and the explicit preview shortcut; retain discreet controls and no care dashboard.

Flow: journey projection determines the roster and memory profiles; resident actors propose activity/movement; the coordinator resolves shared claims and movement conflicts; approved actor/object state drives rendering. Completed direct interactions dispatch one recipient-specific memory event. Comparison/return/reset invalidate transient actions before projecting a new scene.

## Failure handling and verification

Pure tests precede implementation. Cover population across returns and history; idempotent preview advancement; independent state and memory; stale/wrong-recipient completions; one held target; exclusive and fairly released toy claims; cancelled offers; pair cancellation; safe toy sweeps and resident separation; blocked-route recovery; reset and reduced-motion branches. Retain all existing Pip and garden regression tests, adapting singleton fixtures without weakening their safety assertions.

Appearance tests cover valid composable profiles, the unchanged Pip defaults, distinct initial combinations, readable non-color variation, independence from temperament/name, stable profiles across returns, and feature bounds. Repeated common traits are valid; exact duplicate initial appearances are not.

Browser acceptance must include: normal gradual arrivals; the three-resident shortcut; walking up to and petting/carrying/offering to each resident; two nearby creatures without target crossover; a completed shared toy sequence; autonomous activity while no controls are used; the raised reading approach; a return and historical comparison; and reset. Verify both destination paths still render and all residents remain distinguishable without relying on color alone.

Record a before/after three-resident frame-time comparison on the workstation at the same viewport and rendering settings. Retain the current frame cadence and quality settings; do not hide a regression by lowering them. A relative p95 frame-time increase over 20% requires investigation before calling the pass ready. If exact telemetry is unavailable, report that limitation explicitly and do not claim a measured performance pass. Reuse geometry/material resources where safe; do not duplicate textures per resident.

Run the full test suite, lint and production build, plus a scoped independent review. The last completed visual pass had 275 passing tests; that is prior evidence, not verification of this new work. Standalone TypeScript has documented pre-existing missing Three declarations and fixture errors; record its current baseline and ensure the new resident code adds no diagnostics rather than suppressing them with `any` or reinstalling dependencies silently. Any required dependency repair is a separate explicit change.

## Completion boundary

This milestone is complete only when three individual creatures coexist, respond correctly to the person, arrive at the specified returns, and demonstrate safe independent and shared play in the actual browser. Documentation, three visible clones, or tests alone do not complete it. Persistent saving, more residents, learned skills, richer relationships, breeding and new habitats remain future decisions. The prototype remains local and is not ready for distribution merely because this milestone passes.

## Design self-review

- No unresolved implementation requirements or placeholder sections remain in this proposed slice; the working names and exact arrival returns are stated for owner review.
- Care is optional and arrivals depend on authored return progression, not interaction counts or absence.
- Three residents are a milestone, not a permanent cap; no social multiplayer or backend work is implied.
- All residents share the base body style. Individual looks combine reusable and distinctive traits independently of their names or personalities; no rarity hierarchy or fixed three-class character system is implied.
- The preview shortcut uses the real fictional journey rather than a hidden alternate population state that could corrupt historical comparisons.
- Ownership, memory attribution, route conflicts and transient cancellation are specified explicitly; locked art is out of scope.
