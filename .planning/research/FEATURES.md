# Feature Landscape

**Domain:** Basketball IQ / Sports Education / Interactive Learning Platform
**Project:** Court Vision
**Researched:** 2026-03-09
**Overall confidence:** HIGH (primary features), MEDIUM (competitive benchmarks)

---

## Comparable Platforms Analyzed

| Platform | Category | What It Does Well | Where It Fails for Casual Fans |
|----------|----------|-------------------|-------------------------------|
| HooperIQ | Basketball IQ quiz app | Shot-clock decision pressure, film pause-and-predict, "Duolingo of Basketball" positioning | Player-focused (skill execution), not fan/GM/coach perspective; app-only; paywalls core features |
| Duolingo | Language learning | Streak mechanics, bite-sized sessions, separated streak goal from daily goal, 600+ streak experiments | Gamification can create psychological fatigue; XP complexity confused early users |
| Hudl | Professional film analysis | Tag/clip/note system, filterable data linked to video, seamless film sharing | Designed for coaches/teams, not fans; requires upload access; steep learning curve |
| The Athletic | Sports journalism | Writer-following, fan grading interactives, NBA highlights embedded in articles | Passive consumption, no structured learning or IQ progression |
| Basketball GM / ZenGM | GM simulator | Free/no-account-required, decision depth without micromanagement, accessible franchise logic | No teaching layer, no real names (licensing), no role-lens education |
| FiveThirtyEight | Data journalism | Clean sports data as storytelling foundation, interactive charts, transparency in methodology | Archived/defunct; never had structured curriculum or progression |
| NBA.com / Second Spectrum | Pro coaching tools | Play-level tagging, machine-indexed video, off-ball metrics | Enterprise cost, requires proprietary tracking data, not designed for fans |

---

## Table Stakes

Features users expect in this category. Missing any of these and users leave or don't return.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured lesson units | Every learning platform (Duolingo, Khan Academy, Coursera) sets this expectation. Users expect discrete, completable units. | Medium | Each lesson needs: title, role lens, difficulty tag, media embed, takeaway, one interactive moment |
| Video/film integration | Sports education without video is abstract. HooperIQ, Hudl, and The Athletic all center video. | Low (YouTube embeds) | YouTube embeds satisfy v1. Timestamped links with annotations are the actual complexity. |
| Bite-sized session length | Duolingo's core insight: 5-10 minutes per session drives retention far better than long-form. Attention is the constraint. | Low (authoring discipline) | Each lesson should be completable in under 10 minutes. Length is a content authoring constraint, not a technical one. |
| Clear role/topic categorization | Users need to know "what is this teaching me and why does it matter to me." Court Vision has three lenses (Player/Coach/GM IQ). | Low | Three lenses are pre-defined. Subcategory tags per lens are the necessary refinement. |
| Progress indication | Completion percentage, lessons done, lessons remaining. Users abandon platforms that make them feel lost. | Low | Per-lens progress bars and total completion. No need for complex dashboards initially. |
| Daily engagement hook | Duolingo's research: 7-day streaks make users 2.4x more likely to return the next day. Single daily action is sufficient. | Medium | Streak tracking + daily challenge. Streak freeze mechanic prevents frustration-driven drop-off. |
| Search and filter in content library | Users scanning a growing library need to find what's relevant. Standard expectation from any content platform. | Medium | Filter by: role lens, subcategory, difficulty, format (video/scenario/quiz). Dynamic result counts on filter changes. |
| Explanation-first feedback | After any prediction/quiz answer, users expect "here's why" not just "correct/incorrect." Without explanation, IQ doesn't grow. | Medium | Required on every pause-and-predict interaction. Tied to lesson authoring. |
| Mobile-responsive web experience | Not a native app requirement but web must work on phone. The Athletic, HooperIQ both confirm mobile as primary consumption context for sports content. | Medium | Tailwind CSS handles responsive layout. Card-based lesson design is naturally mobile-friendly. |
| Anonymous access (no forced account) | Basketball GM, HooperIQ free tier, and Duolingo all allow starting without signup. Forced registration kills top-of-funnel. | Low | localStorage for anonymous progress. Account creation unlocks sync/leaderboard only. |

---

## Differentiators

