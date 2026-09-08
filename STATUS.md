# Common Grove — Current Status

Last updated: 2026-09-08

## Current objective

Verify the approved reusable-learning foundations locally: individual knowledge, autonomous planter construction and transfer into a tool rack. Four abilities are enabled; sixteen later abilities remain planned. Environment polish, staff invitations and hosting remain paused.

## Active slice

**Learning foundations: B1, B2, G1 and G2**

The new Learning demo controls expose five isolated scenarios, solo/three-resident rosters, explicit book/material opportunities, knowledge sources and a one-time Watch turn. Reading grants familiarity; only performed work grants practice, and observation credits only the action witnessed. Full owner acceptance remains open; see the [dated verification record](docs/reviews/2026-09-08-learning-foundations-verification.md).

The established Release 0B journey remains available:

1. An employee returns after being away.
2. The companion has acted on several accomplishments.
3. The garden has visibly changed.
4. A welcome-back story explains the changes in friendly language.
5. The employee can inspect why a change occurred without seeing a score.
6. One permanent choice remains available without urgency.

## Current decisions

- Internal employee product
- Approximately 14 prospective participants
- Web-first stylized 3D
- Multiple companions in each employee's personal garden (owner clarification, 2026-09-05); the current local slice includes Pip, Moss and Fern with gradual arrivals
- Release 0 uses a bounded first-person employee view while Pip remains autonomous
- Role-equitable progression is a product requirement
- Simulated events precede production integrations
- Product-owner concept review approved on 2026-08-25
- Development remains local-only

## Working assumptions awaiting validation

- Autotask or similar business systems will eventually supply source events.
- Three universal contribution categories are sufficient for the first prototype.
- Essential garden progress should not depend on a role-specific activity.
- Six to ten volunteers are sufficient for qualitative concept interviews; all staff may receive a short survey.

## Immediate next outcome

Complete the learning-foundations action and lifecycle walkthrough, review the exact implementation and record owner observations. Automated navigation evidence and visual evidence are tracked separately in the dated verification record. Retain the four-return journey, approved crafted visual style and local-only constraints; owner acceptance does not automatically resume staff invitations or hosting.

## Latest implementation

- September 8: reusable B1 fitting, B2 fastening, G1 soil filling and G2 seed planting; shared planter/tool-rack recipes, exclusive reusable tools, isolated demonstration sessions, confirmation/replay and accessible knowledge controls are implemented locally. The catalog contains 20 abilities across five paths, with only these four enabled. New commits after the previously recorded push remain local.
- Creature art direction updated to the approved non-animal, soft-technology family: Pip uses B/Wisp (the future most-common default), Fern uses A/Roundling, and Moss uses C/Pebblekin. Defined sculpted heads, expressive layered eyes, tiny paddles/feet and subtle amber insets replace the previous ears and limbs. See `docs/design/garden-beings-2026-09-05.md` and the saved approved concept. Future rarity is a design decision only; current authored arrivals are unchanged.
- This visual pass passed 28 focused pose/identity/interaction tests, targeted lint and a production build; the subsequent eye-depth adjustment was linted and checked in the live browser.
- Four authored visits: beginning, one week later, several weeks later, and one season later.
- Flowers accumulate; the pavilion gains cushions, books and lanterns; Orchard crowns/lanterns and Workshop inventions develop within a fixed destination plot.
- An optional seed choice survives returns and may be made late. Earlier comparisons preserve the choice that existed then.
- Completed pet, snack and toy interactions can produce a remembered next-return greeting and weighted activity preference. Neutral returns remain available with no interaction.
- Return/restart clears transient carrying/reactions; return and historical comparison are disabled while a direct interaction is unfinished.
- Historical comparison pauses Pip and suppresses live interactions/commentary. Already-established rewards mount settled on return rather than replaying their reveal.
- Arrival attention no longer prevents greetings or queued rewards. Initial camera framing shows Pip more fully.
- Workshop roof slopes now meet at a ridge, its attic is closed, and outdoor inventions no longer crowd the roof.
- Everything remains fictional, session-local, original and local-only. No backend, authentication, persistent state, real event mapping or real social features were added.

