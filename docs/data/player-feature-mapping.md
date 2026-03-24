# PlayerFeatures mapping (nba_api → 31 core keys)

This document tracks the **explicit bridge** from `server/scripts/scrape_nba_stats.py` JSON (`NbaScraperSeasonStatsRow` in `shared/schemas.ts`) to `PlayerRawStats`, then to `PlayerFeatures` via `buildPlayerFeatures()` in `server/services/features.ts`.

**Code:** `server/services/playerFeaturesMapping.ts`  
**Completeness guard:** `server/services/playerFeaturesMapping.test.ts` asserts every entry in `PLAYER_FEATURES_CORE_KEYS` is finite after mapping.

## Pipeline

1. Python emits season **totals** per player plus league-dash **rate** columns when available (`USG_PCT`, `OREB_PCT`, `DREB_PCT`, `REB_PCT`, `AST_PCT`, `TOV_PCT`).
2. `nbaSeasonJsonRowToPlayerRawStats()` copies totals, derives nothing that the scraper already sends, and passes:
   - `USG_PROXY = USG_PCT / 100` (NBA publishes usage as 0–100).
   - `POSSESSIONS = POSS_EST` with `POSS_EST = max(1, 0.96 * (FGA + 0.44*FTA + TOV - OREB))` from the scraper.
   - `AST_PCT_PROXY` / `TOV_PCT_PROXY` from `AST_PCT` / `TOV_PCT` when present (stored for forward use; primary feature math still follows `features.ts`).
   - `OREB_PCT` / `DREB_PCT` / `REB_PCT` from league-dash when present; else `buildPlayerFeatures` uses `0` via `??` in `features.ts`.
3. `mapSeasonRowToPlayerFeatures(row, roleSummary)` = `buildPlayerFeatures(raw, roleSummary)` — **all formulas and fallbacks** for the 31 `PLAYER_FEATURES_CORE_KEYS` live in `features.ts` (single source of truth).

## Field reference (summary)

| Feature key | Primary raw / derived inputs | Notes |
|-------------|------------------------------|--------|
| R | `GP`, `MP_TOTAL` | Reliability gate |
| TS, THREE_P_PCT, THREE_PA_RATE, TWO_P_PCT, TWO_PA_RATE, FT_PCT, FT_RATE, EFG, THREE_P_VOLUME | FGA, FGM, FG3A, FG3M, FTA, FTM, MIN, GP + role shrink | Per-36 and poss normalization |
| AST, AST_RATE, POTENTIAL_AST, AST_TO_PASS_RATE, SECONDARY_AST, PAR | AST, TOV, passes heuristics | Optional `PASSES_MADE` not in scrape → heuristic |
| TOV, TOV_RATE, A2T | TOV, AST, poss | — |
| STL, BLK, STL_RATE, BLK_RATE | STL, BLK, poss | — |
| DEFLECTIONS, PF_RATE, CHARGES_DRAWN | STL heuristic, PF, CHARGES optional | — |
| OREB_PCT, DREB_PCT, REB_TOTAL | League-dash % or 0; REB / MIN | — |
| USG, VI | `USG_PROXY` or FGA/FTA/TOV/poss; versatility heuristic | — |

Full per-line comments remain in `server/services/features.ts`.

## Tests enforce coverage

If a new field is added to `PlayerFeatures`, update:

1. `shared/schemas.ts` — `PLAYER_FEATURES_CORE_KEYS`
2. `server/services/features.ts` — `buildPlayerFeatures`
3. This doc — row in the summary table

`playerFeaturesMapping.test.ts` will fail until the array and `buildPlayerFeatures` agree.
