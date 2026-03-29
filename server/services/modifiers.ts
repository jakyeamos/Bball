/**
 * server/services/modifiers.ts
 *
 * Team modifiers now reflect synergy and structural weaknesses around the new
 * team event model instead of a purely archetype-based bonus/penalty system.
 */

import {
  Player,
  TeamAggregation,
  TeamModifiers,
  TEAM_MODIFIER_PARAMS,
} from '@nba-draft-sim/shared';

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeTeamModifiers(team: TeamAggregation, roster: Player[]): TeamModifiers {
  const params = TEAM_MODIFIER_PARAMS;
  const { teamModel } = team;

  const creatorPen = teamModel.primaryCreation < 0.42
    ? -0.05 * (0.42 - teamModel.primaryCreation)
    : (teamModel.primaryCreation > 0.82 && teamModel.secondaryCreation < 0.45 ? -0.02 : 0);

  const spacingSynergy = Math.max(0, average([
    teamModel.spacing,
    teamModel.primaryCreation,
    teamModel.finishing,
  ]) - 0.56) * 0.10;

  const shootBonus = Math.min(spacingSynergy, params.MAX_COMPONENT);

  const rimPen = teamModel.rimDefense < 0.46
    ? -0.06 * (0.46 - teamModel.rimDefense)
    : 0;

  const offenseBonus = Math.max(0, average([
    teamModel.primaryCreation,
    teamModel.spacing,
    teamModel.ballSecurity,
  ]) - 0.54) * 0.08;

  const offensePenalty = teamModel.ballSecurity < 0.47
    ? 0.04 * (0.47 - teamModel.ballSecurity)
    : 0;

  const defenseBonus = Math.max(0, average([
    teamModel.perimeterDefense,
    teamModel.rimDefense,
    teamModel.defensiveReboundRate,
  ]) - 0.54) * 0.08;

  const defensePenalty = teamModel.foulDiscipline < 0.45
    ? 0.04 * (0.45 - teamModel.foulDiscipline)
    : 0;

  const variancePenalty = Math.max(0, teamModel.volatility - teamModel.benchDepth) * 0.05;

  let total = shootBonus
    + offenseBonus
    + defenseBonus
    + creatorPen
    + rimPen
    - offensePenalty
    - defensePenalty
    - variancePenalty;

  total = clamp(-params.MAX_TOTAL, params.MAX_TOTAL, total);

  const teamCounts = new Map<string, number>();
  for (const player of roster) {
    teamCounts.set(player.team, (teamCounts.get(player.team) || 0) + 1);
  }

  let maxCount = 0;
  for (const count of teamCounts.values()) {
    maxCount = Math.max(maxCount, count);
  }

  let homeCourtAdvantage = 0;
  if (maxCount >= 5) {
    homeCourtAdvantage = params.HCA_MAX_BONUS;
  } else if (maxCount === 4) {
    homeCourtAdvantage = params.HCA_MAX_BONUS * 0.83;
  } else if (maxCount === 3) {
    homeCourtAdvantage = params.HCA_MAX_BONUS * 0.66;
  } else if (maxCount === 2) {
    homeCourtAdvantage = params.HCA_MAX_BONUS * 0.5;
  }

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
    homeCourtAdvantage,
  };
}

export function debugTeamModifiers(teamId: string, modifiers: TeamModifiers): void {
  console.log(`\n🎯 Team Modifiers for ${teamId}:`);
  console.log(`  Total: ${modifiers.total.toFixed(3)}`);
  console.log(`  Spacing Bonus: ${modifiers.shootBonus.toFixed(3)}`);
  console.log(`  Creator Penalty: ${modifiers.creatorPen.toFixed(3)}`);
  console.log(`  Rim Penalty: ${modifiers.rimPen.toFixed(3)}`);
  console.log(`  Variance Penalty: ${modifiers.variancePenalty.toFixed(3)}`);
  console.log(`  Offense Bonus: ${modifiers.offenseBonus.toFixed(3)}`);
  console.log(`  Defense Bonus: ${modifiers.defenseBonus.toFixed(3)}`);
  console.log('');
}

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}
