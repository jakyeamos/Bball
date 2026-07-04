# Roadmap: Court Vision

## Overview

Court Vision expands an existing NBA Draft Simulator monorepo into a full basketball IQ training platform. The build sequence is non-negotiable: fix the coaching simulation correctness bug first so every teaching layer that follows is factually grounded; establish Supabase persistence before any feature writes user data; seed real NBA data before the offseason simulator can reference it; build lesson components and the admin CMS together so content can be authored immediately; layer engagement, discovery, and profiles on top of a content-rich foundation; add the draft teaching layer as the first high-leverage apply-what-you-learned experience; and defer the NBA Offseason Simulator - a 7-phase decision engine - until the lesson platform and data infrastructure are proven and stable.

**Core value:** The platform only succeeds if users' basketball IQ genuinely improves - education comes before surface polish.

**Cross-cutting — stat utilization:** Player evaluation across the **draft sim** (retroactive updates), **Phase 7** teaching layer, **Phases 9–10** offseason, and any lesson or profile UI that cites stats must follow **DATA-06** and the living docs [`docs/data/player-feature-mapping.md`](../docs/data/player-feature-mapping.md), [`docs/data/nba-stats-stack-delta-todos.md`](../docs/data/nba-stats-stack-delta-todos.md), [`docs/data/external-data-sources.md`](../docs/data/external-data-sources.md). The legacy sim must not drift from the shared pipeline when new metrics land. **Phase 6** daily challenges follow the same rule **when** they include stat-backed NBA content (optional per challenge design).

## Repository Reality Check

The roadmap below reflects the code that is actually present in the repo as of 2026-04-22, not just the last formally closed plan:

- **Phases 1-3 remain the last fully closed and historically verified phases.**
- **Phases 4-8 are now implemented in the repo** in a local-first / guest-first form. The per-phase summaries track the remaining release-gate items, mainly manual/browser QA plus live Supabase verification where account continuity depends on production env.
- **Phase 4 now includes** shared lesson/admin/daily schemas, a seeded 15-lesson catalog, reusable lesson runtimes, admin lesson/tag/daily flows, and daily challenge authoring scaffolding.
- **Phase 5 now includes** dual-path progress persistence, onboarding, searchable/filterable library and recap surfaces, plus text-only lesson discussion.
- **Phase 6 now includes** daily challenge retrieval/submission, streak and badge plumbing, share-card generation, and a done/not-done friend leaderboard.
- **Phase 7 now includes** draft teaching overlays, post-draft analysis, and capstone surfacing across the IQ track pages.
- **Phase 8 now includes** profile metrics/recommendations plus login/account-upgrade surfaces with guest fallback when Supabase admin env is absent.
- **Phase 9 foundation implementation is now in repo** (schema-versioned run state, Team Context, GM entry/recommendation), with one remaining human verification gate for discoverability/rollout safety.
- **Phase 10 implementation is now complete through 10-04** (coaching market, scouting uncertainty, trade fit explanations, draft night, free agency, and recap), with local browser acceptance passed on 2026-06-11; product-owner recap quality sign-off and live Supabase persistence verification remain before full rollout.
- **Front-office rules-engine expansion has started beyond the simplified Phase 10 loop.** The transaction-graph legality preview path is implemented with directed shared graph types, dataset-first CBA validation, structured preview deltas/citations/suggested fixes, and `POST /api/front-office/transactions/preview`; it now covers over-cap salary matching, first/second-apron restrictions, hard caps, Stepien rolling future-first coverage, and protected-pick conversion fallback validation. Sign-and-trade/base-year/minimum-salary special cases, generated/consumed trade exception accounting, swap conveyance validation, execution, and UI replacement remain follow-up slices.
- **The working tree also contains in-flight data/model work beyond the original Phase 3 close-out**: calibration artifacts/scripts, role inference, advanced player-model tests, and richer player valuation logic are present but were never folded back into the roadmap.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

Checkboxes below reflect implementation landed in the repo. Remaining manual verification or release gates are tracked in each phase summary.

