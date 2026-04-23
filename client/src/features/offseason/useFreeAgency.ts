import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  OffseasonFreeAgencySigning,
  OffseasonFreeAgencyTarget,
  OffseasonRunState,
} from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
  freeAgencyTargets: (runId: string) =>
    [...offseasonKeys.all, 'free-agency-targets', runId] as const,
};

export interface FreeAgencyHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  targetsQuery: UseQueryResult<OffseasonFreeAgencyTarget[], ApiError>;
  submitOffer: UseMutationResult<
    OffseasonFreeAgencySigning,
    ApiError,
    {
      runId: string;
      playerId: number;
      contractMillions: number;
      decision: 'signed' | 'declined';
    }
  >;
  continueToRecap: UseMutationResult<OffseasonRunState | null, ApiError, string>;
}

export function useFreeAgency(enabled = true): FreeAgencyHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const targetsQuery = useQuery<OffseasonFreeAgencyTarget[], ApiError>({
    queryKey: offseasonKeys.freeAgencyTargets(activeRunQuery.data?.run_id ?? 'none'),
    queryFn: async () => {
      const run = activeRunQuery.data;
      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }
      const response = await apiService.getOffseasonFreeAgencyTargets(run.run_id);
      return response.targets;
    },
    enabled:
      enabled &&
      Boolean(activeRunQuery.data?.run_id) &&
      activeRunQuery.data?.phase === 'free_agency',
  });

  const submitOffer = useMutation<
    OffseasonFreeAgencySigning,
    ApiError,
    {
      runId: string;
      playerId: number;
      contractMillions: number;
      decision: 'signed' | 'declined';
    }
  >({
    mutationFn: async ({ runId, playerId, contractMillions, decision }) => {
      const response = await apiService.submitOffseasonFreeAgencyOffer(runId, {
        player_id: playerId,
        contract_millions: contractMillions,
        decision,
      });
      queryClient.setQueryData(offseasonKeys.activeRun(), response.run);
      return response.signing;
    },
    onSuccess: (_signing, variables) => {
      queryClient.invalidateQueries({
        queryKey: offseasonKeys.freeAgencyTargets(variables.runId),
      });
    },
  });

  const continueToRecap = useMutation<
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
        'post_offseason_recap'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    activeRunQuery,
    targetsQuery,
    submitOffer,
    continueToRecap,
  };
}

