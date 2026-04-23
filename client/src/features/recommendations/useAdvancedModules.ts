import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AdvancedModuleRecommendation } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

export function useAdvancedModules(): UseQueryResult<
  AdvancedModuleRecommendation[],
  ApiError
> {
  return useQuery<AdvancedModuleRecommendation[], ApiError>({
    queryKey: ['recommendations', 'advanced-modules'],
    queryFn: async () => {
      const response = await apiService.getAdvancedModules();
      return response.modules;
    },
  });
}