- [x] **Phase 1: Foundation and Bug Fixes** - Completed 2026-03-10
- [x] **Phase 2: Infrastructure - Supabase and Auth** - Completed 2026-03-24
- [x] **Phase 3: Data Layer** - Completed baseline 2026-03-24; repo also contains newer in-flight calibration / player-model work not yet formally closed. See [data stack delta todos](../docs/data/nba-stats-stack-delta-todos.md) and [external / free sources](../docs/data/external-data-sources.md).
- [x] **Phase 4: Lesson Components and CMS** - Implemented 2026-04-01 in local-first form; feature-flag / SEO / manual rollout checks remain open
- [x] **Phase 5: Progress, Onboarding, and Content Discovery** - Implemented 2026-04-01 with local-first persistence, onboarding, library discovery, and discussion surfaces
- [x] **Phase 6: Daily Engagement** - Implemented 2026-04-01 with daily challenge, streak, badge, share-card, and friend-status leaderboard flows
- [x] **Phase 7: Draft Simulator Teaching Layer** - Implemented 2026-04-01 with overlays, post-draft analysis, and capstone positioning
- [x] **Phase 8: User Profile and Account Upgrade** - Implemented 2026-04-01; live Supabase upgrade/sync verification remains open
- [x] **Phase 9: Offseason Simulator - Foundation** - Implemented 2026-04-22; final human verification gate pending
- [x] **Phase 10: Offseason Simulator - Decision Loop** - Coaching market, scouting, trade market, draft night, free agency, and post-offseason recap (implemented 2026-04-23; local browser acceptance passed 2026-06-11; product-owner / live Supabase sign-off remains)

## Phase Details

### Phase 1: Foundation and Bug Fixes
**Goal**: The existing simulation engine is correct and fully wired; the app is rebranded as Court Vision with a homepage that exposes all three role lenses and fluid navigation between them
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running an auto-sim with high-rated coaching decisions produces statistically different outcomes from running with blank stubs - confirming `handleSimulateRoundInternal` uses real TeamAggregation objects
  2. A user in the quarter-by-quarter coaching flow submits decisions and the game advances through quarter transitions without hanging - `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` events are handled in socketManager.ts and observed in socket traffic
  3. The app loads with "Court Vision" in the browser tab title, page headings, and meta tags - no legacy draft-sim branding visible anywhere in the user-facing UI
  4. The homepage renders Player IQ, Coach IQ, and GM IQ as three distinct visible lanes without any click or navigation required
  5. A user can navigate from any role lens section to either of the other two without being locked into a single-track flow
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md - Fix handleSimulateRoundInternal bug + Monte Carlo regression test (FOUND-03)
- [x] 01-02-PLAN.md - Wire SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER WebSocket events (FOUND-04)
- [x] 01-03-PLAN.md - Court Vision rebrand strings + Tailwind design tokens (FOUND-01, FOUND-02)
- [x] 01-04-PLAN.md - Homepage three-lane layout + NavBar cross-lens navigation (FOUND-05, FOUND-06)
- [x] 01-05-PLAN.md - Human verification checkpoint for all Phase 1 success criteria

### Phase 2: Infrastructure - Supabase and Auth
**Goal**: Every visitor gets a durable anonymous Supabase identity on first load; the full database schema and RLS policies are in place for all three user states; all REST calls from the learning layer use TanStack Query; shared Zod schemas validate all data shapes at the API boundary
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. Opening the app in a fresh browser with no cookies results in a Supabase anonymous UUID being assigned - visible in the network inspector - and that UUID persists across page reloads in the same browser session
  2. Three simultaneous browser sessions - authenticated, Supabase-anonymous, and unauthenticated - each read and write only their own rows in lesson_progress; no silent empty results for the anonymous session when data exists
  3. An anonymous user who upgrades to an email/password account retains all previously stored progress rows - the user_id is the same before and after upgrade, confirmed by querying the database
  4. A malformed lesson payload sent to any REST route returns a 400 response with a structured Zod error body rather than a 500 or a silent failure
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md - Supabase bootstrap + anonymous auth (INFRA-01, INFRA-02)
- [x] 02-02-PLAN.md - Schema + RLS + account upgrade continuity (INFRA-03, INFRA-04)
- [x] 02-03-PLAN.md - Shared Zod contracts + TanStack Query migration (INFRA-05, INFRA-06)

