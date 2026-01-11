/**
 * server/services/scoutingReport.ts
 *
 * Generates pre-game scouting reports for matchups
 * Analyzes opponent team composition, strengths, weaknesses, and key players
 */

import {
  ScoutingReport,
  TeamAggregation,
  Player,
  RoundMatchup,
  ArchetypeProfile,
  CoachingDecision,
  LineupStrategy,
  DefensiveStrategy,
  OffensiveStrategy,
} from '@nba-draft-sim/shared';

interface TeamAnalysis {
  strengths: string[];
  weaknesses: string[];
  keyPlayers: Array<{ name: string; role: string; threat: string }>;
}

/**
 * Generate a scouting report for a matchup
 */
export function generateScoutingReport(
  matchup: RoundMatchup,
  teamAName: string,
  teamBName: string,
  teamAAggregation: TeamAggregation,
  teamBAggregation: TeamAggregation,
  teamARoster: Player[],
  teamBRoster: Player[],
  teamARecentDecisions?: CoachingDecision[],
  teamBRecentDecisions?: CoachingDecision[]
): ScoutingReport {
  const teamAAnalysis = analyzeTeam(teamAAggregation, teamARoster);
  const teamBAnalysis = analyzeTeam(teamBAggregation, teamBRoster);

  const styleClash = generateStyleClash(teamAAggregation, teamBAggregation, teamAName, teamBName);
  const prediction = generatePrediction(
    teamAAggregation,
    teamBAggregation,
    teamAName,
    teamBName,
    matchup.homeTeam
  );

  // Analyze coaching tendencies from recent decisions
  const teamACoachingTendencies = analyzeCoachingTendencies(teamAName, teamARecentDecisions);
  const teamBCoachingTendencies = analyzeCoachingTendencies(teamBName, teamBRecentDecisions);

  return {
    matchupId: matchup.matchupId,
    teamAId: matchup.teamAId,
    teamBId: matchup.teamBId,
    teamAName,
    teamBName,
    teamAStrengths: teamAAnalysis.strengths,
    teamAWeaknesses: teamAAnalysis.weaknesses,
    teamBStrengths: teamBAnalysis.strengths,
    teamBWeaknesses: teamBAnalysis.weaknesses,
    teamAKeyPlayers: teamAAnalysis.keyPlayers,
    teamBKeyPlayers: teamBAnalysis.keyPlayers,
    styleClash,
    teamACoachingTendencies,
    teamBCoachingTendencies,
    prediction,
  };
}

/**
 * Analyze a team's strengths, weaknesses, and key players
 */
function analyzeTeam(aggregation: TeamAggregation, roster: Player[]): TeamAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Analyze shooting
  if (aggregation.features.TS > 0.58) {
    strengths.push('Elite shooting efficiency');
  } else if (aggregation.features.TS < 0.53) {
    weaknesses.push('Struggles with shooting efficiency');
  }

  if (aggregation.features.THREE_PA_RATE > 0.40) {
    strengths.push('Heavy three-point shooting');
  } else if (aggregation.features.THREE_PA_RATE < 0.30) {
    weaknesses.push('Limited three-point volume');
  }

  // Analyze playmaking
  if (aggregation.features.AST > 25) {
    strengths.push('Excellent ball movement');
  } else if (aggregation.features.AST < 20) {
    weaknesses.push('Limited playmaking');
  }

  // Analyze rebounding
  const totalReb = aggregation.features.REB_TOTAL || 0;
  if (totalReb > 46) {
    strengths.push('Dominant on the glass');
  } else if (totalReb < 40) {
    weaknesses.push('Weak rebounding');
  }

  // Analyze defense
  if ((aggregation.features.STL || 0) > 8) {
    strengths.push('Aggressive perimeter defense');
  }
  if ((aggregation.features.BLK || 0) > 5) {
    strengths.push('Strong rim protection');
  }

  // Analyze turnovers
  if (aggregation.features.TOV > 15) {
    weaknesses.push('Turnover prone');
  } else if (aggregation.features.TOV < 12) {
    strengths.push('Takes care of the ball');
  }

  // Analyze pace
  const pace = aggregation.features.PACE || 100;
  if (pace > 105) {
    strengths.push('Fast-paced offense');
  } else if (pace < 95) {
    strengths.push('Methodical, controlled pace');
  }

  // Analyze archetype composition
  const topArchetypes = getTopArchetypes(aggregation.archetypes);
  if (topArchetypes.includes('3_D_WING')) {
    strengths.push('Versatile wing defenders');
  }
  if (topArchetypes.includes('STRETCH_BIG')) {
    strengths.push('Floor-spacing big men');
  }
  if (topArchetypes.includes('FACILITATOR')) {
    strengths.push('Elite facilitators');
  }
  if (topArchetypes.includes('SLASHER')) {
    strengths.push('Drives to the basket effectively');
  }

  // Ensure at least 2 strengths and 2 weaknesses
  if (strengths.length === 0) {
    strengths.push('Balanced team composition');
    strengths.push('Consistent role players');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Lacks a clear edge in any area');
    weaknesses.push('May struggle against elite teams');
  }

  // Get key players (top 3 by impact)
  const keyPlayers = getKeyPlayers(roster);

  return { strengths, weaknesses, keyPlayers };
}

