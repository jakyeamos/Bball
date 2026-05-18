# Basketball IQ Training Platform UI Refresh

Standalone Vite/React UI refresh prototype for Bballedu. It contains the imported design implementation, UI component dependencies, and local Vite build configuration used to evaluate the refreshed basketball IQ training experience.

## Scope

This README documents the UI refresh prototype under `Bballedu/UI-Refresh`. Treat it as a design implementation workspace, not the canonical Bballedu client package.

The package is marked private in `package.json`, so it is intended for local workspace use rather than package publishing.

## Repository Layout

- `ATTRIBUTIONS.md` - project file.
- `default_shadcn_theme.css` - project file.
- `index.html` - project file.
- `package.json` - package metadata and scripts.
- `pnpm-workspace.yaml` - project file.
- `postcss.config.mjs` - project file.
- `src/` - source code and React app internals.
- `vite.config.ts` - Vite configuration.

## Common Commands

- `pnpm build` - `vite build`
- `pnpm dev` - `vite`

## Development Notes

Key runtime dependencies include `@emotion/react`, `@emotion/styled`, `@mui/icons-material`, `@mui/material`, `@popperjs/core`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, and others.
Use `pnpm` from this directory or the containing workspace to install dependencies and run scripts.

## Verification

Run `pnpm build` before treating UI changes as ready.