### Phase 3: Data Layer
**Goal**: Real NBA player, team, and coach data is available to the server at startup via disk cache and static seed files; player stats are mapped to the existing 30-feature PlayerFeatures schema with explicit field-by-field documentation; **stats.nba.com / `nba_api`** traffic for identity and scrape runs **only** at build time or via operator refresh — never on the HTTP request path
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Current repo state**:
- Baseline Phase 3 scope is complete and documented in the summary/verification artifacts.
- The working tree has moved beyond the original close-out: `server/services/features.ts`, `server/services/roleInference.ts`, `server/services/calibrationHarness.ts`, `server/scripts/calibrateDraftSim.ts`, new 2025-26 stats/calibration artifacts, and expanded tests indicate active recalibration of the player model and valuation pipeline.
- Treat that newer work as a **Phase 3 extension in progress**, not as completed downstream product work.
**Success Criteria** (what must be TRUE):
  1. Running the build-time seed script produces `server/data/nba-seed.json` containing all active NBA teams and players; subsequent server restarts never trigger live NBA stats HTTP calls on the request path for identity
  2. Server startup logs show the NBA identity disk cache warming up from JSON; any server endpoint that needs player or team identity responds from cache with no outbound stats API call
  3. `server/data/coaches-seed.json` contains real NBA head coaches, each with at minimum: pace preference, scheme tag, youth development flag, driver-friendly flag, and shooter-friendly flag
  4. Every one of the 30 fields in the existing PlayerFeatures schema has an explicit documented mapping from an `nba_api` source field or documented derivation — no silent null-fill or unmapped gaps
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md - Build-time NBA identity seed artifacts (DATA-01)
- [x] 03-02-PLAN.md - Disk cache warm/refresh + coach seed (DATA-02, DATA-03)
- [x] 03-03-PLAN.md - nba_api extension + 30-field mapping docs/tests (DATA-04, DATA-05)

**Follow-on sourcing (not phase-3 gates):** Future stats depth and third-party / public non-stats sources are tracked in [docs/data/nba-stats-stack-delta-todos.md](../docs/data/nba-stats-stack-delta-todos.md) (on-stack deltas) and [docs/data/external-data-sources.md](../docs/data/external-data-sources.md) (impact models, cap pages, injuries, G League / NCAA, etc.).

### Phase 4: Lesson Components and CMS
**Goal**: All lesson interaction types render correctly and handle failure states gracefully; admins can create, edit, and publish lessons through a protected CMS; at least 15 seed lessons are live at launch distributed across all three role lenses. **Optional:** lesson copy that references NBA player evaluation should align terminology with `PlayerFeatures` / [`player-feature-mapping.md`](../docs/data/player-feature-mapping.md) so Phase 7 draft teaching stays consistent (DATA-06).
**Depends on**: Phase 2, Phase 3
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06, LEARN-07, CMS-01, CMS-02, CMS-03, CMS-04, CMS-05
**Current repo state**:
- `shared/schemas.ts` now defines the lesson, discussion, recap, admin, tag, and daily-challenge contracts used by the learning surfaces.
- `server/src/lib/courtVisionStore.ts` seeds the lesson catalog, tags, recaps, and daily challenge schedule; `server/index.ts` mounts the lesson, admin, tag, and daily-challenge APIs.
- `client/src/pages/LessonPage.tsx` and `client/src/components/lesson/` now support film breakdown, pause-and-predict, scenario simulation, Learn More sections, completion flow, and removed-video fallback handling.
- `client/src/pages/admin/` plus `client/src/components/admin/` provide local-first lesson authoring, publish/unpublish, tag management, and daily challenge scheduling behind the current admin guard.
- Remaining follow-up is release-oriented rather than implementation-oriented: feature-flag rollout, SEO-Max checklist, and human/browser verification.
**Success Criteria** (what must be TRUE):
  1. A lesson card renders title, role lens badge, difficulty indicator, media embed, takeaway text, and interaction type label - all populated from CMS-authored data
  2. A film breakdown page loads a YouTube embed with a timestamped annotation sidebar; clicking an annotation moves the video to the correct timestamp
  3. A pause-and-predict lesson plays video, pauses automatically at the configured timestamp, accepts the user's answer, reveals the explanation, and resumes - and when the YouTube video has been removed, a defined fallback state renders instead of a broken or blank embed
  4. A scenario simulation presents a situation, collects the user's decision, scores it against the answer key, and displays the process-based reasoning for the correct answer
  5. Navigating to `/admin` as a non-admin user is redirected or blocked; navigating as an admin shows the lesson creation form with all required fields and working publish/unpublish controls
  6. At least 15 lessons are published in the content library, distributed across Player IQ, Coach IQ, and GM IQ tracks, each with a complete answer key configured
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md - Lesson card + film breakdown foundations (LEARN-01, LEARN-02)
- [x] 04-02-PLAN.md - Pause-and-predict, failure states, scenario, Learn More (LEARN-03, LEARN-04, LEARN-05, LEARN-06)
- [x] 04-03-PLAN.md - Admin lesson authoring/edit/publish + role guard (CMS-01, CMS-02, CMS-05)
- [x] 04-04-PLAN.md - Daily scheduling + tag management (CMS-03, CMS-04)
- [x] 04-05-PLAN.md - Launch lesson catalog + feature-flag + SEO-Max gate (LEARN-07)

