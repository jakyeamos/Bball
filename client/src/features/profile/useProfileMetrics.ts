import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export function useProfileMetrics() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: apiService.getProfile,
  });
}
