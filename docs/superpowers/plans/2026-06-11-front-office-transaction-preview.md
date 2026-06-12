# Front-Office Transaction Graph Preview Plan

**Goal:** Add the first preview-only transaction legality path on top of the existing front-office shared schema, 2026 CBA constants/citations, and strict league dataset validator.

**Status:** Implemented 2026-06-11; expanded 2026-06-12.

## Scope

- Extend shared front-office contracts with directed transaction graph movements.
- Return preview output as structured validation report, team deltas, citations, and suggested fixes.
- Validate the complete league dataset before any transaction-specific ruling.
- Fail closed on first-slice legality blockers:
  - graph shape and participating-team references
  - player contract/team/active-roster references
  - player trade eligibility and recently traded date restrictions
  - draft asset ownership and encumbrance
  - cash sent/received limits
  - standard roster limit after player movements
  - exception ownership and available amount
- Fail closed on second-slice legality blockers:
  - over-cap trade salary matching using 2026 CBA traded-player exception constants
  - first-apron teams taking back more salary than they send
  - second-apron teams sending cash or aggregating outgoing player salary
  - first- and second-apron hard-cap breaches
  - Stepien rolling two-year future first-round coverage
  - protected-pick conversion fallback ownership/tradeability
- Expose a server-owned preview endpoint at `/api/front-office/transactions/preview`.

## Out Of Scope

- Transaction execution or league-state mutation.
- Rollback-safe persistence and transaction log writes.
- Counterparty acceptance or strategy evaluation.
- Minimum-salary, sign-and-trade, base-year compensation, and post-regular-season special salary treatment.
- Full multi-team generated/consumed trade exception accounting.
- Swap-right and multi-hop conveyance chains beyond protected-pick conversion fallback checks.
- Front-office UI.

## Files

- `shared/src/offseason/frontOffice/schema.ts`
- `shared/src/offseason/frontOffice/schema.test.ts`
- `server/src/offseason/cba/citations/2026.ts`
- `server/src/offseason/cba/validateTransactionGraph.ts`
- `server/src/offseason/cba/validateTransactionGraph.test.ts`
- `server/src/routes/frontOfficeTransactions.ts`
- `server/index.ts`

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm --dir server lint`
- `pnpm build`
- `pnpm audit:dead-code`

2026-06-12 verification: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. Build passed with the existing Vite chunk-size warning. `pnpm audit:dead-code` still fails on the known broad Knip backlog outside this slice.

## Next Slice

Expand `validateTransactionGraph` into sign-and-trade/base-year/minimum-salary special cases, generated/consumed trade exception accounting, swap-right conveyance validation, and rollback-safe execution.
