# Spirit Learning Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four reusable learned abilities, an updated planter, a usable tool rack and five accessible demonstration scenarios before expanding toward the full 20-ability catalog.

**Architecture:** One session-owned knowledge store and project reducer feed the existing autonomous community coordinator. Typed recipe steps reuse safe travel and action presentation; scenario fixtures are isolated from the ordinary journey. Keep incremental adapters at existing planter boundaries while migrating consumers, then remove the old writable knowledge model.

**Tech Stack:** Existing TypeScript, React 19, Three.js, React Three Fiber, Vinext and Vitest; PowerShell on Windows. No new dependencies.

**Spec:** [Spirit abilities demo design](../specs/2026-09-08-spirit-abilities-demo-design.md), approved first milestone, 2026-09-08.

## Global Constraints

- “Demonstrate 20 abilities across five connected paths.” This plan implements only B1, B2, G1 and G2; later catalog rows are planned, not launchable.
- “Pause environment polish.” Keep existing residents, their scale, materials, terrain and first-person controls.
- “Use local deterministic simulation, not network AI.” No persistence, multiplayer, hosting, integrations, new residents or dependencies.
- “No assigned professions, needs, neglect, decay, tool breakage, expiring materials, employee scores or compulsory care.”
- “Reading alone never marks an ability practiced.” Observation credits only the action actually witnessed.
- “Tools are reusable shared resources.” One tool, resident and work slot has one owner at a time.
- “Preserve the existing documented stopped waypoint correction limit of .16 units.” Do not allow any other target teleport or claim perfectly snap-free motion.
- Each project gets at most 240 active simulated seconds after prerequisites in an unobstructed seeded integration run. Transfer gets separate budgets for its two projects.
- New scenarios must explicitly identify seeded knowledge and confirm replacement of an ongoing simulation. Cancel preserves it.
- Hidden tabs, comparison and inactive sessions cannot advance progress; stale epochs and duplicate events are rejected.
- Use apply_patch for file edits. Preserve unrelated notes, Obsidian settings, generated files and dependency directories. Stage exact task files, never `git add .`.
- Existing standalone TypeScript failures are a documented baseline, not permission to add diagnostics. No automatic dependency installation or suppressions.

## Execution preparation and verification commands

- [x] Read the spec completely, inspect current git status and read applicable repository instructions. Use using-git-worktrees at execution time to select a safe isolated execution environment; do not lose local notes or take over a running checkout without checking.
- [x] Confirm the runtime and dependencies exist. Run commands below from `prototype`. The bundled Node path currently used by this workspace is `C:/Users/rsull/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

```powershell
$gardenNode = 'C:/Users/rsull/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $gardenNode node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --testTimeout=60000
& $gardenNode node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
& $gardenNode node_modules/vinext/dist/cli.js build
& $gardenNode node_modules/typescript/bin/tsc --noEmit
```

- [x] Verify the installed Vinext bin path against its package manifest before running it; use the declared bin if different. Record baseline outputs in a local execution report with command, exit code and date, not assumed old test counts. Keep baseline TypeScript diagnostics for comparison.
- [x] For every task, run the named focused Vitest files using the same runtime and serial options. Observe a meaningful red test before implementation, then green. Commit only after the task tests and staged whitespace check pass.

## File responsibilities and order

New modules under `prototype/app/garden/`:

| Module | Responsibility |
|---|---|
| `abilities.ts` | Catalog IDs, prerequisite validation and four enabled abilities |
| `spiritKnowledge.ts` | Pure per-resident familiarity/practice/source state |
| `projectDefinitions.ts` | Typed planter/tool-rack recipe sequences |
| `projectProgress.ts` | Shared knowledge, supplies, project progress and idempotent events |
| `projectLayout.ts` | Shared book/basket/tool anchors and per-project footprints/slots |
| `projectScheduler.ts` | Recipe-driven replacement for the planter scheduler, wired atomically in Task 4 |
| `ToolRackProject.tsx` | Rack geometry and completed-tool resting presentation |
| `LearningProjects.tsx` | Render the two project views from authoritative progress |
| `learningDemo.ts` | Five scenario definitions and deterministic fixture creation |
| `LearningDemoPanel.tsx` | Accessible scenario controls and knowledge/activity explanation |
| `learningDemo.css` | Scoped panel styling consistent with the existing journal |
| `watchProject.ts` | Camera-facing request and project direction calculation |
| `projectIntegrationHarness.ts` | Test-only reusable live-navigation harness; no production imports |

Extract and generalize the existing `planterCoordinator.ts` into `projectScheduler.ts`, preserving its public function names. Task 3 tests the replacement independently; Task 4 atomically switches `CommunityCoordinator.tsx` and all production consumers, then removes the old runtime implementation. There is never more than one active scheduler. Also modify `gardenSession.ts`, `projectActivity.ts`, `ResidentActor.tsx`, `GardenWorld.tsx`, `page.tsx`, `JourneyJournal.tsx`, `PlanterJournal.tsx`, `PlanterProject.tsx` and their tests.

Each new pure/UI module gets a neighboring `.test.ts` file. Use existing Node Vitest and `renderToStaticMarkup` patterns; interaction behavior requires reducer tests plus real browser checks, not markup assertions alone.

## Task 1 — Catalog and individual learning

**Files:** Create `abilities.ts`, `abilities.test.ts`, `spiritKnowledge.ts`, `spiritKnowledge.test.ts`.

**Interfaces:**

```ts
export type AbilityId = 'B1'|'B2'|'B3'|'B4'|'G1'|'G2'|'G3'|'G4'|
  'C1'|'C2'|'C3'|'C4'|'S1'|'S2'|'S3'|'S4'|'P1'|'P2'|'P3'|'P4';