/**
 * Get top archetypes by weight
 */
function getTopArchetypes(archetypes: ArchetypeProfile, count: number = 3): string[] {
  return Object.entries(archetypes)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, count)
    .map(([name]) => name);
}

/**
 * Get key players to watch
 */
function getKeyPlayers(roster: Player[]): Array<{ name: string; role: string; threat: string }> {
  const sorted = [...roster].sort((a, b) => b.impactRating - a.impactRating);
  const top3 = sorted.slice(0, 3);

  return top3.map((player, index) => {
    let role = '';
    let threat = '';

    // Determine role based on archetypes
    const topArch = getTopPlayerArchetype(player);
    switch (topArch) {
      case 'FACILITATOR':
        role = 'Primary Playmaker';
        threat = 'Controls the tempo and sets up teammates';
        break;
      case 'SHARPSHOOTER':
      case 'STRETCH_BIG':
        role = 'Floor Spacer';
        threat = 'Deadly from three-point range';
        break;
      case '3_D_WING':
        role = 'Two-Way Wing';
        threat = 'Elite defender who can score efficiently';
        break;
      case 'SLASHER':
        role = 'Rim Attacker';
        threat = 'Gets to the basket at will';
        break;
      case 'POST_SCORER':
        role = 'Post Presence';
        threat = 'Dominates in the paint';
        break;
      case 'DEFENSIVE_ANCHOR':
        role = 'Defensive Anchor';
        threat = 'Protects the rim and alters shots';
        break;
      case 'VERSATILE_FORWARD':
        role = 'Versatile Forward';
        threat = 'Can impact the game in multiple ways';
        break;
      default:
        role = index === 0 ? 'Star Player' : 'Key Contributor';
        threat = 'High impact on both ends';
    }

    return {
      name: player.name,
      role,
      threat,
    };
  });
}

/**
 * Get a player's top archetype
 */
function getTopPlayerArchetype(player: Player): string {
  const entries = Object.entries(player.archetypes);
  if (entries.length === 0) return 'ROLE_PLAYER';

  return entries.sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0][0];
}

/**
 * Generate style clash narrative
 */
function generateStyleClash(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  teamAName: string,
  teamBName: string
): string {
  const paceA = teamA.features.PACE || 100;
  const paceB = teamB.features.PACE || 100;
  const threeRateA = teamA.features.THREE_PA_RATE;
  const threeRateB = teamB.features.THREE_PA_RATE;

  let clash = '';

  // Pace clash
  if (Math.abs(paceA - paceB) > 8) {
    if (paceA > paceB) {
      clash = `${teamAName} wants to push the tempo while ${teamBName} prefers a slower pace. `;
    } else {
      clash = `${teamBName} wants to push the tempo while ${teamAName} prefers a slower pace. `;
    }
  }

  // Style clash
  if (threeRateA > 0.40 && threeRateB < 0.30) {
    clash += `${teamAName}'s perimeter-oriented attack faces ${teamBName}'s traditional inside game.`;
  } else if (threeRateB > 0.40 && threeRateA < 0.30) {
    clash += `${teamBName}'s perimeter-oriented attack faces ${teamAName}'s traditional inside game.`;
  } else if (threeRateA > 0.40 && threeRateB > 0.40) {
    clash += `Both teams love to launch threes - expect a shootout.`;
  } else {
    clash += `Both teams will battle in the paint and mid-range.`;
  }

  return clash || `A balanced matchup between ${teamAName} and ${teamBName}.`;
}

/**
 * Analyze coaching tendencies from recent decisions (editorial style)
 */
