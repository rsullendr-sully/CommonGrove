# Learning foundations — verification and acceptance, September 8, 2026

The local milestone implements four abilities across two autonomous projects. The catalog describes twenty abilities across five paths; the remaining sixteen are planned and cannot launch. Individual knowledge is shared across recipes, while materials belong to each project. Reading grants familiarity, performed work grants practice, and valid completed-action observation credits only that action. Preview knowledge is explicitly labeled.

Environment polish, staff invitations, hosting, persistence, workplace integrations and multiplayer remain paused or outside scope. Work is local on `codex/connected-sanctuary`; the last recorded push remains `6281993`. This record does not establish owner approval.

## Ability acceptance

| Ability | Implemented | Automated evidence | Actual visual evidence | Owner accepted |
| --- | --- | --- | --- | --- |
| B1 — fit wooden pieces | Yes, planter and rack | Real reading/source timing, safe pickup/carry/work, ordered fitting and practice; both project/roster/gate matrices and transfer | Visible carried wood and planter base; rack base/uprights/crossbar observed at normal height. Full short fitting/contact readability remains open. | [ ] |
| B2 — fasten with a mallet | Yes, planter and rack | Exclusive mallet claims, real delivery, ordered tapping/practice, retained transfer source; distinct/static reduced-motion pose checks | Rack tap completion milestones and B2 practice observed; mallet storage seen. Full strike/contact readability remains open. | [ ] |
| G1 — fill with soil | Yes, planter | Earned six-step planter loops; specific soil reveal/attachment/pose and observation guards | Actual soil attachment and fill contact still need a focused normal-camera observation. | [ ] |
| G2 — plant seeds | Yes, planter | Earned six-step planter loops; specific seed reveal/attachment/pose and completed-action observation guards | Actual seed attachment and planting contact still need a focused normal-camera observation. | [ ] |
| Remaining 16 catalog abilities | Planned, disabled | Catalog/graph and disabled runtime guards | No implementation or visual acceptance claimed | [ ] |

Automated rendering checks establish selected geometry and poses, not visual quality. Owner acceptance remains blank until the owner explicitly records it.

## Real-navigation integration

`projectIntegrationHarness.ts` uses the actual `GardenCommunity` and `stepProjectTravel`, authored resident spawns, `.05` simulated delta, static/peer/project obstacles and the normal `1.2` maximum speed. It checks every traveled segment, per-frame displacement, traveled-distance accounting and stationary peer/footprint safety. Its only larger correction is the established stopped safe-waypoint settle of at most `.16` units; no other target teleport is allowed.

The harness advances only actors that the project scheduler currently directs. Unclaimed residents do not run their ordinary/social locomotion inside this harness, so its passing routes do not prove every live ambient congestion pattern or browser wall-clock completion time. The table below reports deterministic active simulated seconds, not observed wall time.

Both transfer project footprints are reserved before either build. All activated footprints remain deduplicated across every stage, and the actual tool presentation selector exposes one held/resting instance per reusable tool. Only the isolated legacy observation fixtures retain their explicitly authored two-actor starts and migrated knowledge; earned demo runs never seed or reposition residents.

| Scenario | Residents | Planter active seconds | Rack active seconds |
| --- | ---: | ---: | ---: |
| Materials first, earned | 1 | 146.55 | 134.90 |
| Knowledge first, earned | 1 | 145.55 | 133.90 |
| Materials first, earned | 3 | 146.55 | 134.90 |
| Knowledge first, earned | 3 | 145.55 | 133.90 |
| Earned planter → rack transfer | 1 | 145.55 | 131.40 |
| Earned planter → rack transfer | 3 | 145.55 | 166.65 |
| Explicit rack preview | 1 | — | 111.35 |
| Explicit rack preview | 3 | — | 113.35 |

Materials/knowledge columns in the first four rows are independent fixtures. Each project completes within 240 active simulated seconds; transfer uses a separate 240-second budget for its second project. Gate waits are included in the reported single-project durations. The Vitest 60-second wall timeout is independent of these simulation budgets.

After genuine planter completion, transfer fixtures copy the earned knowledge, deliver a separate rack bundle, build the rack, and assert every pre-existing B1/B2/G1/G2 source is retained for Pip, Moss and Fern. Actual emitted batches are also passed through the session reducer to verify ordinary/demo isolation, duplicate no-ops, remount preservation, stale-epoch rejection, replay reset and fresh ordinary exit.

