---
schemaVersion: 1
healthScore: 82
statusLabel: "stabilizing"
nextStep: "Continue the front-office transaction graph work after the live Court Vision shell refresh for draft and offseason entry paths."
blockers:
  - "Live Supabase verification for account-upgrade continuity and second-device sync is still pending."
lastUpdated: "2026-05-19"
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

Bballedu is the Court Vision monorepo, now moving from a simplified offseason simulator toward a near-real front-office offseason simulator with the first rules/data foundation slice implemented.

## Context

The repo has active planning in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`. Current branch is `codex/live-ui-refresh-shell-port`. The stack is a React frontend plus Express/Socket.io backend with shared TypeScript types. The front-office offseason simulator direction is captured in `docs/superpowers/specs/2026-05-14-front-office-offseason-simulator-design.md`. The first executable foundation plan in `docs/superpowers/plans/2026-05-14-front-office-foundation.md` is implemented through shared domain types, 2026 CBA constants/citations, validation result helpers, complete dataset fixtures, and a strict league dataset validator. The live Court Vision UI refresh now includes the draft simulator entry flow and offseason simulator phase pages through a shared shell/token system.

## Risks

The main remaining product risk is scope control: the near-real offseason simulator spans league data, CBA validation, transactions, draft, free agency, and UI. The completed foundation lowers risk by establishing shared types, CBA constants/citations, and strict dataset validation before transaction or UI work. Live Supabase verification for account upgrade and second-device sync is still pending, and Knip reports a broad dead-code backlog that needs a separate cleanup pass.

## Quality Ladder Notes

For the corrected visual refresh slice, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passed on 2026-04-30. A production preview screenshot smoke check passed and confirmed Tailwind now compiles into a normal CSS bundle (`41.66 kB`, up from the broken `1.29 kB` output). A follow-up browser screenshot reproduced the bad giant-icon render on a stale `localhost:3000` Vite process; restarting that dev server and re-screenshotting `localhost:3000` showed the corrected shell/homepage render. The build reports the existing Vite chunk-size warning for the client bundle. `pnpm audit:dead-code` failed with the known broad Knip backlog, including the intentionally unintegrated `UI-Refresh/` reference export, so dead-code status remains warning. On 2026-05-13, `pnpm dev` was corrected to run both client and server, Vite was locked to port 3000 so it cannot steal the API port, and the Offseason Team Context teams API was verified locally.

On 2026-05-14, the near-real front-office offseason simulator design and first foundation implementation plan were committed. No code execution was required for the plan-only update.

On 2026-05-14, the front-office foundation slice was implemented with shared domain types, versioned CBA constants/citations, validation helpers, a complete 30-team fixture builder, and strict dataset validation. Focused shared/server CBA tests passed, plus `pnpm typecheck` and `pnpm build`; the build still reports the existing Vite chunk-size warning.

## Recent Documentation Updates

- 2026-05-18: Added or expanded README coverage for project and subproject roots so workspace documentation inventory is complete.
- 2026-05-19: Converted workspace dependency management to pnpm-only: root workspace discovery now relies on `pnpm-workspace.yaml`, internal shared package links use `workspace:*`, `package-lock.json` was removed in favor of `pnpm-lock.yaml`, and setup/deployment/data runbooks now use pnpm commands. Verified `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- 2026-05-19: Ported the refreshed Court Vision shell and token-backed simulator panels into `/draft-sim` plus all offseason simulator phase pages, including shared notices, action styles, controls, and phase navigation. Verified `pnpm --dir client typecheck`, `pnpm --dir client lint`, `pnpm --dir client build`, and in-app browser smoke checks for `/draft-sim` and `/offseason/team-context`.
