# Phase 11: NBA Big Board Creator — Context

**Gathered:** 2026-04-02 (discuss mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 = **PRD Phase 1 (Core Evaluation Foundation)** only.

Deliver the data model, prospect registry, stat ingestion pipeline (scraper), custom metric engine, film checklist and notes system, heuristic modules, and risk flags. No board UI or scoring output in Phase 11.

PRD Phases 2–4 map to roadmap Phases 12–14 (added separately). This context file covers PRD-wide decisions so downstream phases don't re-litigate them.

</domain>

<decisions>
## Implementation Decisions

### Product Placement
- **D-01:** Lives as a **feature-flagged, admin-only subdirectory** inside the existing Court Vision monorepo and app. No separate repo or workspace needed now.
- **D-02:** Gate the entire big board surface behind the existing feature flag pattern in `shared/` config. Admin-only until explicitly released to the public.
- **D-03:** Architecture can later move to its own workspace or repo. The feature-flag approach keeps the door open without premature separation.

### Data Persistence
- **D-04:** **Supabase** is the data layer. Already wired into this codebase. Provides real relational Postgres (foreign keys, joins, transactions), RLS for admin-only access, and is consistent with the rest of the app's auth and storage direction.
- **D-05:** Use Supabase RLS to enforce private access — only authenticated admin sessions can read/write big board data. No anonymous access.
- **D-06:** The schema must separate raw inputs, derived outputs, and manual opinions clearly. These must never be stored in the same table.

### Data Ingestion — Prospect Stats
- **D-07:** Build a **scraper** for prospect stats. Do not rely on manual CSV import only. Priority sources: **barttorvik** (college advanced stats), **sports-reference / college basketball** (box scores, per-40, shooting splits), and any available international stats.
- **D-08:** Each ingested stat field must carry source attribution, last-updated timestamp, and a null/missing marker. No silent data gaps.
- **D-09:** The ingestion pipeline must handle NCAA, international (Euroleague, NBL, ACB), G League, and OTE pathways — not only NCAA.
- **D-10:** CSV import should exist as a fallback alongside the scraper, not as the primary path.

### Historical Comparison Data
- **D-11:** **basketball-reference draft pages** are the primary source for the historical prospect universe. Structured, goes back decades, covers pre-draft college stats + career outcomes.
- **D-12:** The historical universe searches **all past prospects together** (not position-gated). Role/size/style are features, not filters. Cross-positional analogs are allowed.

### Phase 11 Scope (PRD Phase 1 Deliverables)
- **D-13:** Phase 11 ships the following and nothing else:
  - Supabase schema migrations for all core entities
  - Prospect registry (add, edit, import, tag)
  - Stat profile storage + ingestion pipeline
  - Custom metric engine (definitions, versioning, derivation from base stats)
  - Film evaluation schema + manual checklist UI
  - Heuristic module editor (guard / wing / big rubrics, user-editable)
  - Risk flag taxonomy and per-prospect risk entry
  - Measurement profile storage
  - Context profile storage (teammate quality, spacing, usage, scheme, league, pathway)

### PRD-Wide Philosophy (applies Phases 11–14)
- **D-14:** **Prospect page first.** The prospect page is the source of truth. Rankings and boards are downstream outputs — never the starting point.
- **D-15:** **Modular scoring, not a monolith.** The scoring engine has 7 families that can each be weighted, disabled, or versioned independently:
  1. Statistical production
  2. Custom metric bundle
  3. Physical / age / pathway / context adjustment
  4. Film and heuristic grades
  5. Historical comparison / outcome translation
  6. Risk and failure mode penalties
  7. Manual conviction adjustment
- **D-16:** **Translation > production.** The system asks whether the player's advantages survive better competition, better athletes, and different spacing/scheme. Raw production must never dominate by default.
- **D-17:** **Auditability is first-class.** Every meaningful manual rank change must have a logged reason. The system must help answer whether the process was good, not just what the final board was.
- **D-18:** **Conviction is allowed but logged.** Users can strongly disagree with the model, but every override records why.
- **D-19:** The main board output is **rank + tier only**. Internal uncertainty scores exist but do not clutter the board surface.
- **D-20:** **Consensus is a first-class optional input** — it is never a ranking authority. The system should make disagreement with consensus explicit and easy to record.
- **D-21:** **Multi-horizon** evaluation (Year 1–2, Years 3–5, Prime) lives on the prospect page. The final board remains single-ranked.
- **D-22:** Historical comps must be **predictive, not decorative**. Every comp group must carry structured reasons why similar players hit or failed.

### Schema Design Constraints (applies to all phases)
- **D-23:** Core entities to implement (all required, phased by roadmap):
  - Phase 11: `Prospect`, `ProspectClass`, `StatProfile`, `MeasurementProfile`, `ContextProfile`, `MetricDefinition`, `MetricResult`, `FilmEvaluation`, `HeuristicModule`, `HeuristicScore`, `RiskFlag`
  - Phase 12: `ConsensusSnapshot`, `Board`, `BoardEntry`, `TierAssignment`, `HistoricalCompSnapshot`
  - Phase 13: `OverrideLog`, `TakesLedgerEntry`, `PhilosophyPreset`, `WeightPreset`, `BoardSnapshot`, `OutcomeRecord`
- **D-24:** Every entity with a derived or computed value (MetricResult, HeuristicScore) must store a version reference to the definition it was computed against. History must not break when definitions evolve.
- **D-25:** Missing data is **explicit**: null fields are acceptable; the system must mark uncertainty and reduce internal confidence scores rather than silently pretending completeness.

### Heuristic Modules (PRD §11)
- **D-26:** Three role-group heuristic modules: **Guard**, **Wing**, **Big**. Each is a user-editable rubric with gradable structured fields (not just freeform notes).
- **D-27:** Guard module seed fields: easy self-created paint touch frequency, simple advantage generation, average shot difficulty burden, ability to create two feet in paint, help-warping, passing-window precision, ball pressure handling, obvious high-end translatable trait, fake-speed concern flag, "pretty but fragile" creation flag.
- **D-28:** Wing module seed fields: closeout punishment, straight-line advantage translation, shot diet sustainability, real shooting window difficulty, connective passing, secondary creation viability, on-ball vs off-ball defensive solvency, frame/length utility vs fake versatility, special trait clarity.
- **D-29:** Big module seed fields: easy interior offense, screen utility, vertical pressure, touch and finishing translatability, passing from short roll/elbows/delay actions, defensive coverage survivability, rim deterrence vs empty block numbers, mobility under stress, real offensive special, real defensive special.
- **D-30:** All rubric items must be **editable** — the user's philosophy will evolve across draft classes.

### Film Workflow (PRD §13)
- **D-31:** MVP film workflow assumes **no Synergy access**. Support: manual trait checklists, freeform notes, source links, optional timestamps, confidence level per observation, game source / event context.
- **D-32:** The data model must allow a structured Synergy-style possession layer to be added later without schema migration.

### Claude's Discretion
- Exact Supabase table naming conventions (snake_case preferred per existing patterns)
- Whether heuristic modules are stored as JSONB columns or normalized rows
- Specific scoring formula for custom metrics (this is Phase 12 work)
- UI component choices for the checklist and note editor surfaces

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PRD (full source of truth)
- The full PRD was submitted as the command argument to `/gsd:add-phase` and `/gsd:discuss-phase`. It is reproduced in the DISCUSSION-LOG for this phase. Key sections for Phase 11: §9.1 (Prospect registry), §9.2 (Prospect page), §10 (Evaluation engine), §11 (Heuristic modules), §13 (Film workflow), §14 (Data ingestion), §17 (Suggested data model), §23 (Roadmap), §24 (Task breakdown).

### Existing codebase — relevant to Phase 11
- `.planning/codebase/STACK.md` — Tech stack (React 18, Vite, TypeScript strict, Supabase, Tailwind)
- `.planning/codebase/ARCHITECTURE.md` — Monorepo shape, shared types pattern, existing Supabase wiring
- `.planning/codebase/CONVENTIONS.md` — Coding conventions to follow
- `shared/` — Shared types package; new big board types should follow the same pattern

### Phase decisions in context
- No external specs or ADRs exist yet for this product — all requirements are captured in this CONTEXT.md and the PRD above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/` types package: pattern for cross-cutting TypeScript types — big board types should live in `shared/` or a new `shared/bigboard/` namespace
- Existing Supabase client setup (Phase 2): reuse the singleton client, don't instantiate new ones
- Tailwind CSS 3.4 + Heroicons: use for all UI surfaces (consistent with Court Vision)
- Feature flag pattern in `shared/`: use to gate the entire big board surface

### Established Patterns
- Strict TypeScript — no `any` in production code, explicit return types on exported functions
- Server Components by default (if Next.js migration happens); for now Vite SPA with `"use client"` equivalent
- `@/*` import alias for `src/`
- No component library — Tailwind primitives only

### Integration Points
- Feature flag in `shared/config` → gates `/bigboard` routes in React Router
- Supabase client → all big board reads/writes go through existing Supabase singleton
- New routes: `/bigboard`, `/bigboard/prospects/:id`, `/bigboard/board` added to React Router
- Admin-only guard: reuse existing auth/session check before rendering big board routes

</code_context>

<specifics>
## Specific Ideas

- "Prospect page first" — the UI should open on prospect detail, not a ranking list
- The PRD emphasizes that boards emerge from evaluation, not the other way around; the UX should reinforce this hierarchy
- The scoring engine should feel like a research tool, not a spreadsheet — modular sliders/weights with visible impact
- Historical comps should show "why players like this hit" and "why players like this failed" — not just names
- The takes ledger is a differentiator; it should be easy to log "I'm above consensus because..." without friction

</specifics>

<deferred>
## Deferred Ideas

### Roadmap — PRD Phases 2–4 (added as Phases 12–14)
- **Phase 12:** Scoring engine + board generation + tiering + consensus delta + historical comps + board-level explanations (PRD Phase 2)
- **Phase 13:** Snapshots + override logs + takes ledger + preset versioning + retrospective outcome review scaffolding (PRD Phase 3)
- **Phase 14:** Team fit boards extension — layered on top of neutral board, preserving board integrity (PRD Phase 4)

### Explicitly out of scope (all phases)
- Automated video tagging or Synergy-style possession ingestion
- Public sharing or social platform features
- High school prospect database
- Mock draft simulator (separate from big board)
- Direct API integrations with private scouting services (Synergy, Second Spectrum)
- Multiplayer / collaborative scouting

</deferred>

---

*Phase: 11-nba-big-board-creator*
*Context gathered: 2026-04-02*
