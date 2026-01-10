/**
 * server/managers/tradeProposalManager.ts - Phase 2.5
 * Trade proposal system
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TradeProposal,
  TradeProposalStatus,
  TradeProposalNotification,
  LeagueState,
  DraftState,
  DRAFT_CONSTRAINTS,
} from '@nba-draft-sim/shared';

/**
 * Create a new trade proposal
 */
export function createTradeProposal(
  fromTeamId: string,
  toTeamId: string,
  fromPlayerIds: string[],
  toPlayerIds: string[]
): TradeProposal {
  return {
    proposalId: uuidv4(),
    fromTeamId,
    toTeamId,
    fromPlayerIds,
    toPlayerIds,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + DRAFT_CONSTRAINTS.TRADE_PROPOSAL_EXPIRY_SECONDS * 1000).toISOString(),
  };
}

export function expireAllPendingProposals(league: LeagueState): LeagueState {
  return {
    ...league,
    tradeProposals: league.tradeProposals.map(p =>
      p.status === 'pending'
        ? { ...p, status: 'expired' as TradeProposalStatus }
        : p
    ),
  };
}

/**
 * Add trade proposal to league
 */
export function addTradeProposal(
  league: LeagueState,
  proposal: TradeProposal
): LeagueState {
  return {
    ...league,
    tradeProposals: [...league.tradeProposals, proposal],
  };
}

/**
 * Update trade proposal status
 */
export function updateProposalStatus(
  league: LeagueState,
  proposalId: string,
  status: TradeProposalStatus,
  respondedAt?: string
): LeagueState {
  return {
    ...league,
    tradeProposals: league.tradeProposals.map(p =>
      p.proposalId === proposalId
        ? { ...p, status, respondedAt }
        : p
    ),
  };
}

/**
 * Execute an accepted trade
 */
