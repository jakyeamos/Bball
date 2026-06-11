import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { ApiError, apiService } from '../../services/api';
import { OffseasonRunState, OffseasonTeamSummary } from '@nba-draft-sim/shared';

const offseasonKeys = {
  all: ['offseason'] as const,
  teams: () => [...offseasonKeys.all, 'teams'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
};

function defaultSeasonYear(): number {
  return new Date().getUTCFullYear();
}

export interface TeamContextHook {
  teamsQuery: UseQueryResult<OffseasonTeamSummary[], ApiError>;
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  selectTeam: UseMutationResult<OffseasonRunState | null, ApiError, number>;
  continueToCoachingMarket: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    void
  >;
}

export function useTeamContext(enabled = true): TeamContextHook {
  const queryClient = useQueryClient();

  const teamsQuery = useQuery<OffseasonTeamSummary[], ApiError>({
    queryKey: offseasonKeys.teams(),
    queryFn: async () => {
      const response = await apiService.getOffseasonTeams();
      return response.teams;
    },
    enabled,
  });

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const selectTeam = useMutation<OffseasonRunState | null, ApiError, number>({
    mutationFn: async (teamId: number) => {
      if (!enabled) {
        throw new ApiError('Offseason Team Context is disabled.', 404);
      }

      const currentRun =
        activeRunQuery.data ??
        (await apiService.getActiveOffseasonRun()).run;
      const activeRun =
        currentRun?.phase === 'team_context'
          ? currentRun
          : (await apiService.createOffseasonRun(defaultSeasonYear())).run;

      if (!activeRun) {
        throw new ApiError('Unable to initialize offseason run.', 500);
      }

      const response = await apiService.saveTeamContext(activeRun.run_id, teamId);
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  const continueToCoachingMarket = useMutation<
    OffseasonRunState | null,
    ApiError,
    void
  >({
    mutationFn: async () => {
      if (!enabled) {
        throw new ApiError('Offseason Team Context is disabled.', 404);
      }

      const activeRun =
        activeRunQuery.data ??
        (await apiService.getActiveOffseasonRun()).run;

      if (!activeRun) {
        throw new ApiError('No active offseason run found.', 404);
      }

      if (activeRun.phase !== 'team_context') {
        throw new ApiError(
          `Cannot continue from ${activeRun.phase}. Select a team to start a new offseason run first.`,
          409
        );
      }

      const response = await apiService.transitionOffseasonRun(
        activeRun.run_id,
        activeRun.phase,
        'coaching_market'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    teamsQuery,
    activeRunQuery,
    selectTeam,
    continueToCoachingMarket,
  };
}
