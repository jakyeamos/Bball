import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { OffseasonRunState, OffseasonTradeProposal } from '@nba-draft-sim/shared';
import { ApiError, apiService } from '../../services/api';

const offseasonKeys = {
  all: ['offseason'] as const,
  activeRun: () => [...offseasonKeys.all, 'active-run'] as const,
};

export interface TradeProposalInput {
  runId: string;
  offered_player_ids: number[];
  offered_pick_ids: string[];
  requested_player_ids: number[];
  requested_pick_ids: string[];
  decision: 'accepted' | 'rejected';
}

export interface TradeMarketHook {
  activeRunQuery: UseQueryResult<OffseasonRunState | null, ApiError>;
  submitTradeProposal: UseMutationResult<
    OffseasonTradeProposal,
    ApiError,
    TradeProposalInput
  >;
  continueToDraftNight: UseMutationResult<
    OffseasonRunState | null,
    ApiError,
    string
  >;
}

export function useTradeMarket(enabled = true): TradeMarketHook {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<OffseasonRunState | null, ApiError>({
    queryKey: offseasonKeys.activeRun(),
    queryFn: async () => {
      const response = await apiService.getActiveOffseasonRun();
      return response.run;
    },
    enabled,
  });

  const submitTradeProposal = useMutation<
    OffseasonTradeProposal,
    ApiError,
    TradeProposalInput
  >({
    mutationFn: async (input) => {
      const response = await apiService.submitOffseasonTradeProposal(input.runId, {
        offered_player_ids: input.offered_player_ids,
        offered_pick_ids: input.offered_pick_ids,
        requested_player_ids: input.requested_player_ids,
        requested_pick_ids: input.requested_pick_ids,
        decision: input.decision,
      });

      queryClient.setQueryData(offseasonKeys.activeRun(), response.run);
      return response.proposal;
    },
  });

  const continueToDraftNight = useMutation<
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
        'draft_night'
      );
      return response.run;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(offseasonKeys.activeRun(), run);
    },
  });

  return {
    activeRunQuery,
    submitTradeProposal,
    continueToDraftNight,
  };
}

