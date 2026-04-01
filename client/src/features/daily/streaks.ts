import { DailyChallengeResult, StreakState } from '@nba-draft-sim/shared';

export function inferClientStreak(results: DailyChallengeResult[]): StreakState {
  if (results.length === 0) {
    return { current_streak: 0, best_streak: 0 };
  }

  const orderedDates = [...new Set(results.map((result) => result.challenge_date))].sort();
  let current = 0;
  let best = 0;
  let previous: Date | null = null;

  orderedDates.forEach((dateString) => {
    const nextDate = new Date(`${dateString}T00:00:00.000Z`);
    if (previous) {
      const diff = Math.round((nextDate.getTime() - previous.getTime()) / 86400000);
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }

    best = Math.max(best, current);
    previous = nextDate;
  });

  return {
    current_streak: current,
    best_streak: best,
    last_completed_date: orderedDates[orderedDates.length - 1],
  };
}
