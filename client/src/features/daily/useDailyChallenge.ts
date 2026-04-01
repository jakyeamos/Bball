import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DailyChallengeResult } from '@nba-draft-sim/shared';
import { apiService } from '../../services/api';

export function useDailyChallenge(date?: string) {
  const queryClient = useQueryClient();

  const challengeQuery = useQuery({
    queryKey: ['daily-challenge', date ?? 'today'],
    queryFn: () => apiService.getDailyChallenge(date),
  });

  const submitMutation = useMutation({
    mutationFn: apiService.submitDailyChallenge,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-challenge'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-leaderboard'] }),
      ]);
    },
  });

  return {
    challenge: challengeQuery.data?.challenge ?? null,
    isLoading: challengeQuery.isLoading,
    error: challengeQuery.error,
    submitResult: submitMutation.data as DailyChallengeResult | undefined,
    submitAnswer: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
  };
}
