---
phase: 01-foundation-and-bug-fixes
plan: 04
subsystem: ui
tags: [react, tailwind, react-router-dom, homepage, navigation]

# Dependency graph
requires:
  - phase: 01-03
    provides: cv- design tokens in tailwind.config.js (bg-cv-navy, bg-cv-steel, text-cv-chalk, bg-cv-accent, etc.)
provides:
  - Court Vision three-lane homepage at route /
  - NavBar component with links to all three role lenses and /lobby
  - LobbyPage moved to /lobby; GameRouting unchanged
affects:
  - phase-02-and-beyond (NavBar is the top-level shell for all future pages)
  - 01-05 (App.tsx routing baseline now set; further route additions go into existing structure)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Static JSX-only page component with no useState/useEffect
    - Named export pattern for pages and components (export function HomePage, export function NavBar)
    - react-router-dom Link for SPA navigation; plain <a href="#anchor"> for same-page scroll targets
    - NavBar rendered above Routes in App.tsx layout wrapper for global persistence

key-files:
  created:
    - client/src/pages/HomePage.tsx
    - client/src/components/NavBar.tsx
  modified:
    - client/src/App.tsx

key-decisions:
  - "NavBar uses react-router-dom Link (not <a>) for all navigation including hash anchors, so SPA routing handles scroll"
  - "Player IQ and Coach IQ CTA buttons use href='#player-iq'/'#coach-iq' as placeholders — future routes not yet defined"
  - "GM IQ CTA links directly to /lobby as the existing draft sim entry point"
  - "No hamburger menu on mobile — four nav links fit inline; defer responsive menu to future phase"

patterns-established:
  - "Static content pages: pure JSX, no hooks, no API calls — use only cv- Tailwind tokens"
  - "App layout shell: bg-cv-navy wrapper > NavBar > Routes (NavBar always present)"

requirements-completed:
  - FOUND-05
  - FOUND-06

# Metrics
duration: 10min
completed: 2026-03-10
---

# Phase 1 Plan 4: Homepage and NavBar Summary

**Three-lane Court Vision homepage with sticky NavBar wired into App.tsx routing — LobbyPage moved to /lobby, all cv- design tokens applied**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-10T20:00:00Z
- **Completed:** 2026-03-10T20:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created HomePage.tsx with hero section and three role-lens lane cards (Player IQ, Coach IQ, GM IQ), each with id attributes for anchor navigation
- Created NavBar.tsx with brand wordmark and four nav links (Player IQ, Coach IQ, GM IQ as hash anchors; Draft Sim to /lobby)
- Updated App.tsx to route / to HomePage, move LobbyPage to /lobby, and render NavBar in the global layout wrapper

## Task Commits

1. **Task 1: Build HomePage with three role-lens lanes** - `094ed16` (feat)
2. **Task 2: Build NavBar and wire App.tsx routing** - `65cd654` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `client/src/pages/HomePage.tsx` - Static three-lane homepage: hero + Player IQ, Coach IQ, GM IQ cards with cv- tokens
- `client/src/components/NavBar.tsx` - Sticky top nav with brand wordmark and four links
- `client/src/App.tsx` - Route / → HomePage, /lobby → LobbyPage; NavBar rendered above Routes

## Decisions Made

- NavBar links to /#player-iq, /#coach-iq, /#gm-iq use react-router-dom Link (not native `<a>`), which is consistent with SPA patterns and handles scroll via browser hash behavior
- Player IQ and Coach IQ CTAs are labeled "Coming Soon" with self-referencing href anchors since those routes don't exist yet
- No mobile hamburger menu — the four links fit inline on most viewports; deferred to a future phase

## Deviations from Plan

None — plan executed exactly as written. All files already existed as partially committed work from the current session; they were staged and committed as proper atomic task commits.

## Issues Encountered

None — build passed on first attempt with no TypeScript errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Route structure is set: / → HomePage, /lobby → LobbyPage, all other game routes unchanged
- NavBar is the persistent shell for all future pages — future phases can add links to it
- Player IQ and Coach IQ lanes are placeholders; Phase 4 (Lesson Components) will add real routes
- Ready for Plan 05 (final Phase 1 plan)

---
*Phase: 01-foundation-and-bug-fixes*
*Completed: 2026-03-10*
