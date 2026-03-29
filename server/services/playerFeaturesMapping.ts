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
    AGE: num(row.AGE),

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
    CATCH_SHOOT_3PA: num(row.CATCH_SHOOT_3PA),
    CATCH_SHOOT_3PM: num(row.CATCH_SHOOT_3PM),
    CATCH_SHOOT_3_PCT: num(row.CATCH_SHOOT_3_PCT),
    PULL_UP_3PA: num(row.PULL_UP_3PA),
    PULL_UP_3PM: num(row.PULL_UP_3PM),
    PULL_UP_3_PCT: num(row.PULL_UP_3_PCT),
    DRIVE_FGA: num(row.DRIVE_FGA),
    DRIVE_FGM: num(row.DRIVE_FGM),
    DRIVE_FTA: num(row.DRIVE_FTA),
    DRIVE_PASSES: num(row.DRIVE_PASSES),
    PAINT_TOUCHES: num(row.PAINT_TOUCHES),
    FRONTCOURT_TOUCHES: num(row.FRONTCOURT_TOUCHES),
    TIME_OF_POSSESSION: num(row.TIME_OF_POSSESSION),
    AVG_SEC_PER_TOUCH: num(row.AVG_SEC_PER_TOUCH),
    AVG_DRIBBLES_PER_TOUCH: num(row.AVG_DRIBBLES_PER_TOUCH),
    ELBOW_TOUCHES: num(row.ELBOW_TOUCHES),
    POST_TOUCHES: num(row.POST_TOUCHES),
    BOX_OUTS: num(row.BOX_OUTS),
    LOOSE_BALLS_RECOVERED: num(row.LOOSE_BALLS_RECOVERED),
    CONTESTED_REB: num(row.CONTESTED_REB),
    TRANSITION_FREQ: num(row.TRANSITION_FREQ),
    TRANSITION_PPP: num(row.TRANSITION_PPP),
    ISOLATION_FREQ: num(row.ISOLATION_FREQ),
    ISOLATION_PPP: num(row.ISOLATION_PPP),
    PNR_BALL_HANDLER_FREQ: num(row.PNR_BALL_HANDLER_FREQ),
    PNR_BALL_HANDLER_PPP: num(row.PNR_BALL_HANDLER_PPP),
    PNR_ROLL_MAN_FREQ: num(row.PNR_ROLL_MAN_FREQ),
    PNR_ROLL_MAN_PPP: num(row.PNR_ROLL_MAN_PPP),
    SPOT_UP_FREQ: num(row.SPOT_UP_FREQ),
    SPOT_UP_PPP: num(row.SPOT_UP_PPP),
    HANDOFF_FREQ: num(row.HANDOFF_FREQ),
    HANDOFF_PPP: num(row.HANDOFF_PPP),
    CUT_FREQ: num(row.CUT_FREQ),
    CUT_PPP: num(row.CUT_PPP),
    publicMetricPriors: row.PUBLIC_PRIORS
      ? {
          darkoDpm: num(row.PUBLIC_PRIORS.darkoDpm),
          darkoOpm: num(row.PUBLIC_PRIORS.darkoOpm),
          darkoDpmDefense: num(row.PUBLIC_PRIORS.darkoDpmDefense),
          rapm: num(row.PUBLIC_PRIORS.rapm),
          orapm: num(row.PUBLIC_PRIORS.orapm),
          drapm: num(row.PUBLIC_PRIORS.drapm),
          epm: num(row.PUBLIC_PRIORS.epm),
          sourceCount: [
            row.PUBLIC_PRIORS.darkoDpm,
            row.PUBLIC_PRIORS.darkoOpm,
            row.PUBLIC_PRIORS.darkoDpmDefense,
            row.PUBLIC_PRIORS.rapm,
            row.PUBLIC_PRIORS.orapm,
            row.PUBLIC_PRIORS.drapm,
            row.PUBLIC_PRIORS.epm,
          ].filter((value) => value != null).length,
        }
      : undefined,
  };
}

export function mapSeasonRowToPlayerFeatures(
  row: NbaScraperSeasonStatsRow,
  roleSummary: RoleSummary,
): PlayerFeatures {
  const raw = nbaSeasonJsonRowToPlayerRawStats(row);
  return buildPlayerFeatures(raw, roleSummary);
}
