---
schemaVersion: 1
healthScore: 82
statusLabel: "stabilizing"
nextStep: "Redesign the main product journey around learn, daily rep, draft/offseason application, and recap/profile."
blockers:
  - "Live Supabase verification for account-upgrade continuity and second-device sync is still pending."
lastUpdated: "2026-04-30"
quality:
  format: unknown
  lint: pass
  typecheck: pass
  tests: pass
  smoke: pass
  deadCode: warning
tags:
  - basketball
  - education
  - react
  - express
  - socketio
---

## Summary

Bballedu is the Court Vision monorepo, now stabilized around a working Draft Sim entry path, consistent runtime URL plumbing, demo-only prototype social data, and restored lint/type/test/build/smoke gates.

## Context

The repo has active planning in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`. Current branch is `feat/organize-monorepo-17131035614459335105`. The stack is a React frontend plus Express/Socket.io backend with shared TypeScript types. Draft Sim public CTAs now enter `/draft-sim`; `/draft` is reserved for active draft state.

## Risks

The main remaining product risk is journey clarity: learn, daily challenge, draft/offseason application, and recap/profile exist but still need an intentional next-step system. Live Supabase verification for account upgrade and second-device sync is still pending.

## Quality Ladder Notes

`npm run lint && npm run typecheck && npm test && npm run build && npm run smoke` passed on 2026-04-30. The build reports a Vite chunk-size warning for the client bundle. No Knip/dead-code config exists, so dead-code status is warning; obvious unrouted broken client pages/components were removed during this pass.
