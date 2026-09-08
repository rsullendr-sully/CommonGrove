# Spirit Learning and Shared Planter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let spirits learn practical abilities from the reading nook, receive supplies, autonomously build a shared planter, and continue using it.

**Architecture:** Keep durable session progress in a pure reducer above the remounting garden Canvas. A separate deterministic coordinator reserves project tasks and supplies directives to the existing safe locomotion system. Scene geometry and expressive props depict completed actions without owning progression.

**Tech Stack:** Existing TypeScript, React 19, React Three Fiber, Three.js, Vinext, Vitest and ESLint; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-06-spirit-learning-planter-design.md` (owner approved).

## Global Constraints

- Preserve the current cartoon sprite silhouettes, individual colors, small scale, grounded walking, and warm garden art style.
- Do not introduce human hands, worker uniforms, childlike lessons, or required care.
- Hidden tabs and historical comparison do not fast-forward construction.
- No loss from in-world neglect, failure to water, or a quiet period is introduced.
- Keep the existing flower, reading-nook, seed, destination, interaction and Find flows.
- One project, one supply bundle, two learned abilities; no economy, sports, networking, persistence, publication or real workplace data.
- Run locally on Windows from `prototype`; do not replace dependencies or restart a healthy development server unnecessarily.
- Preserve all existing uncommitted work. Commit only task-owned changes; never broadly stage the current dirty worktree. If a shared file contains earlier work, leave that file uncommitted rather than sweeping it into a task commit.

## File map and execution order

New files under `prototype/app/garden/`:

- `planterProgress.ts` / `.test.ts`: durable project state, prerequisite guards, idempotent events.
- `planterLayout.ts` / `.test.ts`: book, basket, project footprint and interaction slots shared by rendering/collision.
- `planterCoordinator.ts` / `.test.ts`: transient task claims, travel/action timing, learning and recovery.
- `gardenSession.ts` / `.test.ts`: atomic journey/project changes, historical snapshots, stale-event rejection.
- `projectActivity.ts` / `.test.ts`: project presentation contract and pose/prop selection.
- `PlanterProject.tsx` / `.test.ts`: original code-native book, tools and staged planter.
- `PlanterJournal.tsx` / `.test.ts`: plain-language project summary and delivery control.
- `planterIntegration.test.ts`: real navigation plus coordinator lifecycle tests.

Modify `CommunityCoordinator.tsx`, `residentCoordination.ts`, `ResidentActor.tsx`, `GardenWorld.tsx`, `PipCharacter.tsx`, `page.tsx`, `JourneyJournal.tsx`, and `sanctuary.css` only at integration boundaries. Existing navigation and first-person collision functions already accept obstacle arrays; pass project obstacles through instead of replacing those algorithms. Avoid unrelated refactors.

Tasks 1–3 establish pure, independently tested pieces. Task 4 attaches durable session state. Tasks 5–6 integrate acting, scene and journal. Task 7 verifies the full experience. Do not present pure-module completion as a playable milestone.

## Task 1: Durable knowledge, supplies and construction state

**Files:** Create `planterProgress.ts`, `planterProgress.test.ts`.

**Interfaces:** Import existing `ResidentId` from `residents.ts`. Export these contracts:

```ts
export type Ability = 'assembly' | 'planting';
export type BuildStage = 'empty' | 'base' | 'frame' | 'soil' | 'planted';
export type SupplyState = 'absent' | 'available' | 'committed' | 'used';
export type PlanterProgress = {
  book: boolean;
  knowledge: Record<ResidentId, Ability[]>;
  supplies: SupplyState;
  stage: BuildStage;
  delivered: boolean;
  processed: string[];
};
export type PlanterEvent =
  | { type: 'book'; id: string }
  | { type: 'materials'; id: string }
  | { type: 'learn'; id: string; resident: ResidentId; abilities: Ability[] }
  | { type: 'commit'; id: string; resident: ResidentId }
  | { type: 'deliver'; id: string; stage: BuildStage }
  | { type: 'build'; id: string; resident: ResidentId; stage: BuildStage };