The preview solo fixture additionally physically stores both tools, verifies their actual rack anchors, and retrieves the stored mallet for a new planter opportunity through real routes. This ambient/storage observation has separate bounded waits after the rack budget; it does not grant a fifth ability.

## Regression coverage and verification

The existing eleven planter integration tests and their assertions remain. They cover both gate orders/rosters; final-footprint deduplication; a ten-second carried worker, blocked basket, pauses and fresh epoch; interrupted/distant observation; and real completion-batch comparison/remount/reset behavior. The new ten tests add the rack/transfer/preview matrix, absent-knowledge gates, unavailable roster, hidden-time input suppression, large-return-delta capping and real storage/retrieval.

Placement and priority release also remain covered by `pipInteraction.test.ts`, `residentCoordination.test.ts`, `projectCommunity.test.ts`, `projectScheduler.test.ts` and `planterCoordinator.test.ts`. A paused production community call with a 3600-second delta accrues no work; the corresponding visible return accrues at most `.05`. This tests the production pause/delta boundary; it is not a browser `document.hidden` test.

Final commands ran September 8 from `prototype` using the installed bundled Node runtime:

| Check | Command after the Node executable | Completed result |
| --- | --- | --- |
| Final post-fix full regression suite | `node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --testTimeout=60000` | **551 tests / 57 files passed**, exit 0, 327.81s; started 17:47:07 |
| Full lint | `node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next` | Exit 0, no output |
| Production build | `node_modules/vinext/dist/cli.js build` | Exit 0; all five phases completed |
| Final standalone TypeScript | `node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` | Expected remaining baseline failure, raw exit 2: **55 baseline → 52 current diagnostics, zero added**; the same three prior diagnostics remain removed |
| Post-review dialog regression | `node_modules/vitest/vitest.mjs run app/garden/dialogFocus.test.ts app/garden/LearningDemoPanel.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=60000` | **9 tests / 2 files passed**, exit 0 |
| Post-review full lint and build | Same lint/build commands above | Both exit 0; lint had no output and build completed all five phases with the same advisories |

Build advisories remain: plugin timing notices, client chunks larger than 500 kB and unknown `/` route classification by static analysis. No build errors occurred. The typecheck comparison retains complete file/message diagnostics while normalizing line/column numbers; it uses no file-name relocation or suppression. Two earlier PlanterProject diagnostics were already removed; extracting the old Three import into a typed real-runtime Node loader removes one additional old test diagnostic.

The first full lint exposed a prior scheduler-test raw `require('three')` error and unused type import. The approved correction only removes that import and uses `node:module`'s `createRequire(import.meta.url)` under a named loader in both scheduler test and new harness. The real Three runtime and all test assertions remain; focused scheduler/integration verification passed 43 tests before the full suite. There are no dependency or production-code changes in Task 7.

### Final review and scoped fix

The independent final review of `01a3ffd..eb80cd8` found one required implementation issue. The ordinary choice/privacy keyboard handler selected the first document dialog, but the always-mounted hidden learning dialog precedes both ordinary dialogs. Choice and privacy could therefore lose focus instead of wrapping at their Tab boundaries. The scoped fix gives each ordinary dialog an explicit ref and passes only the currently active ordinary-dialog boundary to the shared Tab-wrap helper. Focused tests cover forward and reverse wrapping for both ordinary dialogs and retain the existing learning-panel test coverage. Parent browser rechecks are recorded separately from automated evidence.

The same review closed the catalog visible-proof exact-copy assertion suggestion as nonblocking, retained the familiar preview/legacy observer provenance limitation as nonblocking, and preserved the already approved conservative planter-berm deferral. No cosmetic test-title, catalog-copy or preview-observer expansion was included in the fix.

A final scoped rereview of the fix approved it with no new breakage found. This closes the review finding, not the remaining manual or owner-acceptance gates.

## Browser evidence and remaining checks

Controller observations through actual UI controls, September 8, at `http://127.0.0.1:3001/`:

