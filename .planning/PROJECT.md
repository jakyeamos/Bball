# Court Vision

## What This Is

Court Vision is a free, web-first basketball IQ training platform that teaches users to see the game like a player, coach, and GM. It is aimed at casual fans first but scales to advanced users through structured lessons, real film with YouTube embeds, pause-and-predict interactions, scenario simulations, an NBA Draft Simulator capstone, and a full NBA Offseason Simulator. The platform is built on top of an existing multiplayer NBA Draft Simulator monorepo (React 18, Express 4, Socket.io 4, TypeScript strict, Tailwind CSS) — this is a rebrand and expansion of that codebase, not a rebuild.

## Core Value

The platform only succeeds if users' basketball IQ genuinely improves — education comes before surface polish.

## Requirements

### Validated

<!-- Existing codebase — already built and working -->

- ✓ Real-time multiplayer draft simulation with WebSocket sync (Socket.io) — existing
- ✓ Snake draft with pick timer, auto-pick, and commissioner controls — existing
- ✓ Monte Carlo simulation engine: 30 player features, 13 archetypes, 100-sim matchups — existing
- ✓ Team aggregation with impact weighting and reliability shrinkage (sigmoid curves) — existing
- ✓ Regular season round-robin simulation — existing
- ✓ Playoff bracket simulation (top 4, best-of-3 series) — existing
- ✓ Round-based coaching with quarter-by-quarter gameplay (UI + types present, wiring incomplete) — existing
- ✓ Scouting reports generated from league history — existing
- ✓ Trade proposal system (backend ready, UI placeholder) — existing
- ✓ Cookie-based session management, no account required — existing
- ✓ Monorepo architecture with shared TypeScript types package — existing

### Active

<!-- Court Vision expansion — building toward these -->

**Foundation**
- [ ] Rebrand entire app to Court Vision (name, routes, visual identity, Tailwind theme)
- [ ] Fix silent coaching bug: `handleSimulateRoundInternal` uses blank stub aggregations — coaching decisions have zero effect in auto-sim path
- [ ] Complete quarter-by-quarter coaching event wiring (`SUBMIT_QUARTER_COACHING`, `READY_FOR_QUARTER` events defined but not handled in socketManager)

**Core Learning System**
- [ ] Lesson card system: title, role lens (Player/Coach/GM IQ), difficulty, media embed, takeaway, interaction type
- [ ] Film breakdown pages with timestamped YouTube embeds and annotations
- [ ] Pause-and-predict interactions: clip pauses, user answers a question, explanation reveals
- [ ] Scenario simulations with process-based scoring across all three role lenses
- [ ] "Learn More" expandable sections for optional depth
- [ ] 15–20 seed lessons at launch distributed across Player IQ, Coach IQ, and GM IQ

**Navigation and UX**
- [ ] Homepage shows all three role lenses (Player IQ, Coach IQ, GM IQ) immediately
- [ ] Users can browse freely across lenses without being locked into one
- [ ] Onboarding captures: favorite teams, current knowledge level, improvement goal
- [ ] Onboarding output: recommended starter modules + benchmark challenge + path into content library

**Daily Engagement**
- [ ] Rotating Daily Challenge system spanning all three tracks
- [ ] Streak tracking and light badge-style progression
- [ ] Shareable result cards
- [ ] Friend leaderboard scoped to daily challenge only

**Progress and Content**
- [ ] Anonymous-first progress tracking stored in localStorage; optional account creation later (Supabase)
- [ ] User skill profile: strengths, weaknesses, completion, accuracy, suggested next lessons
- [ ] "What We Saw" recaps connecting lessons to recent NBA / college / overseas basketball
- [ ] Searchable content library filtered by role lens, subcategory, difficulty, format
- [ ] Low-tech discussion board (no feeds, upvoting, or hot-take social layer)
- [ ] Hybrid CMS: admin forms, lesson editing, answer-key config, tagging, daily challenge scheduling

**Draft Simulator Integration**
- [ ] Refresh draft simulator UI to feel native to Court Vision brand
- [ ] Add teaching layer during draft: contextual tips, strategy guidance, decision explanations
- [ ] Post-draft analysis: what user got right, what they missed, which process mistakes mattered
- [ ] Position draft simulator as "final exam" capstone knowledge test across all three IQ tracks

