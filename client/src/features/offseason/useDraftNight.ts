import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { OffseasonDraftPickResult, OffseasonRunState } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
};

export interface DraftNightHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  submitPick: UseMutationResult<
    OffseasonDraftPickResult,
    ApiError,
    { runId: string; playerId: number }
  >;
  continueToFreeAgency: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    string
  >;
}

export function useDraftNight(enabled = true): DraftNightHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const submitPick = useMutation<
    OffseasonDraftPickResult,
    ApiError,
    { runId: string; playerId: number }
  >({
    mutationFn: async ({ runId, playerId }) => {
      const response = await apiService.submitOffseasonDraftPick(runId, playerId);
      queryClient.setQueryData(offseasonKeys.activeRun(), response.run);
      return response.pick;
    },
  });

  const continueToFreeAgency = useMutation<
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
        'free_agency'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    activeRunQuery,
    submitPick,
    continueToFreeAgency,
  };
}

