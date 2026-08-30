# Common Grove — Current Status

Last updated: 2026-08-29

## Current objective

Validate whether internal employees understand and value the personal-garden loop before building production infrastructure.

## Active slice

**Release 0B: Prototype design refinement**

Review and refine the prototype experience before voluntary staff sessions:

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
- One companion per employee
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

Run the Release 0 owner walkthrough using the readiness checklist, then begin a small voluntary staff-validation round only after the owner approves the complete journey.

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

## Verification evidence

- **Automated technical verification:** 201 tests in 16 files pass, including locomotion, safe navigation, autonomous priorities and recovery, direct Pip interactions, snack and toy reactions, deterministic environment placement, boundary and main-corridor clearance, static reduced-motion presentation, and reward and destination mapping. Lint and the production build exit 0. The build reports its existing large-chunk advisory and vinext route-classification notice.
- **Environment browser review at `http://localhost:3001/`:** the starting view, both directions around the pond, pavilion, sanctuary, three canonical trees, starflower area, seed and destination area, snack, and toy were inspected. Main routes remained visually open; the pond read clearly near and far; snack and toy prompts were legible; toy pickup/place completed; all reward changes and both equal-scale destination choices rendered; `390 × 844` and `768 × 800` layouts showed no observed control, journal, garden, or Pip-status clipping. The console contained zero application errors and repeated the existing `THREE.Clock` deprecation warning once per fresh session.
- **Recorded verification limits:** the selected in-app browser has no reduced-motion emulation or exact frame-time/FPS telemetry. Direct browser pet/carry/place and snack/toy offering were not completed because autonomous Pip repeatedly moved outside the fine reticle range; passing pure and interaction tests cover those code paths, but manual owner evidence is not claimed.
- **Full owner walkthrough:** still pending. Owner visual approval, direct Pip interaction and offering branches, unsafe-placement attempts, and an operating-system reduced-motion pass remain unapproved. The environment slice is not complete and the prototype is not ready for staff invitations or distribution.

## Resume here

Run the full Release 0 owner walkthrough in `docs/releases/release-0-validation.md`, including the remaining direct Pip interactions, snack/toy offerings, unsafe-placement attempts, operating-system reduced motion, and final visual approval. Implementation and automated verification are complete, but owner acceptance is not recorded. Staff invitations and testing remain paused until the owner explicitly approves the complete journey. Do not begin production architecture, integrations, hosted access, or prototype distribution.
