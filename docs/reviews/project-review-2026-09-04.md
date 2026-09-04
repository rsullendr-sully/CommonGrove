# Common Grove: setup, goals, and completion review

Date: 2026-09-04

Reviewed checkout: `main`, commit `b8d61b6`
Scope: repository and product review, fresh technical checks, and a limited browser walkthrough. This report proposes the next delivery sequence; it does not change the product, record owner acceptance, or authorize distribution.

## Assessment

Common Grove has a substantial, tested foundation for an original 3D companion garden. Its central missing capability is development across visits. The current prototype demonstrates three accomplishments and one destination choice within a session. The approved future journey—four returns, cumulative garden growth, and a developing relationship with Pip—remains a conversation-level design and is not implemented.

The next useful milestone is a complete, playable four-return experience. More isolated visual improvements cannot establish why an employee would return or where their garden is heading. Visual finishing should support that journey, especially Pip and the mature destination.

## Your goals, as established in the conversation

- A first-person, explorable 3D garden with the inviting companion behavior and sense of place you associate with the Chao Garden. Common Grove's characters, art, and structures remain original.
- Pip feels grounded, expressive, autonomous, and familiar. He walks naturally, engages in activities, responds to the employee, and develops through remembered interactions rather than requiring care.
- Ordinary workplace accomplishments quietly produce visible garden development. Different roles have equitable access to progress.
- The garden becomes personal through occasional choices, with the Lantern Orchard and Tinker Workshop as the first demonstrated branches.
- No hunger, decay, absence penalties, deadlines, mandatory visits, employee rankings, or public work details.
- A more complete and convincing private prototype before showing it to other people.
- The agreed next expansion is a guided four-return story: a new beginning, taking root, becoming yours, and an established grove. Pip's growing-bond direction was recommended and carried forward through your subsequent approval of that story.

The immediate endpoint is a prototype that demonstrates the intended experience across time. The first operational product endpoint is a private personal-garden pilot with saved progress and one real accomplishment source. Social visits and the broader neighborhood are later expansion milestones.

## What exists today

| Area | Evidence and current state | Implication |
| --- | --- | --- |
| Application | React 19, TypeScript, Three.js and React Three Fiber; Vinext/Vite development and build scripts inside `prototype/` | Keep this implementation for the next playable milestone. There is no demonstrated need to restart it in another engine. |
| World | First-person garden, pond, pavilion, paths, surfaces, navigation, textured environment and reward reveals | A usable place exists to carry the progression story. |
| Companion | Activity selection, locomotion, greetings, priority reactions, pet/carry/place and snack/toy logic | Reuse these systems; add remembered experience and chapter-dependent behavior above them. |
| Product state | `app/page.tsx` holds reward stage 0–3, comparison state and one choice in React state | There is no multi-visit progression model. Refresh restores the opening state. |
| Outcomes | Starflowers, improved pavilion, discovery seed and an Orchard/Workshop preview | Outcomes are present, but later growth and mature functions are absent. |
| Social/privacy | Static visit concept with temporary comfort responses | This is a discussion aid, not a visit system or an implemented account/privacy boundary. |
| Backend | Hosting configuration has null D1/R2 bindings; no product account, event ingestion or persistent garden implementation found | Production persistence and integrations remain future work. Development-tool sign-in is not employee authentication. |
| Verification | 239 tests in 21 files passed; lint and production build passed on this review | The technical foundation is healthy within the coverage exercised. |

The test configuration uses a Node environment. Coverage includes pure behavior/state logic and some static markup; passing tests do not establish a complete browser interaction journey, rendering quality, accessibility, or performance.

## Setup findings