function analyzeCoachingTendencies(teamName: string, recentDecisions?: CoachingDecision[]): string {
  if (!recentDecisions || recentDecisions.length === 0) {
    return `${teamName}'s coaching approach is still being assessed.`;
  }

  // Analyze the most recent 3 decisions
  const decisions = recentDecisions.slice(-3);
  const insights: string[] = [];

  // Analyze lineup strategy patterns
  const lineupStrategies = decisions.map(d => d.lineupStrategy);
  const smallBallCount = lineupStrategies.filter(s => s === 'small_ball').length;
  const bigLineupCount = lineupStrategies.filter(s => s === 'big_lineup').length;
  const offenseFirstCount = lineupStrategies.filter(s => s === 'offense_first').length;
  const defenseFirstCount = lineupStrategies.filter(s => s === 'defense_first').length;

  if (smallBallCount >= 2) {
    insights.push('they\'ve been favoring a faster, perimeter-oriented approach');
  } else if (bigLineupCount >= 2) {
    insights.push('they\'ve been emphasizing size and interior presence');
  } else if (offenseFirstCount >= 2) {
    insights.push('they\'ve prioritized offensive firepower over defensive structure');
  } else if (defenseFirstCount >= 2) {
    insights.push('they\'ve taken a defensive-minded, grind-it-out approach');
  }

  // Analyze defensive strategy patterns
  const defStrategies = decisions.map(d => d.defensiveStrategy);
  const switchingCount = defStrategies.filter(s => s === 'switch_everything').length;
  const pressureCount = defStrategies.filter(s => s === 'pressure_ball').length;
  const paintProtectCount = defStrategies.filter(s => s === 'protect_paint' || s === 'pack_paint').length;

  if (switchingCount >= 2) {
    insights.push('expect them to switch aggressively on defense');
  } else if (pressureCount >= 2) {
    insights.push('watch for full-court pressure and trap-heavy schemes');
  } else if (paintProtectCount >= 2) {
    insights.push('they\'ve been clogging the paint and daring opponents to shoot');
  }

  // Analyze offensive strategy patterns
  const offStrategies = decisions.map(d => d.offensiveStrategy);
  const paceSpaceCount = offStrategies.filter(s => s === 'pace_and_space').length;
  const insideOutCount = offStrategies.filter(s => s === 'inside_out').length;
  const isolationCount = offStrategies.filter(s => s === 'isolation').length;

  if (paceSpaceCount >= 2) {
    insights.push('they\'ve been spreading the floor and launching from deep');
  } else if (insideOutCount >= 2) {
    insights.push('they\'ve been working inside-out to set up their shooters');
  } else if (isolationCount >= 2) {
    insights.push('they\'ve been riding their best player in crunch time');
  }

  // Analyze rotation depth trends
  const rotationDepths = decisions.map(d => d.rotationDepth);
  const avgDepth = rotationDepths.reduce((a, b) => a + b, 0) / rotationDepths.length;
  if (avgDepth >= 9) {
    insights.push('they\'ve been going deep into their bench');
  } else if (avgDepth <= 7) {
    insights.push('they\'ve been playing a tight rotation, leaning on their top players');
  }

  // Construct editorial narrative
  if (insights.length === 0) {
    return `${teamName} has been playing it straight, sticking to fundamentals.`;
  } else if (insights.length === 1) {
    return `Recently, ${insights[0]}.`;
  } else if (insights.length === 2) {
    return `Recently, ${insights[0]} and ${insights[1]}.`;
  } else {
    const lastInsight = insights.pop();
    return `Recently, ${insights.join(', ')}, and ${lastInsight}.`;
  }
}

/**
 * Generate betting-line style prediction
 */
function generatePrediction(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  teamAName: string,
  teamBName: string,
  homeTeam: 'A' | 'B'
): string {
  const ratingDiff = teamA.overallRating - teamB.overallRating;
  const homeAdvantage = homeTeam === 'A' ? 2 : -2;
  const adjustedDiff = ratingDiff + homeAdvantage;

  const favorite = adjustedDiff > 0 ? teamAName : teamBName;
  const underdog = adjustedDiff > 0 ? teamBName : teamAName;
  const spread = Math.abs(adjustedDiff);

  if (spread < 2) {
    return `This one's a toss-up. Expect a nail-biter that could go either way.`;
  } else if (spread < 4) {
    return `${favorite} is a slight favorite, but ${underdog} has a real shot if they execute.`;
  } else if (spread < 7) {
    return `${favorite} should win this one, but ${underdog} can keep it close with good coaching.`;
  } else {
    return `${favorite} is heavily favored. ${underdog} will need their best performance to pull off the upset.`;
  }
}
