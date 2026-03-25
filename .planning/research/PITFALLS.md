# Domain Pitfalls

**Domain:** Basketball IQ learning platform + NBA Offseason Simulator (expansion of existing Draft Simulator)
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH — specific to this codebase's known bugs + verified API/library behavior

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or fundamental correctness failures.

---

### Pitfall 1: The Silent Coaching Bug Is Already Present and Will Spread

**What goes wrong:** `handleSimulateRoundInternal` in `server/services/handlers-v2.ts` (lines 240–296) creates stub `TeamAggregation` objects with empty `features: {}`, `archetypes: {}`, and `overallRating: 50`. When all coaches submit simultaneously, this auto-sim path runs — ignoring team quality and all coaching decisions entirely. The simulation returns results that feel real but are statistically random at the 50-rating floor. Expanding the platform without fixing this means every new feature that touches auto-sim (offseason sim, daily challenges, teaching overlays) inherits broken simulation integrity.

**Why it happens:** The auto-sim path was written as a convenience shortcut and never received the `allPlayers` parameter that the manual commissioner path (`handleSimulateRound`, lines 301–346) passes correctly. There are now two divergent code paths with only one being correct.

**Consequences:**
- Any coaching lesson or GM IQ content that references "how your coaching decision affected the outcome" is teaching against false data
- Offseason simulator coaching-hire phase, if it writes back to the same simulation pipeline, will appear to have no effect on results
- Users will correctly perceive that decisions don't matter, destroying the learning premise

**Warning signs:**
- Sim results are suspiciously uniform across games regardless of team strength differential
- Coaching "decisions" correlate zero with win/loss outcomes when checked statistically
- The duplicate `calculateReliabilityFactor` issue (dead sophisticated version in `reliability.ts`) suggests the pattern of writing a feature and then routing around it is established — watch for more of this

**Prevention:**
- Fix before any new feature work begins: pass `allPlayers` into `handleSimulateRoundInternal` following the exact pattern in `handleSimulateRound`
- Simultaneously consolidate the two handler files and move `lobbies`/`drafts` Maps to `server/stores/` to prevent the split-path pattern from recurring
- Write a regression test that asserts a high-rated team beats a 50-rated team at a statistically significant rate over 1000 simulations — this test would have caught the bug

**Phase that must address it:** Phase 1 (Foundation / Bug Fix) — before any learning content or offseason sim work begins

---

### Pitfall 2: NBA Stats Pipeline (nba_api) Is Unofficial and Must Stay Off the Request Path

**What goes wrong:** Team/player identity and stats come from the Python `nba_api` library, which wraps **stats.nba.com** (unofficial, no SLA). Endpoints can change; rate limiting or blocking can occur if you hammer the API. Coach/coaching staff structured data is not available from this stats layer in a product-ready form — coaching tendencies for the offseason sim must remain hand-curated (`coaches-seed.json`).

**Why it happens:** The NBA does not publish a supported public API for third-party apps. `nba_api` tracks the site; breakage is an operational risk, not a vendor ticket.

**Consequences:**
- Identity and roster refresh (`npm run seed:nba`) takes tens of seconds and ~31 HTTP calls (league dash + one roster per team); it must never run on the HTTP request path
- Coach profiles (tendencies, history, style) must be hand-curated static data — there is no substitute in the stats API for editorial coaching attributes
- If you display a coach's "offensive philosophy" as a real attribute, that data must be authored and version-controlled, not scraped

**Warning signs:**
- Someone adds a "quick fix" live fetch to stats.nba.com from an Express handler
- Seed script failures in CI because Python lacks `nba-api` — use `seed:nba:offline` for deterministic teams-only artifacts

**Prevention:**
- Keep DATA-01: all identity HTTP traffic only inside `npm run seed:nba` (Python `seed_nba_identity.py` + TS driver); runtime reads `server/data/nba-seed.json` from disk
- Pin `nba-api` in `server/scripts/requirements-nba.txt` and document `pip install`
- Treat coach profile data as editorial content: structured `coaches-seed.json` with tendency tags (pace, scheme, flags) and version-control it
- Throttle roster fetches in the seed script; commit working `nba-seed.json` so production serves last-known-good if the upstream changes

