---
schemaVersion: 1
healthScore: 84
statusLabel: "front-office rules engine expanding"
nextStep: "Extend the trade engine with advanced CBA edge cases, trade-exception accounting, pick-swap validation, and rollback-safe execution."
blockers:
  - "Live Supabase verification for account-upgrade continuity and second-device sync is still pending."
lastUpdated: "2026-07-02"
quality:
  format: unknown
  lint: pass
  typecheck: pass
  tests: pass
  smoke: unknown
  deadCode: warning
tags:
  - basketball
  - education
  - react
  - express
  - socketio
---

## Summary

Bballedu is the Court Vision monorepo, now moving from a simplified offseason simulator toward a near-real front-office offseason simulator with the transaction preview validator covering salary matching, apron restrictions, and Stepien/protection checks before execution.

## Context

The repo has active planning in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`. Current branch is `codex/live-ui-refresh-shell-port`. The stack is a React frontend plus Express/Socket.io backend with shared TypeScript types. The front-office offseason simulator direction is captured in `docs/superpowers/specs/2026-05-14-front-office-offseason-simulator-design.md`. The first executable foundation plan in `docs/superpowers/plans/2026-05-14-front-office-foundation.md` is implemented through shared domain types, 2026 CBA constants/citations, validation result helpers, complete dataset fixtures, and a strict league dataset validator. The live Court Vision UI refresh now includes the draft simulator entry flow and offseason simulator phase pages through a shared shell/token system.

On 2026-06-11, the first transaction-graph legality preview path was added on top of the front-office foundation. Shared front-office contracts now include directed transaction graph movements and preview/delta output. The server owns `/api/front-office/transactions/preview`, backed by `validateTransactionGraph`, which validates the supplied league dataset first and then fails closed on malformed graph shape, missing references, player trade-date restrictions, encumbered or mis-owned draft assets, cash-limit violations, and post-trade standard roster overages. On 2026-06-12, that validator expanded to cover over-cap salary matching, first/second-apron restrictions, hard caps, Stepien rolling future-first coverage, and protected-pick conversion fallback validation. This is preview-only; it does not execute or persist league-state mutations.

## Risks

The main remaining product risk is scope control: the near-real offseason simulator spans league data, CBA validation, transactions, draft, free agency, and UI. The completed foundation lowers risk by establishing shared types, CBA constants/citations, and strict dataset validation before transaction or UI work. Live Supabase verification for account upgrade and second-device sync is still pending, and Knip reports a broad dead-code backlog that needs a separate cleanup pass.

The transaction preview path deliberately does not yet implement sign-and-trade/base-year/minimum-salary special cases, generated/consumed trade exception accounting, swap-right conveyance validation, counterparty acceptance, or rollback-safe execution. Those remain the next CBA-rule slices before UI replacement.

## Quality Ladder Notes


On 2026-05-14, the near-real front-office offseason simulator design and first foundation implementation plan were committed. No code execution was required for the plan-only update.

On 2026-05-14, the front-office foundation slice was implemented with shared domain types, versioned CBA constants/citations, validation helpers, a complete 30-team fixture builder, and strict dataset validation. Focused shared/server CBA tests passed, plus `pnpm typecheck` and `pnpm build`; the build still reports the existing Vite chunk-size warning.

On 2026-06-11, the transaction graph preview slice passed `pnpm typecheck`, `pnpm test`, `pnpm --dir server lint`, and `pnpm build`; the build still reports the existing Vite chunk-size warning.

On 2026-06-12, the transaction legality expansion passed `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; the build still reports the existing Vite chunk-size warning. `pnpm audit:dead-code` still fails on the known broad Knip backlog. No formatter or browser smoke command was run for this backend-only slice.

On 2026-07-02, QR triage added root `format` and `pre-pr` scripts plus `.quality-runner.toml` to exclude the local `.venv-nba` dependency environment from QR structural scans. Quality Runner 0.2.1 run `triage-20260702-Bballedu` reports no missing repo-owned capabilities and remains `planned` because broad structural findings remain. Direct `pnpm format` verification was blocked by pnpm dependency build approval for `esbuild` after dependency restoration.

## Recent Documentation Updates

- 2026-05-18: Added or expanded README coverage for project and subproject roots so workspace documentation inventory is complete.
- 2026-05-19: Converted workspace dependency management to pnpm-only: root workspace discovery now relies on `pnpm-workspace.yaml`, internal shared package links use `workspace:*`, `package-lock.json` was removed in favor of `pnpm-lock.yaml`, and setup/deployment/data runbooks now use pnpm commands. Verified `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- 2026-05-19: Ported the refreshed Court Vision shell and token-backed simulator panels into `/draft-sim` plus all offseason simulator phase pages, including shared notices, action styles, controls, and phase navigation. Verified `pnpm --dir client typecheck`, `pnpm --dir client lint`, `pnpm --dir client build`, and in-app browser smoke checks for `/draft-sim` and `/offseason/team-context`.
- 2026-06-11: Added `docs/superpowers/plans/2026-06-11-front-office-transaction-preview.md` to record the preview-only transaction graph slice and its current boundaries.
- 2026-06-12: Updated the front-office transaction preview plan, roadmap, and state files for salary matching, apron, Stepien, and protected-pick validation coverage.
- 2026-07-02: Recorded QR triage gate coverage and remaining broad structural-debt classification.

## QR Remediation Planning

## QR Remediation Planning

- 2026-07-04: Added GSD Phase 15 for QR remediation from qr-fleet-continue-20260704-bballedu; 2 plan(s) created from bballedu.md. Execution has not started.