export function executeTradeProposal(
  league: LeagueState,
  proposalId: string
): { league: LeagueState; success: boolean; error?: string } {
  const proposal = league.tradeProposals.find(p => p.proposalId === proposalId);

  if (!proposal) {
    return { league, success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'accepted') {
    return { league, success: false, error: 'Proposal not accepted' };
  }

  if (!league.draftState) {
    return { league, success: false, error: 'No draft state' };
  }

  // Validate teams exist
  const teamA = league.draftState.teams.find(t => t.teamId === proposal.fromTeamId);
  const teamB = league.draftState.teams.find(t => t.teamId === proposal.toTeamId);

  if (!teamA || !teamB) {
    return { league, success: false, error: 'Teams not found' };
  }

  // Validate players belong to correct teams
  for (const pid of proposal.fromPlayerIds) {
    if (!teamA.roster.includes(pid)) {
      return { league, success: false, error: `Player ${pid} not on team ${teamA.teamId}` };
    }
  }

  for (const pid of proposal.toPlayerIds) {
    if (!teamB.roster.includes(pid)) {
      return { league, success: false, error: `Player ${pid} not on team ${teamB.teamId}` };
    }
  }

  // Execute trade
  const updatedDraftState: DraftState = {
    ...league.draftState,
    teams: league.draftState.teams.map(team => {
      if (team.teamId === teamA.teamId) {
        return {
          ...team,
          roster: [
            ...team.roster.filter(p => !proposal.fromPlayerIds.includes(p)),
            ...proposal.toPlayerIds,
          ],
        };
      }
      if (team.teamId === teamB.teamId) {
        return {
          ...team,
          roster: [
            ...team.roster.filter(p => !proposal.toPlayerIds.includes(p)),
            ...proposal.fromPlayerIds,
          ],
        };
      }
      return team;
    }),
  };

  const updatedLeague: LeagueState = {
    ...league,
    draftState: updatedDraftState,
    tradeProposals: league.tradeProposals.map(p =>
      p.proposalId === proposalId
        ? { ...p, status: 'accepted' as TradeProposalStatus }
        : p
    ),
  };

  return { league: updatedLeague, success: true };
}

/**
 * Cancel a trade proposal
 */
export function cancelTradeProposal(
  league: LeagueState,
  proposalId: string,
  userId: string
): { league: LeagueState; success: boolean; error?: string } {
  const proposal = league.tradeProposals.find(p => p.proposalId === proposalId);

  if (!proposal) {
    return { league, success: false, error: 'Proposal not found' };
  }

  // Only the proposer can cancel
  const proposerTeam = league.draftState?.teams.find(t => t.teamId === proposal.fromTeamId);
  if (!proposerTeam || proposerTeam.userId !== userId) {
    return { league, success: false, error: 'Only proposer can cancel' };
  }

  if (proposal.status !== 'pending') {
    return { league, success: false, error: 'Can only cancel pending proposals' };
  }

  const updatedLeague = updateProposalStatus(
    league,
    proposalId,
    'cancelled',
    new Date().toISOString()
  );

  return { league: updatedLeague, success: true };
}

/**
 * Expire old trade proposals
 */
export function expireOldProposals(league: LeagueState): LeagueState {
  const now = new Date();

  return {
    ...league,
    tradeProposals: league.tradeProposals.map(p => {
      if (p.status === 'pending' && new Date(p.expiresAt) < now) {
        return { ...p, status: 'expired' as TradeProposalStatus };
      }
      return p;
    }),
  };
}

/**
 * Get active proposals for a team
 */
export function getActiveProposals(
  league: LeagueState,
  teamId: string
): TradeProposal[] {
  return league.tradeProposals.filter(
    p => p.status === 'pending' && (p.fromTeamId === teamId || p.toTeamId === teamId)
  );
}

/**
 * Create notification for trade proposal
 * FIX: Match the TradeProposalNotification interface
 */
export function createTradeNotification(
  proposal: TradeProposal,
  fromTeamName: string,
  toTeamName: string
): TradeProposalNotification {
  return {
    proposal,
    fromTeamName,
    toTeamName,
  };
}

/**
 * Validate trade proposal
 */
export function validateTradeProposal(
  league: LeagueState,
  fromTeamId: string,
  toTeamId: string,
  fromPlayerIds: string[],
  toPlayerIds: string[]
): { valid: boolean; error?: string } {
  // Check that teams are different
  if (fromTeamId === toTeamId) {
    return { valid: false, error: 'Cannot trade with yourself' };
  }

  // Check that both sides have players
  if (fromPlayerIds.length === 0 || toPlayerIds.length === 0) {
    return { valid: false, error: 'Both teams must trade at least one player' };
  }

  // Check that rosters won't exceed limits after trade
  const fromTeam = league.draftState?.teams.find(t => t.teamId === fromTeamId);
  const toTeam = league.draftState?.teams.find(t => t.teamId === toTeamId);

  if (!fromTeam || !toTeam) {
    return { valid: false, error: 'Teams not found' };
  }

  const fromRosterAfter = fromTeam.roster.length - fromPlayerIds.length + toPlayerIds.length;
  const toRosterAfter = toTeam.roster.length - toPlayerIds.length + fromPlayerIds.length;

  const maxRosterSize = league.draftState?.config.rosterSize || 15;

  if (fromRosterAfter > maxRosterSize || toRosterAfter > maxRosterSize) {
    return { valid: false, error: 'Trade would exceed roster size limit' };
  }

  // Check for duplicate active proposals between same teams
  const existingProposal = league.tradeProposals.find(
    p =>
      p.status === 'pending' &&
      ((p.fromTeamId === fromTeamId && p.toTeamId === toTeamId) ||
        (p.fromTeamId === toTeamId && p.toTeamId === fromTeamId))
  );

  if (existingProposal) {
    return { valid: false, error: 'Already have a pending proposal with this team' };
  }

  return { valid: true };
}