export type KnowledgeSource = { kind: 'book'|'observation'|'preview'|'legacy'; id: string };
export type AbilityKnowledge = { status: 'familiar'|'practiced'; source: KnowledgeSource };
export type SpiritKnowledge = Record<ResidentId, Partial<Record<AbilityId, AbilityKnowledge>>>;
export function createKnowledge(): SpiritKnowledge;
export function learnAbility(k: SpiritKnowledge, who: ResidentId, ability: AbilityId, source: KnowledgeSource): SpiritKnowledge;
export function practiceAbility(k: SpiritKnowledge, who: ResidentId, ability: AbilityId): SpiritKnowledge;
export function canPerform(k: SpiritKnowledge, who: ResidentId, ability: AbilityId): boolean;
export function validateAbilityCatalog(): string[];
```

`ResidentId` imports from `residents.ts`. Missing entries mean unfamiliar. Preserve the first genuine source; preview source stays explicit. Catalog includes all 20 rows and the exact prerequisite graph from the spec, but `enabled` is true only for B1/B2/G1/G2. `canPerform` checks enabled, learned ability and every prerequisite; later S4 target-skill validation is not implemented here.

- [x] Write failing tests including the following, plus disabled/unknown ID rejection, prerequisite graph uniqueness/cycles, per-resident isolation and idempotence:

```ts
it('reading permits fitting but cannot award practice', () => {
  const k = learnAbility(createKnowledge(), 'pip', 'B1', { kind: 'book', id: 'making-growing' });
  expect(k.pip.B1?.status).toBe('familiar');
  expect(k.moss.B1).toBeUndefined();
  expect(canPerform(k, 'pip', 'B1')).toBe(true);
  expect(practiceAbility(k, 'pip', 'B1').pip.B1?.status).toBe('practiced');
});
it('mallet work requires fitting knowledge', () => {
  const k = learnAbility(createKnowledge(), 'pip', 'B2', { kind: 'book', id: 'making-growing' });
  expect(canPerform(k, 'pip', 'B2')).toBe(false);
  expect(practiceAbility(k, 'pip', 'B2')).toBe(k);
});
```

- [x] Run `abilities.test.ts spiritKnowledge.test.ts`; verify failures concern the missing behavior.
- [x] Implement catalog data, validation and immutable learning helpers. Core practice guard:

```ts
if (!canPerform(k, who, ability) || k[who][ability]?.status === 'practiced') return k;
return { ...k, [who]: { ...k[who], [ability]: { ...k[who][ability]!, status: 'practiced' } } };
```

- [x] Run focused tests green and staged whitespace check. Commit `feat: add individual spirit ability knowledge` with these four files only.

## Task 2 — Two recipes and one authoritative progress model

**Files:** Create `projectDefinitions.ts`, `projectDefinitions.test.ts`, `projectProgress.ts`, `projectProgress.test.ts`. Read existing `planterProgress.ts`; keep it operational until Task 4 switches consumers.

**Consumes:** Task 1 knowledge functions and types.

**Produces:**

```ts
export type ProjectId = 'planter'|'tool-rack';
export type WorkAction = 'fit'|'tap'|'fill'|'plant';
export type RecipeStep = {
  id: string; action: WorkAction; ability: AbilityId;
  tool: 'piece'|'mallet'|'soil'|'seeds'; seconds: number; reveal: string;
};
export type ProjectState = {
  supplies: 'absent'|'available'|'committed'|'used';
  completedSteps: number; deliveredForStep: number|null;
};
export type ProjectsProgress = {
  book: boolean; knowledge: SpiritKnowledge;
  projects: Record<ProjectId, ProjectState>; active: ProjectId|null; processed: string[];
};
export type ProjectEvent =
  | {type:'book'; id:string}
  | {type:'materials'; id:string; project:ProjectId}
  | {type:'learn'; id:string; resident:ResidentId; ability:AbilityId; source:KnowledgeSource}
  | {type:'commit'; id:string; project:ProjectId; resident:ResidentId}
  | {type:'deliver'; id:string; project:ProjectId; step:number}
  | {type:'complete'; id:string; project:ProjectId; step:number; resident:ResidentId};