### Phase 5: Progress, Onboarding, and Content Discovery
**Goal**: Lesson completion is tracked and persists across sessions for both anonymous and authenticated users; first-time visitors are guided through an onboarding flow; the full content library is searchable and filterable; users can leave text comments on lessons
**Depends on**: Phase 4
**Requirements**: LEARN-08, ONBD-01, ONBD-02, ONBD-03, DISC-01, DISC-02, DISC-03
**Current repo state**:
- `client/src/features/progress/` now provides the dual-path lesson progress adapter, keeping local continuity for guests while preserving the current account path.
- `client/src/pages/OnboardingPage.tsx` and `client/src/features/onboarding/` capture preferences, enforce the three-lesson plus one-benchmark output, and persist completion/skip state.
- `client/src/pages/LibraryPage.tsx`, `client/src/pages/RecapPage.tsx`, and `server/src/routes/contentLibrary.ts` provide searchable/filterable lesson and recap discovery.
- `client/src/pages/LessonDiscussionPage.tsx` and `server/src/routes/discussion.ts` provide the deliberately text-only lesson discussion surface.
- Remaining verification is mostly policy/release oriented rather than missing-feature implementation.
**Success Criteria** (what must be TRUE):
  1. A user who completes a lesson, closes the browser, and reopens the app sees that lesson marked as complete - for anonymous users via localStorage, for account holders via Supabase
  2. A first-time visitor who completes onboarding is shown exactly 3 recommended starter lessons, one benchmark challenge, and a direct link into the content library - all derived from their team preference, knowledge level, and goal
  3. A user who clicks Skip on the onboarding flow lands directly on the homepage with all three role lens lanes visible and is not shown the onboarding prompt again
  4. The content library lists all published lessons with filters for role lens, subcategory, difficulty, and format; applying two filters simultaneously narrows the result set rather than resetting it
  5. A user can post a text comment on a lesson and see comments left by other users on the same lesson - with no upvote, downvote, feed ranking, or social graph feature present
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md - Dual-path lesson progress persistence (LEARN-08)
- [x] 05-02-PLAN.md - Onboarding capture, recommendation output, skip flow (ONBD-01, ONBD-02, ONBD-03)
- [x] 05-03-PLAN.md - Library search/filter, recaps, discussion + SEO-Max gate (DISC-01, DISC-02, DISC-03)

