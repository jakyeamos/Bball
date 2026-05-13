---
schemaVersion: 1
healthScore: 82
statusLabel: "stabilizing"
nextStep: "Continue the UI-first refresh across library, track, profile, draft, and offseason surfaces now that the local dev workflow starts both Vite and the API."
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

Bballedu is the Court Vision monorepo, now using a corrected UI-first visual refresh foundation and a pnpm local dev entrypoint that starts both the React client and Express API.

## Context

The repo has active planning in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`. Current branch is `feat/organize-monorepo-17131035614459335105`. The stack is a React frontend plus Express/Socket.io backend with shared TypeScript types. The corrected refresh slice adds the missing client PostCSS/Tailwind pipeline, maps refresh tokens into the live Tailwind theme, and rebuilds the shell/sidebar/homepage around the UI-Refresh structure while preserving existing route targets and feature flags. The root `pnpm dev` command now runs both Vite and the API server so API-backed pages such as Offseason Team Context do not fail when only the client is started.

## Risks

The main remaining product risk is refresh consistency: the shell and homepage now follow the new direction, but library, track, profile, draft, and offseason screens still need the same UI-first treatment. Live Supabase verification for account upgrade and second-device sync is still pending, and Knip reports a broad dead-code backlog that needs a separate cleanup pass.

## Quality Ladder Notes

For the corrected visual refresh slice, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passed on 2026-04-30. A production preview screenshot smoke check passed and confirmed Tailwind now compiles into a normal CSS bundle (`41.66 kB`, up from the broken `1.29 kB` output). A follow-up browser screenshot reproduced the bad giant-icon render on a stale `localhost:3000` Vite process; restarting that dev server and re-screenshotting `localhost:3000` showed the corrected shell/homepage render. The build reports the existing Vite chunk-size warning for the client bundle. `pnpm audit:dead-code` failed with the known broad Knip backlog, including the intentionally unintegrated `UI-Refresh/` reference export, so dead-code status remains warning. On 2026-05-13, `pnpm dev` was corrected to run both client and server, Vite was locked to port 3000 so it cannot steal the API port, and the Offseason Team Context teams API was verified locally.
