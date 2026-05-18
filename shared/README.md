# @nba-draft-sim/shared

Shared package for Bballedu cross-app contracts, schemas, and reusable TypeScript modules.

## Scope

This README documents the `shared` subproject inside `Bballedu`.

## Repository Layout

- `index.ts` - project file.
- `package.json` - JavaScript package metadata and scripts.
- `schemas.ts` - project file.
- `src/` - source code and package internals.
- `tsconfig.json` - project file.
- `types.ts` - project file.
- `utils.test.ts` - project file.
- `utils.ts` - project file.
- `vitest.config.ts` - project file.

## Common Commands

- `pnpm build` - `tsc`
- `pnpm typecheck` - `tsc --noEmit`
- `pnpm test` - `vitest`

## Development Notes

Use `pnpm` from the containing workspace to install dependencies and run scripts.

## Verification

Run the relevant test script listed above before changing behavior.
