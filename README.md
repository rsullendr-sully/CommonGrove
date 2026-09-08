# Common Grove

Common Grove is an internal employee experience where accomplishments from existing workplace systems quietly grow a personal garden and a community of autonomous companions. The current local prototype includes Pip, Moss and Fern as a first shared-garden milestone.

## Project control

- [PROJECT.md](PROJECT.md) — stable vision, principles, scope, and working assumptions
- [ROADMAP.md](ROADMAP.md) — release sequence and approval gates
- [STATUS.md](STATUS.md) — the single place to resume current work
- [BACKLOG.md](BACKLOG.md) — Now, Next, and Later work
- [Release 0](docs/releases/release-0-validation.md) — the active concept-validation slice
- [Role-equitable progression](docs/decisions/0001-role-equitable-progression.md) — provisional accomplishment and reward rules
- [Local-only development](docs/decisions/0002-local-only-during-development.md) — current security and hosting decision
- [Constrained 3D space](docs/decisions/0003-constrained-3d-space.md) — spatial garden direction and boundaries
- [Staff interview guide](docs/research/release-0-interview-guide.md) — 20–25 minute qualitative session
- [Short staff survey](docs/research/release-0-survey.md) — anonymous follow-up questions
- [Validation tracker](docs/research/release-0-validation-tracker.md) — participant plan, session notes, and gate scorecard
- [Current project review](docs/reviews/project-review-2026-09-04.md) — setup, goals, gaps, and completion direction
- [Four-return implementation](docs/superpowers/plans/2026-09-04-four-return-journey.md) — current simulation milestone and checks

## Run the local prototype

The application is in `prototype/`. On the configured Windows workstation, use its already-installed runtime without triggering a dependency reinstall:

```powershell
cd prototype
.\node_modules\.bin\vinext.cmd dev --hostname 127.0.0.1 --port 3001
```

Open [the local garden](http://127.0.0.1:3001/). In Garden journal, expand Simulation controls and choose “Preview three residents” to jump to return 3 for Pip, Moss and Fern, or simulate the authored returns normally. Choose the Lantern Orchard or Tinker Workshop now or later, then use the return buttons to preview a week, several weeks, and a season of development. Last return compares the preceding garden; Now resumes the shared community. A completed pet, snack, or toy interaction is remembered by the resident who received it.

Nothing is connected to workplace systems. Refresh or Restart journey clears all progress and memories. Both choice and care are optional. No hosting, source upload, or staff distribution is authorized.

Verification from `prototype/`:

```powershell
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
.\node_modules\.bin\vinext.cmd build
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
```

See STATUS.md for the latest results and the currently failing standalone typecheck; a successful build alone is not evidence of type safety.

## Working rule

Only work listed under **Now** in `BACKLOG.md` is active. New ideas go under **Later** until the current release gate is evaluated.
