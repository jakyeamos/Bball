import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export function useDailyLeaderboard(date?: string) {
  return useQuery({
    queryKey: ['daily-leaderboard', date ?? 'today'],
    queryFn: () => apiService.getLeaderboard(date),
  });
}