Features that give Court Vision competitive advantage. Not expected by the market, but valued and sticky when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Three-lens role framing (Player / Coach / GM) | No competitor teaches basketball IQ from all three perspectives in one platform. HooperIQ is player-focused. Hudl is coach-focused. Nothing serves GM perspective for fans. | Medium | Lesson card system, onboarding path routing | The framing IS the product differentiation. Every piece of content needs a lens assignment at authoring time. |
| Pause-and-predict film interactions | HooperIQ does shot-clock quizzes. Court Vision's version pauses real NBA film at a decision moment and asks the user to predict the correct read BEFORE seeing the outcome. This is the testing effect — prediction improves retention more than watching. | High | YouTube embed API, interaction state machine, explanation reveal component | Requires precise timestamp control. Research confirms prediction before reveal outperforms immediate feedback. |
| Process-based scoring (not just right/wrong) | Most quiz platforms score correct answers. Court Vision scores decision-making process — partial credit for choosing a play that was wrong outcome but right reasoning. This mirrors how coaches evaluate players. | High | Scenario simulation engine, answer-key CMS config | Major differentiator but high authoring complexity. The answer-key must capture multiple valid approaches, not just one correct answer. |
| NBA Offseason Simulator as GM capstone | No consumer platform lets a fan genuinely simulate a real NBA team's offseason (real coaches, real players, real draft picks) with educational framing. Basketball GM uses fictional players. NBA 2K has franchise mode but no teaching layer. | Very High | BallDontLie API, save/resume system, Supabase persistence, draft engine | The 7-phase loop (team context → coaching market → scouting/pre-draft → trade market → draft night → free agency → recap) is a full product unto itself. Must be positioned as the "after you've learned" capstone, not the entry point. |
| Role-lens-aware skill profile | Rather than a generic "you completed X lessons," the profile surfaces: "Your Coach IQ is strong. Your GM IQ understanding of asset valuation is weak. Try these next." Actionable gap analysis tied to role lens. | High | Progress tracking, Supabase schema, lesson tagging taxonomy | Requires sufficient lesson taxonomy depth to generate meaningful recommendations. Empty early — needs 20+ lessons before profile is useful. |
| "What We Saw" NBA news-to-lesson bridge | Connecting current NBA events to lessons ("Damian Lillard's trade request exemplifies the lesson on player leverage in CBA negotiations"). Turns content fresh without constant new lesson authoring. | Medium | Content library, admin CMS, NBA news awareness | This is a content authoring pattern, not a technical feature. Low technical complexity, high editorial complexity. |
| Shareable daily challenge result cards | Wordle proved this: a shareable result card is a zero-cost acquisition loop. Users share their score, friends click, frictionless entry. | Low | Daily challenge system, OG image generation | Generate static image cards (og:image) at the time of challenge completion. No complex sharing infrastructure needed. |
| Teaching layer inside draft simulator | Post-draft analysis: what you got right, what you missed, which process mistakes mattered. Converts an existing game into an IQ classroom. | Medium | Existing draft engine, lesson taxonomy tags mapped to draft decisions | Depends on draft sim stability. Requires post-draft analysis logic and explanation copy for each archetype/decision type. |

---

## Anti-Features

Features to deliberately NOT build. These are either explicitly out of scope per the PRD, or research indicates they actively harm the target user experience.

