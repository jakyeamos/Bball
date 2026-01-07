/**
 * Anti-Domination Modifiers
 * Implements Section 6 from pseudocode: prevents dominant meta builds
 */

import { TeamAggregation, TeamModifiers } from '@nba-draft-sim/shared';
import { TEAM_MODIFIER_PARAMS } from '@nba-draft-sim/shared';
import { clamp, exponentialDecay } from '../utils/utils';

/**
 * Diminishing returns function
 * Returns: cap * (1 - exp(-k * max(0, x)))
 */
function diminishingReturns(x: number, cap: number, k: number): number {
  const bounded = Math.max(0, x);
  return cap * (1 - exponentialDecay(bounded, k));
}

/**
 * Compute team-level modifiers to prevent dominant strategies
 *
 * Three main penalties/bonuses:
 * 1. Creator Penalty: Too many ball-dominant creators
 * 2. Shooting Bonus: Rewards spacing
 * 3. Rim Protection Penalty: Punishes lack of interior defense
 */
export function computeTeamModifiers(team: TeamAggregation): TeamModifiers {
  const {
    CREATOR_TARGET,
    CREATOR_CAP,
    CREATOR_K,
    SHOOT_CAP,
    SHOOT_K,
    RIMPROT_MIN,
    RIMPROT_PENALTY_RATE,
    RIMPROT_MAX_PENALTY,
    TOTAL_MIN,
    TOTAL_MAX,
  } = TEAM_MODIFIER_PARAMS;

  // 1. Creator penalty (for exceeding target %)
  const creatorPercent =
    team.archetypes.PrimaryCreator + team.archetypes.SecondaryCreator;
  const creatorOverage = Math.max(0, creatorPercent - CREATOR_TARGET);
  const creatorPen = diminishingReturns(creatorOverage, CREATOR_CAP, CREATOR_K);

  // 2. Shooting bonus (for high shooting archetype %)
  const shootingPercent =
    team.archetypes.OffBallShooter + team.archetypes.MovementShooter;
  const shootBonus = diminishingReturns(shootingPercent, SHOOT_CAP, SHOOT_K);

  // 3. Rim protection penalty (for insufficient rim protection)
  const rimProtPercent =
    team.archetypes.RimProtector + team.archetypes.DefAnchor;
  let rimPen = 0;
  if (rimProtPercent < RIMPROT_MIN) {
    const deficit = RIMPROT_MIN - rimProtPercent;
    rimPen = Math.min(RIMPROT_MAX_PENALTY, deficit * RIMPROT_PENALTY_RATE);
  }

  // Total modifier (clamped)
  const total = clamp(
    TOTAL_MIN,
    TOTAL_MAX,
    shootBonus - creatorPen - rimPen
  );

  return {
    total,
    shootBonus,
    creatorPen,
    rimPen,
  };
}
