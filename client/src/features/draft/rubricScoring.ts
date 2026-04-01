import { DraftDecisionInsight, LessonRecord, Player } from '@nba-draft-sim/shared';

function playerLensSummary(player: Player): Array<{ role: 'player' | 'coach' | 'gm'; score: number; summary: string }> {
  return [
    {
      role: 'player',
      score: player.rawStats.TS_PCT + player.rawStats.AST / Math.max(1, player.rawStats.GP * 10),
      summary: `${player.name} adds efficient offense and live-ball creation pressure.`,
    },
    {
      role: 'coach',
      score: player.rawStats.STL + player.rawStats.BLK + player.rawStats.REB,
      summary: `${player.name} changes how a coach can build defensive coverages and matchups.`,
    },
    {
      role: 'gm',
      score: player.impactRating,
      summary: `${player.name} carries a long-term value signal through impact rating and role portability.`,
    },
  ];
}

export function buildDraftInsights(
  draftedPlayers: Player[],
  lessons: LessonRecord[]
): DraftDecisionInsight[] {
  if (draftedPlayers.length === 0) {
    return [];
  }

  const ranked = draftedPlayers
    .map((player) => {
      const bestLens = playerLensSummary(player).sort((a, b) => b.score - a.score)[0];
      return { player, bestLens };
    })
    .sort((a, b) => b.bestLens.score - a.bestLens.score);

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  const findLessonForRole = (role: 'player' | 'coach' | 'gm') =>
    lessons.find((lesson) => lesson.role_lens === role);

  return [
    {
      id: `strong-${strongest.player.playerId}`,
      verdict: 'strong',
      role_lens: strongest.bestLens.role,
      title: `Strong pick: ${strongest.player.name}`,
      summary: strongest.bestLens.summary,
      lesson_id: findLessonForRole(strongest.bestLens.role)?.id,
      lesson_title: findLessonForRole(strongest.bestLens.role)?.title,
    },
    {
      id: `weak-${weakest.player.playerId}`,
      verdict: 'weak',
      role_lens: weakest.bestLens.role,
      title: `Review this pick: ${weakest.player.name}`,
      summary: `This selection may have been defensible, but the profile suggests a thinner margin. ${weakest.bestLens.summary}`,
      lesson_id: findLessonForRole(weakest.bestLens.role)?.id,
      lesson_title: findLessonForRole(weakest.bestLens.role)?.title,
    },
  ];
}
