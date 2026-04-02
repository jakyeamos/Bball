# Phase 11: NBA Big Board Creator — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-02
**Phase:** 11-nba-big-board-creator
**Mode:** discuss
**Areas discussed:** Phase scope, Product relationship, Data persistence, Prospect data sources, Historical data

---

## Assumptions Presented

| Area | Assumption | Confidence |
|------|-----------|------------|
| Phase scope | PRD Phase 1 only is the right MVP unit for Phase 11 | Confident |
| Product relationship | New workspace in monorepo or feature-flagged subdirectory | Likely |
| Data persistence | Supabase (already wired) | Likely |
| Prospect ingestion | Manual CSV as primary MVP path | Likely |
| Historical data | basketball-reference draft pages | Confident |

---

## Corrections Made

### Phase scope
- **Original assumption:** PRD Phase 1 only recommended
- **User direction:** Confirmed PRD Phase 1 for Phase 11 — AND requested that the full PRD roadmap (Phases 2–4) be added as Phases 12–14 to preserve context

### Product relationship
- **Original assumption:** New workspace in monorepo recommended
- **User direction:** Feature-flagged, admin-only subdirectory for now — not a separate workspace. Release decision deferred.

### Prospect data ingestion
- **Original assumption:** Manual CSV import recommended as first path
- **User direction:** Build a scraper. Multiple sources mentioned: barttorvik, sports-reference college, others. Scraper is the primary path, CSV is secondary fallback.

---

## No Corrections
- **Data persistence:** Supabase (Recommended) — confirmed
- **Historical data:** basketball-reference draft pages — confirmed

---

## Full PRD (preserved for downstream phases)

The full PRD submitted by the user as the `/gsd:add-phase` argument is the source document for Phases 11–14. It covers:

- §1–8: Product summary, philosophy, goals, non-goals, users, core shape, JTBD, principles
- §9: Functional requirements (prospect registry, prospect page, board creation, tiering, filtering, consensus, takes ledger, snapshots, multi-horizon, board explanation)
- §10: Evaluation engine (scoring families, objective base, custom metrics, context adjustment, missing data)
- §11: Heuristic modules (guard, wing, big — with seeded rubric fields)
- §12: Historical comparison engine (purpose, universe, comp types, why comps hit/fail)
- §13: Film workflow (MVP requirements without Synergy)
- §14: Data ingestion (assumptions, capabilities, data quality layer)
- §15: Board views (master + position boards)
- §16: Team fit extension (post-MVP Phase 4)
- §17: Suggested data model (20+ entities)
- §18: System architecture (data layer, evaluation engine, app layer, audit layer)
- §19: MVP scope
- §20: Success metrics (board quality, auditability, efficiency, retrospective learning)
- §21: Risks (data incompleteness, manual burden, overfitting, false objectivity, historical leakage, era drift, consensus contamination, labeling subjectivity)
- §22: Acceptance criteria
- §23: Roadmap (4 PRD phases)
- §24: Task breakdown (8 workstreams)
- §25: Agent-ready build prompts (8 prompts)
- §26: Final product definition
