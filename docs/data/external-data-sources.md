# External and non–NBA-stats data sources (Column B)

**Purpose:** Needs that **cannot** be satisfied by **stats.nba.com via `nba_api`** + your own math on box/tracking alone — but many categories still have **free or public** entry points (sites, leaderboards, HTML, or public PBP). Use this when scoping ingestion, ToS, and what must stay manual or modeled.

**Pair with:** [nba-stats-stack-delta-todos.md](./nba-stats-stack-delta-todos.md) (what you can still build on the core NBA stats stack). **DATA-06** in [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) applies when any of these sources feed user-visible numbers.

---

## Free / public options (clearest)

| Area | What is free / public | What is not (typical) |
|------|------------------------|------------------------|
| **DARKO / DPM** | Public **leaderboard / site** — viewable impact-style outputs without needing NBA’s raw endpoints for those metrics. | Bulk export, API, or redistribution may still be constrained by **site terms**; treat as display/attribution problem, not “paid NBA API.” |
| **EPM** | **Dunks & Threes:** current values viewable **for free** on the site. | **Custom date ranges** and **fuller EPM datasets** are **subscriber-only** — fine for a link-out or snapshot UX; bad for a fully custom historical pipeline without paying. |
| **RAPM / EPM-ish (build your own)** | Feasible from **public play-by-play**: `stats.nba.com` / `nba_api` for PBP, plus parsers such as **[pbpstats](https://github.com/dblackrun/pbpstats)** (supports NBA, WNBA, G League PBP from stats.nba.com / data.nba.com). | Engineering cost: pipelines, regression, shrinkage, testing — not a license fee to the NBA for PBP itself. |
| **Cap / contracts** | **Website-level** public pages: **Spotrac** (NBA contracts), **RealGM** (FA options, rookie scale, cap history, related cap pages), **Basketball-Reference** (contracts / team payroll). | Reliable **machine-readable** feeds are often still **scrape** or manual copy; respect **robots.txt** and site ToS. |
| **Injuries / availability** | **Official NBA injury reports** are public and updated through the day — raw status is **free** at the source. | A **minutes / availability projection engine** is not included; that needs **your own model**, heuristics, or a **manual** editorial layer. |
| **Film** | **YouTube** is free and strong for **prototyping** and lesson embeds (already in product). | Full league **syndicated** film, all-22, or licensed clip libraries — different bucket. |
| **G League** | Official **G League stats** site is public: advanced stats, leaders, schedules, standings, etc. | Separate ingestion from NBA stats; not in your current monorepo scrape by default. |
| **NCAA** | **stats.ncaa.org** is public; unofficial **free APIs** wrapping ncaa.com also exist (community-maintained, fragile). | Data quality, schema stability, and ToS vary — treat as integration risk. |

---

## Matrix (summary)

| Need | Why Column B (vs core `nba_api` box/tracking) | Typical sources / approaches |
|------|----------------|------------------------------|
| **DARKO / DPM / EPM (published values)** | Not native columns on stats.nba.com | Public leaderboards / Dunks & Threes (free tier vs paid depth); link-out, manual snapshots, or **BYO model** from PBP. |
| **RAPM / custom impact** | Model output, not one endpoint | **pbpstats** + PBP from NBA sources; or license vendor tables. |
| **Salaries / cap** | Not in stats API | Spotrac, RealGM, B-Ref (public pages); scrape/manual with ToS care. |
| **Injury status** | Not same as box score | NBA official injury reports (free); projections = **your** logic. |
| **Synergy-grade play tagging** | Beyond NBA playtype tables | Synergy license or accept NBA playtype endpoints as ceiling. |
| **Non-NBA (G League, NCAA)** | Different properties | G League official site; NCAA stats + unofficial APIs. |
| **Betting / odds** | Separate industry | Sportsbooks where legal; compliance-heavy. |

---

## Principles (from project research)

- **DATA-01 boundary:** Identity and bulk stats ingestion stay **off the request path** (build-time or batch refresh), regardless of source — including PBP-derived models.
- **Coach tendencies** remain **editorial** unless you invest in modeling or licensed scouting data.
- **Pin versions** of parsers (`pbpstats`, `nba-api`) and commit **last-known-good** artifacts when upstreams break.
- **Attribution:** Public leaderboards and third-party sites may allow **reading** for personal/research use but restrict **redistribution** — productize with legal review if you cache or republish their numbers.

## Wired from planning

Referenced from [`.planning/ROADMAP.md`](../../.planning/ROADMAP.md) (Phase 3 follow-on), [`.planning/REQUIREMENTS.md`](../../.planning/REQUIREMENTS.md) (Data Layer), [`.planning/PROJECT.md`](../../.planning/PROJECT.md), and [`.planning/phases/03-data-layer/`](../../.planning/phases/03-data-layer/) (03-01–03-03 plans/summaries + `03-SUMMARY.md`). Pair with [nba-stats-stack-delta-todos.md](./nba-stats-stack-delta-todos.md).