export const PROJECT_RECIPES: Record<ProjectId, readonly RecipeStep[]>;
export function createProjectsProgress(): ProjectsProgress;
export function reduceProjectProgress(p: ProjectsProgress, e: ProjectEvent): ProjectsProgress;
export function nextRecipeStep(p: ProjectsProgress, id: ProjectId): RecipeStep|null;
export function projectComplete(p: ProjectsProgress, id: ProjectId): boolean;
```

Recipe stages: planter `fit-base/B1 → tap-base/B2 → fit-frame/B1 → tap-frame/B2 → fill/G1 → plant/G2`; rack `fit-base/B1 → tap-base/B2 → fit-upright/B1 → tap-upright/B2 → fit-crossbar/B1 → tap-crossbar/B2`. Perform durations: fit 3s, tap 3s, fill 4s, plant 4s. Each step needs a delivery acknowledgement; tapping uses the reusable mallet, not a new wooden part. Reveal IDs distinguish seated parts from fastened parts. Carrying/delivery remains unskilled.

- [x] Write failing model tests for independent bundles, both prerequisite orders, exact stage guards, active-project exclusion, learned-skill transfer and idempotence. Include:

```ts
it('supplies do not teach and a repeated delivery is harmless', () => {
  const e: ProjectEvent = { type:'materials', id:'rack-bundle', project:'tool-rack' };
  const p = reduceProjectProgress(createProjectsProgress(), e);
  expect(p.knowledge.pip).toEqual({});
  expect(p.projects.planter.supplies).toBe('absent');
  expect(p.projects['tool-rack'].supplies).toBe('available');
  expect(reduceProjectProgress(p, e)).toBe(p);
});
```

- [x] Run `projectDefinitions.test.ts projectProgress.test.ts` red.
- [x] Implement ordered immutable transitions. Validate step index, committed/active project, correct delivered step and `canPerform` before completion. Completion calls `practiceAbility` for only that step's ability; final completion sets supplies used and clears active. Preserve committed materials on interruption. Validate definition IDs, enabled abilities and positive finite durations.

```ts
const step = nextRecipeStep(p, e.project);
// In the complete branch, before constructing a new state:
if (!step || p.active !== e.project || e.step !== state.completedSteps ||
    state.deliveredForStep !== e.step || !canPerform(p.knowledge, e.resident, step.ability)) return p;