| Anti-Feature | Why Avoid | What to Do Instead | Source of Insight |
|--------------|-----------|-------------------|-------------------|
| Full gamification economy (XP, loot boxes, rank ladders, complex point systems) | Duolingo research found XP-tied streaks confused users. Deep gamification economies create psychological fatigue, particularly for casual users. They shift focus from learning to gaming the system. | Streaks (binary: done or not), light badges for meaningful milestones, no XP accumulation | Duolingo's own streak redesign removed XP coupling; research on gamification fatigue |
| Social feeds, upvoting, hot-take debate layer | "User-vs-user debate products — arguing is not learning." Sports social media is already dominated by takes. Court Vision's value is structured education, not Twitter-with-scores. | Low-tech discussion board scoped to lesson-specific comments only. No hot/trending/upvote mechanics. | PRD explicit out-of-scope; The Athletic's lesson that writer-reader connection beats social debate |
| Native mobile apps (iOS/Android) | Web-first is the right v1 call. Native apps require separate codebases, app store approval, increased maintenance burden, and delay learning value delivery. Mobile-responsive web covers 80% of the use case. | Progressive Web App (PWA) if needed later; optimize mobile-web CSS | PRD explicit; consistent with "extend, don't rebuild" constraint |
| Live game companion mode | High real-time infrastructure complexity. Requires push notifications, live data feeds, sub-second latency. Different product entirely. | "What We Saw" recap after games — same news hook, zero real-time infrastructure | PRD explicit out-of-scope |
| Perfect CBA / salary-cap simulation in offseason sim v1 | The real CBA is a 600-page document. Replicating it exactly is a multi-year engineering project. It also confuses casual fans more than it educates them. | Simplified-but-realistic spending constraints that capture the spirit of decisions (max contracts, mid-level exception, hard cap behavior) without legalese | PRD explicit; Basketball GM succeeds precisely because it abstracts cap details |
| Multi-year franchise / continuity mode in offseason sim v1 | Save/resume for a single offseason is already required infrastructure. Multi-year continuity multiplies state management complexity by an order of magnitude. | Single offseason runs. Scope creep here delays the core learning platform by months. | PRD explicit out-of-scope |
| User-generated lesson creation | UGC quality control is a product in itself. Early content quality is critical to establish trust. Inconsistent quality undermines the "education first" positioning. | Admin CMS-created content only in v1. Expand contributor model post-product-market-fit validation. | PRD explicit; consistent with content trust requirement |
| Full film annotation tooling for end users | Hudl-style annotation (tagging clips, drawing on frames, sharing playlists) requires significant video infrastructure investment. Fans don't need to create film breakdowns — they need to understand them. | Admin CMS creates timestamped annotations. Users interact with pre-authored breakdowns. | PRD explicit; Hudl is a B2B product, Court Vision is B2C |
| Paid expert marketplace or creator economy | Keeps the platform free and focused. Creator economies fragment content quality and turn the platform into a marketplace management problem. | Free platform, admin-curated content, "What We Saw" editorial layer | PRD explicit |
| Deep analytics dashboards for users | Research shows learners don't want to manage spreadsheets about themselves. Dashboards become guilt-inducing rather than motivating when usage drops. | Practical skill profile: strengths, weaknesses, 2-3 suggested next lessons. Actionable, not comprehensive. | Learning platform UX research consensus |
| Multi-difficulty simulator ladders | Artificial difficulty tiers require parallel content authoring for each tier and obscure whether the user actually learned the concept. | Single difficulty level where realism and contextual ambiguity create authentic challenge. A wrong draft pick feels wrong because basketball is hard, not because a slider was moved. | PRD explicit; Basketball GM's success with single-path realism |
| Fantasy basketball integrations | Different product. Fantasy basketball is about player stats accumulation. Court Vision is about basketball process understanding. The user mindset is different. | The Offseason Simulator scratches the "be the GM" itch more educationally than fantasy. | PRD explicit |

---

## Feature Dependencies

```
Onboarding (team preference, level, goal)
  → Personalized starter module recommendations
  → Benchmark challenge (measures baseline IQ across lenses)
  → Path into content library

Lesson card system (title, lens, difficulty, embed, interaction)
  → Film breakdown pages (lesson variant with timestamped embeds)
  → Pause-and-predict interactions (lesson variant with state machine)
  → Scenario simulations (lesson variant with process scoring)
  → "What We Saw" recaps (lesson variant with news hook)
  → Searchable content library (indexes all lesson metadata)
  → User skill profile (aggregates lesson completion + accuracy by lens/subcategory)
  → Teaching layer in draft simulator (maps draft decisions to lesson taxonomy)

Daily challenge system
  → Streak tracking (requires daily challenge completion tracking)
  → Shareable result cards (requires challenge completion state)
  → Friend leaderboard (requires challenge scores — scope-limited to daily only)

Anonymous progress tracking (localStorage)
  → Optional Supabase account creation
    → Synced skill profile across devices
    → Friend leaderboard access
    → Save/resume for offseason sim runs (REQUIRED — not optional)

Admin CMS
  → All lesson content (no lessons without CMS)
  → Daily challenge scheduling
  → Answer-key configuration for pause-and-predict
  → "What We Saw" editorial publishing

Draft simulator (existing)
  → Teaching layer overlay (new — reads from lesson taxonomy)
  → Post-draft analysis (new — uses existing Monte Carlo engine output)
  → Positioned as capstone after core lesson completion

NBA Offseason Simulator (new, major)
  → BallDontLie API + static seed (real player/team/coach names)
  → Existing Monte Carlo simulation engine (extended for offseason logic)
  → Supabase save/resume (HARD dependency — multi-session runs require persistence)
  → GM lens lesson completion (soft dependency — sim is most meaningful post-learning)
```