**Phase that must address it:** Phase before Offseason Simulator build (data layer design phase) — specifically during the "modular data layer" milestone

---

### Pitfall 3: Supabase Migration Creates a Dual-Authority State Problem

**What goes wrong:** The existing architecture runs all live game state through Socket.io in memory (`lobbies` and `drafts` Maps in `handlers.ts`). When Supabase is added incrementally, there are two distinct moments of truth: the in-memory Map (fast, authoritative for active rounds) and Supabase (persistent, but eventually consistent). Any write that must hit both — e.g., saving a coaching decision that also needs to persist — creates a window where Socket.io has accepted the decision but Supabase has not written it. On server crash or reconnect, the in-memory state is gone and Supabase may have an incomplete record.

**Why it happens:** "Incremental migration" sounds safe but is actually the highest-risk pattern for state stores because you accumulate two partial sources of truth simultaneously. The existing codebase's `coachingTimerManager` already mutates league state directly on object references rather than through `leagueStore.update()` — adding a Supabase write alongside this increases the likelihood of inconsistent state.

**Consequences:**
- Offseason sim save/resume fails on crash mid-phase: user loses hours of work and the promised "save and resume" feature (described in PROJECT.md as "required, not nice-to-have") cannot be trusted
- Progress tracking (streaks, lesson completions, daily challenge scores) silently drops writes when the Supabase call fails while the in-memory state looks fine
- RLS policies written for draft-sim data may expose user lesson progress or vice versa if the schema is not modeled carefully upfront

**Warning signs:**
- Any code that writes to an in-memory Map AND fires a Supabase insert/update without a transaction or rollback path
- The `coachingTimerManager` direct mutation pattern reappearing in new code
- Offseason sim save logic that calls `supabase.from('runs').upsert(...)` without a success check before emitting the "saved" event to the client

**Prevention:**
- Decide the authority boundary before writing any Supabase code: for active multiplayer draft lobbies, in-memory remains authoritative and Supabase is write-behind (best-effort persistence); for offseason sim and all learning progress, Supabase is the primary store and Socket.io only carries real-time deltas
- For offseason sim specifically, treat each phase completion as a checkpoint: serialize the entire phase state to a single Supabase row (JSONB column) atomically — do not write field-by-field mid-phase
- Add a "saved at" timestamp the client can display so users know when their last checkpoint was
- Write a "recovery path" spec before building save/resume: what does the user see if they resume from a mid-phase crash?
- Fix the `lobbies`/`drafts` store location first (move to `server/stores/`) to establish a clean pattern before adding Supabase writes

**Phase that must address it:** Infrastructure / Supabase setup phase — the schema and authority-boundary decisions must be made before any feature uses Supabase writes

---

### Pitfall 4: YouTube Embed Pause-and-Predict Depends on Video Availability You Do Not Control

**What goes wrong:** The pause-and-predict interaction model requires that (a) a specific video is available to embed, (b) the video is embeddable (not all videos allow embedding), (c) the IFrame API loads and fires `onStateChange` events reliably, and (d) you can programmatically pause at a specific timestamp. Any of these can fail silently: the video gets taken down, the uploader restricts embedding, the API fails to load, or the timestamp is wrong after a re-upload. Since the lesson itself is built around a specific clip at a specific timestamp, a broken embed makes the lesson completely non-functional — not degraded, broken.

**Why it happens:** YouTube video availability is controlled by third parties (content owners, YouTube policy, regional restrictions). The IFrame API does not fire events until the user has interacted with the player on mobile (autoplay is blocked). The `onReady` event does not guarantee the video is playable — an error event may follow immediately if the video is geo-restricted or embedding-disabled.

**Consequences:**
- A lesson on "reading a pick-and-roll" built around a specific NBA clip becomes a blank page with an error player after the clip is removed from YouTube
- On mobile, the pause-at-timestamp pattern requires user interaction before API control is available, breaking the "clip pauses automatically" interaction model
- Content that relies on YouTube clips from official NBA or team channels is at elevated risk because leagues actively manage clip availability and often remove highlights

