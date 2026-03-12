# Roadmap: Court Vision

## Overview

Court Vision expands an existing NBA Draft Simulator monorepo into a full basketball IQ training platform. The build sequence is non-negotiable: fix the coaching simulation correctness bug first so every teaching layer that follows is factually grounded; establish Supabase persistence before any feature writes user data; seed real NBA data before the offseason simulator can reference it; build lesson components and the admin CMS together so content can be authored immediately; layer engagement, discovery, and profiles on top of a content-rich foundation; add the draft teaching layer as the first high-leverage apply-what-you-learned experience; and defer the NBA Offseason Simulator - a 7-phase decision engine - until the lesson platform and data infrastructure are proven and stable.

**Core value:** The platform only succeeds if users' basketball IQ genuinely improves - education comes before surface polish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Bug Fixes** - Fix simulation correctness bug, wire coaching WebSocket events, rebrand to Court Vision, establish homepage with all three role lenses (completed 2026-03-10)
- [ ] **Phase 2: Infrastructure - Supabase and Auth** - Initialize Supabase project, establish anonymous auth, define full DB schema with RLS, add TanStack Query and Zod validation
- [ ] **Phase 3: Data Layer** - BallDontLie build-time seed, disk cache, coach profiles seed, player stats to PlayerFeatures mapping
- [ ] **Phase 4: Lesson Components and CMS** - All lesson UI interaction types plus admin authoring tools; 15-20 seed lessons authored and published
- [ ] **Phase 5: Progress, Onboarding, and Content Discovery** - Lesson completion persistence, onboarding flow, searchable content library, discussion board
- [ ] **Phase 6: Daily Engagement** - Rotating daily challenge, streak tracking, badge milestones, shareable result cards, friend leaderboard
- [ ] **Phase 7: Draft Simulator Teaching Layer** - Court Vision reskin, contextual teaching overlay, post-draft analysis, capstone positioning
- [ ] **Phase 8: User Profile and Account Upgrade** - Skill profile page, optional email/password account creation, cross-device progress sync
- [ ] **Phase 9: Offseason Simulator - Foundation** - Save/resume infrastructure, schema versioning, Team Context phase, GM lens entry point
- [ ] **Phase 10: Offseason Simulator - Decision Loop** - Coaching market, scouting, trade market, draft night, free agency, and post-offseason recap

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
- [ ] 01-01-PLAN.md - Fix handleSimulateRoundInternal bug + Monte Carlo regression test (FOUND-03)
- [ ] 01-02-PLAN.md - Wire SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER WebSocket events (FOUND-04)
- [ ] 01-03-PLAN.md - Court Vision rebrand strings + Tailwind design tokens (FOUND-01, FOUND-02)
- [ ] 01-04-PLAN.md - Homepage three-lane layout + NavBar cross-lens navigation (FOUND-05, FOUND-06)
- [ ] 01-05-PLAN.md - Human verification checkpoint for all Phase 1 success criteria

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
- [ ] 02-01-PLAN.md - Supabase bootstrap + anonymous auth (INFRA-01, INFRA-02)
- [ ] 02-02-PLAN.md - Schema + RLS + account upgrade continuity (INFRA-03, INFRA-04)
- [ ] 02-03-PLAN.md - Shared Zod contracts + TanStack Query migration (INFRA-05, INFRA-06)

### Phase 3: Data Layer
**Goal**: Real NBA player, team, and coach data is available to the server at startup via disk cache and static seed files; player stats are mapped to the existing 30-feature PlayerFeatures schema with explicit field-by-field documentation; the BallDontLie API is never called on the request path
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Running the build-time seed script produces `server/data/nba-seed.json` containing all active NBA teams and players; subsequent server restarts never trigger BallDontLie API calls on the request path
  2. Server startup logs show the BallDontLie disk cache warming up in the background; any server endpoint that needs player or team data responds from cache with no outbound API call
  3. `server/data/coaches-seed.json` contains real NBA head coaches, each with at minimum: pace preference, scheme tag, youth development flag, driver-friendly flag, and shooter-friendly flag
  4. Every one of the 30 fields in the existing PlayerFeatures schema has an explicit documented mapping from a BallDontLie or nba_api source field - no silent null-fill or unmapped gaps
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md - Build-time BallDontLie seed artifacts (DATA-01)
- [ ] 03-02-PLAN.md - Disk cache warm/refresh + coach seed (DATA-02, DATA-03)
- [ ] 03-03-PLAN.md - nba_api extension + 30-field mapping docs/tests (DATA-04, DATA-05)