## Completed in this slice

- Scripted responsive 2.5D garden experience
- Welcome-back summary with three visible changes
- Private explanations for Support Desk, Project Team, vCIO, and manager role lenses
- Non-expiring choice between an orchard and workshop path
- Original branded social-preview artwork
- Successful production build
- Local-only development decision; no prototype source upload
- Staff interview guide and short survey
- Product-owner approval of the concept direction
- Interactive before/now garden comparison and session reset
- Anonymous participant and results tracker
- Interactive visual hierarchy for starflowers, reading nook, and discovery seed
- Character direction confirmed: preserve the original compact body with smooth clay rendering, one listening ear, cheek freckles, and a quiet asymmetrical smile
- First constrained 3D-space pass: angled island, visible terrain edge, layered depth, foreshortened surfaces, spatial shadows, and foreground framing
- Bounded first-person garden exploration with keyboard and on-screen movement controls
- Pip enlarged to a close, conversational scale within the garden view
- Garden spatial inspiration captured in `docs/design/garden-visual-direction.md`; use its composition and scale principles without copying source art or assets
- Approved spatial scale: a bounded 40 × 40 meter square with approximately 10 seconds of walking from side to side
- First true-3D shell limited to ground, sky, boundaries, center marker, smooth movement, and camera look
- Product owner confirmed the garden shell is a good size on 2026-08-26; the Release 0 footprint and walking pace are now locked
- Central pond slice added at twelve meters across with a low stone rim and a contained water-edge movement boundary
- Product owner accepted the central pond as a decent starting point on 2026-08-26; retain its scale and placement provisionally while leaving visual refinement open
- Integrated spatial pass completed: full-screen garden, rock backdrop, spring sanctuary, raised reading pavilion, trees, flower discoveries, compact journal, and correctly scaled Pip
- Product owner described the integrated composition as a solid start; environmental finish pass added grass variation, natural boundary planting, stepping-stone wayfinding, atmospheric clouds, localized lighting, rock detail, and Pip idle motion
- Pip behavior slice added: safe autonomous route, natural pauses, one warm proximity greeting, quiet later reactions, and automatic return to exploration
- Autonomous activity selection completed: automated runtime tests cover wander, look-around, inspect-flowers, watch-pond, visit-pavilion, inspect-destination, rest, and proximity greeting, with cooldown and repetition safeguards. Named interests, pond/boundary/obstacle-safe routing, nearest-safe recovery, and the eight-second ordinary travel timeout are implemented and tested.
- Reward and choice interruptions completed: automated lifecycle tests verify priority missions serialize once in reward-before-choice order, override ordinary behavior and greeting while active, avoid the ordinary timeout, and resume fresh ordinary behavior after the reaction pause. The integrated reward-one to reward-two route simulation completes without unsafe steps or deadlock.
- First complete reward loop added: simulated “Helped someone succeed” event, animated starflower bloom, Pip investigation, Before/Now comparison, and private role-neutral explanation
- Product owner confirmed the first reward loop works technically on 2026-08-26; emotional value remains a later staff-validation question
- Second reward loop added: simulated “Moved important work forward” event, animated pavilion shelves/books/lanterns, Pip investigation, sequential Before/Now comparison, and private role-neutral explanation
- Third reward loop added: simulated “Strengthened the team or system” event, animated discovery seed, Pip investigation, sequential Before/Now comparison, and private role-neutral explanation
- Meaningful choice implemented: deliberate Lantern Orchard or Tinker Workshop selection, corresponding 3D destination preview, Pip reaction, and no deadline or upkeep
- Static coworker-visit privacy preview implemented: opt-in concept, explicit visible/private boundaries, local-only comfort response, and no actual social capability
- Release 0 readiness controls completed: full-session restart, keyboard-contained dialogs with initial focus and Escape dismissal, assistive selected states, and reduced-motion behavior within the 3D scene
- Procedural 3D Pip locomotion pass completed: original clay character, grounded foot cycle, natural facing, acceleration, arrival braking, and reduced-motion treatment. Live OS-level reduced-motion review remains outstanding.
- Employee garden movement increased from 2 to 4 meters per second while preserving the approved 40 × 40 meter footprint and collision boundaries.
- Discovery-seed transition completed and privacy comfort feedback clarified as temporary local research input.
- Pip exploration expansion implementation completed: Pip can autonomously greet, accept petting, be carried and safely placed, and temporarily react to one snack and one wooden-ring toy. These session-local interactions add no scores, needs, upkeep, inventory, or persistent penalties.
- Soft Storybook Grove environment polish implemented with deterministic layered foliage, an organic luminous pond, warm storybook lighting, localized landmark glow, pooled motes, refined paths, and state-driven reward and destination accents. The 40 × 40 meter footprint, 4 meter-per-second movement speed, ground plane, pond exclusion, obstacles, interaction coordinates, and product behavior remain unchanged.
- Shared companion garden slice implemented: Pip, Moss and Fern arrive on returns 1/2/3, share the original clay body style with composed individual ears/markings/colors, retain independent journey profiles and memories, and remain together on return 4. A real preview shortcut advances the local journey to return 3.
- Resident presentation scale tuned to 0.72 of the earlier close-up size so first-person encounters feel comfortable while the shared silhouettes remain readable.
- Resident journal cards now make the community legible at a glance: each arrival has a color-coded initial, a neutral individual inclination, and a separate session relationship line without introducing scores, needs or health states.
- Direct player actions are recipient-scoped through an epoch-checked interaction adapter; carried residents, snack offers, placement/resume state and stale completions cannot transfer credit between residents.
- Shared-space coordination implemented with bounded grounded toy motion, exclusive/fair turns, an optional observer, finite social greetings, peer-aware route/placement obstacles, blocked-route recovery, comparison/carry cancellation and reduced-motion support.

