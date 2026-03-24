/**
 * Deterministic bridge: nba_api scrape row (Python JSON) → PlayerRawStats → PlayerFeatures.
 * Field formulas and fallbacks stay aligned with server/services/features.ts (buildPlayerFeatures).
 */

import type {
  PlayerFeatures,
  PlayerRawStats,
  NbaScraperSeasonStatsRow,
} from '@nba-draft-sim/shared';
import { buildPlayerFeatures, type RoleSummary } from './features';

function num(v: number | null | undefined): number | undefined {
  if (v == null || Number.isNaN(v)) return undefined;
  return v;
}

/**
 * Normalizes a league-dash scrape row into the shared PlayerRawStats model.
 * Optional rate columns from NBA Stats feed through when present; otherwise
 * buildPlayerFeatures applies the same heur documented in features.ts.
 */
export function nbaSeasonJsonRowToPlayerRawStats(
  row: NbaScraperSeasonStatsRow,
): PlayerRawStats {
  const usgPct = num(row.USG_PCT);
  const usgProxy =
    usgPct != null ? Math.min(0.99, Math.max(0, usgPct / 100)) : undefined;

  return {
    playerId: row.playerId,
    name: row.name,
    team: row.team,
    position: row.position || 'PG',

    PTS: row.PTS,
    REB: row.REB,
    AST: row.AST,
    STL: row.STL,
    BLK: row.BLK,
    TS_PCT: row.TS_PCT,
    MP_TOTAL: row.MIN,
    GP: row.GP,
    FGA: row.FGA,
    FTA: row.FTA,
    FTM: row.FTM,
    TOV: row.TOV,
    THREE_PA: row.THREE_PA,
    THREE_PM: row.THREE_PM,
    THREE_P_PCT: row.THREE_P_PCT,
    FT_PCT: row.FT_PCT,
    ORB: row.ORB,
    DRB: row.DRB,
    PF: row.PF,

    TWO_PA: row.TWO_PA,
    TWO_PM: row.TWO_PM,
    TWO_P_PCT: row.TWO_P_PCT,

    POTENTIAL_AST: undefined,
    SECONDARY_AST: undefined,
    PASSES_MADE: undefined,
    PASSES_RECEIVED: undefined,
    DEFLECTIONS: undefined,
    CHARGES_DRAWN: undefined,
    CONTESTED_SHOTS: undefined,
    POSSESSIONS: row.POSS_EST > 0 ? row.POSS_EST : undefined,
    TOUCHES: undefined,
    SCREEN_ASSISTS: undefined,
    USG_PROXY: usgProxy,
    AST_PCT_PROXY: num(row.AST_PCT),
    TOV_PCT_PROXY: num(row.TOV_PCT),
    OREB_PCT: num(row.OREB_PCT),
    DREB_PCT: num(row.DREB_PCT),
    REB_PCT: num(row.REB_PCT),
  };
}

export function mapSeasonRowToPlayerFeatures(
  row: NbaScraperSeasonStatsRow,
  roleSummary: RoleSummary,
): PlayerFeatures {
  const raw = nbaSeasonJsonRowToPlayerRawStats(row);
  return buildPlayerFeatures(raw, roleSummary);
}