**Warning signs:**
- Lesson authoring tools that only store a YouTube URL without a canonical video ID and a "last verified" timestamp
- No fallback state in the lesson component when `onError` fires (error codes 2, 5, 100, 101, 150 all mean "unavailable")
- Assuming mobile behavior matches desktop for autoplay and API control

**Prevention:**
- Store YouTube video IDs (not full URLs) and a "last verified available" date in the CMS
- Build an admin-facing health check script that hits the YouTube oEmbed endpoint for every lesson video and flags unavailable ones — run this weekly or before any content push
- Design the lesson component with three states: (1) video loads and API ready, (2) video unavailable (show explanation text + "clip removed" notice), (3) API fails to load (fall back to static screenshot + manual timestamp link)
- For pause-and-predict: use `player.seekTo(timestamp)` then `player.pauseVideo()` in the `onReady` handler — do not rely on autoplay-then-pause because autoplay is blocked on mobile
- Prefer clips from YouTube channels with stable, long-lived content (e.g., historical/analysis accounts) over official NBA clips that get pulled for broadcast rights
- Tag clips with a `content_risk_level` field in the CMS: `high` (official broadcast), `medium` (analysis channel), `low` (original content) so editors know which lessons need monitoring

**Phase that must address it:** Core Learning System phase — before building pause-and-predict interactions, design the fallback and health-check infrastructure

---

## Moderate Pitfalls

---

### Pitfall 5: Supabase RLS Policies Will Silently Block Anonymous Users

**What goes wrong:** Anonymous-first progress tracking (localStorage → optional Supabase account) is central to the product's low-friction premise. When Supabase RLS is enabled on progress tables, the anonymous user (who has no `auth.uid()`) will receive empty results instead of errors. Policies written as `USING (auth.uid() = user_id)` evaluate to `null = user_id` for anonymous users, which is `false` in SQL — the query returns zero rows silently. This is not a query error; it looks like the user has no data.

**Why it happens:** SQL null semantics mean `null = anything` is always null/false, not true. Developers test RLS with authenticated sessions in the Supabase dashboard and miss the anonymous case. The distinction between the `anon` Postgres role (unauthenticated requests) and Supabase Auth's anonymous users (which assume the `authenticated` role via `is_anonymous` JWT claim) is non-obvious and rarely documented clearly at the integration layer.

**Consequences:**
- User completes lessons, builds a streak, then creates an account — and sees empty progress because the localStorage migration path to Supabase wrote under an unauthenticated session that RLS blocked
- Daily challenge scores silently drop for any user who hasn't logged in, making the leaderboard incomplete without any error indication
- Friend leaderboard queries return empty arrays instead of "no friends yet" because RLS blocks the join

**Warning signs:**
- Progress writes succeed (200 response from Supabase client) but reads return empty arrays
- Supabase logs show no error but row counts are zero for new users
- The JWT `is_anonymous` claim is not being checked anywhere in RLS policy definitions

**Prevention:**
- Write RLS policies to handle three user states explicitly: (1) fully authenticated (`auth.uid() IS NOT NULL AND NOT (auth.jwt()->'user_metadata'->>'is_anonymous')::boolean`), (2) Supabase anonymous user (`auth.uid() IS NOT NULL AND (auth.jwt()->'user_metadata'->>'is_anonymous')::boolean`), (3) pure anonymous/unauthenticated (no write access to progress tables at all — localStorage only)
- For the anonymous → authenticated upgrade path, write a migration function that copies localStorage progress to the user's newly created Supabase account on sign-up
- Index every column used in RLS policies on progress tables to prevent full-table scans per-row
- Test RLS policies in three browser sessions simultaneously: logged-out, anonymous Supabase user, and authenticated user — run the full lesson-completion flow in each

**Phase that must address it:** Supabase infrastructure phase, before any progress tracking tables are created

---