**NBA Offseason Simulator**
- [ ] Team context phase: user selects a real team and inherits roster, picks, timeline, and obvious needs
- [ ] Coaching market phase: interview and hire real coaches; tendencies reshape player valuations
- [ ] Scouting and pre-draft phase: build board using stats, workouts, interviews, and uncertainty signals
- [ ] Trade market phase: explore trades involving players, picks, and fit-based decisions
- [ ] Draft night phase: picks via existing engine plus teaching overlays and explanation-first grades
- [ ] Free agency and roster balancing: fill needs with simplified but realistic spending constraints
- [ ] Post-offseason recap: team grade, fit report, developmental environment, projected direction
- [ ] Save and resume support for offseason runs (runs span multiple sessions — required, not nice-to-have)
- [ ] Modular data layer for real rosters, picks, coach profiles, and stat-model refreshes
- [ ] Real names for teams, players, and coaches via BallDontLie API + curated static seed file
- [ ] Evergreen stat base: structured to absorb DARKO, LEBRON, PEST, and future public models
- [ ] Offseason sim reachable directly from GM lens or after completing core learning content

**Infrastructure**
- [ ] Migrate toward Supabase for auth, database, and storage
- [ ] Keep anonymous session tracking with optional account upgrade path

### Out of Scope

- Native mobile apps — web-first only; mobile is post-v1
- Heavy social mechanics (feeds, upvoting, full network effects) — low-tech board only
- Full gamification economy (loot boxes, rank ladders, complex XP) — streaks and badges only
- Fantasy basketball integrations — different product
- Perfect CBA / salary-cap replica in offseason sim v1 — simplified but realistic constraints only
- User-vs-user debate products — arguing is not learning
- Paid expert marketplace or creator economy — free platform only
- Youth-specific segmentation — single audience for now
- Full film-annotation tooling for end users — admin CMS only
- User-generated lesson creation in v1 — admin-created content only
- Live game companion mode — post-v1
- Multi-difficulty simulator ladders — single difficulty, realism creates challenge
- Deep analytics dashboards — practical progress profile and explanation-first recap only
- Multi-year continuity / franchise mode in offseason sim v1 — single offseason runs only

## Context

**Existing codebase state (from map, 2026-03-09):**
- Simulation engine is fully built and sophisticated — reliable foundation for offseason sim expansion
- Critical silent bug: `handleSimulateRoundInternal` (auto-sim path) uses blank stub `TeamAggregation` objects — coaching decisions mechanically do nothing in this path; `handleSimulateRound` (commissioner manual path) works correctly
- Quarter-by-quarter coaching flow is partially wired: UI (`QuarterCoachingPage`), types, and `simulateQuarter` logic exist but `SUBMIT_QUARTER_COACHING` / `READY_FOR_QUARTER` WebSocket events are not handled in `socketManager.ts`
- Trade UI is placeholder only — backend proposal logic exists
- No test coverage of any kind
- Tailwind CSS present but no design system or token layer — rebrand requires establishing one
- All state is in-memory; no persistence layer yet

**Key product decisions (from PRD):**
- YouTube embeds for film/clip hosting in v1 — validate demand before paying for video infra
- BallDontLie API + curated static seed file for real NBA player/team/coach data in v1
- Single difficulty level for offseason sim — ambiguity and context create challenge, not tiers
- Coaching affects grades and recommendations, not deterministic outcomes — probabilistic model
- Draft outcomes feel uncertain — stats and workouts improve process but never eliminate risk

**Target audience:** Casual fans first. Secondary: players, coach-adjacent learners, analysts, front-office-minded users.

## Constraints

- **Tech Stack**: React 18, Express 4, Socket.io 4, TypeScript strict mode, Tailwind CSS, Node.js — extend, do not rebuild
- **Persistence**: Migrate to Supabase incrementally; in-memory store remains for draft sim initially
- **Video**: YouTube embeds only in v1 — no video hosting infra until usage patterns justify it
- **Data**: BallDontLie API (rate-limited free tier) + static seed for real names; no enterprise data contracts in v1
- **Accounts**: Anonymous-first; Supabase auth added as optional upgrade, never required gate
- **Platform**: Web only; no native mobile apps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebrand + expand existing repo | PRD explicitly says "extend the monorepo, not rebuild the stack" | — Pending |
| YouTube embeds for film (v1) | PRD: "start simple on video, optimize once usage patterns are known" | — Pending |
| BallDontLie + static seed for real names | Free tier, documented, no enterprise cost; revisit at scale | — Pending |
| Single difficulty in offseason sim | Realism and ambiguity create challenge more honestly than artificial tiers | — Pending |
| Coaching affects grades, not certainty | Basketball decisions are probabilistic; sim should reflect that | — Pending |
| Save/resume required for offseason runs | Runs span multiple sessions — must be infrastructure, not a feature | — Pending |
| Anonymous-first progress | Keep learning wedge broad, reduce friction; Supabase account as optional upgrade | — Pending |
| Fix coaching sim bug in early phase | Silent correctness bug undermines the core learning value of the existing sim | — Pending |

---
*Last updated: 2026-03-09 after initialization*