### Phase 6: Daily Engagement
**Goal**: Every day a single challenge is surfaced on the homepage; completing it records the user's streak, awards badges at defined milestones, generates a shareable result card, and contributes to a friend leaderboard scoped to that day only. **Optional (DATA-06):** If a CMS-authored challenge uses **NBA statistics** in the prompt, answer key, or recap, terminology and numbers align with the shared `PlayerFeatures` / mapping docs — not one-off stat jargon.
**Depends on**: Phase 5
**Requirements**: DAILY-01, DAILY-02, DAILY-03, DAILY-04, DAILY-05, DAILY-06
**Current repo state**:
- `server/src/routes/dailyChallenge.ts` now serves the current challenge, records submissions, infers streak state, and awards milestone badges.
- `client/src/features/daily/` and `client/src/pages/HomePage.tsx` surface the daily challenge, share-card output, and done/not-done leaderboard on the home feed.
- `server/src/routes/leaderboard.ts` limits the social layer to current-day completion status rather than ranking users by score.
- `server/src/routes/adminDailyChallenge.ts` and `client/src/pages/admin/AdminDailyChallengePage.tsx` let admins manage the daily schedule in the same local-first stack.
**Success Criteria** (what must be TRUE):
  1. Visiting the homepage on any given day shows exactly one Daily Challenge sourced from the CMS-scheduled calendar; visiting the next day shows a different challenge from a different track
  2. A user who completes today's challenge sees their streak counter increment by one; returning after missing a day resets the counter to zero
  3. A user who reaches a 3-day, 7-day, or 30-day streak sees a badge awarded and displayed on their profile; completing the first challenge in each role lens track earns a separate track badge
  4. After completing the Daily Challenge, a shareable result card is generated showing the user's answer, correctness, the track, and the date - and is copyable or shareable via the browser share API
  5. A user who has at least one friend in the system sees a leaderboard scoped to today's challenge showing each friend's completion status - not a ranked score ladder, just done or not done
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md - Daily challenge retrieval and completion loop (DAILY-01, DAILY-02)
- [x] 06-02-PLAN.md - Streaks, badges, shareable result cards (DAILY-03, DAILY-04, DAILY-05)
- [x] 06-03-PLAN.md - Friend completion leaderboard + phase verification gate (DAILY-06)

### Phase 7: Draft Simulator Teaching Layer
**Goal**: The existing draft simulator feels native to Court Vision's visual identity; contextual teaching appears during drafting tied to lesson taxonomy tags; a post-draft analysis page closes the educational loop; the simulator is positioned as a capstone accessible from all three IQ tracks after a completion threshold. **DATA-06:** Draft UI, scouting, and post-draft analysis **use** the shared `PlayerFeatures` / `nba_api` pipeline (not a forked stat model); when the data layer adds metrics, **draft sim is updated** in the same release or a blocking gap is tracked.
**Depends on**: Phase 5
**Requirements**: DRAFT-01, DRAFT-02, DRAFT-03, DRAFT-04, DATA-06
**Current repo state**:
- `client/src/pages/DraftPage.tsx` now consumes `server/src/routes/draftTeaching.ts` to show contextual teaching overlays during the live draft.
- `client/src/components/draft/TeachingOverlay.tsx` and `client/src/components/draft/DraftTeachingMoment.tsx` provide lesson-linked guidance tied to draft moments.
- `client/src/pages/DraftRecapPage.tsx`, `client/src/components/draft/PostDraftAnalysis.tsx`, and `client/src/features/draft/rubricScoring.ts` add post-draft role-lens analysis.
- `client/src/pages/TrackPageLayout.tsx` and the refreshed home/library/profile surfaces now position the draft simulator as a capstone once lesson thresholds are met.
- The data model feeding the simulator is still evolving through the active Phase 3 extension work, so DATA-06 remains an ongoing coupling requirement.
**Success Criteria** (what must be TRUE):
  1. Loading the draft simulator shows Court Vision color tokens, typography, and component patterns consistent with the rest of the platform - no legacy draft-sim visual identity visible
  2. During a draft, a contextual tip or strategy note appears at key moments - each tip is tagged to a lesson in the content library so users can follow up
  3. After completing a draft, the post-draft analysis page identifies at least one decision the user got right and one they missed, framed in terms of Player IQ, Coach IQ, and GM IQ rubrics
  4. A user who has completed a threshold number of lessons sees the draft simulator surfaced as a prominent recommended next activity in all three IQ track pages
  5. Player-facing stats and explanations in the draft flow (including cards, tooltips, or post-draft recap) are **consistent** with `PlayerFeatures` and [`player-feature-mapping.md`](../docs/data/player-feature-mapping.md); any **new** pipeline metrics from [`nba-stats-stack-delta-todos.md`](../docs/data/nba-stats-stack-delta-todos.md) are either wired into the draft sim or explicitly deferred with a tracked issue
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md - Draft runtime reskin + contextual teaching overlays (DRAFT-01, DRAFT-02)
- [x] 07-02-PLAN.md - Post-draft analysis + capstone surfacing + release gate (DRAFT-03, DRAFT-04)

