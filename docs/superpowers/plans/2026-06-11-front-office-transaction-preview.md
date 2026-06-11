# Front-Office Transaction Graph Preview Plan

**Goal:** Add the first preview-only transaction legality path on top of the existing front-office shared schema, 2026 CBA constants/citations, and strict league dataset validator.

**Status:** Implemented 2026-06-11.

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
- Expose a server-owned preview endpoint at `/api/front-office/transactions/preview`.

## Out Of Scope

- Transaction execution or league-state mutation.
- Rollback-safe persistence and transaction log writes.
- Counterparty acceptance or strategy evaluation.
- Full salary matching.
- First-apron and second-apron trade restrictions.
- Aggregation limits.
- Stepien, pick protections, swaps, and conveyance chains beyond current owner/encumbrance checks.
- Sign-and-trades and generated/consumed trade exceptions.
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

Build passed with the existing Vite chunk-size warning.

## Next Slice

Expand `validateTransactionGraph` with full trade salary matching, apron restrictions, aggregation restrictions, and Stepien/protection-aware pick validation before adding execution.
