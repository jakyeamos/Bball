# Court Vision

A free, web-first basketball IQ training platform that teaches users to see the game like a player, coach, and GM.

## Packages

- `client`: React 18 frontend
- `server`: Node.js + Express 4 + Socket.io 4 backend
- `shared`: Shared TypeScript types and schemas

## Getting Started

Install dependencies at the root:

```
npm install
```

Run client and server concurrently:

```
npm run dev
```

## Planning

Project planning lives in `.planning/`:

- `PROJECT.md` — vision, requirements, key decisions
- `ROADMAP.md` — 10-phase build plan
- `REQUIREMENTS.md` — full v1 requirement list with traceability
- `research/` — stack, features, architecture, and pitfalls research
- `codebase/` — existing codebase map

## Current Status

Existing foundation (validated):
- Real-time multiplayer draft simulation (WebSocket)
- Monte Carlo simulation engine: 30 player features, 13 archetypes
- Regular season + playoff bracket simulation
- Snake draft with timer, auto-pick, commissioner controls
- Session management (cookie-based, no accounts required)

Next up: Phase 1 — Foundation and Bug Fixes (`/gsd:plan-phase 1`)