### Pitfall 6: The Quarter-by-Quarter Coaching Wiring Gap Will Corrupt Phase Transitions

**What goes wrong:** The `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` WebSocket events are defined in `shared/types.ts` (lines 644–645) but are not handled in `socketManager.ts`. When the client emits these events, the server ignores them silently. The `QuarterCoachingPage` listens for `game:quarter_coaching_window` events that are never emitted by the current round flow. This means `league.roundState?.phase` can get stuck or transition incorrectly when the quarter coaching UI is reachable but non-functional, and `GameRouting` in `App.tsx` depends on these fields for navigation decisions.

**Why it happens:** The quarter-based coaching system was designed in types/UI before the server-side wiring was completed — a feature branch was merged in a partially-done state.

**Consequences:**
- If any new route or state check is added that assumes quarter coaching works end-to-end, it will enter an unrecoverable loop (routing bug documented in CONCERNS.md)
- Teaching overlays built for the coaching lesson layer that inject tips into the quarter coaching UI will never fire
- Fix applied incorrectly (e.g., adding a handler without updating the phase state machine) creates a new category of phase corruption bugs

**Warning signs:**
- Any PR that adds to `QuarterCoachingPage` or references `SUBMIT_QUARTER_COACHING` without a corresponding `socketManager.ts` handler registration
- `league.roundState.phase` becomes `COACHING_WINDOW` in tests but no subsequent phase transition fires
- Client network tab shows events emitted but no server acknowledgment

**Prevention:**
- Wire `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` in `socketManager.ts` as part of the Foundation milestone alongside the coaching bug fix — these are the same correctness domain
- Add phase-state-machine tests to `leagueManager.ts` before wiring: assert that `COACHING_WINDOW → QUARTER_SIMULATING → COACHING_WINDOW` transitions fire in order for a 4-quarter game
- The `coachingTimerManager` direct-mutation bug (bypassing `leagueStore.update()`) must be fixed at the same time — otherwise the new handlers will conflict with timer-driven mutations

**Phase that must address it:** Phase 1 (Foundation) — same milestone as the coaching aggregation bug fix

---

### Pitfall 7: Offseason Sim Save/Resume Will Break on Schema Evolution

**What goes wrong:** The offseason sim is multi-session (PROJECT.md: "runs span multiple sessions — required, not nice-to-have"). The natural implementation stores the run state as a serialized JSONB blob in Supabase. When the sim's data model evolves (new phase, new field, changed enum), existing saved runs become unreadable or cause runtime errors when deserialized. This is identical to save-file compatibility problems in traditional games.

**Why it happens:** Early serialization decisions don't account for forward compatibility. A run saved in phase 1 of the product with `{ coachingHire: { name: string } }` breaks when phase 2 adds `{ coachingHire: { name: string, system: string } }` and the deserialization code expects both fields.

**Consequences:**
- Users who start an offseason run on one week return to find it broken after a product update
- "Save and resume" becomes "save and lose" after any schema change, destroying trust in the feature
- Migrations on live JSONB blobs are painful — no Postgres column-level migration, you must write transform scripts over arbitrary JSON

**Warning signs:**
- Offseason sim state type (`OffseasonRunState` or equivalent) is changed without a migration version bump
- No `schemaVersion` field on saved runs
- A run saved last week fails to parse with a TypeScript type error today

**Prevention:**
- Add a `schemaVersion: number` field to the top-level saved run object from day one
- Write a `migrateRun(savedRun: unknown, targetVersion: number): OffseasonRunState` function alongside the schema and update it with every model change
- Use TypeScript's `zod` or similar runtime validation at the deserialization boundary — never cast blind from JSONB
- Keep all phase-completion checkpoints versioned: do not overwrite previous checkpoint with new-format data until migration is validated
- Test deserialization of a v1 blob against v2 schema in CI before every release that changes the offseason run model

**Phase that must address it:** Offseason Simulator design phase — the `schemaVersion` pattern must be established before the first run is ever saved to Supabase

---

### Pitfall 8: Content Staleness Creates a Trust Problem Specific to Sports