```

Here `state` is `p.projects[e.project]`; this guard is inside the narrowed `e.type === 'complete'` branch. Accepted event IDs are recorded once; rejected events must not poison future valid retries. Preview fixtures set knowledge directly through the explicit preview-source helper, not fabricated reading events.

- [x] Run tests green; commit `feat: define reusable planter and tool rack progression`.

## Task 3 — Generic scheduling, safe project sites and tool ownership

**Files:** Create `projectLayout.ts`, `projectLayout.test.ts`, `projectScheduler.ts`, `projectScheduler.test.ts`. Read `planterCoordinator.ts`, `CommunityCoordinator.tsx` and `projectActivity.ts` as the extraction source. Leave existing production imports intact until Task 4.

**Consumes:** Task 2 recipe/progress API. Preserve existing `createProjectRuntime(seed, epoch)` and `stepProject(runtime, input)` names. Change `ProjectInput.progress` to `ProjectsProgress`; events become `ProjectEvent[]`. Keep `actors`, `reachable`, `delta`, `paused`, `epoch` inputs and replace the single footprint flag with `footprintClear: Record<ProjectId, boolean>`.

**Produces:** Extend `ProjectDirective` with `project: ProjectId|null`, `step: number|null`, and `ability: AbilityId|null`; actions are existing read/carry/observe/water/inspect plus fit/tap/fill/plant/store-tool/retrieve-tool. Existing `key`, `actor`, `phase`, `target`, `lookAt`, `tool`, `elapsed` retain their meaning. Runtime owns a single claim for each reusable tool. Expose `toolRestAnchor(progress, tool, claimed)` from the layout module; tools move their resting anchor only when unclaimed.

- [x] Extend red coordinator tests using real resident snapshots, not immediate synthetic completion. Exercise exact position tolerance `.28`, interrupted 6s reading, interrupted 3s observation, tool exclusion, one active project, pickup release, blocked-route 4s retry and epoch invalidation. A paused step returns no events:

```ts
it('does not progress a paused project', () => {
  const out = stepProject(createProjectRuntime(37, 1), {
    delta:.05, paused:true, epoch:1, progress:createProjectsProgress(), actors:[],
    reachable:()=>true, footprintClear:{planter:true, 'tool-rack':true},
  });
  expect(out.events).toEqual([]);
  expect(out.directives).toEqual({});
});
```

- [x] Run focused tests red. Build layout from existing `PLANTER_LAYOUT`, reading approach and actual navigation obstacles. Candidate rack site is `{x:-17,z:1.5}` with final radius `.65`; work/observation/drop slots are outside it. Treat these as testable candidates, not validated geometry: run route/overlap tests before finalizing. If unsafe, choose another nearby lawn anchor and update one layout definition; do not modify terrain or weaken tests.
- [x] Refactor current coordinator stage selection into recipe lookup. Reading emits four separate familiar events with one shared book source; observe emits only the active step's ability. Carrying delivers the current recipe step's required input. Perform time accrues only at the reserved position with prerequisites and resources held; a fresh valid claim is required after interruption. Use finite delta capped at `.05`.

```ts
const step = nextRecipeStep(progress, project);
const eligible = step !== null && canPerform(progress.knowledge, actor.id, step.ability);
// Reserve before issuing approach; only completion of that same claim emits a complete event.
```

- [x] Define the arbitration contract: community input marks player/reward-owned residents unavailable before scheduling. Keep finite breaks between newly chosen tasks (2s) and between ambient tool/planter visits (15s); an available actor must still eventually choose pending project work. Idle tool storage/retrieval has lower priority than active construction. Losing a claim returns unfinished props to the supply/tool anchor without changing completed progress.
- [x] Produce shared obstacle selectors that reserve both activated projects' final footprints and deduplicate identical obstacles. Rack activation is supplied explicitly by scenario selection or its material opportunity, not merely because it exists in the catalog. Test selector results against existing safe-route functions; Task 4 wires all production consumers.
- [x] Run scheduler/layout tests green alongside unchanged legacy tests, then commit `feat: define reusable project scheduler and safe tool claims`. Production still runs the legacy planter until the atomic switch next.

## Task 4 — Session migration and isolated demo scenarios

**Files:** Create `learningDemo.ts`, `learningDemo.test.ts`; modify `gardenSession.ts`, `gardenSession.test.ts`, `planterProgress.ts`, `planterProgress.test.ts`, `page.tsx`, `GardenWorld.tsx`, `JourneyJournal.tsx`, `PlanterJournal.tsx`, `PlanterJournal.test.ts`, `PlanterProject.tsx`, `CommunityCoordinator.tsx`, `projectCommunity.test.ts`, `projectActivity.ts`, `projectActivity.test.ts`, `ResidentActor.tsx`, `planterCoordinator.test.ts` and `planterIntegration.test.ts`. Remove `planterCoordinator.ts` only after every import and its regression coverage have migrated to the new scheduler.

**Consumes:** Tasks 1–3. This is the atomic switch to the new authoritative progress store.

**Produces:**

```ts
export type DemoScenarioId = 'planter-materials-first'|'planter-knowledge-first'|
  'rack-from-scratch'|'rack-preview'|'planter-to-rack';