1. **Project documents lag behind decisions and code.** `PROJECT.md` still assumes 2.5D and excludes full 3D navigation. `ROADMAP.md` describes the first release as 2.5D. `STATUS.md` is dated August 29, records 201 tests, and directs work toward owner acceptance and staff validation. `BACKLOG.md` still parks relationships and memories. None records the newly approved four-return journey. These conflicts should be reconciled before further implementation; they should not override the newer user direction.
2. **Dependency setup needs one reproducible path.** The tracked lockfile is `prototype/package-lock.json`; installed dependencies are laid out under `.pnpm`. In this environment, `pnpm test`/`pnpm run lint` attempted automatic dependency installation and failed before the scripts ran. Running the already-installed executables worked. Select one package manager, preserve a matching lockfile, document installation/start/test/build, and pin the supported runtime. Do not repair this by deleting working dependencies during a review.
3. **The app is under `prototype/`, not the repository root.** The root has untracked `node_modules/` and `.pnpm-store/`, while its `.gitignore` only covers worktrees. These are setup clutter to resolve deliberately, not source to add to a commit.
4. **Local work needs an explicit backup arrangement.** Main is 69 commits ahead of the locally recorded `origin/main`. No remote fetch was performed, so this does not establish the live remote state or whether another backup exists. The local-only decision prohibits prototype source upload; use an approved backup arrangement rather than assuming a push is allowed.
5. **The previous server was not reachable through the inspected local setup.** For this review, a temporary server was started from the current checkout at `http://127.0.0.1:3001/`, and the root route returned HTTP 200. A consistent launch command and documented address would remove repeated port confusion.
6. **Build warnings remain.** The production build reports a client chunk larger than 500 kB and a Vinext route-classification notice. These are not build failures. Measure real startup and frame performance before expanding rendering complexity.

## Browser observations

The review opened a fresh session, inspected the opening garden, advanced through all three accomplishments, and confirmed the Lantern Orchard choice. The UI reached its final state successfully. This was not a full direct-interaction, keyboard, reduced-motion, or performance acceptance pass, and the Workshop was not replayed in this review.

- The pond, rock backdrop, pavilion and paths establish a readable layout. The garden already communicates an explorable place.
- The starting composition has substantial empty lawn/sky and visibly faceted rock forms. The environment still reads as a prototype, particularly beside the more polished journal styling.
- Pip was outside the opening captured view. His initial presence and greeting should be deliberately staged if he is the emotional center of returning.
- The journal prominently exposes simulation controls. This is useful for development, but a later employee return should explain accumulated changes while leaving most of the view to the garden.
- After the third reward and destination choice, the remaining forward action is a privacy preview. The UI says the chosen destination will grow, but the prototype cannot show that later visit. This is the clearest explanation of the user's uncertainty about where the experience leads.

## Recommended delivery sequence

### 1. Align the setup and active scope

Update the charter, status and backlog to reflect 3D, the latest verified state, and the approved four-return expansion. Establish one reliable install/start/test/build path. Keep source backup and local-only distribution decisions explicit.

Done when someone can resume this checkout from the written instructions and identify the same next milestone without relying on this long conversation.

### 2. Build the four-return simulation

Treat this as one connected experience, delivered in small playable increments:

| Return | Visible development | Pip's role |
| --- | --- | --- |
| A new beginning | Existing accomplishments reveal flowers, the pavilion and the seed; the Orchard/Workshop decision becomes available | Clear welcome and optional direct interaction |
| Taking root | Flowers spread in authored areas, the pavilion shows use, and the chosen destination begins to develop | A changed greeting and a response to an interaction that actually occurred; a neutral routine if none occurred |
| Becoming yours | The chosen destination gains a distinct activity and readable intermediate form | Uses that destination in his autonomous routine |
| An established grove | The selected region is a mature, inhabited landmark; earlier changes remain coherent | Recognizes the employee, demonstrates familiarity, then resumes his own activity |

Use a discreet, explicitly simulated next-return control. Each advance represents a fictional batch of accomplishments and elapsed time; elapsed days alone should not be presented as the cause of workplace rewards. Show a brief welcome-back story and a private reason for each major change. Make clear that the compressed timing is illustrative rather than a promised real reward schedule.

Remember only actions performed in the simulated journey. If the employee never pets, feeds or plays with Pip, he still develops a warm routine and the garden still advances. Leave the seed choice available without making it a required chore; if postponed, shared areas and Pip can continue developing while the destination remains pending.

