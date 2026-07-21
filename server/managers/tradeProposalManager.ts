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
  Player,
  RosterRole,
} from '@nba-draft-sim/shared';
import { ROSTER_ROLE_TARGET_SHARE } from '../services/roleInference';

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
  toPlayerIds: string[],
  allPlayers: Player[],
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

  for (const playerId of fromPlayerIds) {
    if (!fromTeam.roster.includes(playerId)) {
      return { valid: false, error: `Player ${playerId} is not on the proposing roster` };
    }
  }

  for (const playerId of toPlayerIds) {
    if (!toTeam.roster.includes(playerId)) {
      return { valid: false, error: `Player ${playerId} is not on the receiving roster` };
    }
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

  const fromBefore = evaluateRoster(fromTeam.roster, allPlayers);
  const toBefore = evaluateRoster(toTeam.roster, allPlayers);
  const fromAfter = evaluateRoster(
    [
      ...fromTeam.roster.filter((playerId) => !fromPlayerIds.includes(playerId)),
      ...toPlayerIds,
    ],
    allPlayers,
  );
  const toAfter = evaluateRoster(
    [
      ...toTeam.roster.filter((playerId) => !toPlayerIds.includes(playerId)),
      ...fromPlayerIds,
    ],
    allPlayers,
  );

  const fromDelta = fromAfter.totalScore - fromBefore.totalScore;
  const toDelta = toAfter.totalScore - toBefore.totalScore;
  const maxAllowedDrop = -4;

  if (fromDelta < maxAllowedDrop) {
    return { valid: false, error: 'Trade costs the proposer too much value or fit' };
  }

  if (toDelta < maxAllowedDrop) {
    return { valid: false, error: 'Trade is too one-sided against the recipient' };
  }

  return { valid: true };
}

function evaluateRoster(rosterIds: string[], allPlayers: Player[]): { totalScore: number } {
  const roster = rosterIds
    .map((playerId) => allPlayers.find((player) => player.playerId === playerId))
    .filter((player): player is Player => player !== undefined);

  if (roster.length === 0) {
    return { totalScore: 0 };
  }

  const tradeValue = roster.reduce((sum, player) => sum + (player.valueModel?.tradeValue ?? player.impactRating), 0);
  const fitAverage = roster.reduce(
    (acc, player) => {
      const fit = player.valueModel?.fitVectors;
      if (!fit) return acc;
      acc.creation += fit.creation;
      acc.spacing += fit.spacing;
      acc.rimPressure += fit.rimPressure;
      acc.perimeterDefense += fit.perimeterDefense;
      acc.rimDefense += fit.rimDefense;
      acc.rebounding += fit.rebounding;
      acc.transition += fit.transition;
      acc.ballSecurity += fit.ballSecurity;
      return acc;
    },
    {
      creation: 0,
      spacing: 0,
      rimPressure: 0,
      perimeterDefense: 0,
      rimDefense: 0,
      rebounding: 0,
      transition: 0,
      ballSecurity: 0,
    },
  );

  const divisor = Math.max(roster.length, 1);
  const target = 0.55;
  const rosterRoleCounts: Record<RosterRole, number> = {
    backcourt: 0,
    wing: 0,
    frontcourt: 0,
  };

  for (const player of roster) {
    rosterRoleCounts[player.rosterRole] += 1;
  }

  const fitPenalty = Math.abs(target - fitAverage.creation / divisor)
    + Math.abs(target - fitAverage.spacing / divisor)
    + Math.abs(target - fitAverage.rimPressure / divisor)
    + Math.abs(target - fitAverage.perimeterDefense / divisor)
    + Math.abs(target - fitAverage.rimDefense / divisor)
    + Math.abs(target - fitAverage.rebounding / divisor);

  const roleBalancePenalty = (
    Math.abs(ROSTER_ROLE_TARGET_SHARE.backcourt - rosterRoleCounts.backcourt / divisor)
    + Math.abs(ROSTER_ROLE_TARGET_SHARE.wing - rosterRoleCounts.wing / divisor)
    + Math.abs(ROSTER_ROLE_TARGET_SHARE.frontcourt - rosterRoleCounts.frontcourt / divisor)
  ) * 6;

  const missingRolePenalty =
    (rosterRoleCounts.backcourt === 0 ? 2.5 : 0)
    + (rosterRoleCounts.wing === 0 ? 1.5 : 0)
    + (rosterRoleCounts.frontcourt === 0 ? 2.5 : 0);

  return {
    totalScore: tradeValue - fitPenalty * 8 - roleBalancePenalty - missingRolePenalty,
  };
}
