---
phase: 10-offseason-simulator-decision-loop
scope: phase-summary
status: planned
created: 2026-03-10
last_updated: 2026-03-10
---

# Phase 10: Offseason Simulator - Decision Loop - Summary

## Mission
Implement full six-phase offseason decision loop with explanation-first guidance, persisted transitions, and final recap quality.

## Plan Inventory
- [ ] 10-01-PLAN.md (Wave 1) - Coaching market and tendency propagation (OSIM-02)
- [ ] 10-02-PLAN.md (Wave 2) - Scouting uncertainty and trade fit explanations (OSIM-03, OSIM-04)
- [ ] 10-03-PLAN.md (Wave 3) - Draft Night and Free Agency phases with explanation-first grading (OSIM-05, OSIM-06)
- [ ] 10-04-PLAN.md (Wave 4) - Post-offseason recap, full-loop verification, and final human acceptance gate (OSIM-07)

## Requirement Coverage
- OSIM-02
- OSIM-03
- OSIM-04
- OSIM-05
- OSIM-06
- OSIM-07

## Dependency and Sequence
- Entry gate: Phase 9 completion (`09-03-PLAN.md`).
- Execution order: 10-01 -> 10-02 -> 10-03 -> 10-04.
- 10-04 is mandatory human acceptance gate for phase closure.

## Key Risks
- Tendency propagation must remain coherent across all downstream phases to avoid grading contradictions.
- Scouting uncertainty and trade explanations can regress into opaque scoring without narrative checks.
- Full-loop resume stability can break at phase boundaries if transition persistence is incomplete.
- Recap quality can become generic unless it references concrete run decisions.

## Verification Gate
- [ ] Coaching hire influences subsequent valuation and grade weighting.
- [ ] Scouting phase exposes uncertainty for every prospect.
- [ ] Trade phase returns fit-based explanations for accepted/rejected proposals.
- [ ] Draft and free agency produce explanation-first outcomes.
- [ ] Recap includes grade, fit report, developmental environment, and projected direction.
- [ ] End-to-end loop resumes and completes across restart boundaries.

## Exit Criteria
- All remaining OSIM requirements are satisfied.
- Offseason simulator is playable end-to-end and educationally coherent.
- Final rollout is approved through human acceptance gate.