Implementation boundaries should be small: chapter content, a deterministic journey state reducer, recorded interaction memories, and a projection from that state into the existing scene and behavior. Avoid scattering chapter-number checks throughout the renderer or building a general economy engine for four authored visits.

Done when both destination branches can be experienced across the entire journey, remembered interactions are truthful, no-choice/no-interaction paths still work, and restart reproduces the opening state. The employee should understand what changed, why, what Pip did, and what they might discover on another return.

### 3. Finish the presentation of that complete journey

Prioritize Pip's arrival, readable reward transformations, mature destination assets, consistent materials/light, and approachable interaction targeting. Keep the approved footprint and movement feel. Make each chapter visually distinct through meaningful landmark development rather than filling every empty area with decoration.

Review the full journey on the graphics workstation and a representative employee laptop. Agree a measurable frame/startup target, then profile against it; this review did not measure GPU performance. Check direct interactions, safe placement, keyboard use and operating-system reduced motion as part of the same acceptance pass.

Done when the four returns communicate progression without developer narration, their key moments are easy to see, and the agreed device/interaction checks pass.

### 4. Validate the complete prototype privately

The owner's observation that things seem fine is positive feedback, not a recorded result for every outstanding test. Once the expanded journey is satisfactory, complete owner acceptance and then the proposed small voluntary staff round. Use the existing research materials, revised to include accumulation and return motivation.

Done when participants can explain the cause of garden changes, distinguish personal choices from work progression, understand privacy boundaries, and express whether another return would be worthwhile. Review role equity and whether anything feels like maintenance or surveillance.

### 5. Make the personal garden durable

Implement employee identity, saved garden/choice/companion state, a sanitized accomplishment contract, duplicate-safe event processing, recovery and deletion. Keep the progression rules separate from rendering so a saved history can produce the same garden consistently.

Resolve the long-term content question here: a bounded garden cannot add a permanent object for every accomplishment forever. Prototype evolving existing landmarks, occasional new projects and variations before committing to reward rates. Continue progress without erasing choices or penalizing absence.

Done when closing/reopening preserves the garden, repeated delivery of the same event grants progress once, missed visits create a coherent return story, and recovery works.

### 6. Connect one real source and run the personal-garden pilot

Confirm the first source—Autotask is currently a working assumption—and map a small, reviewable set of accomplishments. First observe mappings without granting rewards, then enable them for an approved pilot once accuracy and role fairness are understood.

Move this ahead of building the social neighborhood. The current roadmap places social work before the first integration; testing real accomplishment-to-garden behavior sooner better addresses the core product assumption.

Done when the approved participants can use saved personal gardens, real events produce understandable and reliable growth, Pip provides a reason to return, and the pilot meets the agreed privacy, fairness and performance criteria.

### 7. Expand the neighborhood after the personal loop works

Opt-in visits, gifts and shared spaces can then build on real identity and permissions. Treat them as a later product release rather than a condition for finishing the first useful product.

## Working approach

Use the decisions already made. Deliver one complete behavior at a time, inspect it in the browser, fix observed problems, and keep the status/backlog current. Ask for direction when a consequential product choice remains unresolved; routine implementation decisions do not need another sequence of option-selection turns.

The first concrete implementation slice should be **Return 1 to Return 2**: advance the simulated visit, preserve existing outcomes and the destination decision, show new landmark growth, and let Pip react to one real remembered interaction. This establishes the state and presentation pattern for the remaining two returns.

## Review verification and limits

- 239/239 tests passed across 21 files using the installed Vitest executable. The test compiler needed sandbox escalation to read configuration; the approved rerun passed.
- ESLint exited 0.
- Vinext production build exited 0 with the warnings described above.
- HTTP root route returned 200; the limited browser flow described above completed.
- GPU model, frame rate, full accessibility and manual interaction acceptance were not verified. System hardware inventory was access-denied in this environment.
- No product code, dependencies, primary planning documents, external repository or deployment were changed by this review. This report is the only authored file.