---

## MVP Feature Prioritization

### Must Have at Launch (15-20 lessons)

1. **Lesson card system with three role lenses** — core product definition
2. **Film breakdown pages with timestamped YouTube embeds** — primary content format for basketball
3. **Pause-and-predict interactions** — primary differentiator, drives retention via testing effect
4. **Searchable content library** — makes 15-20 lessons feel organized, not random
5. **Anonymous progress tracking** (localStorage) — zero-friction learning wedge
6. **Daily challenge with streak tracking** — daily active user retention loop
7. **Shareable result cards** — acquisition loop at zero infrastructure cost
8. **Onboarding: team preference + level + goal** — routes users to relevant content
9. **Admin CMS: lesson authoring + daily challenge scheduling** — without this, no content exists
10. **Homepage showing all three lenses immediately** — no single-path lock-in

### High Priority (Shortly After Launch)

11. **User skill profile** (requires enough lesson completions to be meaningful — needs 20+ lessons)
12. **Supabase auth + cross-device sync** (optional account upgrade)
13. **Teaching layer in draft simulator** (existing asset, high leverage)
14. **Post-draft analysis** (closes the existing sim's educational loop)

### Defer (Post-PMF Validation)

- **NBA Offseason Simulator** — full 7-phase loop; massive scope; validate lesson platform first
- **Friend leaderboard** — needs user base to be meaningful
- **"What We Saw" recaps** — editorial process dependency; build after content rhythm is established
- **Low-tech discussion board** — needs content density first to give users something to discuss

### Explicitly Deferred (Per PRD)

- Native mobile apps
- Live game companion
- Multi-year franchise mode
- User-generated content
- Creator economy

---

## Feature Complexity Summary

| Feature | Complexity | Primary Constraint |
|---------|------------|-------------------|
| Lesson card component | Low | Content authoring |
| YouTube timestamped embeds | Low | YouTube iframe API |
| Pause-and-predict state machine | High | Interaction design + authoring tooling |
| Process-based scoring | High | Answer-key schema + authoring discipline |
| Admin CMS (custom forms) | Medium | Data model design |
| Daily challenge + streaks | Medium | Scheduling, localStorage state |
| Shareable result cards | Low | OG image generation |
| Searchable content library | Medium | Full-text search + filter UX |
| Anonymous progress (localStorage) | Low | State schema design |
| Supabase auth + sync | Medium | Migration from localStorage schema |
| User skill profile | High | Lesson taxonomy depth + aggregation logic |
| Draft simulator teaching layer | Medium | Lesson taxonomy mapping |
| Post-draft analysis | Medium | Monte Carlo output interpretation |
| NBA Offseason Simulator (7-phase) | Very High | Data layer + save/resume + sim engine extension |
| Onboarding quiz + path routing | Medium | UX flow + content path logic |
| "What We Saw" recaps | Low (tech) / High (editorial) | Content operations |

---

## Sources

- [HooperIQ Platform](https://www.hooperiq.com/) — direct competitor analysis (MEDIUM confidence)
- [Duolingo streak research](https://blog.duolingo.com/improving-the-streak/) — HIGH confidence, official source
- [Duolingo psychology of streaks](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) — HIGH confidence, official source
- [Hudl basketball video analysis](https://www.hudl.com/sports/basketball) — HIGH confidence, official source
- [Interactive video learning research — PMC](https://pmc.ncbi.nlm-nih.gov/articles/PMC11965562/) — HIGH confidence, peer-reviewed
- [Interactive video learning — SpringerOpen](https://slejournal.springeropen.com/articles/10.1186/s40561-016-0033-3) — HIGH confidence, peer-reviewed
- [Gamification trends 2025](https://raccoongang.com/blog/designing-efficient-elearning-gamification/) — MEDIUM confidence, industry
- [Basketball GM (ZenGM)](https://basketball-gm.com/) — HIGH confidence, direct platform analysis
- [Search filter UX best practices — Algolia](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/) — HIGH confidence
- [Onboarding UX best practices 2025](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/) — MEDIUM confidence
- [Gamification anti-patterns — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0378720625000369) — HIGH confidence, academic
- [FiveThirtyEight interactive data journalism](https://fivethirtyeight.com/) — HIGH confidence, direct analysis
- Court Vision PRD (PROJECT.md) — HIGH confidence, primary source
