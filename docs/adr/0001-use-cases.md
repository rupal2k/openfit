# ADR-0001: Use cases only where they protect data

**Status:** Proposed
**Date:** 2026-10-16
**Deciders:** project owner, contributors

## Context

A contributor coming from Kotlin/Android asked for a use-case layer, as in Clean Architecture. We measured the current code first:

| Fact | Count |
|---|---|
| State mutations (`update(s => …)`) inside UI files | 49 (18 in `sheets.jsx`, 12 in `views/Settings.jsx`) |
| State mutations in `lib/` or `store/` | 1 |
| Multi-statement mutation blocks in UI files | 42 |
| Test files that cover UI files | 0 (all 18 test files cover `lib/`) |

The clearest case is `doFinishWorkout` in `sheets.jsx`. It mixes business rules with UI work:

- **Business rules:** weight-PR and estimated-1RM-PR detection, building the stored workout record (including the `target` field the progression engine reads), and updating best weights (`exWeights`).
- **UI:** saving, sounds, and opening the summary sheet.

None of the rules is tested, so a regression there would silently corrupt training history and future progression targets.

Some flows already follow a use-case shape without being called that. For example, `addEntry` and `updateEntry` in `lib/nutrition.js` are pure `(state, input) → newState` functions with tests, invoked through the store's `update()`.

## Decision

Do **not** add a general use-case layer (no `usecases/` folder with a class per action, no repositories or dependency injection).

Instead, extract a flow into a pure, tested function in `lib/` with the shape `(state, input) → result` when it meets **at least one** of these criteria:

1. It changes more than one part of the state (for example `workouts` and `exWeights`).
2. It affects progression or data integrity.
3. It is triggered from more than one screen.

Everything else stays inline in the component.

## Options considered

### A. Keep everything as is
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Cost | None now; risk of untested regressions in progression and PR logic |
| Team familiarity | High |

### B. Full Clean Architecture use-case layer
| Dimension | Assessment |
|---|---|
| Complexity | High: about 50 wrappers, repository interfaces, new conventions |
| Cost | Large rewrite of `sheets.jsx`; heavy merge conflicts with upstream openGym |
| Fit | Poor: in a React/Zustand app most of these would be pass-through wrappers |

### C. Extract only the flows that meet the criteria (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Low: about four functions |
| Cost | Small, incremental, and each step can be tested on its own |
| Fit | Good: it is the pattern `lib/nutrition.js` already uses |

## Flows that meet the criteria

1. **Finish workout:** PR detection, the stored workout record and best-weight updates. Highest risk.
2. **Start workout:** builds sets from the progression policy.
3. **Import history and plan:** merges outside data into the user's log.
4. **Log food:** triggered from both food search and photo logging, which currently each have their own validation.

## Consequences

- **Easier:** progression and PR rules get unit tests, and the use cases exist where they pay off.
- **Harder:** very little. About four new `lib/` functions, and the UI files get shorter.
- **Revisit:** if OPENFIT gains a second storage backend or needs offline sync with conflict resolution, data access would justify a repository-style interface.

## Action items

1. [x] `lib/workout.js` → `finishSession(state, active)`: move PR detection, the workout record and best-weight updates out of `doFinishWorkout`, with tests. The UI keeps the sounds and the summary sheet.
2. [ ] Same treatment for `startFlow`.
3. [ ] Same treatment for the history and plan import merges.
4. [ ] One shared `logFood` validation for food search and photo logging.