export type DemoScenario = { id: DemoScenarioId; residents: 1|3 };
export function createDemoProgress(scenario: DemoScenario): ProjectsProgress;
export type DemoSession = { scenario:DemoScenario; progress:ProjectsProgress };
// Extend GardenSession with demo: DemoSession|null.
export function visibleProjects(session: GardenSession): ProjectsProgress;
```

Change ordinary `project`/`previousProject` to `ProjectsProgress`; they remain separate from `demo.progress`. Add session events `{type:'start-demo'; scenario:DemoScenario}`, `{type:'exit-demo'}`, `{type:'demo-book'; id:string}`, `{type:'demo-materials'; id:string; project:ProjectId}`. Existing project events carry `ProjectEvent[]` and epoch; route them to the active store only. Start/replay/exit increment epoch; exit creates a fresh ordinary journey as disclosed by UI. Confirmation is a UI concern: do not dispatch destructive replacement before confirmation.

- [x] Write failing tests proving start/exit epoch changes, ignored stale batches, ordinary/demo isolation, comparison immutability, remount preservation, fresh preview source labels and preview not practiced:

```ts
it('preview knowledge is explicit and never contaminates ordinary progress', () => {
  const before = createGardenSession();
  const next = gardenSessionReducer(before, {type:'start-demo', scenario:{id:'rack-preview', residents:3}});
  expect(next.project).toBe(before.project);
  expect(next.demo?.progress.knowledge.pip.B1?.source.kind).toBe('preview');
  expect(next.demo?.progress.knowledge.pip.B1?.status).toBe('familiar');
  expect(next.epoch).toBeGreaterThan(before.epoch);
});
```

- [x] Run session/scenario tests red. Define five fixtures: materials-first starts with planter supplies and offers book; knowledge-first starts with book and offers materials after any resident learns; rack-from-scratch starts with book and offers rack supplies; rack-preview seeds familiar B1/B2 for the selected roster and rack supplies; transfer starts with book/planter supplies and offers rack supplies after planter completion. Never auto-award knowledge outside the named preview fixture.
- [x] Implement reducer routing and current scene roster projection. A solo demo shows the expanded nook/book without silently advancing to three residents. Disable ordinary role/journey changes while a demo is active; keep direct interactions, finding and pause available. Demo has no comparison timeline; ordinary comparison remains unchanged.
- [x] Atomically wire `CommunityCoordinator.tsx` to `projectScheduler.ts`, new events and shared obstacles. Preserve priority release and pending-parent-acknowledgement handling. Change travel/directive imports without changing safe motion. Bridge new fit/tap presentation to existing assembly poses until Task 5 refines them; expose read-only planter stage projections to the old renderer so the ordinary planter stays visible. This projection must not become a writable second store. Migrate existing coordinator, community, movement and integration tests without dropping assertions.
- [x] Replace old knowledge reads throughout consumers. Convert legacy `assembly` to familiar B1/B2 and `planting` to familiar G1/G2 using an explicit `migrateLegacyPlanter` function in `projectProgress.ts`, with `legacy` source. Preserve supply state; map old base/frame/soil/planted completion to new step counts 2/4/5/6. Old delivered flags only map when the equivalent next action input is known; otherwise return it to supplies without spending again. Test each old stage. Remove old writable reducer from production consumers; keep only a one-way migration type/helper if fixtures need it.
- [x] Update journal copy/tests to use selectors from one model. Include a clear distinction between ability familiarity and practice and retain privacy/reset explanations. Run all migrated tests green; commit `feat: isolate learning scenarios and migrate shared knowledge`.

## Task 5 — Visible actions, rack geometry and tool reuse

**Files:** Create `ToolRackProject.tsx`, `ToolRackProject.test.ts`, `LearningProjects.tsx`, `LearningProjects.test.ts`; modify `PlanterProject.tsx`, `PlanterProject.test.ts`, `projectActivity.ts`, `projectActivity.test.ts`, `ResidentActor.tsx`, `GardenWorld.tsx` and `PipCharacter.tsx` (the existing creature prop renderer).

**Consumes:** `ProjectsProgress`, recipe reveal IDs, shared layout and project directives. **Produces:** `<LearningProjects progress={progress} directives={directives} />`, with no event-dispatch prop; presentation cannot grant progression.

- [x] Write failing tests for each reveal boundary, distinct fit/tap poses, no held tool on released claims, static readable reduced-motion presentation and one resting/held instance per tool. Extend existing render/model test patterns, including:

```ts
it('approaching never animates fastening', () => {
  const motion = projectMotion({action:'tap', tool:'mallet', elapsed:1,
    performing:false, reducedMotion:false});
  expect(motion.tap).toBe(0);
});
```

- [x] Run render/action tests red. Build the small rack using existing material helpers and original code-native shapes. Render fitted parts seated but not magically floating, then show a small joint accent at fastening completion. Derive geometry from step reveal IDs; do not use a reveal timer.
- [x] Implement fitting rotation/settling and mallet taps as distinct action adapters in `projectActivity.ts`. Preserve fill/plant motion with visible soil/seeds attachments. Reduced motion removes oscillation but retains held object, static contact pose and stage changes. Avoid adding human hands or altering creature proportions.
- [x] Render held tools from claims and idle tools from the single unclaimed resting-anchor selector. After rack completion an available spirit can store and retrieve the mallet; this is ambient reuse, not a fifth learned ability. Coordinate resting-anchor change with Task 3 rather than spawning a second tool at the rack.
- [x] Wire `LearningProjects` into `GardenWorld` and completed geometry into all collision consumers. Run tests green and inspect the normal first-person view in the browser. Record actual screenshot/interaction evidence; do not call visual acceptance complete from static markup. Commit `feat: show fitting fastening and usable tool rack`.

## Task 6 — Discoverable controls, knowledge explanations and watch action

**Files:** Create `LearningDemoPanel.tsx`, `LearningDemoPanel.test.ts`, `learningDemo.css`, `watchProject.ts`, `watchProject.test.ts`; modify `page.tsx` and `GardenWorld.tsx`, including its existing `FirstPersonControls` camera consumer.

**Consumes:** Task 4 scenario/session events and Task 3 live directive status. **Produces:**

```ts
export type WatchProjectRequest = { project:ProjectId; sequence:number };
export type DemoPanelProps = {
  session:GardenSession; busy:boolean;
  activities:Partial<Record<ResidentId, string>>;
  onStart:(scenario:DemoScenario)=>void; onExit:()=>void;
  onBook:()=>void; onMaterials:(project:ProjectId)=>void;
  onWatch:(project:ProjectId)=>void;
};
```

Panel owns open/closed state, selected roster/scenario and a pending replacement confirmation. Only confirmation calls `onStart`/`onExit`. Escape cancels pending replacement or closes the panel; restore focus to the triggering control. Confirmation text explicitly says local simulation resets. Avoid changing pointer-lock while a dialog has focus.

- [x] Write failing server-render tests for a prominent `Learning demo` button, all five scenario labels, disabled inappropriate material/book actions, explicit preview badges and only four enabled abilities. Test confirmation decision logic as a pure exported helper in `learningDemo.ts`:

```ts
export function requiresDemoConfirmation(session:GardenSession): boolean;
// True for active demo or any non-initial ordinary journey/project progress.
```

```ts
it('requires confirmation before replacing an active demo', () => {
  const s = gardenSessionReducer(createGardenSession(), {
    type:'start-demo', scenario:{id:'rack-from-scratch', residents:1},
  });
  expect(requiresDemoConfirmation(s)).toBe(true);
});
```

- [x] Run UI/watch tests red. Implement the panel beside journal access, with one selected scenario card, roster selector and explicit opportunity buttons. Show unfamiliar/familiar/practiced per resident, source labels, current activity and bounded recent accepted milestones (last 12). Derive milestones only from accepted state changes, not raw rejected callbacks. Expose at most the newest meaningful milestone through a polite live region.
- [x] Implement waiting selectors: missing book, missing skill/prerequisite, missing project bundle, unavailable resident or owned tool. These explain state but never assign jobs or force an actor. Keep the knowledge panel readable on a narrow viewport without a 20-column grid; planned paths can be collapsed text.
- [x] Implement watch using the existing `residentLookAngles` math and the active project's work point. A request changes yaw/pitch once, not player position; it does not continuously follow. Show the destination name/direction even when terrain blocks the view. Respect busy dialogs and existing direct-interaction controls.
- [x] Run tests green. In browser verify Tab/Shift+Tab, Escape/cancel, confirm/replay, return-to-journey, roster changes, no state loss on cancel, focus return and camera comfort. Commit `feat: add accessible learning demo and watch controls`.

## Task 7 — Full navigation transfer demo and acceptance record

**Files:** Create `projectIntegrationHarness.ts`, `learningDemoIntegration.test.ts`; adapt `planterIntegration.test.ts`; update `STATUS.md`, `BACKLOG.md`, `docs/Start Here.md` and this plan's checked steps only to match evidence. Keep a dated `docs/reviews/2026-09-08-learning-foundations-verification.md` report.

**Consumes:** Live `GardenCommunity`, generic progress/session events and actual safe locomotion. **Produces:** a test-only harness extracted from current `planterIntegration.test.ts`, preserving authored spawns, `.05` delta, actual routes, peer obstacles and the existing stopped `.16` waypoint exception.

```ts
export function createProjectHarness(count:1|3, initial:ProjectsProgress): {
  readonly progress:ProjectsProgress; readonly activeSeconds:number;
  apply:(events:ProjectEvent[])=>void;
  tick:()=>void;
  until:(done:()=>boolean, seconds?:number)=>Promise<void>;
};
```

- [x] Write failing end-to-end tests for planter and rack in both gate orders and both rosters, plus two-project transfer. Use book events and real reading rather than seeding earned tests; only preview tests seed knowledge. Include the following budget/transfer assertion inside the transfer fixture after planter completion:

```ts
const earned = structuredClone(sim.progress.knowledge);
sim.apply([{type:'materials', id:'second-project', project:'tool-rack'}]);
await sim.until(() => projectComplete(sim.progress, 'tool-rack'), 240);
for (const resident of ['pip','moss','fern'] as const) {
  for (const ability of ['B1','B2','G1','G2'] as const) {
    const before = earned[resident][ability];
    if (before) expect(sim.progress.knowledge[resident][ability]?.source).toEqual(before.source);
  }
}
```

- [x] Run the integration tests and diagnose failures using systematic-debugging. Never raise the 240 simulated-second budget, remove obstacles, assign knowledge mid-test, or snap actors to work slots to get green. Vitest's 60s wall-time per test is independent of active simulation time.
- [x] Cover pickup mid-carry and placement, blocked pickup, unavailable roster, duplicate deliveries and completion batches, stage footprints, tool anchor transition, hidden-tab delta suppression, remount, stale epochs, ordinary comparison and reset. Check ordinary motion speed and safe segments each frame, accepting only the exact existing stopped waypoint exception.
- [ ] Run the full fresh suite, lint, production build and standalone typecheck comparison. Record failures and build warnings explicitly. Request scoped code review through the execution skill's workflow, correct findings and rerun affected tests before claiming the milestone complete.
- [ ] Browser walkthrough: launch every scenario; prove real book learning, fitting, tapping, soil/seeds placement, rack use and retained knowledge; verify solo/three residents, safe nook access, keyboard controls, cancel/replay and a real hidden-tab return. Inspect from ordinary camera height. Check reduced motion where the available browser/OS tooling permits it and mark any untested portion open.
- [x] Update documentation with per-ability implemented/automated/visual/owner-accepted columns, concrete evidence and remaining issues. No owner acceptance checkbox may be ticked on the agent's judgment. Keep later 16 abilities planned. Commit exact implementation/report files; do not push or deploy without authorization.

## Plan self-review and handoff

- [x] Coverage: Tasks 1–2 knowledge/gates/transfer; Task 3 autonomous ownership/routes; Task 4 migration/scenario isolation; Task 5 visible behavior; Task 6 understandable testing; Task 7 recovery/regression/manual evidence.
- [x] Scope: only the first four enabled abilities and two projects; later paths are catalog descriptions, not stubbed runtime actions.
- [x] Interfaces: ProjectId/AbilityId are shared, one authoritative knowledge model, one event type, one progress owner per active session.
- [x] Preparation does not imply implementation or passing tests. Existing implementation tests require deliberate migration, not deletion of their assertions.

Execution choice: subagent-driven implementation with per-task reviews, or inline execution in this task with checkpoints. Do not create a separate user task or dispatch agents until the execution approach is selected.
