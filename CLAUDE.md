# CLAUDE.md — Court Vision (Bball)

## Project Overview

Basketball IQ training platform. Teaches users to see basketball from player, coach, and GM perspectives through interactive draft simulations, daily challenges, and learning tracks. Multiplayer via WebSocket; no account required for MVP.

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router v6, TanStack React Query v5, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express 4, Socket.io 4, TypeScript
- **Persistence:** Supabase (optional, graceful fallback); cookie-based sessions (no auth for MVP)
- **Stats:** Python scraper (`nba-api`) for player data
- **Monorepo:** npm workspaces (client, server, shared)

## Key Commands

```bash
npm run dev        # client only (Vite, port 3000)
npm run build      # shared → client → server
npm start          # Express server (port 3001)
npm test           # run tests

# Python stats scraper (optional)
python scripts/scrape_stats.py
```

## Architecture

```
client/src/
├── pages/          # Full page components (draft, learning, daily, profile, admin)
├── features/       # Feature-level components (draft, learning, lesson, onboarding…)
├── components/     # Reusable UI primitives
├── context/        # AppContext (global state)
├── services/       # API client, WebSocket handlers
└── lib/            # Utilities

server/
├── managers/       # WebSocket & session mgmt (socket, lobby, draftState, timers, trades)
├── services/       # Core logic:
│   ├── simulation.ts    # Monte Carlo draft engine (30 features, 13 archetypes)
│   ├── aggregation.ts   # Team composition analytics
│   ├── draftState.ts    # Draft state machine
│   └── archetypes.ts    # Player archetype definitions
├── src/routes/     # REST API endpoints
└── data/           # Player stats, NBA identity cache

shared/             # Types, schemas, utils, feature flags — used by both sides
```

## Planning Docs

`.planning/` contains the authoritative design docs:
- `PROJECT.md` — vision, requirements, key decisions
- `ROADMAP.md` — 10-phase build plan
- `REQUIREMENTS.md` — v1 requirements with traceability

Read these before adding features or changing architecture.

## Conventions

- Shared TypeScript types go in `shared/` — never duplicate between client and server
- Feature flags in `shared/` config — gate unfinished work behind flags, don't branch
- Socket events defined in `shared/` types; handlers in `server/managers/`
- Supabase calls must have local fallback — offline/local-first is a hard requirement for MVP
- CORS allows `localhost:3000` and Vercel preview/prod deployments

## Git

- Feature branches per roadmap phase
- `main` must run locally with or without Supabase configured