**What goes wrong:** Basketball IQ content tied to real events ("what the Lakers did in the 2024 offseason," "why this pick-and-roll coverage works against today's lineups") becomes misleading when teams change, players are traded, or strategic trends evolve. Unlike abstract educational content, sports IQ content is falsifiable against current reality — a casual fan knows when the lesson's "current roster" is two years old.

**Why it happens:** Lesson content is created in a burst at launch and then maintained reactively. The "What We Saw" recaps (PROJECT.md) require continuous editorial effort that is easy to underestimate. A static seed of 15–20 lessons is fine at launch; it becomes a liability six months later if nothing has been updated.

**Consequences:**
- A GM IQ lesson on "how to build around a max-contract player" that references a team's current roster becomes wrong after the next trade deadline
- Coach profile data (if hand-curated, per Pitfall 2) becomes stale when coaches are fired or change systems
- Daily challenges that reference recent games stop feeling "daily" if the content pipeline stalls

**Warning signs:**
- No "last reviewed" date field in the lesson CMS
- Coaches listed in the sim who were fired in the previous season
- The gap between lesson creation date and current date exceeds one NBA season

**Prevention:**
- Add a `lastReviewedAt` and `contentLockedToSeason` field to every lesson in the CMS — surface lessons flagged as overdue for review in the admin panel
- Model the offseason sim's coach and roster data as season-versioned: `coaches_2025.json`, `rosters_2025.json` — so updating for a new season is a file swap, not a database migration
- Design "What We Saw" recaps as atomic units with a `publishDate` and `expiresAfter` field — archive them automatically rather than showing stale recaps as current
- Plan the editorial calendar as part of the infrastructure spec: who updates the seed data, how often, and what triggers a review

**Phase that must address it:** Content architecture phase and ongoing — the CMS schema must include staleness management fields before first lesson is authored

---

## Minor Pitfalls

---

### Pitfall 9: The `onAny` Debug Logger in Production Will Log Every WebSocket Event

**What goes wrong:** `socket.onAny((eventName, ...args) => console.log(...))` is registered unconditionally in `socketManager.ts` line 108. With Court Vision's expanded platform, every lesson interaction, daily challenge event, and offseason sim phase event will be logged verbatim to stdout in production — including any user session data, progress payloads, or coach decisions that travel over the socket.

**Prevention:** Gate behind `process.env.NODE_ENV !== 'production'` before any new features emit socket events containing user data. Address in Foundation phase.

---

### Pitfall 10: The Snapshot ID Hardcode Will Corrupt Any Feature That Compares Snapshot Versions

**What goes wrong:** `server/services/handlers.ts` line 203 sets `DraftState.leagueSnapshotId` to the literal string `'snapshot_v1'` regardless of the actual snapshot. If the offseason sim or any data-refresh logic ever compares snapshot IDs to check data freshness, every comparison will evaluate to `'snapshot_v1' === 'snapshot_v1'` regardless of whether the data has changed.

**Prevention:** Pass the real `leagueSnapshot.snapshotId` through to the handler as the TODO comment indicates. Fix in Foundation phase alongside other handler cleanup.

---

### Pitfall 11: Socket.io Client Version Mismatch Will Surface Under Load

**What goes wrong:** Root `package.json` uses `socket.io-client: ^4.8.3`; `client/package.json` uses `^4.6.1`; server uses `socket.io: ^4.7.4`. Minor version differences in Socket.io can cause subtle protocol handshake issues that appear only under certain network conditions or when new features (like connection state recovery, added in 4.6.0) are used.

**Prevention:** Pin all three to a single agreed version. Fix in Foundation phase.

---

### Pitfall 12: Score Guard Masking Root Calculation Error

**What goes wrong:** `server/services/simulation.ts` lines 339–357 contain a "SCORE GUARD" that adds points to the winner after the fact when the base spread + variance produces an incorrect result. This is a symptom patch, not a root fix. When offseason sim coaching hires or player ratings affect spread calculations more aggressively, the underlying negative-spread edge case will appear more frequently.