## Verification evidence — 2026-09-05

- Current full suite: **301 tests in 30 files pass**. ESLint and the production build exit 0. Build retains the existing large-chunk advisory and Vinext route-classification/plugin-timing notices.
- Browser: opened the local preview, used “Preview three residents,” confirmed Pip/Moss/Fern in the journal and visually checked the new resident cards, the more comfortable resident scale, distinct shared-body residents, grounded independent movement, a shared-play status message and the unchanged crafted cliff/pond/pavilion composition. The preview remains open at return 3 for owner exploration.
- Independent read-only review found recipient focus crossover, direct toy standoff clearance, peer overlap on historical remount, placement race safety and false arrival on failed routes. Each finding was addressed with a targeted fix and focused regression coverage; the final exact-working-tree recheck found no remaining material issue.
- Standalone TypeScript check still fails: missing `@types/three`, resulting implicit-any errors, and older tuple/literal fixture types in environment/movement/interaction tests. New journey fixture typing was corrected. No dependency reinstall or `any` declaration workaround was used.
- No precise FPS/GPU benchmark, full snack/toy offer for each resident, complete unsafe-placement browser pass, OS reduced-motion pass, or full four-return owner walkthrough is claimed for this milestone. Those remain explicit checks before owner acceptance.
- Local feature branch: `codex/connected-sanctuary`. No upload, deployment or merge to main. Unrelated root dependency directories were preserved.

### Earlier evidence (2026-08-29; not a fresh result)

- **Automated technical verification:** 201 tests in 16 files pass, including locomotion, safe navigation, autonomous priorities and recovery, direct Pip interactions, snack and toy reactions, deterministic environment placement, boundary and main-corridor clearance, static reduced-motion presentation, and reward and destination mapping. Lint and the production build exit 0. The build reports its existing large-chunk advisory and vinext route-classification notice.
- **Environment browser review at `http://localhost:3001/`:** the starting view, both directions around the pond, pavilion, sanctuary, three canonical trees, starflower area, seed and destination area, snack, and toy were inspected. Main routes remained visually open; the pond read clearly near and far; snack and toy prompts were legible; toy pickup/place completed; all reward changes and both equal-scale destination choices rendered; `390 × 844` and `768 × 800` layouts showed no observed control, journal, garden, or Pip-status clipping. The console contained zero application errors and eight identical instances of the pre-existing `THREE.Clock` deprecation warning, once per fresh renderer/session.
- **Recorded verification limits:** the selected in-app browser has no reduced-motion emulation or exact frame-time/FPS telemetry. Direct browser pet/carry/place and snack/toy offering were not completed because autonomous Pip repeatedly moved outside the fine reticle range; passing pure and interaction tests cover those code paths, but manual owner evidence is not claimed.
- **Full owner walkthrough:** still pending. Owner visual approval, direct Pip interaction and offering branches, unsafe-placement attempts, and an operating-system reduced-motion pass remain unapproved. The environment slice is not complete and the prototype is not ready for staff invitations or distribution.