export function createPlanterProgress(): PlanterProgress;
export function reducePlanterProgress(p: PlanterProgress, e: PlanterEvent): PlanterProgress;
export function nextBuildStage(stage: BuildStage): BuildStage | null;
export function canStartPlanter(p: PlanterProgress, resident: ResidentId): boolean;
```

- [x] Write failing tests for initial emptiness, both prerequisite orders, per-resident learning and duplicate deliveries. Include:

```ts
it('does not turn a materials delivery into knowledge', () => {
  const p = reducePlanterProgress(createPlanterProgress(), {type:'materials', id:'bundle-1'});
  expect(p.supplies).toBe('available');
  expect(canStartPlanter(p, 'pip')).toBe(false);
  expect(p.knowledge.pip).toEqual([]);
  expect(reducePlanterProgress(p, {type:'materials', id:'bundle-1'})).toBe(p);
});
```

- [x] Run `.\node_modules\.bin\vitest.cmd run app/garden/planterProgress.test.ts`; confirm failure comes from absent implementation, not a test syntax error.
- [x] Implement factory with fresh arrays for all three residents, stage `empty`, no book, absent supplies and delivered false. Reducer returns the same object for rejected or duplicate events. Accept learning only after book unlock; source encounter validity belongs to Task 3, never UI callbacks. Union abilities without duplicates. `canStartPlanter` requires book, assembly knowledge, and available supplies. Commit once; distinct extra delivery IDs also cannot replenish an existing bundle.
- [x] Add failing tests and implement ordered construction. `deliver` is valid only for `nextBuildStage(p.stage)` while committed and not already delivered. `build` requires that exact next stage, delivered true and the acting resident's ability (assembly for base/frame, planting for soil/planted). It clears delivered; planted changes supplies to used. No failed event ID is consumed.

```ts
const order: BuildStage[] = ['empty','base','frame','soil','planted'];
export function nextBuildStage(stage: BuildStage): BuildStage | null {
  return order[order.indexOf(stage) + 1] ?? null;
}
```

- [x] Verify wrong-stage, untrained and repeated build events leave state unchanged; inputs remain unmutated. Run the focused tests green. Commit only the two new files as `feat: model planter knowledge and supplies`.

## Task 2: A shared safe layout

**Files:** Create `planterLayout.ts`, `planterLayout.test.ts`; read `navigation.ts`, `pavilionLayout.ts`, `gardenElevation.ts`, `journeyLayout.ts`.

**Interfaces:** Export `PlanterLayout` with `book`, `basket`, `planter` as `GardenPoint`, `slots` as `Record<'read'|'pickup'|'carryDrop'|'work'|'observe'|'water', GardenPoint>`, and `planterRadius: number`. Export `PLANTER_LAYOUT: PlanterLayout` and `planterObstacles(p: PlanterProgress): GardenObstacle[]`. Dependencies are Task 1 types and existing navigation/elevation functions.

- [x] Write a failing test that every slot remains a safe point with the final planter and basket present:

```ts
it('keeps every approach outside finished geometry', () => {
  const p = {...createPlanterProgress(), book:true, supplies:'used' as const, stage:'planted' as const};
  const obstacles = [...GARDEN_OBSTACLES, ...planterObstacles(p)];
  for (const point of Object.values(PLANTER_LAYOUT.slots)) {
    expect(isSafeGardenPoint(point, obstacles)).toBe(true);
  }
});
```

- [x] Run the test red. Survey candidate fixed positions on the lawn beside, not inside, the nook entrance. Start with planter `{-15,-7}`, basket `{-16.8,-9}`, radius `.85`; these are candidate coordinates, not approved collision facts. Reject candidates with unequal footprint elevation greater than `.08`, unsafe slots, or failed routes; adjust this one layout until all checks pass. Derive the book reading slot from `PAVILION_READING_POINT`, offset a small book stand away from the occupied reading position.
- [x] Implement circular obstacle samples enclosing the visible basket and planter. Basket appears when supplies exist; planter appears at base stage. The book stand, when unlocked, also has a matching obstacle. Work/drop/observation slots must be at least body clearance outside visible footprints, with separate worker and observer positions.
- [x] Test actual `createSafeGardenRoute` routes from each resident spawn to read, pickup, work and observer positions and onward to `PAVILION_READING_POINT`; validate every resulting segment with `isSafeGardenSegment`. Repeat for empty/base/planted state and test both destination choices' existing collision constraints. Reject a layout that blocks the central nook approach.
- [x] Run layout/navigation/elevation tests green. Commit the two new files as `feat: define safe shared planter layout`.

## Task 3: Autonomous task coordinator

**Files:** Create `planterCoordinator.ts`, `planterCoordinator.test.ts`.

**Interfaces:** Consume Tasks 1–2. Define:

```ts
export type ProjectAction = 'read'|'carry'|'assemble'|'fill'|'plant'|'observe'|'water'|'inspect';
export type ProjectDirective = {
  key:string; actor:ResidentId; action:ProjectAction;
  phase:'approach'|'perform'; target:GardenPoint; lookAt:GardenPoint;
  tool:'piece'|'soil'|'seeds'|'mallet'|'can'|null;
  elapsed:number;
};
export type ProjectClaim = {
  directive:ProjectDirective; elapsed:number; stalled:number;
  lastDistance:number; lastPosition:GardenPoint; step:'pickup'|'drop'|'action'; stage:BuildStage|null;
  teacher:ResidentId|null; teacherKey:string|null;
};
export type ProjectRuntime = {
  claims:Partial<Record<ResidentId,ProjectClaim>>;
  serial:number; seed:number; elapsed:number; nextTaskAt:number;
  epoch:number; cooldowns:Partial<Record<ResidentId,number>>;
};
export type ProjectInput = {
  delta:number; paused:boolean; epoch:number; progress:PlanterProgress;
  actors:readonly ResidentSnapshot[];
  reachable:(actor:ResidentId, target:GardenPoint)=>boolean;
  footprintClear:boolean;
};
export type ProjectStep = {
  runtime:ProjectRuntime; events:PlanterEvent[];
  directives:Partial<Record<ResidentId,ProjectDirective>>;
};
export function createProjectRuntime(seed:number, epoch:number):ProjectRuntime;
export function stepProject(runtime:ProjectRuntime, input:ProjectInput):ProjectStep;
```

- [x] Write/run a failing paused test:

```ts
it('does not advance time while paused', () => {
  const r = createProjectRuntime(37, 0);
  const out = stepProject(r, {delta:60, paused:true, epoch:0,
    progress:createPlanterProgress(), actors:[], reachable:()=>true, footprintClear:true});
  expect(out.events).toEqual([]);
  expect(out.runtime.elapsed).toBe(0);
});
```

- [x] Implement delta capped to `[0,.05]`. Paused input releases transient claims without emitting progression. Epoch changes reset transient claims while retaining a unique event namespace. Generate keys from epoch plus monotonically increasing serial; same session remounts must receive a new epoch from Task 4.
- [x] Add/run red tests for learning only after arrival and complete uninterrupted action time, then implement a single reserved book slot. Read takes 6 active seconds; completion emits both abilities for that actor. Lost proximity resets action elapsed. Never learn because a destination was selected.
- [x] Add/run red tests for all construction stages and implement claims: reserve one carrier and one worker, pickup then drop for each next-stage bundle, then assemble/fill/plant. Commit before first pickup once an assembly-trained resident is available. Carrying can be untrained; assemble takes 6 seconds, fill and plant 5 each. Keep one mallet owner, one can owner and one basket pickup owner. Stage completion must also wait for `footprintClear` before new solid geometry appears.
- [x] Add/run red observation tests. One observer occupies its own slot beside an active worker; 3 continuous seconds observing the same assembly or planting action emit that ability. Observation is optional and must never hold up the teacher. Choose among available residents with seeded rotation, not appearance or a fixed name. An untrained worker reads if required knowledge is missing; a solo resident must not wait for an observer.
- [x] Add/run red recovery tests: unavailable actor releases claim; incomplete carried piece is not delivered; after 4 seconds without actual planar movement before arrival, release with a 2-second actor cooldown and allow reassignment. A moving detour can initially increase target distance without being stalled. Completed stages and committed supplies remain untouched. At planted stage schedule occasional 3-second watering or inspection with a 15-second quiet gap; do not generate resources, needs, or experience counters.
- [x] For deterministic end-to-end tests, supply snapshots at each directive's target on the following simulated frame and fold emitted events through `reducePlanterProgress`. Prove completion with Pip alone and all three, plus idempotency if an event batch is replayed. This test double proves task ordering, not real locomotion (Task 7 covers travel).
- [x] Run focused tests green; commit the new module/test as `feat: coordinate autonomous planter tasks`.

## Task 4: Session ownership, snapshots and safe event delivery

**Files:** Create `gardenSession.ts`, `gardenSession.test.ts`. Modify `page.tsx`, `GardenWorld.tsx`.

**Interfaces:** Define `GardenSession = {journey:JourneyState; project:PlanterProgress; previousProject:PlanterProgress; view:GardenView; epoch:number}` and `GardenSessionEvent = {type:'journey'; event:JourneyEvent} | {type:'view'; view:GardenView} | {type:'materials'; id:string} | {type:'project'; epoch:number; events:PlanterEvent[]} | {type:'remount'}`. Export `createGardenSession():GardenSession`, `gardenSessionReducer(s:GardenSession,e:GardenSessionEvent):GardenSession`, `visiblePlanter(s:GardenSession):PlanterProgress`.

- [x] Write/run failing tests for reward and return snapshots, duplicate deliveries, community preview unlocking book without learned abilities, and rejecting stale event epochs:

```ts
it('rejects an event emitted by an old scene', () => {
  const s = createGardenSession();
  expect(gardenSessionReducer(s, {type:'project', epoch:s.epoch-1,
    events:[{type:'materials',id:'old'}]})).toBe(s);
});
```

- [x] Implement atomic wrapping of existing `journeyReducer`. Capture project before successful reward/return changes only. At crossing reward stage 2, or community preview, emit idempotent book unlock. Reject project action batches while comparing; validate resident events against `residentsForVisit` before reducing. Increment epoch on reset, accepted journey scene changes, comparison toggles and remount; never reuse epoch 0 on restart. Reset progress but retain incremented epoch. Keep view semantics identical to existing page behavior.
- [x] Replace only the page's journey/view state owners with `gardenSessionReducer`; preserve UI handlers, busy guards, dialogs, memories and Find scope. Add project/projection/epoch and `onProjectEvents(epoch,events)` to GardenWorld. Use one batch per frame with discrete completions, not React updates for elapsed time. A coordinator may optimistically fold its emitted batch locally, but must reconcile with authoritative parent state before starting another stage.
- [x] Mount lifecycle emits `remount` once and waits for acknowledged epoch before starting claims; cleanup stops emissions. Use a stable callback and a mount-only effect, not an effect depending on epoch (which would continually trigger itself). Test simulated remount and React strict-effect replay do not reuse task IDs. No progress or knowledge belongs solely to a Canvas ref.
- [x] Run new session tests plus journey/memory tests green. Review page diff against existing handlers. Commit new files separately; preserve prior shared-file changes.

## Task 5: Resident acting and community arbitration

**Files:** Create `projectActivity.ts`, `projectActivity.test.ts`; modify `CommunityCoordinator.tsx`, `residentCoordination.ts`, `ResidentActor.tsx`, `PipCharacter.tsx`, `GardenWorld.tsx` and related existing tests.

**Interfaces:** `ProjectVisual = {action:ProjectAction; tool:ProjectDirective['tool']; elapsed:number; performing:boolean; reducedMotion:boolean}`. Export `projectVisual(d:ProjectDirective,reducedMotion:boolean):ProjectVisual`, `projectMotion(v:ProjectVisual):{lean:number; tap:number; tilt:number}`. Extend community with `projectDirective(id:ResidentId):ProjectDirective|null`, a project runtime, current project progress, and `extraObstacles:readonly GardenObstacle[]`. Preserve its existing social `directive` API.

- [x] Write/run failing tests for stationary reduced-motion effects:

```ts
it('keeps reduced-motion tool use readable without rhythmic taps', () => {
  expect(projectMotion({action:'assemble',tool:'mallet',elapsed:1,
    performing:true,reducedMotion:true}).tap).toBe(0);
});
```

- [x] Implement small bounded pose offsets, separate from gait: inspect/read tilt, assemble mallet taps, fill/plant dip, water can tilt. Example tap expression:

```ts
const tap = v.performing && v.action === 'assemble' && !v.reducedMotion
  ? Math.max(0, Math.sin(v.elapsed * Math.PI * 2)) * .16 : 0;