### Phase 4: Lesson Components and CMS
**Goal**: All lesson interaction types render correctly and handle failure states gracefully; admins can create, edit, and publish lessons through a protected CMS; at least 15 seed lessons are live at launch distributed across all three role lenses
**Depends on**: Phase 2, Phase 3
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06, LEARN-07, CMS-01, CMS-02, CMS-03, CMS-04, CMS-05
**Success Criteria** (what must be TRUE):
  1. A lesson card renders title, role lens badge, difficulty indicator, media embed, takeaway text, and interaction type label - all populated from CMS-authored data
  2. A film breakdown page loads a YouTube embed with a timestamped annotation sidebar; clicking an annotation moves the video to the correct timestamp
  3. A pause-and-predict lesson plays video, pauses automatically at the configured timestamp, accepts the user's answer, reveals the explanation, and resumes - and when the YouTube video has been removed, a defined fallback state renders instead of a broken or blank embed
  4. A scenario simulation presents a situation, collects the user's decision, scores it against the answer key, and displays the process-based reasoning for the correct answer
  5. Navigating to `/admin` as a non-admin user is redirected or blocked; navigating as an admin shows the lesson creation form with all required fields and working publish/unpublish controls
  6. At least 15 lessons are published in the content library, distributed across Player IQ, Coach IQ, and GM IQ tracks, each with a complete answer key configured
**Plans**: 5 plans

Plans:
- [ ] 04-01-PLAN.md - Lesson card + film breakdown foundations (LEARN-01, LEARN-02)
- [ ] 04-02-PLAN.md - Pause-and-predict, failure states, scenario, Learn More (LEARN-03, LEARN-04, LEARN-05, LEARN-06)
- [ ] 04-03-PLAN.md - Admin lesson authoring/edit/publish + role guard (CMS-01, CMS-02, CMS-05)
- [ ] 04-04-PLAN.md - Daily scheduling + tag management (CMS-03, CMS-04)
- [ ] 04-05-PLAN.md - Launch lesson catalog + feature-flag + SEO-Max gate (LEARN-07)

### Phase 5: Progress, Onboarding, and Content Discovery
**Goal**: Lesson completion is tracked and persists across sessions for both anonymous and authenticated users; first-time visitors are guided through an onboarding flow; the full content library is searchable and filterable; users can leave text comments on lessons
**Depends on**: Phase 4
**Requirements**: LEARN-08, ONBD-01, ONBD-02, ONBD-03, DISC-01, DISC-02, DISC-03
**Success Criteria** (what must be TRUE):
  1. A user who completes a lesson, closes the browser, and reopens the app sees that lesson marked as complete - for anonymous users via localStorage, for account holders via Supabase
  2. A first-time visitor who completes onboarding is shown exactly 3 recommended starter lessons, one benchmark challenge, and a direct link into the content library - all derived from their team preference, knowledge level, and goal
  3. A user who clicks Skip on the onboarding flow lands directly on the homepage with all three role lens lanes visible and is not shown the onboarding prompt again
  4. The content library lists all published lessons with filters for role lens, subcategory, difficulty, and format; applying two filters simultaneously narrows the result set rather than resetting it
  5. A user can post a text comment on a lesson and see comments left by other users on the same lesson - with no upvote, downvote, feed ranking, or social graph feature present
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md - Dual-path lesson progress persistence (LEARN-08)
- [ ] 05-02-PLAN.md - Onboarding capture, recommendation output, skip flow (ONBD-01, ONBD-02, ONBD-03)
- [ ] 05-03-PLAN.md - Library search/filter, recaps, discussion + SEO-Max gate (DISC-01, DISC-02, DISC-03)

### Phase 6: Daily Engagement
**Goal**: Every day a single challenge is surfaced on the homepage; completing it records the user's streak, awards badges at defined milestones, generates a shareable result card, and contributes to a friend leaderboard scoped to that day only
**Depends on**: Phase 5
**Requirements**: DAILY-01, DAILY-02, DAILY-03, DAILY-04, DAILY-05, DAILY-06
**Success Criteria** (what must be TRUE):
  1. Visiting the homepage on any given day shows exactly one Daily Challenge sourced from the CMS-scheduled calendar; visiting the next day shows a different challenge from a different track
  2. A user who completes today's challenge sees their streak counter increment by one; returning after missing a day resets the counter to zero
  3. A user who reaches a 3-day, 7-day, or 30-day streak sees a badge awarded and displayed on their profile; completing the first challenge in each role lens track earns a separate track badge
  4. After completing the Daily Challenge, a shareable result card is generated showing the user's answer, correctness, the track, and the date - and is copyable or shareable via the browser share API
  5. A user who has at least one friend in the system sees a leaderboard scoped to today's challenge showing each friend's completion status - not a ranked score ladder, just done or not done
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md - Daily challenge retrieval and completion loop (DAILY-01, DAILY-02)
- [ ] 06-02-PLAN.md - Streaks, badges, shareable result cards (DAILY-03, DAILY-04, DAILY-05)
- [ ] 06-03-PLAN.md - Friend completion leaderboard + phase verification gate (DAILY-06)

