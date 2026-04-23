import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { OffseasonRecapReport, OffseasonRunState } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
  recap: (runId: string) => [...offseasonKeys.all, 'recap', runId] as const,
};

export interface OffseasonRecapHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  recapQuery: UseQueryResult<OffseasonRecapReport | null, ApiError>;
  completeRun: UseMutationResult<OffseasonRunState | null, ApiError, string>;
}

export function useOffseasonRecap(enabled = true): OffseasonRecapHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const recapQuery = useQuery<OffseasonRecapReport | null, ApiError>({
    queryKey: offseasonKeys.recap(activeRunQuery.data?.run_id ?? 'none'),
    queryFn: async () => {
      const run = activeRunQuery.data;
      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }

      const response = await apiService.getOffseasonRecap(run.run_id);
      return response.recap;
    },
    enabled:
      enabled &&
      Boolean(activeRunQuery.data?.run_id) &&
      (activeRunQuery.data?.phase === 'post_offseason_recap' ||
        activeRunQuery.data?.phase === 'complete'),
  });

  const completeRun = useMutation<OffseasonRunState | null, ApiError, string>({
    mutationFn: async (runId: string) => {
      const run =
        activeRunQuery.data ??
        (await apiService.getActiveOffseasonRun(runId)).run;

      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }

      if (run.phase === 'complete') {
        return run;
      }

      const response = await apiService.transitionOffseasonRun(
        run.run_id,
        run.phase,
        'complete'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
      if (run?.run_id) {
        queryClient.invalidateQueries({
          queryKey: offseasonKeys.recap(run.run_id),
        });
      }
    },
  });

  return {
    activeRunQuery,
    recapQuery,
    completeRun,
  };
}