### Phase 8: User Profile and Account Upgrade
**Goal**: Users have a skill profile showing learning progress broken down by role lens with actionable next-lesson suggestions; anonymous users can optionally create an email/password account and keep all their data; account holders can log in from any device and see their progress. If the profile surfaces **basketball stat literacy** or compares user understanding to lesson topics, align copy with the same `PlayerFeatures` vocabulary as DATA-06 (avoid inventing new metric names).
**Depends on**: Phase 6, Phase 7
**Requirements**: PROF-01, PROF-02, PROF-03
**Current repo state**:
- `server/src/routes/profile.ts` and `client/src/features/profile/` now calculate role-lens completion, accuracy, badge, streak, and recommendation outputs.
- `client/src/pages/ProfilePage.tsx` renders the skill profile and next-lesson guidance.
- `client/src/pages/LoginPage.tsx` and `client/src/pages/AccountUpgradePage.tsx` provide the auth/upgrade surfaces while preserving a guest-mode fallback if Supabase env is unavailable.
- `server/src/routes/internal/accountUpgrade.ts` remains the live continuity path, but its end-to-end guarantee still requires human verification against a real Supabase project.
**Success Criteria** (what must be TRUE):
  1. A user's profile page shows completion count and accuracy rate separately for each of the three role lens tracks, their full badge collection, and at least one suggested next lesson based on their weakest lens or subcategory
  2. An anonymous user who creates an email/password account retains all previously accumulated progress, streak, badges, and Daily Challenge history - confirmed by comparing state before and after account creation
  3. A user who logs out and logs back in on a different device sees the same lesson completions, streak count, and badge collection - progress is in sync via Supabase
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md - Role-lens profile metrics and recommendations (PROF-01)
- [x] 08-02-PLAN.md - Account upgrade continuity + cross-device sync gate (PROF-02, PROF-03)

### Phase 9: Offseason Simulator - Foundation
**Goal**: The save/resume infrastructure is in place with schema versioning from day one; the Team Context phase works end-to-end with real NBA data; the simulator is reachable from the GM IQ lens. **DATA-06** continues to apply: roster and identity data come from the same disk seeds as the rest of the app.
**Depends on**: Phase 8
**Requirements**: OSIM-01, OSIM-08, OSIM-09, OSIM-10
**Success Criteria** (what must be TRUE):
  1. A user who selects a real NBA team in the Team Context phase sees that team's real roster, draft pick holdings, a timeline assessment (rebuilding / contending / transitioning), and a list of the team's obvious needs - all populated from the seeded data layer
  2. A user who completes the Team Context phase, closes the browser, and returns to the app resumes from that exact point with roster selection, picks, and needs assessment all present without re-entry
  3. Updating the offseason sim state schema by adding a field, then running the migration function on a previously saved run, produces a Zod-valid upgraded run state without data loss
  4. A user who has completed core GM IQ lessons sees the Offseason Simulator surfaced as a recommended module in the GM IQ lens; the GM IQ lens page contains a direct entry point to the simulator
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md - Versioned state + migration-safe save/resume (OSIM-08, OSIM-09)
- [x] 09-02-PLAN.md - Team Context phase implementation (OSIM-01)
- [x] 09-03-PLAN.md - GM lens entry + advanced module recommendation gate (OSIM-10, pending human verification)

