# Offseason Simulator Decision Loop Verification Checklist

## Purpose
Validate that the full six-phase decision loop (Coaching -> Scouting -> Trade -> Draft Night -> Free Agency -> Recap) is stable, resumable, and release-gated.

## Preconditions
- `VITE_ENABLE_OFFSEASON_FOUNDATION=true`
- `VITE_ENABLE_OFFSEASON_TEAM_CONTEXT=true`
- `VITE_ENABLE_OFFSEASON_COACHING_MARKET=true`
- `VITE_ENABLE_OFFSEASON_SCOUTING=true`
- `VITE_ENABLE_OFFSEASON_TRADE_MARKET=true`
- `VITE_ENABLE_OFFSEASON_DRAFT_NIGHT=true`
- `VITE_ENABLE_OFFSEASON_FREE_AGENCY=true`
- `VITE_ENABLE_OFFSEASON_DECISION_LOOP=true`

## Resume Boundary Checks
Run one offseason flow and restart the app at each boundary.

- Team Context -> Coaching Market: selected team, roster, picks, and needs persist.
- Coaching Market -> Scouting: hired coach and tendency notes persist.
- Scouting -> Trade Market: ranked board and uncertainty fields persist.
- Trade Market -> Draft Night: submitted trade proposals persist with rationale.
- Draft Night -> Free Agency: pick grades and explanations persist.
- Free Agency -> Post-Offseason Recap: signings and remaining cap persist.
- Post-Offseason Recap -> Complete: recap remains readable after completion.

## Recap Outcome Checks
- Recap includes all required sections:
  - Team grade
  - Fit report
  - Developmental environment score
  - Projected direction with plain-language rationale
- Key moments list references real decisions from the run timeline.
- `Complete Offseason Run` moves phase from `post_offseason_recap` to `complete`.

## Known Failure Modes
- Feature gate mismatch: one phase flag enabled while prerequisite phase flag is disabled.
- Stale run phase: client attempts recap fetch while run is still in free agency.
- Invalid transition payload: `expected_phase` does not match persisted run phase.

## Rollback Steps
- Disable `VITE_ENABLE_OFFSEASON_DECISION_LOOP` to hide recap and final loop closeout.
- If a specific phase regresses, disable its phase flag (`DRAFT_NIGHT` or `FREE_AGENCY`) while keeping earlier phases operational.
- Re-run migration tests and focused offseason engine tests before re-enabling rollout flags.
