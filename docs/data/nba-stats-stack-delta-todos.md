# NBA stats stack — delta to-do list (Column A)

**Scope:** Work that stays inside the **stats.nba.com + `nba_api` + disk artifacts + your code** family — but is **not** already specified as a deliverable in `.planning/REQUIREMENTS.md` (DATA-01–DATA-05), `.planning/phases/03-data-layer/03-03-PLAN.md`, or [`player-feature-mapping.md`](./player-feature-mapping.md). **Product binding** for draft sim + new features is **DATA-06** (same file).

**Already planned / done (do not duplicate here):**

- Build-time identity seed → `nba-seed.json` (DATA-01).
- Disk cache + `refresh:nba-cache` (DATA-02).
- Coach editorial seed (DATA-03).
- League-dash scrape extended for **PlayerFeatures** + full mapping doc + tests (DATA-04, DATA-05, 03-03).
- Heuristic fills where the **single** league-dash totals row lacks tracking columns (documented in `player-feature-mapping.md`).

---

## Delta to-dos (stack-only, net-new)

- [ ] **Multi-endpoint ingestion:** Design and implement a merge pipeline that pulls **additional** `nba_api` endpoints (e.g. hustle, player tracking, passing, playtypes — whatever the NBA exposes for the season) and joins rows on `PLAYER_ID`, then writes one normalized artifact for the TS layer (still build-time or startup batch — not the HTTP request path).
- [ ] **Replace high-impact heuristics:** For each `PlayerFeatures` / `PlayerRawStats` field still driven by heuristics in `features.ts` (e.g. deflections, charges, pass-based stats), either wire **real** columns from the new endpoints or document an explicit “still heuristic” cap with tests.
- [ ] **Playtype / transition panels:** Add optional season playtype splits (frequency + efficiency) from NBA stats endpoints and expose them in a typed schema (even if v1 is server-only JSON).
- [ ] **Shot locations / shot charts:** Integrate shot-detail or shot-chart endpoints for zone splits or chart data, with a stable JSON contract for the client.
- [ ] **League-relative metrics:** Build **percentiles / z-scores / vs-league-average** from the in-memory or disk **population** (you already compute league snapshots); productize as API fields or UI when you need Databallr-style “vs league” framing — no new vendor, but **not** listed in current phase-3 plans.
- [ ] **Custom composite “impact” (optional):** Define a transparent, versioned Court Vision index from **official** stats only (document formula + changelog). Distinct from licensing DARKO/RAPM (see [external-data-sources.md](./external-data-sources.md)).

---

## Product utilization (draft sim + new features)

**DATA-06** ([`.planning/REQUIREMENTS.md`](../../.planning/REQUIREMENTS.md)): When you complete items in this delta list or change `scrape_nba_stats.py` / `playerFeaturesMapping.ts`, **update the draft simulator** (player presentation, post-draft recap, any stat-backed UI) **in the same release**, or track a **blocking** gap. Phase 7 teaching overlays and Phases 9–10 offseason must **reuse** `PlayerFeatures` and these docs — no parallel undocumented stat model. **Phase 6** daily challenges: **if** a challenge is stat-backed, use the same contracts. Optional third-party metrics: [external-data-sources.md](./external-data-sources.md).

## Meta (doc drift)

- [ ] **Planning copy alignment:** Sweep remaining `.planning/**` files (phase summaries, research SUMMARY, ARCHITECTURE) for stale **BallDontLie** wording and align with the **nba_api** identity + scrape pivot where still inaccurate.

## Wired from planning

These docs are linked from [`.planning/ROADMAP.md`](../../.planning/ROADMAP.md) (Phase 3), [`.planning/REQUIREMENTS.md`](../../.planning/REQUIREMENTS.md) (Data Layer), [`.planning/PROJECT.md`](../../.planning/PROJECT.md), and **phase 03 data-layer** plans/summaries under [`.planning/phases/03-data-layer/`](../../.planning/phases/03-data-layer/). Pair with [external-data-sources.md](./external-data-sources.md).