### Phase 10: Offseason Simulator - Decision Loop
**Goal**: All six remaining phases of the offseason decision loop are playable end-to-end - coaching hire, draft board, trade exploration, draft night, free agency, and final recap - each with teaching overlays, explanation-first grades, and coach-tendency integration throughout. **DATA-06:** Scouting, trades, and draft night **reuse** the same player evaluation contracts as the draft sim; optional cap or external data follows [`external-data-sources.md`](../docs/data/external-data-sources.md).
**Depends on**: Phase 9
**Requirements**: OSIM-02, OSIM-03, OSIM-04, OSIM-05, OSIM-06, OSIM-07
**Success Criteria** (what must be TRUE):
  1. A user who hires a coach in the Coaching Market phase sees that coach's tendency tags reflected in player valuations and grade weights for every subsequent phase of that run
  2. A user building their draft board in the Scouting phase sees explicit uncertainty signals alongside each prospect's stats and workout data - no prospect is displayed as a safe pick or a certainty
  3. A user in the Trade Market phase can propose a player-for-player or player-for-picks trade and receives a fit-based explanation of whether the trade helps or hurts the team's needs and timeline
  4. Completing Draft Night produces explanation-first grades for each pick: the user sees why that player was graded well or poorly given their board, team needs, and the hired coach's tendencies
  5. The Post-Offseason Recap screen shows a team grade, a fit report, a developmental environment score, and a plain-language explanation of why the offseason succeeded or failed
**Plans**: 4 plans

Plans:
- [x] 10-01-PLAN.md - Coaching market + tendency propagation (OSIM-02)
- [x] 10-02-PLAN.md - Scouting uncertainty + trade fit explanations (OSIM-03, OSIM-04)
- [x] 10-03-PLAN.md - Draft Night + Free Agency phases (OSIM-05, OSIM-06)
- [x] 10-04-PLAN.md - Post-offseason recap + full-loop verification gate (OSIM-07, pending human verification gate)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8 - 9 - 10

Note: Phase 2 (Infrastructure) and Phase 3 (Data Layer) are independent of each other and can be parallelized. Both must be complete before Phase 4 begins.
Implementation is now complete through Phase 9 in the repo. The remaining open items are manual/release verification gates called out in the phase summaries, plus the separate Phase 3 model-calibration extension.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Bug Fixes | 5/5 | Complete   | 2026-03-10 |
| 2. Infrastructure - Supabase and Auth | 3/3 | Complete   | 2026-03-24 |
| 3. Data Layer | 3/3 formal + extension work in repo | Complete baseline / extension in progress | 2026-03-24 |
| 4. Lesson Components and CMS | 5/5 | Implemented pending manual rollout / SEO verification | 2026-04-01 |
| 5. Progress, Onboarding, and Content Discovery | 3/3 | Implemented | 2026-04-01 |
| 6. Daily Engagement | 3/3 | Implemented | 2026-04-01 |
| 7. Draft Simulator Teaching Layer | 2/2 | Implemented | 2026-04-01 |
| 8. User Profile and Account Upgrade | 2/2 | Implemented pending live Supabase verification | 2026-04-01 |
| 9. Offseason Simulator - Foundation | 3/3 | Implemented pending final human verification gate | 2026-04-22 |
| 10. Offseason Simulator - Decision Loop | 4/4 | Browser accepted locally; product-owner / live Supabase sign-off remains | 2026-06-11 |

### Phase 11: NBA Big Board Creator — private-first prospect evaluation platform with modular scoring, historical comps, film workflow, and auditable big board generation

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 4/4 plans complete

Plans:
- [ ] TBD (run /gsd:plan-phase 11 to break down)

### Phase 12: NBA Big Board Creator — Ranking, scoring engine, board generation, tiering, historical comps, and board-level explanations (PRD Phase 2)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 11
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 12 to break down)

### Phase 13: NBA Big Board Creator — Audit layer, snapshots, override logs, takes ledger, preset versioning, and retrospective outcome review scaffolding (PRD Phase 3)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 12
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 13 to break down)

### Phase 14: NBA Big Board Creator — Team fit boards extension layered on top of neutral board (PRD Phase 4)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 13
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 14 to break down)

### Phase 15: QR remediation: bballedu



**Goal:** Resolve Quality Runner findings for bballedu using cluster-oriented, behavior-preserving remediation from run qr-fleet-continue-20260704-bballedu.
**Requirements**: QR-BBALLEDU
**Depends on:** Phase 14
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md - Primary QR cluster remediation
- [ ] 15-02-PLAN.md - Additional QR cluster remediation

**Cross-cutting constraints:**
- The post-remediation QR run records no unresolved regression for this plan scope.
