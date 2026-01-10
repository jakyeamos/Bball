/**
 * server/services/editorial.ts
 *
 * NEW FILE - Phase 1
 * Regular season editorial text generation
 */

import { MatchupResult, TeamRecord } from '@nba-draft-sim/shared';

/**
 * Phrase pools for different matchup contexts
 */
const PHRASE_POOLS = {
  // Generic outcomes
  close_win: [
    "{winner} edges out {loser} in a nail-biter",
    "{winner} survives a scare from {loser}",
    "{winner} holds off {loser}'s late push",
    "{winner} guts out a tough win over {loser}",
    "{winner} outlasts {loser} in a grind-it-out affair",
  ],

  comfortable_win: [
    "{winner} controls the game against {loser}",
    "{winner} takes care of business vs {loser}",
    "{winner} handles {loser} with relative ease",
    "{winner} never trails in victory over {loser}",
    "{winner} cruises past {loser}",
  ],

  blowout: [
    "{winner} dominates {loser} wire-to-wire",
    "{winner} runs {loser} off the floor",
    "{winner} dismantles {loser} in lopsided affair",
    "{winner} embarrasses {loser} in rout",
    "{winner} blows out {loser} from the opening tip",
  ],

  // Driver-specific phrases
  shooting_advantage: [
    "{winner}'s shooting efficiency proves decisive",
    "{winner} can't miss from the field",
    "{winner}'s hot shooting overwhelms {loser}",
    "{winner} converts at a high clip",
    "{winner}'s marksmanship makes the difference",
  ],

  ball_security: [
    "{winner}'s ball security proves crucial",
    "{loser}'s turnovers doom their chances",
    "{winner} takes care of the ball",
    "{winner}'s discipline with the ball pays off",
    "{loser} gives the game away with sloppy play",
  ],

  spacing: [
    "{winner}'s spacing creates easy looks",
    "{winner} torches {loser} from deep",
    "{winner}'s floor spacing opens up everything",
    "{winner} stretches {loser} to the breaking point",
    "{winner}'s three-point barrage sinks {loser}",
  ],

  versatility: [
    "{winner}'s balanced attack proves too much",
    "{winner} attacks from all angles",
    "{winner}'s versatile lineup confounds {loser}",
    "{winner} finds mismatches everywhere",
    "{winner}'s multi-faceted offense clicks",
  ],

  composition: [
    "{winner}'s roster construction pays dividends",
    "{winner}'s balanced roster shines through",
    "{winner}'s team chemistry on full display",
    "{winner}'s complementary pieces fit perfectly",
    "{winner} shows the value of team building",
  ],

  defense: [
    "{winner}'s defense stifles {loser}",
    "{winner} locks down {loser}'s offense",
    "{winner}'s defensive intensity sets the tone",
    "{winner} forces {loser} into tough shots",
    "{winner}'s defense travels",
  ],
};

/**
 * Generate editorial text for a single game
 */
export function generateGameEditorial(
  teamAName: string,
  teamBName: string,
  result: MatchupResult
): string {
  const winner = result.winner === 'A' ? teamAName : teamBName;
  const loser = result.winner === 'A' ? teamBName : teamAName;

  const phrases: string[] = [];

  // 1. Main outcome phrase (based on actual point differential)
  const pointDifferential = Math.abs(result.finalScoreA - result.finalScoreB);

  let outcomePool: string[];
  if (pointDifferential <= 5) {
    // Close game: 5 points or less
    outcomePool = PHRASE_POOLS.close_win;
  } else if (pointDifferential <= 12) {
    // Comfortable win: 6-12 points
    outcomePool = PHRASE_POOLS.comfortable_win;
  } else {
    // Blowout: 13+ points (phrases like "blows out", "dismantles" only for bigger margins)
    outcomePool = PHRASE_POOLS.blowout;
  }

  const outcomePhrase = selectRandomPhrase(outcomePool, winner, loser);
  phrases.push(outcomePhrase);

  // 2. Driver phrase (if we have strong drivers)
  if (result.drivers && result.drivers.length > 0) {
    const topDriver = result.drivers[0];

    let driverPool: string[] | null = null;

    if (topDriver.category.includes('Shooting Efficiency')) {
      driverPool = PHRASE_POOLS.shooting_advantage;
    } else if (topDriver.category.includes('Ball Security')) {
      driverPool = PHRASE_POOLS.ball_security;
    } else if (topDriver.category.includes('Spacing') || topDriver.category.includes('3PA')) {
      driverPool = PHRASE_POOLS.spacing;
    } else if (topDriver.category.includes('Versatility')) {
      driverPool = PHRASE_POOLS.versatility;
    } else if (topDriver.category.includes('Composition')) {
      driverPool = PHRASE_POOLS.composition;
    }

    // Only add driver phrase for strong advantages
    if (driverPool && topDriver.impact > 0.03) {
      const driverPhrase = selectRandomPhrase(driverPool, winner, loser);
      phrases.push(driverPhrase);
    }
  }

  return phrases.join('. ') + '.';
}

/**
 * Select random phrase from pool and fill in placeholders
 */
function selectRandomPhrase(pool: string[], winner: string, loser: string): string {
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template
    .replace(/{winner}/g, winner)
    .replace(/{loser}/g, loser);
}

/**
 * Generate season summary editorial
 */
export function generateSeasonSummary(
  standingsArray: TeamRecord[],
  teamNames: Map<string, string>
): string {
  const topTeam = standingsArray[0];
  const topTeamName = teamNames.get(topTeam.teamId) || topTeam.teamId;

  const summaries = [
    `${topTeamName} claims the top seed with a ${topTeam.wins}-${topTeam.losses} record`,
    `${topTeamName} finishes atop the standings at ${topTeam.wins}-${topTeam.losses}`,
    `${topTeamName} secures home court advantage throughout with ${topTeam.wins} wins`,
    `${topTeamName} dominates the regular season, finishing ${topTeam.wins}-${topTeam.losses}`,
  ];

  return summaries[Math.floor(Math.random() * summaries.length)] + '.';
}