```

- [x] In the community frame, create one shared snapshot. Exclude explicit interaction participants, carried residents and reward-priority residents from project eligibility. Advance project claims before selecting new toy/social claims. Release play/social claims involving any newly reserved project actor, including both sides of a greeting. Pass all actors to ordinary coordination with project-reserved actors marked unavailable; keep their positions in collision snapshots. Test nobody holds both directives and no tool has two owners. Compute `footprintClear` from both resident and player positions against the next stage's footprint before accepting completion.
- [x] Do not use indefinitely renewed reticle/proximity attention as project unavailability. Cap passive attention to 4 seconds per approach episode; reset only after visitor leaves the attention radius. Explicit greeting/pet/pickup still preempts. Test 30 seconds with stationary visitor attention and no clicks still permits project work.
- [x] In ResidentActor, after explicit interaction and priority branches, consume project directive through existing `createSafeGardenRoute` and `stepSafeRouteLocomotion`. Route failures report no arrival. Keep distance-driven walking, including when carrying; performing begins only at target. Bind visible tools/pieces to a small side-paddle attachment, not a new human hand. Reset project visual immediately when the actor is picked up or loses the claim.
- [x] Add `project?:ProjectVisual` to PipCharacter; preserve existing callers and body/face geometry. Ordinary walking pose plus prop attachment is used in approach phase; bounded project pose only in perform phase. On transition to planted, use the existing brief happy greeting/stretch expression once for participants before releasing them to normal activity; it must not loop or award progression. Pass project obstacles through `community.obstacles` to movement, object offers, pickup placement and toy paths. FirstPersonControls receives the same project footprints with existing player-clearance conventions.
- [x] Run acting, locomotion, interaction, community and first-person tests green. Record shared-file changes without bundling preexisting work into a commit.

## Task 6: Readable scene, tool props and journal

**Files:** Create `PlanterProject.tsx`, `PlanterProject.test.ts`, `PlanterJournal.tsx`, `PlanterJournal.test.ts`; modify `GardenWorld.tsx`, `JourneyJournal.tsx`, `sanctuary.css`, `page.tsx`, and `PipCharacter.tsx` for the shared tool attachment deferred from Task 5.

**Interfaces:** `PlanterProject({progress,layout,directives}:{progress:PlanterProgress;layout:PlanterLayout;directives:Partial<Record<ResidentId,ProjectDirective>>})`; `PlanterJournal({progress,busy,comparing,onMaterials}:{progress:PlanterProgress;busy:boolean;comparing:boolean;onMaterials:()=>void})`. In `PlanterProject.tsx`, export `planterParts(stage:BuildStage):readonly ('base'|'frame'|'soil'|'sprouts')[]` and `ProjectTool({kind}:{kind:NonNullable<ProjectDirective['tool']>})` for resident attachments. Only this module owns tool geometry.

- [x] Write/run a failing stage test:

```ts
it('does not reveal planting before it is completed', () => {
  expect(planterParts('frame')).toEqual(['base','frame']);
  expect(planterParts('planted')).toEqual(['base','frame','soil','sprouts']);
});
```

- [x] Implement progressive groups based only on stage. Use warm timber rounded planks, dark soft soil and a few original leaf sprouts. Place meshes from `PLANTER_LAYOUT` and sampled terrain elevation. No new texture downloads. Book uses simple plant/assembly diagrams constructed from shapes; supply basket includes wooden pieces, soil sack and seed packet. Mallet and can use soft rounded forms scaled to existing `.72` residents. Reuse project-owned prop geometry for carried supplies.
- [x] Basket props reflect `available/committed/used`; hide only the currently claimed carried item while in transit, using the coordinator directive snapshot, without removing the remaining tools. On interrupted carry, the item reappears in the basket. Use the `directives` prop to derive this presentation, never to infer completed progress.
- [x] Journal copy follows real progress: book absent -> “A making-and-growing book can arrive with the reading nook.”; book present/unlearned -> “A new book is waiting to be explored.”; learned/no supplies -> “An idea is ready. Materials can arrive whenever.”; committed -> “The spirits are making a planter together.”; planted -> “Their planter is part of the grove now.” List learned abilities by resident in plain words, without levels or rankings.
- [x] Add “Simulate material delivery” inside existing Simulation controls, enabled before book arrival but disabled when busy, comparing or already supplied. Dispatch fixed session-local ID `planter-materials-1`; show “Fictional supplies. Refresh starts over.” Avoid a second reset or project-selection screen.
- [x] Use existing `renderToStaticMarkup` testing convention to assert delivery button labeling/disabled states and completed copy. Add a browser keyboard check for the actual callback and focus; static markup cannot verify behavior.
- [x] Run scene/journal tests green and lint touched TS/TSX files. Open local preview and verify distinct visible stages, prop attachment scale, diagrams and no clipping at ordinary camera height. Commit new files only when checked.

## Task 7: Full-loop verification and handoff

**Files:** Create `planterIntegration.test.ts`; update `STATUS.md`, `PROJECT.md` and the approved spec's implementation-status sentence after evidence exists.

- [x] Write/run failing integration harness tests using real `createSafeGardenRoute` and `stepSafeRouteLocomotion`, not instant target placement. On each frame: snapshot actors, call `stepProject`, route each directive, apply safe motion, then reduce its completion events. Reserve the final planter footprint from the first frame, including the empty stage, for every reachability route, actor route and stationary safety check; deduplicate it when production geometry includes the obstacle. Include peer obstacles and assert no unsafe segment at any frame. Ordinary moving frames must stay within `maxSpeed × delta`; the approved verification amendment permits only the established stopped, zero-speed arrival correction of at most `.16` units exactly onto a planned waypoint, across a safe segment, with matching distance-travelled accounting. Do not claim strict per-frame no-teleport coverage; this bounded arrival artifact remains for future locomotion work.
- [x] Run both event orders and solo/three-resident rosters for up to 240 active simulated seconds. Final assertions:

```ts
expect(progress.stage).toBe('planted');
expect(progress.supplies).toBe('used');
expect(Object.values(progress.knowledge).some(a => a.includes('assembly'))).toBe(true);
expect(new Set(progress.processed).size).toBe(progress.processed.length);
```

- [x] Extend the harness with 10 seconds of participant pickup during carrying, blocked-route recovery, comparison pause, epoch changes and duplicate event batches. Confirm no arbitrary target placement or recovery repositioning beyond the explicit bounded waypoint-arrival exception above, no skipped stage, material replenishment or knowledge granted from a distance. Verify observer learning separately so an all-read roster cannot hide a broken teaching path.
- [x] Run `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd app --ignore-pattern dist --ignore-pattern .next`, and `.\node_modules\.bin\vinext.cmd build` from `prototype`. Record actual counts/results; distinguish existing warnings from new failures. Request sandbox escalation only if the local toolchain requires it.
- [ ] In the browser, test fresh Pip-only start: materials first, expand nook, watch book investigation and entire build without work orders. Repeat after Restart with Preview three residents and knowledge first. Watch a grounded carry, a second helper/observer, mallet, soil, seeds, brief completion reaction and later watering. Confirm standing nearby does not stall progress. Use ordinary camera views and Find rather than teleporting actors.
- [ ] Exercise pickup mid-project, placement and recovery; historical Before/Last return then Now; next visit; hidden-tab return; reduced motion; keyboard delivery control; nook entrance walking; existing toy play and destination choices. Refresh must explicitly reset, not masquerade as persistence. If a full loop fails, diagnose/fix and rerun affected tests before handoff.
- [x] Update docs with what is actually implemented and verified, remaining limits and local preview instructions. Keep multiplayer and further recipes in future scope. Review task-owned diff and leave the working local preview ready; do not publish or open a PR.

## Plan self-review

- Spec experience 1–5: Tasks 1, 3, 5, 6, 7.
- Accomplishments, session ownership, comparison and reset: Tasks 1, 4, 6, 7.
- Layout, locomotion, tool arbitration and interruption: Tasks 2, 3, 5, 7.
- Individual learning, observation and solo completion: Tasks 1, 3, 7.
- Reduced motion, accessibility and original art constraints: Tasks 5, 6, 7.
- Future features excluded; no new dependencies, backend or external writes planned.

Local implementation and automated verification are complete. Task 7's remaining direct visual and interaction checks are still open; the local handoff is not full owner/visual acceptance. Completed checkboxes are supported by task reports and reviews in the plan-scoped execution ledger; unchecked steps remain outstanding.