### Phase 7: Draft Simulator Teaching Layer
**Goal**: The existing draft simulator feels native to Court Vision's visual identity; contextual teaching appears during drafting tied to lesson taxonomy tags; a post-draft analysis page closes the educational loop; the simulator is positioned as a capstone accessible from all three IQ tracks after a completion threshold
**Depends on**: Phase 5
**Requirements**: DRAFT-01, DRAFT-02, DRAFT-03, DRAFT-04
**Success Criteria** (what must be TRUE):
  1. Loading the draft simulator shows Court Vision color tokens, typography, and component patterns consistent with the rest of the platform - no legacy draft-sim visual identity visible
  2. During a draft, a contextual tip or strategy note appears at key moments - each tip is tagged to a lesson in the content library so users can follow up
  3. After completing a draft, the post-draft analysis page identifies at least one decision the user got right and one they missed, framed in terms of Player IQ, Coach IQ, and GM IQ rubrics
  4. A user who has completed a threshold number of lessons sees the draft simulator surfaced as a prominent recommended next activity in all three IQ track pages
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md - Draft runtime reskin + contextual teaching overlays (DRAFT-01, DRAFT-02)
- [ ] 07-02-PLAN.md - Post-draft analysis + capstone surfacing + release gate (DRAFT-03, DRAFT-04)

### Phase 8: User Profile and Account Upgrade
**Goal**: Users have a skill profile showing learning progress broken down by role lens with actionable next-lesson suggestions; anonymous users can optionally create an email/password account and keep all their data; account holders can log in from any device and see their progress
**Depends on**: Phase 6, Phase 7
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. A user's profile page shows completion count and accuracy rate separately for each of the three role lens tracks, their full badge collection, and at least one suggested next lesson based on their weakest lens or subcategory
  2. An anonymous user who creates an email/password account retains all previously accumulated progress, streak, badges, and Daily Challenge history - confirmed by comparing state before and after account creation
  3. A user who logs out and logs back in on a different device sees the same lesson completions, streak count, and badge collection - progress is in sync via Supabase
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md - Role-lens profile metrics and recommendations (PROF-01)
- [ ] 08-02-PLAN.md - Account upgrade continuity + cross-device sync gate (PROF-02, PROF-03)

### Phase 9: Offseason Simulator - Foundation
**Goal**: The save/resume infrastructure is in place with schema versioning from day one; the Team Context phase works end-to-end with real NBA data; the simulator is reachable from the GM IQ lens
**Depends on**: Phase 8
**Requirements**: OSIM-01, OSIM-08, OSIM-09, OSIM-10
**Success Criteria** (what must be TRUE):
  1. A user who selects a real NBA team in the Team Context phase sees that team's real roster, draft pick holdings, a timeline assessment (rebuilding / contending / transitioning), and a list of the team's obvious needs - all populated from the seeded data layer
  2. A user who completes the Team Context phase, closes the browser, and returns to the app resumes from that exact point with roster selection, picks, and needs assessment all present without re-entry
  3. Updating the offseason sim state schema by adding a field, then running the migration function on a previously saved run, produces a Zod-valid upgraded run state without data loss
  4. A user who has completed core GM IQ lessons sees the Offseason Simulator surfaced as a recommended module in the GM IQ lens; the GM IQ lens page contains a direct entry point to the simulator
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md - Versioned state + migration-safe save/resume (OSIM-08, OSIM-09)
- [ ] 09-02-PLAN.md - Team Context phase implementation (OSIM-01)
- [ ] 09-03-PLAN.md - GM lens entry + advanced module recommendation gate (OSIM-10)

### Phase 10: Offseason Simulator - Decision Loop
**Goal**: All six remaining phases of the offseason decision loop are playable end-to-end - coaching hire, draft board, trade exploration, draft night, free agency, and final recap - each with teaching overlays, explanation-first grades, and coach-tendency integration throughout
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
- [ ] 10-01-PLAN.md - Coaching market + tendency propagation (OSIM-02)
- [ ] 10-02-PLAN.md - Scouting uncertainty + trade fit explanations (OSIM-03, OSIM-04)
- [ ] 10-03-PLAN.md - Draft Night + Free Agency phases (OSIM-05, OSIM-06)
- [ ] 10-04-PLAN.md - Post-offseason recap + full-loop verification gate (OSIM-07)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8 - 9 - 10

Note: Phase 2 (Infrastructure) and Phase 3 (Data Layer) are independent of each other and can be parallelized. Both must be complete before Phase 4 begins.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Bug Fixes | 5/5 | Complete   | 2026-03-10 |
| 2. Infrastructure - Supabase and Auth | 0/3 | Not started | - |
| 3. Data Layer | 0/3 | Not started | - |
| 4. Lesson Components and CMS | 0/5 | Not started | - |
| 5. Progress, Onboarding, and Content Discovery | 0/3 | Not started | - |
| 6. Daily Engagement | 0/3 | Not started | - |
| 7. Draft Simulator Teaching Layer | 0/2 | Not started | - |
| 8. User Profile and Account Upgrade | 0/2 | Not started | - |
| 9. Offseason Simulator - Foundation | 0/3 | Not started | - |
| 10. Offseason Simulator - Decision Loop | 0/4 | Not started | - |


