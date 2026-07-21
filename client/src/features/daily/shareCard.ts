import { DailyChallengeRecord, DailyChallengeResult } from '@nba-draft-sim/shared';

function buildShareCardText(
  challenge: DailyChallengeRecord,
  result: DailyChallengeResult
): string {
  return [
    `Court Vision Daily: ${challenge.title}`,
    `Track: ${challenge.role_lens.toUpperCase()}`,
    `Date: ${challenge.challenge_date}`,
    `Result: ${result.correct ? 'Correct' : 'Reviewing the explanation'}`,
    `Answer: ${result.selected_choice_id.toUpperCase()}`,
    `Streak: ${result.streak.current_streak}`,
  ].join('\n');
}

export async function shareResultCard(
  challenge: DailyChallengeRecord,
  result: DailyChallengeResult
): Promise<void> {
  const text = buildShareCardText(challenge, result);

  if (navigator.share) {
    await navigator.share({
      title: challenge.title,
      text,
    });
    return;
  }

  await navigator.clipboard.writeText(text);
}