- Materials-first solo: actual Add book, all four Book familiar records, later B1 practice; Watch turned once and showed the destination cue. Ordinary three-resident smoke showed carried wood and planter base.
- Knowledge-first solo: launched with all four abilities unfamiliar and the book already provided while planter materials stayed locked. After genuine reading, Pip showed all four familiar from Book and none practiced; planter materials then unlocked and the actual separate bundle was accepted.
- Tool-rack-from-scratch solo: launched with the book provided and all four abilities unfamiliar; rack materials were available while planter materials were disabled, and the separate rack bundle was accepted during the reading approach. All six rack steps later completed; B1/B2 became practiced from Book while G1/G2 remained familiar from Book, and the grounded base/uprights/crossbar were visible. A short tap status was caught, but the view after the action did not establish contact readability. Across the recorded passes, all five scenarios have been launched through the actual UI and both earned recipe types have completed at least once, but not all five scenario runs have completed.
- Rack preview with three residents: all six accepted completion milestones and normal-height base/upright/crossbar stages; Pip B1/B2 practice, Moss B1 practice, Fern B2 practice; sources stayed Preview seed and G1/G2 stayed unfamiliar. Mallet and then can moved from the basket to separate rack hooks without resting duplicates.
- Earlier background Planter-to-tool-rack pass with three genuinely unfamiliar residents: all six planter steps completed. Before the separate rack bundle, earned B1/B2/G1/G2 records mixed Book and Observed action sources with no Preview seed. Those first sources remained unchanged after the rack bundle and first rack fitting. The grounded rack base appeared beside the completed planter, but the rack did not complete in that pass. Retrieve-tool approach later changed claim owners; no deadlock, frame-rate or timing diagnosis is inferred from that partial background observation.
- Fresh foreground Planter-to-tool-rack pass with three genuinely unfamiliar residents: planter and rack each completed all six steps with the independent rack bundle accepted between them, and both built props were visible. Before the rack, Pip had B1/B2 familiar from Observed action and G1/G2 practiced from Book; Moss and Fern had B1/B2 practiced from Book and G1/G2 familiar from Book. After rack completion Pip’s B1/B2 became practiced while retaining Observed action, Moss and Fern stayed unchanged, and all 12 resident/ability source kinds were retained. Normal-camera frames caught fill perform, rack fit perform and rack tap perform; the soil view remained too distant for full attachment readability and the short plant contact was missed. After both the mallet and blue can were visibly stored on separate rack hooks, Fern showed retrieve-tool approach. A later actual-UI wait caught Moss water approach; the synchronous normal-camera frame showed Moss at the rack, the can absent from its hook and the mallet still hanging. This supports actual post-storage watering-can retrieval/reuse, not a complete watering contact or mallet retrieval. Knowledge remained unchanged and browser errors were empty.
- Learning-panel modal wrapping, Escape/cancel focus restoration, replay/reset and fresh-journey exit were verified before final review. A 390×844 viewport showed stacked controls, no horizontal overflow and usable focus return. Before the fix, a fresh visible-browser check reproduced both ordinary failures: reverse traversal escaped Choice and forward traversal escaped Privacy. After the frozen-source fix, Choice wrapped Close ↔ Workshop even while Keep this path was disabled; Privacy wrapped Done ↔ Close; Escape closed both. The always-mounted learning panel still wrapped Close ↔ Planned abilities, and Escape restored focus to its launcher. Browser error logs were empty; no destination or privacy response was committed during these checks.

Open: full completion of every one of the five scenario runs, close/readable soil and seed attachment views plus the missed short plant contact, broader animation-quality acceptance, complete watering action/contact and actual mallet retrieval, pickup/placement interruption recovery, full held-movement modal check, real hidden-tab return, browser/OS reduced motion and owner acceptance. Prior QA tabs were created with the browser surface hidden while the page still reported `document.visibilityState === 'visible'`; background rendering or throttling could contribute to wall time, but this was not established and is not a hidden-tab test. Screenshots were inspected inline, not saved as permanent image artifacts. Controller scratch evidence is in `task-4/5/6-browser-smoke.md`, `task-7-browser-evidence.md` and `final-fix-browser-evidence.md`; the concrete observations above are retained here for the project record.

## Preserved limitations

The existing planter at `(-15,-1.8)`, radius `.85`, has conservative rendered-west-berm clearance **0.8574924838520323**, below the unit ellipse bound. Berm 6 is centered at `(-19.1,-1.1)`, radius `3.5`; inflated test radii are `3.5*1.06+.85=4.56` on x and `3.5*.66+.85=3.16` on z. This stronger approximation flagged an existing footprint concern; the owner-approved scope preserves the planter and terrain. The new rack at `(-16,1.5)`, radius `.65`, clears the stronger check. Every old/new role route passes sampled berm clearance with both projects present. The baseline concern does not permit unsafe new routes.

Standalone TypeScript has established missing-Three-declaration and other diagnostics. No declarations, suppressions or dependencies are added to hide them. Performance measurements and the complete owner walkthrough remain open. The independent final review is complete and its sole required ordinary-dialog fix has focused automated and parent browser evidence; final acceptance must still preserve the remaining manual and owner gates above.
