import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { OffseasonCoachProfile, OffseasonRunState } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
  coachingMarket: (runId: string) =>
    [...offseasonKeys.all, 'coaching-market', runId] as const,
};

export interface CoachingMarketHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  coachingMarketQuery: UseQueryResult<OffseasonCoachProfile[], ApiError>;
  hireCoach: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    { runId: string; coachId: string }
  >;
  continueToScouting: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    string
  >;
}

export function useCoachingMarket(enabled = true): CoachingMarketHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const coachingMarketQuery = useQuery<OffseasonCoachProfile[], ApiError>({
    queryKey: offseasonKeys.coachingMarket(activeRunQuery.data?.run_id ?? 'none'),
    queryFn: async () => {
      const run = activeRunQuery.data;
      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }
      const response = await apiService.getOffseasonCoachingMarket(run.run_id);
      return response.coaches;
    },
    enabled:
      enabled &&
      Boolean(activeRunQuery.data?.run_id) &&
      activeRunQuery.data?.phase === 'coaching_market',
  });

  const hireCoach = useMutation<
    OffseasonRunState | null,
    ApiError,
    { runId: string; coachId: string }
  >({
    mutationFn: async ({ runId, coachId }) => {
      const response = await apiService.hireOffseasonCoach(runId, coachId);
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
      if (run) {
        queryClient.invalidateQueries({
          queryKey: offseasonKeys.coachingMarket(run.run_id),
        });
      }
    },
  });

  const continueToScouting = useMutation<
    OffseasonRunState | null,
    ApiError,
    string
  >({
    mutationFn: async (runId: string) => {
      const run =
        activeRunQuery.data ??
        (await apiService.getActiveOffseasonRun(runId)).run;

      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }

      const response = await apiService.transitionOffseasonRun(
        run.run_id,
        run.phase,
        'scouting_pre_draft'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    activeRunQuery,
    coachingMarketQuery,
    hireCoach,
    continueToScouting,
  };
}

