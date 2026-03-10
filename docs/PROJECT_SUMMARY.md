# Court Vision — Project Summary

## What This Is

Court Vision is a free, web-first basketball IQ training platform. Users learn to see the game like a player, coach, and GM through structured lessons, real film with pause-and-predict interactions, scenario simulations, an NBA Draft Simulator capstone, and a full NBA Offseason Simulator.

**Core value:** The platform only succeeds if users' basketball IQ genuinely improves. Education comes before surface polish.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript strict, Tailwind CSS, Vite |
| Backend | Node.js, Express 4, Socket.io 4, TypeScript |
| Shared | TypeScript workspace package (types + Zod schemas) |
| Persistence | Supabase (auth + database + storage) — migration in progress |
| Real-time | Socket.io (draft sim and live coaching) |
| Video | YouTube IFrame API embeds (v1) |
| Data | BallDontLie API (build-time seed) + curated static coach profiles |

---

## Three Learning Tracks

| Track | Purpose | Topics |
|-------|---------|--------|
| **Player IQ** | Read the floor like a player | Offensive reads, pick-and-roll, spacing, transition, help defense, decision windows |
| **Coach IQ** | See the game through structure and adjustment | Actions, coverages, adjustments, lineup logic, after-timeout ideas, counters |
| **GM IQ** | Understand team-building logic | Trade value, archetypes, roster construction, asset logic, scouting, offseason planning |

---

## Existing Foundation (Validated)

The simulation engine already exists and is production-ready:

- Real-time multiplayer draft with WebSocket sync (Socket.io)
- Snake draft: pick timer, auto-pick, commissioner controls
- Monte Carlo simulation engine: 30 player features, 13 archetypes, 100-sim matchups
- Team aggregation with impact weighting and reliability shrinkage
- Regular season round-robin + playoff bracket simulation
- Round-based coaching with quarter-by-quarter gameplay (partially wired)
- Scouting reports generated from league history
- Trade proposal system
- Cookie-based session management, no accounts required
- Monorepo architecture with shared TypeScript types

---

## Build Roadmap (10 Phases)

| Phase | Name | Key Deliverables |
|-------|------|-----------------|
| 1 | Foundation and Bug Fixes | Fix coaching sim bug, wire quarter coaching events, rebrand to Court Vision, homepage with three lenses |
| 2 | Infrastructure — Supabase and Auth | Anonymous Supabase identity, DB schema + RLS, TanStack Query, Zod validation |
| 3 | Data Layer | BallDontLie build-time seed, coach profiles, 30-feature PlayerFeatures mapping |
| 4 | Lesson Components and CMS | Lesson cards, film breakdowns, pause-and-predict, scenario sims, admin CMS, 15+ seed lessons |
| 5 | Progress, Onboarding, and Content Discovery | Completion persistence, onboarding flow, searchable library, discussion board |
| 6 | Daily Engagement | Daily challenge, streaks, badges, shareable cards, friend leaderboard |
| 7 | Draft Simulator Teaching Layer | Court Vision reskin, teaching overlay, post-draft analysis, capstone positioning |
| 8 | User Profile and Account Upgrade | Skill profile, optional account creation, cross-device sync |
| 9 | Offseason Simulator — Foundation | Save/resume infra, schema versioning, Team Context phase, GM lens entry |
| 10 | Offseason Simulator — Decision Loop | Coaching market, scouting, trades, draft night, free agency, post-offseason recap |

Full details: `.planning/ROADMAP.md`

---

## NBA Offseason Simulator

The flagship feature: a full 7-phase offseason loop for one real NBA team.

| Phase | What the user does | What they learn |
|-------|-------------------|----------------|
| Team Context | Select a real team, inherit roster/picks/needs | Every move starts from context |
| Coaching Market | Interview and hire real coaches | How scheme reshapes roster value |
| Scouting and Pre-Draft | Build a board with uncertainty signals | Drafts are informed, not solved |
| Trade Market | Explore player/pick trades | Asset logic, timeline, fit |
| Draft Night | Pick via existing engine + teaching overlays | Process discipline under pressure |
| Free Agency | Fill needs with realistic constraints | Opportunity cost and role balance |
| Post-Offseason Recap | Team grade, fit report, projected direction | Why it worked or didn't |

**Key rules:**
- Real names for teams, players, and coaches
- Single difficulty level — ambiguity creates challenge, not artificial tiers
- Coaching hires affect grades and recommendations, not deterministic outcomes
- Draft outcomes are probabilistic — stats improve process, never eliminate risk
- Save and resume required — runs span multiple sessions

---

## Out of Scope (v1)

- Native mobile apps
- Heavy social mechanics (feeds, upvoting, hot takes)
- Full gamification economy (loot boxes, rank ladders, complex XP)
- Fantasy basketball integrations
- Perfect CBA/salary-cap replica in offseason sim
- User-generated lesson creation
- Live game companion mode
- Multi-year franchise mode

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Extend existing monorepo | PRD: "extend the monorepo, not rebuild the stack" |
| YouTube embeds for film (v1) | Start simple, optimize once usage patterns are known |
| BallDontLie + static seed for real names | Free tier, documented, no enterprise cost in v1 |
| Single difficulty in offseason sim | Realism and ambiguity create challenge more honestly than tiers |
| Anonymous-first progress tracking | Keep the learning wedge broad, reduce friction |
| Fix coaching sim bug in Phase 1 | Silent correctness bug undermines the core learning value |

---

*Last updated: 2026-03-09*
*Planning documents: `.planning/`*