**Prevention:** Investigate and fix the root `generateGameScores()` calculation so that the winner always has a higher score before the guard runs. Add a test that asserts score consistency for 10,000 generated games across the full rating distribution. Address as part of simulation hardening before offseason sim launch.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation / bug fix | Coaching bug fix applied to auto-sim path only; manual path drifts again | Write the regression test (Pitfall 1) that validates both paths |
| Foundation / bug fix | Quarter coaching fix creates new phase transition bugs | Fix phase state machine tests before wiring events (Pitfall 6) |
| Supabase infrastructure | RLS blocks anonymous users silently | Test three user states before any progress feature ships (Pitfall 5) |
| Supabase infrastructure | Dual-authority state between in-memory and Supabase | Define authority boundary in writing before first Supabase write (Pitfall 3) |
| Data layer / offseason sim | Coach data assumed to exist in API | Treat coach profiles as editorial content, not API data (Pitfall 2) |
| Data layer / offseason sim | stats.nba.com / nba_api breakage or rate limits | Commit `nba-seed.json`; never call live on request path (Pitfall 2) |
| Offseason sim save/resume | Schema evolution breaks saved runs | Add `schemaVersion` before first save is written (Pitfall 7) |
| Core learning system | YouTube clips removed or embed-disabled | Build health-check script and three-state lesson component before first lesson ships (Pitfall 4) |
| Core learning system | Pause-and-predict broken on mobile | Use `seekTo` + `pauseVideo` in `onReady`, not autoplay-then-pause (Pitfall 4) |
| Content and CMS | Lesson content goes stale relative to current NBA | Add `lastReviewedAt` field to CMS schema before first lesson is authored (Pitfall 8) |
| Content and CMS | Coach profiles reference fired coaches | Season-version all coach/roster seed files (Pitfall 8) |
| Daily engagement | Supabase writes silently fail for non-authenticated users | Streak and challenge data must be written only after verifying auth state (Pitfall 5) |

---

## Sources

- nba_api (stats.nba.com wrapper): [github.com/swar/nba_api](https://github.com/swar/nba_api) — MEDIUM confidence (community-maintained; unofficial API)
- Supabase RLS documentation: [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence (official)
- YouTube IFrame Player API reference: [developers.google.com/youtube/iframe_api_reference](https://developers.google.com/youtube/iframe_api_reference) — HIGH confidence (official)
- Supabase anonymous sign-in reference: [supabase.com/docs/reference/javascript/auth-signinanonymously](https://supabase.com/docs/reference/javascript/auth-signinanonymously) — HIGH confidence (official)
- RLS misconfiguration patterns: [prosperasoft.com/blog/database/supabase/supabase-rls-issues/](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) — MEDIUM confidence (verified against official docs)
- Socket.io connection state recovery: [socket.io/docs/v4/connection-state-recovery](https://socket.io/docs/v4/connection-state-recovery) — HIGH confidence (official)
- YouTube embed reliability for education: [medium.com/@hakim.ziad/how-we-safely-embed-youtube-videos-in-educational-websites-c26e5a9817e5](https://medium.com/@hakim.ziad/how-we-safely-embed-youtube-videos-in-educational-websites-c26e5a9817e5) — MEDIUM confidence (practitioner report)
- Supabase RLS security risks (83% misconfiguration stat): [dev.to/fabio_a26a4e58d4163919a53/supabase-security-the-hidden-dangers-of-rls](https://dev.to/fabio_a26a4e58d4163919a53/supabase-security-the-hidden-dangers-of-rls-and-how-to-audit-your-api-29e9) — MEDIUM confidence (community, corroborated by official docs)
- Gamification pitfalls (pointsification, tacking-on): [elearningindustry.com/gamification-in-learning-enhancing-engagement-and-retention-in-2025](https://elearningindustry.com/gamification-in-learning-enhancing-engagement-and-retention-in-2025) — MEDIUM confidence (domain-general)
- Codebase-specific findings: `.planning/codebase/CONCERNS.md` (2026-03-09 audit) — HIGH confidence (direct code analysis)
