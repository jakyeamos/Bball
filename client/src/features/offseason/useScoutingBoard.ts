import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { OffseasonRunState, OffseasonScoutingProspect } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
  scoutingBoard: (runId: string) =>
    [...offseasonKeys.all, 'scouting-board', runId] as const,
};

export interface ScoutingBoardHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  boardQuery: UseQueryResult<OffseasonScoutingProspect[], ApiError>;
  updateBoardRanking: UseMutationResult<
    OffseasonScoutingProspect[],
    ApiError,
    { runId: string; rankedPlayerIds: number[] }
  >;
  continueToTradeMarket: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    string
  >;
}

export function useScoutingBoard(enabled = true): ScoutingBoardHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const boardQuery = useQuery<OffseasonScoutingProspect[], ApiError>({
    queryKey: offseasonKeys.scoutingBoard(activeRunQuery.data?.run_id ?? 'none'),
    queryFn: async () => {
      const run = activeRunQuery.data;
      if (!run) {
        throw new ApiError('No active offseason run found.', 404);
      }
      const response = await apiService.getOffseasonScoutingBoard(run.run_id);
      return response.prospects;
    },
    enabled:
      enabled &&
      Boolean(activeRunQuery.data?.run_id) &&
      activeRunQuery.data?.phase === 'scouting_pre_draft',
  });

  const updateBoardRanking = useMutation<
    OffseasonScoutingProspect[],
    ApiError,
    { runId: string; rankedPlayerIds: number[] }
  >({
    mutationFn: async ({ runId, rankedPlayerIds }) => {
      const response = await apiService.updateOffseasonScoutingBoard(
        runId,
        rankedPlayerIds
      );
      return response.prospects;
    },
    onSuccess: (prospects, variables) => {
      queryClient.setQueryData(
        offseasonKeys.scoutingBoard(variables.runId),
        prospects
      );
      queryClient.invalidateQueries({
        queryKey: offseasonKeys.activeRun(),
      });
    },
  });

  const continueToTradeMarket = useMutation<
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
        'trade_market'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    activeRunQuery,
    boardQuery,
    updateBoardRanking,
    continueToTradeMarket,
  };
}

