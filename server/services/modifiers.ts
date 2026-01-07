/**
 * Anti-Domination Modifiers
 */

import { TeamAggregation, TeamModifiers } from '@nba-draft-sim/shared';
import { TEAM_MODIFIER_PARAMS } from '@nba-draft-sim/shared';
import { clamp } from '../utils/utils';

function diminishingReturns(x: number, cap: number, k: number): number {
  return cap * (1 - Math.exp(-k * Math.max(0, x)));
}

export function computeTeamModifiers(team: TeamAggregation): TeamModifiers {
  const p = TEAM_MODIFIER_PARAMS;
  const arch = team.archetypes;

  // Core archetype buckets
  const creators = (arch.PrimaryCreator ?? 0) + (arch.SecondaryCreator ?? 0);
  const shooters = (arch.OffBallShooter ?? 0) + (arch.MovementShooter ?? 0) + (arch.ThreeAndD ?? 0) + (arch.StretchBig ?? 0);
  const rimprot  = (arch.RimProtector ?? 0) + (arch.DefAnchor ?? 0);

  // NEW: stability proxy from team versatility
  const viTeam = (team.features as any).VI ?? 0.5;

  // Creator redundancy (too many creators → diminishing returns / turnovers / role overlap)
  const creatorOver = Math.max(0, creators - p.CREATOR_TARGET);
  const creatorPen = diminishingReturns(creatorOver, p.CREATOR_REDUNDANCY_CAP, p.DIMINISH_K);

  // Spacing bonus (helps but capped)
  const shootBonus = diminishingReturns(shooters, p.SPACING_BONUS_CAP, p.DIMINISH_K);

  // Rim protection floor
  const rimPen = rimprot < p.RIMPROT_MIN
    ? Math.min(p.RIM_HOLE_CAP, (p.RIMPROT_MIN - rimprot) * 0.002)
    : 0;

  // Low versatility penalty (fragile teams more exploitable/volatile)
  const lowVIPen = viTeam < 0.45
    ? Math.min(p.LOW_VI_PEN_CAP, (0.45 - viTeam) * 0.06)
    : 0;

  // Split modifiers (preferred by the upgraded sim engine)
  const offenseBonus = shootBonus;
  const offensePenalty = creatorPen;

  const defenseBonus = 0;
  const defensePenalty = rimPen;

  // Variance penalty is used to increase sigma (more volatile) rather than directly impacting rating
  const variancePenalty = lowVIPen;

  const total = clamp(-p.MAX_TOTAL, p.MAX_TOTAL, offenseBonus - offensePenalty - defensePenalty);

  return {
    total,
    shootBonus,
    creatorPen,
    rimPen,
    offenseBonus,
    offensePenalty,
    defenseBonus,
    defensePenalty,
    variancePenalty,
  };
}