## Resume here

Start the local app using README.md. Use the “Preview three residents” shortcut, watch Pip/Moss/Fern, then try direct targeting, toy turns, both destinations, comparison and restart. Next technical work is a clean standalone typecheck, exact performance baseline on the GPU workstation and an ordinary laptop, then the remaining interaction/accessibility checks and focused art refinement. See BACKLOG.md. Staff invitations remain paused until explicit owner approval. Do not begin production integrations, hosted access or distribution.

## Spirit learning and shared planter — 2026-09-06

The local prototype now includes an original making-and-growing book in the expanded nook, per-resident assembly and planting knowledge, one optional materials delivery, and autonomous carrying, assembly, soil filling and planting. A shared session reducer preserves progress across in-session visits and scene remounts; historical comparison and hidden tabs pause work. Knowledge and supplies gate actual stage completion. Residents can learn by watching an active worker and later inspect or water the finished planter without required upkeep.

The real-navigation integration harness covers materials-first and knowledge-first arrival for Pip alone and all three residents, each completing within 240 active simulated seconds. It uses the live coordinator and safe route/movement adapter, reserves the final planter footprint from the first frame for all routing and safety checks, includes peers, and covers ten-second pickup interruption, blocked pickup recovery, pause, epoch changes, replayed batches and independent observation teaching. The explicit verification amendment allows the existing stopped, zero-speed correction of at most `.16` units onto a planned waypoint across a safe segment, with matching distance-travelled accounting. Ordinary moving frames retain their speed bound; arbitrary target placement or recovery repositioning is prohibited. Strict per-frame no-teleport coverage is not claimed, and the small arrival artifact remains for future locomotion work.

Final automated verification after the review corrections: **419 tests in 43 files passed**, with serial Vitest exiting 0 in 106.28 seconds; fresh full app ESLint and the production build also exited 0. The corrected integration suite includes both prerequisite orders/rosters, final-footprint reservation and recovery. The build retains its existing chunk-size and route-classification advisories. The integration harness yields between bounded simulation chunks to keep Vitest worker messages responsive without changing simulated time. Standalone TypeScript remains non-green for the existing missing Three.js declarations and older fixture/type diagnostics; the new test's own literal-widening errors were corrected. Independent broad final review found no remaining code findings and approved a local implementation handoff, with the manual verification limits below.

The controller's stable browser walkthrough completed both the Pip-only materials-first and three-resident knowledge-first runs at the corrected layout. It showed successive base/frame/final plants, a small attached mallet, Moss carrying a wooden piece, and grounded movement. Tab showed a visible delivery-button focus outline and Return activated delivery. Workshop choice, next visit, Last return/Now and Restart worked without losing live project state except for the explicit reset; nook access remained clear and standing nearby did not prevent completion.

Manual verification is still incomplete: soil/seeds attachment closeups, the brief completion reaction, actual watering tilt, pickup during carrying with placement/recovery, hidden-tab return and OS reduced motion were not directly verified. Automated tests cover the relevant progression, pause, interaction and reduced-motion contracts, but complete visual acceptance is not claimed. The browser cannot emulate reduced motion, and global Windows preferences were not changed.

Local preview: use the already-running [garden](http://127.0.0.1:3001/) or the existing Windows launch command in README.md. In Garden journal → Simulation controls, deliver materials and simulate two accomplishments for the Pip-only flow; after Restart journey, use Preview three residents and let a resident learn before delivery for the other order. No work orders are needed. Refresh and Restart journey clear project knowledge, materials and construction. Further recipes, football and multiplayer remain future scope; there is no persistence, production integration or publication.
