# CLAUDE.md — Court Vision (Bball)

## Constraints

- **Supabase:** All calls must have local fallback — offline/local-first is a hard requirement for MVP. App must run without Supabase configured.
- **Types:** Shared TypeScript types go in `shared/` — never duplicate between client and server. Socket events defined in `shared/` types; handlers in `server/managers/`.
- **Architecture:** Read `.planning/PROJECT.md`, `ROADMAP.md`, and `REQUIREMENTS.md` before adding features or changing architecture.
- `main` must run locally with or without Supabase configured.

## References

- Stack, commands, full conventions: `.planning/PROJECT.md`
- Vault: `[[03 Projects/Bball]]`
