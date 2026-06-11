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

## Acceptance Run - 2026-06-11

Environment:
- Local dev stack: `pnpm dev`
- Browser target: `http://localhost:3000/offseason/team-context`
- Supabase mode: local-first fallback; Supabase admin env intentionally absent
- Feature gates: offseason foundation, team context, coaching market, scouting, trade market, draft night, free agency, and decision loop enabled

Run path:
- Selected Atlanta Hawks in Team Context.
- Hired a coach in Coaching Market.
- Loaded Scouting board with uncertainty scores/signals.
- Submitted an accepted player-for-player trade proposal.
- Submitted one Draft Night pick.
- Signed one Free Agency target on a 4.0M offer.
- Opened Post-Offseason Recap and completed the run.

Resume Boundary Results:
- [x] Team Context -> Coaching Market: selected team, roster, picks, and needs persisted after reload.
- [x] Coaching Market -> Scouting: hired coach and downstream tendency notes persisted after reload.
- [x] Scouting -> Trade Market: ranked board and uncertainty fields persisted after reload.
- [x] Trade Market -> Draft Night: submitted trade proposal persisted with rationale after reload.
- [x] Draft Night -> Free Agency: pick grade and explanation persisted after reload.
- [x] Free Agency -> Post-Offseason Recap: signing and remaining cap context persisted after reload.
- [x] Post-Offseason Recap -> Complete: completed recap remained readable after reload.

Recap Outcome Results:
- [x] Recap included team grade, fit report, developmental environment score, and projected direction.
- [x] Key moments referenced run decisions from the timeline.
- [x] `Complete Offseason Run` moved the run into the completed recap state and remained readable after reload.

Failures Found and Fixed:
- Completed runs were reused from Team Context. Selecting a team on a completed active run updated team context but left the phase as `complete`, so `Continue to Coaching Market` could silently stay on Team Context. Fixed `useTeamContext` to create a fresh run unless the current active run is still in `team_context`, and to surface a clear phase error if continue is attempted from a non-team-context run.
- Free Agency signings were blocked for seeded rosters that already exceeded the simplified 15-player roster limit. Updated the offseason MVP roster limit to 21 so current seed rosters can complete the required single-offseason signing flow.

Remaining Human Sign-Off:
- [ ] Product owner should still perform qualitative copy/design sign-off on whether the recap is sufficiently educational and plain-language for release.
- [ ] Live Supabase persistence remains outside this local acceptance pass; this run verified the required local-first fallback path only.
